"""Tests for LLM connection, error classification, health check completion, offline replies, and greetings."""
from unittest.mock import MagicMock, patch
import httpx
import openai
import pytest

from backend.agents.tutor_agent import (
    TutorAgent,
    TutorInput,
    check_greeting_or_thanks,
    extract_clean_explanation,
)
from backend.llm.gateway import (
    LLMGateway,
    classify_error,
    strip_thinking,
)


def test_base_url_ipv4_normalization():
    """Verify localhost is automatically replaced with 127.0.0.1 to avoid Windows IPv6 resolution lag."""
    gw = LLMGateway(base_url="http://localhost:8000/v1")
    assert gw.base_url == "http://127.0.0.1:8000/v1"

    gw2 = LLMGateway(base_url="https://localhost:8888/v1/")
    assert gw2.base_url == "https://127.0.0.1:8888/v1"


def test_error_classification():
    """Verify error types are classified accurately."""
    # Not running / connection refused
    assert classify_error(httpx.ConnectError("Connection refused [WinError 10061]")) == "not_running"
    assert classify_error(openai.APIConnectionError(request=MagicMock(), message="Failed to connect")) == "not_running"

    # Timeout
    assert classify_error(httpx.ReadTimeout("Read timed out after 120s")) == "timeout"
    assert classify_error(openai.APITimeoutError(request=MagicMock())) == "timeout"

    # Bad model
    assert classify_error(Exception("The model `xyz` does not exist")) == "bad_model"
    assert classify_error(openai.NotFoundError("Model not found", response=MagicMock(status_code=404), body=None)) == "bad_model"

    # Generic server error
    assert classify_error(Exception("500 Internal Server Error")) == "server_error"


def test_strip_thinking():
    """Verify reasoning blocks are stripped from model output."""
    raw1 = "<thought>\nLet's analyze what a list is in Python...\n</thought>\nA list in Python is an ordered, mutable collection."
    assert strip_thinking(raw1) == "A list in Python is an ordered, mutable collection."

    raw2 = "<think>Pondering...</think>Python lists are created with brackets."
    assert strip_thinking(raw2) == "Python lists are created with brackets."

    raw3 = "Thinking Process:\n1. Check definition.\n\nPython lists store items."
    assert strip_thinking(raw3) == "Python lists store items."


def test_auto_detect_model():
    """Verify auto-detect queries /models endpoint and picks the first model id."""
    gw = LLMGateway(base_url="http://127.0.0.1:8000/v1", model="")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "data": [{"id": "gemma-4-E2B-it-UD-Q4_K_XL"}, {"id": "other-model"}]
    }

    with patch("httpx.Client.get", return_value=mock_resp):
        detected = gw.auto_detect_model()
        assert detected == "gemma-4-E2B-it-UD-Q4_K_XL"


def test_health_check_real_completion_healthy():
    """Verify health check performs a real chat completion and returns healthy."""
    gw = LLMGateway(base_url="http://127.0.0.1:8000/v1", model="gemma-4")

    mock_resp = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = "pong"
    mock_resp.choices = [mock_choice]

    with patch.object(gw._client.chat.completions, "create", return_value=mock_resp):
        health = gw.health_check()
        assert health["status"] == "healthy"
        assert health["model"] == "gemma-4"
        assert health["base_url"] == "http://127.0.0.1:8000/v1"
        assert health["error"] is None
        assert "latency_ms" in health


def test_health_check_real_completion_unreachable():
    """Verify health check returns unreachable and classifies connection refused."""
    gw = LLMGateway(base_url="http://127.0.0.1:8000/v1", model="gemma-4")

    with patch.object(
        gw._client.chat.completions,
        "create",
        side_effect=httpx.ConnectError("Connection refused [WinError 10061]"),
    ):
        health = gw.health_check()
        assert health["status"] == "unreachable"
        assert health["error_type"] == "not_running"
        assert "Connection refused" in health["error"]


def test_clean_offline_reply_no_raw_metadata():
    """Verify offline fallback strips raw metadata (Subject/Topic, Keywords, Example, Hint)."""
    raw_chunk = (
        "Subject/Topic: Python\n"
        "Keywords: python, python programming, python language\n"
        "Explanation: Python is a simple and powerful programming language used to develop websites, software, automation tools and AI applications. It is easy to learn and write.\n"
        "Example: For example, print('Hello World') displays Hello World on the screen.\n"
        "Hint: Python is known for its simple and easy-to-read syntax."
    )
    clean = extract_clean_explanation(raw_chunk)

    assert "Subject/Topic:" not in clean
    assert "Keywords:" not in clean
    assert "Example:" not in clean
    assert "Hint:" not in clean
    assert "Python is a simple and powerful programming language" in clean

    # Test full TutorAgent offline fallback
    mock_gw = MagicMock()
    mock_gw.chat.side_effect = ConnectionError("LLM offline")
    tutor = TutorAgent(gateway=mock_gw)

    out = tutor.explain(
        TutorInput(
            message="What is Python?",
            session_id="test_sess",
            subject="Python",
        )
    )

    assert out.source == "offline"
    assert "Offline mode: the AI model is not connected." in out.response
    assert "Subject/Topic:" not in out.response
    assert "Keywords:" not in out.response
    assert "Hint:" not in out.response
    assert "Ask your instructor to start the AI model or run scripts/start-llm.ps1." in out.response
    assert len(out.citations) > 0


def test_greetings_and_thanks_handling():
    """Verify 'hi', 'hello', 'thanks' get friendly conversational replies without course chunks."""
    assert check_greeting_or_thanks("hi") == "greeting"
    assert check_greeting_or_thanks("Hello there!") == "greeting"
    assert check_greeting_or_thanks("hey") == "greeting"
    assert check_greeting_or_thanks("thanks a lot!") == "thanks"
    assert check_greeting_or_thanks("thank you") == "thanks"
    assert check_greeting_or_thanks("What is a dictionary in Python?") is None

    mock_gw = MagicMock()
    tutor = TutorAgent(gateway=mock_gw)

    # Greeting
    greeting_out = tutor.explain(
        TutorInput(message="hi", session_id="test_sess", subject="Python")
    )
    assert "Parivestra AI Tutor" in greeting_out.response
    assert "Offline mode" not in greeting_out.response
    assert "Subject/Topic:" not in greeting_out.response
    assert greeting_out.citations == []
    # Mock gateway should not have been called for greeting
    mock_gw.chat.assert_not_called()

    # Streaming greeting
    stream_events = list(
        tutor.explain_stream(
            TutorInput(message="hello", session_id="test_sess", subject="Python")
        )
    )
    tokens = [e["token"] for e in stream_events if e["type"] == "token"]
    assert any("Parivestra AI Tutor" in t for t in tokens)
    done_event = [e for e in stream_events if e["type"] == "done"][0]
    assert done_event["source"] == "assistant"
    assert done_event["citations"] == []

