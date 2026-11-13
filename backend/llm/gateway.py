"""Unified LLM Gateway supporting OpenAI-compatible endpoints and Ollama fallback."""
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


def classify_error(err: Exception) -> str:
    """Classify exceptions into standardized error types:
    - 'timeout': Connection or read timeout
    - 'not_running': Port unreachable, connection refused, host down
    - 'bad_model': Model not found or invalid model id
    - 'server_error': Internal server error or bad request
    """
    msg = str(err).lower()

    # Check timeout first (APITimeoutError inherits from APIConnectionError in OpenAI SDK)
    if (
        isinstance(err, (httpx.TimeoutException, openai.APITimeoutError))
        or "timeout" in msg
        or "timed out" in msg
    ):
        return "timeout"

    if (
        isinstance(err, (httpx.ConnectError, openai.APIConnectionError))
        or "10061" in msg
        or "refused" in msg
        or "failed to establish a new connection" in msg
        or "connection reset" in msg
    ):
        return "not_running"

    if (
        isinstance(err, (openai.NotFoundError, openai.BadRequestError))
        or "not found" in msg
        or "does not exist" in msg
        or "invalid model" in msg
        or "unknown model" in msg
    ):
        return "bad_model"

    return "server_error"


def strip_thinking(text: str) -> str:
    """Strip reasoning/thinking blocks from generated model answers."""
    if not text:
        return ""
    # Strip <thought>...</thought> or <think>...</think> (including trailing unclosed tags)
    cleaned = re.sub(r"<(thought|think)>[\s\S]*?(?:</\1>|$)", "", text, flags=re.IGNORECASE)
    # Strip "Thinking Process:\n... \n\n" if it appears at start
    cleaned = re.sub(r"^Thinking Process:[\s\S]*?(?:\n\n|\r\n\r\n)", "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


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
        timeout: float = 120.0,
    ):
        raw_base_url = (base_url or config.LLM_BASE_URL).rstrip("/")
        # Always replace localhost with 127.0.0.1 on Windows to eliminate IPv6 lookup lag
        if "://localhost" in raw_base_url:
            raw_base_url = raw_base_url.replace("://localhost", "://127.0.0.1")
        self.base_url = raw_base_url
        self.model = model if model is not None else config.LLM_MODEL
        self.api_key = api_key if api_key is not None else config.LLM_API_KEY
        self.temperature = temperature if temperature is not None else config.LLM_TEMPERATURE
        self.max_tokens = max_tokens if max_tokens is not None else config.LLM_MAX_TOKENS
        self.provider = (provider or config.LLM_PROVIDER).lower()
        self.timeout = timeout

        if self.provider == "openai":
            # 5s connect timeout, 120s read timeout for first token
            self._client = openai.OpenAI(
                base_url=self.base_url,
                api_key=self.api_key or "EMPTY",
                timeout=httpx.Timeout(self.timeout, connect=5.0),
            )
        else:
            self._client = None

    def auto_detect_model(self) -> Optional[str]:
        """Query /v1/models and return the first available model id."""
        try:
            with httpx.Client(timeout=httpx.Timeout(5.0, connect=3.0)) as client:
                headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
                resp = client.get(f"{self.base_url}/models", headers=headers)
                if resp.status_code == 200:
                    data = resp.json().get("data", [])
                    if data and isinstance(data, list) and len(data) > 0:
                        first_id = data[0].get("id")
                        if first_id:
                            return first_id
        except Exception as err:
            logger.debug(f"Auto-detect model failed: {err}")
        return None

    def _resolve_model(self) -> str:
        """Return configured model or auto-detect if unset/empty."""
        if self.model and self.model.strip():
            return self.model
        detected = self.auto_detect_model()
        if detected:
            self.model = detected
            return detected
        return self.model or "gemma-4"

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
        """Perform a real tiny chat completion (max_tokens 5) to verify model reachability."""
        start_time = time.perf_counter()
        target_model = self._resolve_model()

        if self.provider == "ollama":
            try:
                import ollama
                res = ollama.chat(
                    model=target_model,
                    messages=[{"role": "user", "content": "ping"}],
                    options={"temperature": 0.0, "num_predict": 5},
                )
                latency = (time.perf_counter() - start_time) * 1000
                return {
                    "status": "healthy",
                    "provider": "ollama",
                    "model": target_model,
                    "base_url": self.base_url,
                    "latency_ms": round(latency, 2),
                    "error": None,
                    "error_type": None,
                }
            except Exception as e:
                latency = (time.perf_counter() - start_time) * 1000
                return {
                    "status": "unreachable",
                    "provider": "ollama",
                    "model": target_model,
                    "base_url": self.base_url,
                    "latency_ms": round(latency, 2),
                    "error": str(e),
                    "error_type": classify_error(e),
                }

        # OpenAI compatible endpoint: real tiny completion with 5s timeout
        try:
            try:
                self._client.chat.completions.create(
                    model=target_model,
                    messages=[{"role": "user", "content": "ping"}],
                    max_tokens=5,
                    temperature=0.0,
                    timeout=5.0,
                    extra_body={"chat_template_kwargs": {"enable_thinking": False}},
                )
            except Exception as eb_err:
                # If extra_body is rejected by another server implementation, retry without extra_body
                if "extra_body" in str(eb_err).lower() or "chat_template_kwargs" in str(eb_err).lower():
                    self._client.chat.completions.create(
                        model=target_model,
                        messages=[{"role": "user", "content": "ping"}],
                        max_tokens=5,
                        temperature=0.0,
                        timeout=5.0,
                    )
                else:
                    raise eb_err

            latency = (time.perf_counter() - start_time) * 1000
            return {
                "status": "healthy",
                "provider": "openai-compatible",
                "model": target_model,
                "base_url": self.base_url,
                "latency_ms": round(latency, 2),
                "error": None,
                "error_type": None,
            }
        except Exception as e:
            latency = (time.perf_counter() - start_time) * 1000
            err_type = classify_error(e)
            return {
                "status": "unreachable",
                "provider": "openai-compatible",
                "model": target_model,
                "base_url": self.base_url,
                "latency_ms": round(latency, 2),
                "error": str(e),
                "error_type": err_type,
            }

    def chat(
        self,
        messages: List[Dict[str, str]],
        stream: bool = False,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Union[str, Generator[str, None, None]]:
        """Send a chat completion request to the LLM with retry once on failure."""
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
        target_model = self._resolve_model()

        for attempt in range(2):
            start = time.perf_counter()
            try:
                if self.provider == "ollama":
                    import ollama
                    res = ollama.chat(
                        model=target_model,
                        messages=messages,
                        options={"temperature": temperature, "num_predict": max_tokens},
                    )
                    latency = (time.perf_counter() - start) * 1000
                    raw_content = res.get("message", {}).get("content", "")
                    content = strip_thinking(raw_content)
                    prompt_tokens = res.get("prompt_eval_count")
                    comp_tokens = res.get("eval_count")
                    self._log_call(latency, prompt_tokens, comp_tokens, True)
                    return content
                else:
                    # Pass extra_body for thinking suppression
                    try:
                        response = self._client.chat.completions.create(
                            model=target_model,
                            messages=messages,
                            temperature=temperature,
                            max_tokens=max_tokens,
                            extra_body={"chat_template_kwargs": {"enable_thinking": False}},
                        )
                    except Exception as eb_err:
                        if "extra_body" in str(eb_err).lower() or "chat_template_kwargs" in str(eb_err).lower():
                            response = self._client.chat.completions.create(
                                model=target_model,
                                messages=messages,
                                temperature=temperature,
                                max_tokens=max_tokens,
                            )
                        else:
                            raise eb_err

                    latency = (time.perf_counter() - start) * 1000
                    raw_content = response.choices[0].message.content or ""
                    content = strip_thinking(raw_content)
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

        raise LLMError(f"LLM request to '{target_model}' at '{self.base_url}' failed after 2 attempts: {last_error}")

    def _chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> Generator[str, None, None]:
        start = time.perf_counter()
        target_model = self._resolve_model()
        collected_chunks: List[str] = []

        try:
            if self.provider == "ollama":
                import ollama
                stream_resp = ollama.chat(
                    model=target_model,
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
                try:
                    stream_resp = self._client.chat.completions.create(
                        model=target_model,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        stream=True,
                        extra_body={"chat_template_kwargs": {"enable_thinking": False}},
                    )
                except Exception as eb_err:
                    if "extra_body" in str(eb_err).lower() or "chat_template_kwargs" in str(eb_err).lower():
                        stream_resp = self._client.chat.completions.create(
                            model=target_model,
                            messages=messages,
                            temperature=temperature,
                            max_tokens=max_tokens,
                            stream=True,
                        )
                    else:
                        raise eb_err

                in_thought = False
                thought_buf = ""

                for chunk in stream_resp:
                    if chunk.choices and len(chunk.choices) > 0:
                        delta = chunk.choices[0].delta
                        token = getattr(delta, "content", "") or ""
                        if not token:
                            continue

                        # Check for thinking tag suppression
                        if "<think" in token or "<thought" in token or in_thought:
                            thought_buf += token
                            if "</think>" in thought_buf or "</thought>" in thought_buf:
                                in_thought = False
                                thought_buf = ""
                            else:
                                in_thought = True
                            continue

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
