"""Unit tests for unified LLM Gateway with mocked OpenAI client."""
from unittest.mock import MagicMock, patch
import pytest
from backend.llm.gateway import LLMGateway, LLMError


def test_gateway_sync_chat_success():
    gateway = LLMGateway(base_url="http://mock-llm:8000/v1", model="test-model")

    mock_choice = MagicMock()
    mock_choice.message.content = "Python is a dynamic programming language."
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
        assert tokens == ["Hello ", "World!"]

