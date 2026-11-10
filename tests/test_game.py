"""Tests for Bug Hunt Arena game service, safe AST validation, scoring and leaderboard."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.agents.game_service import (
    BugHuntGameService,
    validate_bug_snippet,
    ALLOWED_BUG_TYPES,
)
from backend.agents.progress_agent import ProgressAgent
from backend.models import Base, GameScore, GameSession, User, Attempt, Mastery


class DummyGateway:
    def chat(self, messages, max_tokens=100, temperature=0.7):
        return "Pay attention to boundary conditions in the loops."


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    user = User(id="game_user_1", name="Alex")
    db.add(user)
    db.commit()

    yield db
    db.close()


def test_validate_bug_snippet_valid():
    valid_raw = {
        "snippet": "scores = [10, 20, 30]\nfor s in scores:\n    print(s)",
        "buggy_line": 2,
        "bug_type": "logic",
        "explanation": "Logic bug explanation",
        "hint": "Check loop",
        "topic": "Lists",
    }
    validated = validate_bug_snippet(valid_raw)
    assert validated is not None
    assert validated["buggy_line"] == 2
    assert validated["bug_type"] == "logic"


def test_validate_bug_snippet_invalid_type():
    invalid_raw = {
        "snippet": "a = 1\nb = 2\nc = a + b",
        "buggy_line": 2,
        "bug_type": "quantum_error",  # Not in ALLOWED_BUG_TYPES
    }
    assert validate_bug_snippet(invalid_raw) is None


def test_validate_bug_snippet_out_of_bounds_line():
    invalid_raw = {
        "snippet": "a = 1\nb = 2\nc = 3",
        "buggy_line": 99,  # Line 99 does not exist
        "bug_type": "logic",
    }
    assert validate_bug_snippet(invalid_raw) is None


def test_game_flow_and_scoring(test_db):
    user = test_db.query(User).filter_by(id="game_user_1").first()
    service = BugHuntGameService(gateway=DummyGateway(), progress_agent=ProgressAgent())

    # 1. Start game
    start_data = service.start_game(db=test_db, user=user, topic="Lists")
    assert start_data["lives"] == 3
    assert start_data["score"] == 0
    assert start_data["streak"] == 0
    assert "current_buggy_line" not in start_data  # hidden from student

    session_id = start_data["session_id"]
    db_session = test_db.query(GameSession).filter_by(id=session_id).first()
    assert db_session is not None
    correct_line = db_session.current_buggy_line
    correct_type = db_session.current_bug_type

    # 2. Submit correct answer
    ans_res = service.submit_answer(
        db=test_db,
        user=user,
        session_id=session_id,
        selected_line=correct_line,
        selected_bug_type=correct_type,
        time_taken_seconds=5.0,
    )
    assert ans_res["was_line_correct"] is True
    assert ans_res["was_type_correct"] is True
    assert ans_res["points_awarded"] > 0
    assert ans_res["streak"] == 1
    assert ans_res["lives_remaining"] == 3

    # Check that Attempt and Mastery were synced
    attempts = test_db.query(Attempt).filter_by(user_id=user.id).all()
    assert len(attempts) == 1
    assert attempts[0].correct is True

    # 3. Test hint deduction
    current_score = ans_res["current_score"]
    hint_res = service.get_hint(db=test_db, session_id=session_id)
    assert "hint" in hint_res
    assert hint_res["score"] == max(0, current_score - 25)

    # 4. Submit wrong answers until game over
    wrong_line = 1 if correct_line != 1 else 2
    for _ in range(3):
        ans_res = service.submit_answer(
            db=test_db,
            user=user,
            session_id=session_id,
            selected_line=wrong_line,
            selected_bug_type="logic",
            time_taken_seconds=10.0,
        )

    assert ans_res["game_over"] is True
    assert ans_res["lives_remaining"] == 0

    # Check leaderboard entry
    scores = test_db.query(GameScore).filter_by(user_id=user.id).all()
    assert len(scores) == 1

    leaderboard = service.get_leaderboard(db=test_db, limit=5)
    assert len(leaderboard) >= 1
    assert leaderboard[0]["user_name"] == "Alex"

