"""Unit tests for unified LLM Gateway with mocked OpenAI client, auto-detect, and thinking stripping."""
from unittest.mock import MagicMock, patch
import pytest
import httpx
from backend.llm.gateway import (
    LLMGateway,
    LLMError,
    strip_thinking_text,
    strip_thinking_stream,
)


def test_strip_thinking_text():
    raw_thought = "<thought>Thinking about lists in Python...\nThey are arrays.</thought>A list in Python is an ordered, mutable collection."
    cleaned = strip_thinking_text(raw_thought)
    assert cleaned == "A list in Python is an ordered, mutable collection."

    raw_think = "<think>Let me recall the definition.\nLists have bracket syntax.</think>Lists are created using []."
    assert strip_thinking_text(raw_think) == "Lists are created using []."

    plain = "This is a clean response with no tags."
    assert strip_thinking_text(plain) == plain


def test_strip_thinking_stream():
    tokens = [
        "<thought>",
        "Thinking ",
        "deeply ",
        "about ",
        "the answer...",
        "</thought>",
        "A list ",
        "is mutable.",
    ]
    stream_out = list(strip_thinking_stream(iter(tokens)))
    result = "".join(stream_out)
    assert "Thinking" not in result
    assert "A list is mutable." in result


def test_gateway_auto_detect_model():
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "data": [{"id": "gemma-4-E2B-it-GGUF"}]
    }

    gateway = LLMGateway(base_url="http://mock-llm:8000/v1", model="")
    with patch("httpx.Client.get", return_value=mock_resp):
        detected = gateway.auto_detect_model()
        assert detected == "gemma-4-E2B-it-GGUF"
        assert gateway.model == "gemma-4-E2B-it-GGUF"


def test_gateway_sync_chat_success():
    gateway = LLMGateway(base_url="http://mock-llm:8000/v1", model="test-model")

    mock_choice = MagicMock()
    mock_choice.message.content = "<think>Internal reasoning</think>Python is a dynamic programming language."
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.usage.prompt_tokens = 15
    mock_response.usage.completion_tokens = 25

    with patch.object(gateway._client.chat.completions, "create", return_value=mock_response):
        out = gateway.chat([{"role": "user", "content": "What is Python?"}], stream=False)
        assert out == "Python is a dynamic programming language."


def test_gateway_retry_on_failure():
    gateway = LLMGateway(base_url="http://mock-llm:8000/v1", model="test-model")

    mock_choice = MagicMock()
    mock_choice.message.content = "Recovered after 1 retry"
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    mock_response.usage.prompt_tokens = 10
    mock_response.usage.completion_tokens = 12

    # First call raises ConnectionError, second call succeeds
    with patch.object(
        gateway._client.chat.completions,
        "create",
        side_effect=[ConnectionError("Temporary network glitch"), mock_response],
    ):
        out = gateway.chat([{"role": "user", "content": "Hello"}])
        assert out == "Recovered after 1 retry"


def test_gateway_failure_raises_llm_error():
    gateway = LLMGateway(base_url="http://mock-llm:8000/v1", model="test-model")

    with patch.object(
        gateway._client.chat.completions,
        "create",
        side_effect=ConnectionError("Server unreachable"),
    ):
        with pytest.raises(LLMError) as exc_info:
            gateway.chat([{"role": "user", "content": "Hello"}])
        assert "failed after 2 attempts" in str(exc_info.value)


def test_gateway_streaming_generator():
    gateway = LLMGateway(base_url="http://mock-llm:8000/v1", model="test-model")

    chunk1 = MagicMock()
    chunk1.choices = [MagicMock(delta=MagicMock(content="Hello "))]
    chunk2 = MagicMock()
    chunk2.choices = [MagicMock(delta=MagicMock(content="World!"))]

    with patch.object(gateway._client.chat.completions, "create", return_value=iter([chunk1, chunk2])):
        tokens = list(gateway.chat([{"role": "user", "content": "Hi"}], stream=True))
        assert "".join(tokens) == "Hello World!"
