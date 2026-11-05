"""Unit tests for PracticeAgent code validation and fallback."""
from unittest.mock import patch
from backend.agents.practice_agent import PracticeAgent, GeneratePracticeInput


def test_practice_validation_success():
    agent = PracticeAgent()
    valid_raw = {
        "question": "What is the primary keyword for loops over iterables?",
        "options": ["for", "while", "loop", "iterate"],
        "correct_index": 0,
        "topic": "Control Flow",
    }
    validated = agent._validate_question(valid_raw, "Python", "Control Flow", "Beginner")
    assert validated is not None
    assert validated.answer == "for"
    assert validated.correct_index == 0
    assert len(validated.options) == 4


def test_practice_validation_rejects_duplicate_options():
    agent = PracticeAgent()
    duplicate_opts = {
        "question": "Which operator does floor division?",
        "options": ["//", "//", "%", "/"],
        "correct_index": 0,
    }
    validated = agent._validate_question(duplicate_opts, "Python", "Operators", "Beginner")
    assert validated is None


def test_practice_validation_rejects_less_than_4_options():
    agent = PracticeAgent()
    invalid_opts = {
        "question": "Is Python interpreted?",
        "options": ["Yes", "No"],
        "correct_index": 0,
    }
    validated = agent._validate_question(invalid_opts, "Python", "Basics", "Beginner")
    assert validated is None


def test_practice_fallback_when_llm_fails():
    agent = PracticeAgent()
    with patch.object(agent.gateway, "chat", side_effect=Exception("Offline")):
        fallbacks = agent.generate(GeneratePracticeInput(subject="Python", difficulty="Beginner", count=3))
        assert len(fallbacks) == 3
        for q in fallbacks:
            assert len(q.options) == 4
            assert len(set(q.options)) == 4
            assert q.correct_index in [0, 1, 2, 3]
            assert q.answer in q.options
