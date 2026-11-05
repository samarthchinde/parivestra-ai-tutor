"""Unified LLM Gateway supporting OpenAI-compatible endpoints and Ollama fallback."""
import logging
import time
from typing import Any, Dict, Generator, List, Optional, Union
import httpx
import openai

from backend import config
from backend.database import SessionLocal
from backend.models import LLMLog

logger = logging.getLogger("backend.llm.gateway")


class LLMError(Exception):
    """Custom exception for LLM errors."""
    pass


class LLMGateway:
    """Gateway for LLM calls with health check, streaming, retry, and latency logging."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        provider: Optional[str] = None,
        timeout: float = 60.0,
    ):
        self.base_url = (base_url or config.LLM_BASE_URL).rstrip("/")
        # Replace localhost with 127.0.0.1 to avoid Windows mDNS/IPv6 delay
        if "://localhost" in self.base_url:
            self.base_url = self.base_url.replace("://localhost", "://127.0.0.1")
        self.model = model or config.LLM_MODEL
        self.api_key = api_key if api_key is not None else config.LLM_API_KEY
        self.temperature = temperature if temperature is not None else config.LLM_TEMPERATURE
        self.max_tokens = max_tokens if max_tokens is not None else config.LLM_MAX_TOKENS
        self.provider = (provider or config.LLM_PROVIDER).lower()
        self.timeout = timeout

        if self.provider == "openai":
            # standard openai client with fast connect timeout
            self._client = openai.OpenAI(
                base_url=self.base_url,
                api_key=self.api_key or "EMPTY",
                timeout=httpx.Timeout(self.timeout, connect=4.0),
            )
        else:
            self._client = None

    def _log_call(
        self,
        latency_ms: float,
        prompt_tokens: Optional[int],
        completion_tokens: Optional[int],
        success: bool,
        error_message: Optional[str] = None,
    ):
        """Record call metadata to both application logs and the database."""
        logger.info(
            f"[LLM CALL] model={self.model} latency={latency_ms:.1f}ms "
            f"prompt_tokens={prompt_tokens} completion_tokens={completion_tokens} "
            f"success={success} error={error_message}"
        )
        try:
            with SessionLocal() as db:
                log_entry = LLMLog(
                    model=self.model,
                    latency_ms=latency_ms,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    success=success,
                    error_message=error_message,
                )
                db.add(log_entry)
                db.commit()
        except Exception as db_err:
            logger.warning(f"Failed to record LLMLog to database: {db_err}")

    def health_check(self) -> Dict[str, Any]:
        """Check whether the configured LLM endpoint is reachable."""
        start_time = time.perf_counter()
        if self.provider == "ollama":
            # Check Ollama tags endpoint
            ollama_url = f"{self.base_url}/api/tags" if "/api" not in self.base_url else self.base_url
            try:
                with httpx.Client(timeout=httpx.Timeout(2.0, connect=1.0)) as client:
                    resp = client.get(ollama_url)
                    latency = (time.perf_counter() - start_time) * 1000
                    return {
                        "status": "healthy" if resp.status_code == 200 else "degraded",
                        "provider": self.provider,
                        "model": self.model,
                        "base_url": self.base_url,
                        "latency_ms": round(latency, 2),
                        "details": resp.json() if resp.status_code == 200 else resp.text,
                    }
            except Exception as e:
                return {
                    "status": "unreachable",
                    "provider": self.provider,
                    "model": self.model,
                    "base_url": self.base_url,
                    "error": str(e),
                }

        # OpenAI compatible endpoint health probe
        models_url = f"{self.base_url}/models"
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        try:
            with httpx.Client(timeout=httpx.Timeout(2.0, connect=1.0)) as client:
                resp = client.get(models_url, headers=headers)
                latency = (time.perf_counter() - start_time) * 1000
                if resp.status_code in (200, 204):
                    return {
                        "status": "healthy",
                        "provider": "openai-compatible",
                        "model": self.model,
                        "base_url": self.base_url,
                        "latency_ms": round(latency, 2),
                    }
                else:
                    return {
                        "status": "degraded",
                        "provider": "openai-compatible",
                        "model": self.model,
                        "base_url": self.base_url,
                        "http_status": resp.status_code,
                        "latency_ms": round(latency, 2),
                    }
        except Exception as e:
            return {
                "status": "unreachable",
                "provider": "openai-compatible",
                "model": self.model,
                "base_url": self.base_url,
                "error": str(e),
            }

    def chat(
        self,
        messages: List[Dict[str, str]],
        stream: bool = False,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Union[str, Generator[str, None, None]]:
        """
        Send a chat completion request to the LLM.
        Retries once on network failure.
        """
        temp = temperature if temperature is not None else self.temperature
        max_t = max_tokens if max_tokens is not None else self.max_tokens

        if stream:
            return self._chat_stream(messages, temp, max_t)
        else:
            return self._chat_sync(messages, temp, max_t)

    def _chat_sync(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> str:
        last_error = None
        for attempt in range(2):
            start = time.perf_counter()
            try:
                if self.provider == "ollama":
                    import ollama
                    res = ollama.chat(
                        model=self.model,
                        messages=messages,
                        options={"temperature": temperature, "num_predict": max_tokens},
                    )
                    latency = (time.perf_counter() - start) * 1000
                    content = res.get("message", {}).get("content", "")
                    prompt_tokens = res.get("prompt_eval_count")
                    comp_tokens = res.get("eval_count")
                    self._log_call(latency, prompt_tokens, comp_tokens, True)
                    return content
                else:
                    response = self._client.chat.completions.create(
                        model=self.model,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                    )
                    latency = (time.perf_counter() - start) * 1000
                    content = response.choices[0].message.content or ""
                    prompt_tokens = response.usage.prompt_tokens if response.usage else None
                    comp_tokens = response.usage.completion_tokens if response.usage else None
                    self._log_call(latency, prompt_tokens, comp_tokens, True)
                    return content
            except Exception as err:
                latency = (time.perf_counter() - start) * 1000
                last_error = err
                logger.warning(f"LLM call attempt {attempt + 1} failed: {err}")
                if attempt == 1:
                    self._log_call(latency, None, None, False, str(err))

        raise LLMError(f"LLM request to '{self.model}' at '{self.base_url}' failed after 2 attempts: {last_error}")

    def _chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> Generator[str, None, None]:
        start = time.perf_counter()
        collected_chunks = []
        try:
            if self.provider == "ollama":
                import ollama
                stream_resp = ollama.chat(
                    model=self.model,
                    messages=messages,
                    stream=True,
                    options={"temperature": temperature, "num_predict": max_tokens},
                )
                for chunk in stream_resp:
                    token = chunk.get("message", {}).get("content", "")
                    if token:
                        collected_chunks.append(token)
                        yield token
            else:
                stream_resp = self._client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    stream=True,
                )
                for chunk in stream_resp:
                    if chunk.choices and len(chunk.choices) > 0:
                        delta = chunk.choices[0].delta
                        token = getattr(delta, "content", "") or ""
                        if token:
                            collected_chunks.append(token)
                            yield token

            latency = (time.perf_counter() - start) * 1000
            # Rough estimation of completion tokens if not provided by stream
            comp_tokens = len(collected_chunks)
            self._log_call(latency, None, comp_tokens, True)

        except Exception as err:
            latency = (time.perf_counter() - start) * 1000
            self._log_call(latency, None, None, False, str(err))
            logger.error(f"Streaming error: {err}")
            raise LLMError(f"LLM streaming error: {err}")
