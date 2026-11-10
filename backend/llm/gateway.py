"""Unified LLM Gateway supporting OpenAI-compatible endpoints, Ollama fallback,
model auto-detection, and reasoning/thinking-block stripping.
"""
import logging
import re
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


def strip_thinking_text(text: str) -> str:
    """Strip reasoning/thinking blocks (<thought>...</thought> or <think>...</think>)."""
    if not text:
        return ""
    # Strip closed thinking tags
    cleaned = re.sub(r"<(thought|think)>.*?</\1>", "", text, flags=re.DOTALL)
    # Strip unclosed thinking tag if output was cut off
    cleaned = re.sub(r"<(thought|think)>.*$", "", cleaned, flags=re.DOTALL)
    return cleaned.strip()


def strip_thinking_stream(generator: Generator[str, None, None]) -> Generator[str, None, None]:
    """
    Streaming filter that suppresses tokens inside <think>...</think>
    or <thought>...</thought> blocks before yielding to the client.
    """
    in_thought = False
    buffer = ""

    for token in generator:
        buffer += token

        while True:
            if not in_thought:
                # Look for opening tag <think> or <thought>
                think_pos = buffer.find("<think>")
                thought_pos = buffer.find("<thought>")

                candidates = [p for p in (think_pos, thought_pos) if p != -1]
                if candidates:
                    start_pos = min(candidates)
                    tag = "<think>" if start_pos == think_pos else "<thought>"
                    if start_pos > 0:
                        yield buffer[:start_pos]
                    buffer = buffer[start_pos + len(tag):]
                    in_thought = True
                    continue
                else:
                    tag_prefixes = ["<", "<t", "<th", "<thi", "<thin", "<think", "<tho", "<thou", "<thoug", "<thought"]
                    if any(buffer.endswith(p) for p in tag_prefixes):
                        matching_prefix = next(p for p in sorted(tag_prefixes, key=len, reverse=True) if buffer.endswith(p))
                        safe = buffer[:-len(matching_prefix)]
                        if safe:
                            yield safe
                            buffer = matching_prefix
                        break
                    else:
                        yield buffer
                        buffer = ""
                        break
            else:
                close_think = buffer.find("</think>")
                close_thought = buffer.find("</thought>")
                candidates = [p for p in (close_think, close_thought) if p != -1]
                if candidates:
                    close_pos = min(candidates)
                    tag = "</think>" if close_pos == close_think else "</thought>"
                    buffer = buffer[close_pos + len(tag):]
                    in_thought = False
                    continue
                else:
                    if len(buffer) > 15:
                        buffer = buffer[-15:]
                    break

    if not in_thought and buffer:
        cleaned = strip_thinking_text(buffer)
        if cleaned:
            yield cleaned


class LLMGateway:
    """Gateway for LLM calls with health check, auto-detection, streaming, and latency logging."""

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
        # Standardize localhost to 127.0.0.1 to prevent Windows mDNS resolution lag
        if "://localhost" in self.base_url:
            self.base_url = self.base_url.replace("://localhost", "://127.0.0.1")

        self.model = model or config.LLM_MODEL
        self.api_key = api_key if api_key is not None else config.LLM_API_KEY
        self.temperature = temperature if temperature is not None else config.LLM_TEMPERATURE
        self.max_tokens = max_tokens if max_tokens is not None else config.LLM_MAX_TOKENS
        self.provider = (provider or config.LLM_PROVIDER).lower()
        self.timeout = timeout

        if self.provider == "openai":
            self._client = openai.OpenAI(
                base_url=self.base_url,
                api_key=self.api_key or "EMPTY",
                timeout=httpx.Timeout(self.timeout, connect=4.0),
            )
        else:
            self._client = None

        # Auto-detect model if empty or auto
        if not self.model or self.model.lower() == "auto":
            self.auto_detect_model()

    def auto_detect_model(self) -> Optional[str]:
        """Query /v1/models and set self.model to the first model returned."""
        if self.provider != "openai":
            return self.model

        try:
            models_url = f"{self.base_url}/models"
            headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
            with httpx.Client(timeout=httpx.Timeout(3.0, connect=2.0)) as client:
                resp = client.get(models_url, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    # Check standard OpenAI format: data: [{"id": "..."}]
                    model_list = data.get("data") or data.get("models") or []
                    if model_list and isinstance(model_list, list):
                        first_id = model_list[0].get("id") or model_list[0].get("name") or model_list[0].get("model")
                        if first_id:
                            self.model = first_id
                            logger.info(f"Auto-detected model: {self.model}")
                            return self.model
        except Exception as e:
            logger.debug(f"Auto-detect model failed: {e}")
        return self.model

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
                    model=self.model or "unknown",
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
        """Check whether the configured LLM endpoint is reachable, returning detailed metrics."""
        start_time = time.perf_counter()

        if self.provider == "ollama":
            ollama_url = f"{self.base_url}/api/tags" if "/api" not in self.base_url else self.base_url
            try:
                with httpx.Client(timeout=httpx.Timeout(3.0, connect=2.0)) as client:
                    resp = client.get(ollama_url)
                    latency = (time.perf_counter() - start_time) * 1000
                    return {
                        "status": "healthy" if resp.status_code == 200 else "degraded",
                        "provider": self.provider,
                        "model": self.model,
                        "base_url": self.base_url,
                        "latency_ms": round(latency, 2),
                        "error": None if resp.status_code == 200 else resp.text,
                    }
            except Exception as e:
                return {
                    "status": "unreachable",
                    "provider": self.provider,
                    "model": self.model,
                    "base_url": self.base_url,
                    "latency_ms": round((time.perf_counter() - start_time) * 1000, 2),
                    "error": str(e),
                }

        # OpenAI compatible endpoint health probe
        models_url = f"{self.base_url}/models"
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        try:
            with httpx.Client(timeout=httpx.Timeout(3.0, connect=2.0)) as client:
                resp = client.get(models_url, headers=headers)
                latency = (time.perf_counter() - start_time) * 1000
                if resp.status_code in (200, 204):
                    # Auto-refresh model if needed
                    data = resp.json()
                    model_list = data.get("data") or data.get("models") or []
                    detected = self.model
                    if model_list and isinstance(model_list, list):
                        detected = model_list[0].get("id") or model_list[0].get("name") or self.model
                        self.model = detected

                    return {
                        "status": "healthy",
                        "provider": "openai-compatible",
                        "model": detected,
                        "base_url": self.base_url,
                        "latency_ms": round(latency, 2),
                        "error": None,
                    }
                else:
                    return {
                        "status": "degraded",
                        "provider": "openai-compatible",
                        "model": self.model,
                        "base_url": self.base_url,
                        "latency_ms": round(latency, 2),
                        "error": f"HTTP {resp.status_code}: {resp.text}",
                    }
        except Exception as e:
            return {
                "status": "unreachable",
                "provider": "openai-compatible",
                "model": self.model,
                "base_url": self.base_url,
                "latency_ms": round((time.perf_counter() - start_time) * 1000, 2),
                "error": str(e),
            }

    def chat(
        self,
        messages: List[Dict[str, str]],
        stream: bool = False,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        enable_thinking: bool = False,
        extra_body: Optional[Dict[str, Any]] = None,
    ) -> Union[str, Generator[str, None, None]]:
        """
        Send a chat completion request to the LLM with thinking blocks stripped.
        Retries once on network failure.
        """
        # If model is still empty, attempt auto-detect
        if not self.model or self.model == "auto":
            self.auto_detect_model()

        temp = temperature if temperature is not None else self.temperature
        max_t = max_tokens if max_tokens is not None else self.max_tokens

        req_extra = {}
        if not enable_thinking:
            req_extra["chat_template_kwargs"] = {"enable_thinking": False}
        if extra_body:
            req_extra.update(extra_body)

        if stream:
            raw_gen = self._chat_stream(messages, temp, max_t, req_extra)
            return strip_thinking_stream(raw_gen)
        else:
            raw_text = self._chat_sync(messages, temp, max_t, req_extra)
            return strip_thinking_text(raw_text)

    def _chat_sync(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
        extra_body: Optional[Dict[str, Any]] = None,
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
                    create_kwargs = {
                        "model": self.model or "gemma-4",
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                    }
                    if extra_body:
                        create_kwargs["extra_body"] = extra_body

                    try:
                        response = self._client.chat.completions.create(**create_kwargs)
                    except Exception as extra_err:
                        # Fallback if endpoint does not support extra_body parameters
                        if extra_body and ("extra_body" in str(extra_err) or "chat_template_kwargs" in str(extra_err)):
                            create_kwargs.pop("extra_body", None)
                            response = self._client.chat.completions.create(**create_kwargs)
                        else:
                            raise extra_err

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
        extra_body: Optional[Dict[str, Any]] = None,
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
                create_kwargs = {
                    "model": self.model or "gemma-4",
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "stream": True,
                }
                if extra_body:
                    create_kwargs["extra_body"] = extra_body

                try:
                    stream_resp = self._client.chat.completions.create(**create_kwargs)
                except Exception as extra_err:
                    if extra_body and ("extra_body" in str(extra_err) or "chat_template_kwargs" in str(extra_err)):
                        create_kwargs.pop("extra_body", None)
                        stream_resp = self._client.chat.completions.create(**create_kwargs)
                    else:
                        raise extra_err

                for chunk in stream_resp:
                    if chunk.choices and len(chunk.choices) > 0:
                        delta = chunk.choices[0].delta
                        token = getattr(delta, "content", "") or ""
                        if token:
                            collected_chunks.append(token)
                            yield token

            latency = (time.perf_counter() - start) * 1000
            comp_tokens = len(collected_chunks)
            self._log_call(latency, None, comp_tokens, True)

        except Exception as err:
            latency = (time.perf_counter() - start) * 1000
            self._log_call(latency, None, None, False, str(err))
            logger.error(f"Streaming error: {err}")
            raise LLMError(f"LLM streaming error: {err}")
