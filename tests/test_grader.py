"""Unit tests for GraderAgent deterministic grading in code."""
from unittest.mock import MagicMock
from backend.agents.grader_agent import GraderAgent, GradeInput


def test_grader_correct_answer():
    grader = GraderAgent()
    inp = GradeInput(
        question="Which keyword is used to define a function in Python?",
        options=["def", "function", "fun", "define"],
        correct_answer="def",
        selected_answer="def",
    )
    out = grader.grade(inp)
    assert out.is_correct is True
    assert "def" in out.explanation


def test_grader_correct_answer_case_insensitive():
    grader = GraderAgent()
    inp = GradeInput(
        question="What is True or False data type?",
        options=["Bool", "Int", "Str", "Float"],
        correct_answer="bool",
        selected_answer="BOOL",
    )
    out = grader.grade(inp)
    assert out.is_correct is True


def test_grader_incorrect_answer_with_llm_explanation():
    mock_gw = MagicMock()
    mock_gw.chat.return_value = "def is the standard keyword in Python; function is used in JavaScript."
    grader = GraderAgent(gateway=mock_gw)

    inp = GradeInput(
        question="Which keyword defines a function?",
        options=["def", "function", "fun", "define"],
        correct_answer="def",
        selected_answer="function",
    )
    out = grader.grade(inp)
    assert out.is_correct is False
    assert out.correct_answer == "def"
    assert out.selected_answer == "function"
    assert "JavaScript" in out.explanation

