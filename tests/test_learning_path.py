"""Unit tests for Learning Path unlock rules, XP, and streak logic."""
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.agents.learning_path_service import (
    calculate_xp_and_streak,
    get_learning_path,
)
from backend.database import Base
from backend.models import Attempt, Mastery, User


def test_calculate_xp_and_streak():
    now = datetime.now(timezone.utc)
    attempts = [
        Attempt(id=1, user_id="u1", subject="Python", topic="Lists", difficulty="Beginner", question_id="q1", selected="a", correct=True, created_at=now),
        Attempt(id=2, user_id="u1", subject="Python", topic="Lists", difficulty="Beginner", question_id="q2", selected="b", correct=False, created_at=now),
        Attempt(id=3, user_id="u1", subject="Python", topic="Strings", difficulty="Beginner", question_id="q3", selected="c", correct=True, created_at=now - timedelta(days=1)),
    ]

    stats = calculate_xp_and_streak(attempts)
    # Total attempts = 3 * 20 = 60, Correct = 2 * 50 = 100 -> total 160 XP
    assert stats["xp"] == 160
    assert stats["badge"] == "Python Apprentice"
    assert stats["streak_days"] == 2


def test_learning_path_level_unlock_rule():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    user = User(id="u_path_test", name="Bob")
    db.add(user)
    db.commit()

    # Case 1: Fresh user -> Level 1 in_progress, Level 2 locked
    path = get_learning_path(db, "u_path_test")
    levels = path["levels"]
    assert len(levels) >= 5
    assert levels[0]["status"] == "in_progress"
    assert levels[1]["status"] == "locked"
    assert "Requires >= 60%" in levels[1]["lock_reason"]

    # Case 2: Complete Level 1 milestones with >= 3 attempts and >= 60% mastery
    # Level 1 milestones: Introduction, Variables, Data Types
    for topic in ["Introduction", "Variables", "Data Types"]:
        m = Mastery(
            user_id="u_path_test",
            subject="Python",
            topic=topic,
            score=85.0,
            attempts=4,
        )
        db.add(m)
    db.commit()

    unlocked_path = get_learning_path(db, "u_path_test")
    unlocked_levels = unlocked_path["levels"]
    assert unlocked_levels[0]["status"] == "completed"
    assert unlocked_levels[1]["status"] == "in_progress"  # Level 2 unlocked!
    assert unlocked_levels[1]["lock_reason"] is None
    assert unlocked_levels[2]["status"] == "locked"  # Level 3 still locked

