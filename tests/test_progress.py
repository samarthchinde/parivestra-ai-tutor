"""Unit tests for ProgressAgent weighted moving average and mastery calculation."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.agents.progress_agent import ProgressAgent
from backend.database import Base
from backend.models import User


def test_progress_mastery_weighted_moving_average():
    # In-memory SQLite session for isolated testing
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    user = User(id="u123", name="Alice")
    db.add(user)
    db.commit()

    agent = ProgressAgent(alpha=0.3)

    # Attempt 1: Correct (+100) -> score 100.0, attempts 1 (not sufficient yet, < 3)
    m1 = agent.update_mastery(db, "u123", "Python", "Lists", correct=True)
    assert m1.score == 100.0
    assert m1.attempts == 1
    assert m1.sufficient_data is False

    # Attempt 2: Incorrect (0) -> 100.0 * 0.7 + 0.0 * 0.3 = 70.0, attempts 2
    m2 = agent.update_mastery(db, "u123", "Python", "Lists", correct=False)
    assert m2.score == 70.0
    assert m2.attempts == 2
    assert m2.sufficient_data is False

    # Attempt 3: Correct (+100) -> 70.0 * 0.7 + 100.0 * 0.3 = 49.0 + 30.0 = 79.0, attempts 3 -> sufficient data!
    m3 = agent.update_mastery(db, "u123", "Python", "Lists", correct=True)
    assert m3.score == 79.0
    assert m3.attempts == 3
    assert m3.sufficient_data is True

    # Progress Summary
    summary = agent.get_progress_summary(db, "u123")
    assert len(summary.mastery_per_topic) == 1
    assert summary.mastery_per_topic[0].topic == "Lists"
    assert "Lists" in summary.recommended_next_topic or "Great work" in summary.recommended_next_topic

