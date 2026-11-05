"""Integration tests for main FastAPI endpoint handlers with mocked LLM."""
from unittest.mock import MagicMock, patch
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from api import (
    ask_legacy,
    get_progress,
    get_subjects,
    health_check,
    practice_generate,
    practice_submit,
    LegacyQuestion,
    PracticeGenerateRequest,
    PracticeSubmitRequest,
)
from backend.database import Base
from backend.models import User


@pytest.fixture
def mock_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    user = User(id="test_student_42", name="Alice")
    db.add(user)
    db.commit()
    return db


def test_api_subjects():
    data = get_subjects()
    assert "subjects" in data
    assert any(s["name"] == "Python" for s in data["subjects"])
    assert len(data["subjects"]) >= 5


def test_api_health_mocked():
    with patch("api.gateway.health_check", return_value={"status": "healthy", "model": "gemma-4"}):
        data = health_check()
        assert data["status"] == "ok"
        assert data["llm"]["status"] == "healthy"


def test_api_practice_generate_and_submit(mock_db):
    user = mock_db.query(User).filter(User.id == "test_student_42").first()

    with patch("api.practice_agent.gateway.chat", side_effect=Exception("Offline")):
        # 1. Generate questions
        gen_data = practice_generate(
            PracticeGenerateRequest(subject="Python", difficulty="Beginner", count=2),
            user=user,
        )
        questions = gen_data["questions"]
        assert len(questions) == 2
        q0 = questions[0]

        # 2. Submit answer
        sub_data = practice_submit(
            PracticeSubmitRequest(
                question_id=q0["id"],
                selected=q0["answer"],
                time_taken=4.5,
                hints_used=0,
                subject=q0["subject"],
                topic=q0["topic"],
                difficulty=q0["difficulty"],
                question=q0["question"],
                options=q0["options"],
                correct_answer=q0["answer"],
            ),
            user=user,
            db=mock_db,
        )
        assert sub_data["correct"] is True
        assert "mastery" in sub_data

        # 3. Check progress
        prog_data = get_progress(user=user, db=mock_db)
        assert prog_data["user_id"] == "test_student_42"
        assert len(prog_data["recent_attempts"]) >= 1


def test_legacy_ask_endpoint():
    with patch("api.tutor_agent.explain") as mock_explain:
        from backend.agents.tutor_agent import TutorOutput, Citation

        mock_explain.return_value = TutorOutput(
            response="Python is a simple and powerful language.",
            citations=[Citation(id="py_intro_01", title="Python Overview")],
            hint_level=0,
        )

        data = ask_legacy(LegacyQuestion(question="What is Python?"))
        assert data["success"] is True
        assert data["type"] == "AI Tutor Response"
        assert len(data["citations"]) == 1
