"""Unit tests for practice question deduplication, adaptive difficulty, and seen-question tracking."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.agents.practice_agent import (
    PracticeAgent,
    calculate_jaccard_overlap,
    compute_adaptive_difficulty,
    normalize_stem,
    stem_hash,
)
from backend.database import Base
from backend.models import Attempt, GeneratedQuestion, User, UserSeenQuestion


def test_stem_normalization_and_hash():
    s1 = "What is a list in Python?"
    s2 = "  what is a list in python???  "
    assert normalize_stem(s1) == normalize_stem(s2)
    assert stem_hash(s1) == stem_hash(s2)


def test_jaccard_token_overlap():
    s1 = "Which keyword is used to define a function in Python?"
    s2 = "What keyword is used to define a function in Python?"
    # Almost identical
    overlap = calculate_jaccard_overlap(s1, s2)
    assert overlap > 0.80

    s3 = "How do while loops work with break and continue statements?"
    assert calculate_jaccard_overlap(s1, s3) < 0.20


def test_adaptive_difficulty_progression():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    user = User(id="u_adapt", name="Charlie")
    db.add(user)
    db.commit()

    # When 0 attempts exist -> returns requested difficulty
    diff = compute_adaptive_difficulty(db, "u_adapt", "Functions", "Beginner")
    assert diff == "Beginner"

    # Add 3 correct attempts -> should promote to Intermediate!
    for i in range(3):
        db.add(
            Attempt(
                user_id="u_adapt",
                subject="Python",
                topic="Functions",
                difficulty="Beginner",
                question_id=f"q_{i}",
                selected="correct_ans",
                correct=True,
            )
        )
    db.commit()

    promoted_diff = compute_adaptive_difficulty(db, "u_adapt", "Functions", "Beginner")
    assert promoted_diff == "Intermediate"

    # Add 2 wrong attempts -> should demote back to Beginner!
    for i in range(2):
        db.add(
            Attempt(
                user_id="u_adapt",
                subject="Python",
                topic="Functions",
                difficulty="Intermediate",
                question_id=f"q_w_{i}",
                selected="wrong_ans",
                correct=False,
            )
        )
    db.commit()

    demoted_diff = compute_adaptive_difficulty(db, "u_adapt", "Functions", "Intermediate")
    assert demoted_diff == "Beginner"


def test_seen_question_exclusion():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    user = User(id="u_seen", name="Dave")
    db.add(user)

    # Mark bundled_1 as seen
    db.add(
        UserSeenQuestion(
            user_id="u_seen",
            question_id="bundled_1",
            question_hash=stem_hash("Which keyword is used to define a function in Python?"),
        )
    )
    db.commit()

    agent = PracticeAgent()
    seen_stems, seen_hashes = agent._get_user_seen_stems_and_hashes(db, "u_seen")
    assert len(seen_hashes) == 1

    # Fallback should not return bundled_1
    fallbacks = agent._get_fallback_questions("Python", "Beginner", 5, seen_hashes)
    for q in fallbacks:
        assert q.id != "bundled_1"


def test_extract_and_repair_json():
    from backend.agents.practice_agent import extract_and_repair_json

    # 1. Code fence with json
    fenced = """```json
    {
        "question": "What is Python?",
        "options": ["A", "B", "C", "D"],
        "correct_index": 0,
        "topic": "Python"
    }
    ```"""
    parsed, err = extract_and_repair_json(fenced)
    assert parsed is not None
    assert parsed["question"] == "What is Python?"
    assert err is None

    # 2. Trailing comma repair
    trailing = '{"question": "Valid?", "options": ["1", "2", "3", "4",], "correct_index": 1,}'
    parsed2, err2 = extract_and_repair_json(trailing)
    assert parsed2 is not None
    assert parsed2["question"] == "Valid?"

    # 3. Invalid json returns error
    invalid = "Not a json text"
    parsed3, err3 = extract_and_repair_json(invalid)
    assert parsed3 is None
    assert err3 == "invalid_json"


def test_question_pool_serving_and_refill():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    user = User(id="pool_user", name="Eve")
    db.add(user)

    # Add 2 ready questions to GeneratedQuestion
    q1 = GeneratedQuestion(
        id="q_pool_1",
        subject="Python",
        topic="Lists",
        difficulty="Beginner",
        question_hash=stem_hash("How to create a list in Python?"),
        stem="How to create a list in Python?",
        options='["[]", "{}", "()", "<>"]',
        correct_index=0,
        status="ready",
    )
    q2 = GeneratedQuestion(
        id="q_pool_2",
        subject="Python",
        topic="Lists",
        difficulty="Beginner",
        question_hash=stem_hash("How to append to a list in Python?"),
        stem="How to append to a list in Python?",
        options='["push", "append", "add", "insert"]',
        correct_index=1,
        status="ready",
    )
    db.add(q1)
    db.add(q2)
    db.commit()

    agent = PracticeAgent()

    # User Eve has not seen anything -> should get 2 pool questions
    served = agent.get_from_pool(db, "pool_user", "Python", "Lists", "Beginner", 2)
    assert len(served) == 2
    assert served[0].id in ("q_pool_1", "q_pool_2")
    assert served[0].source == "ai"

    # Mark q_pool_1 as seen by Eve
    db.add(
        UserSeenQuestion(
            user_id="pool_user",
            question_id="q_pool_1",
            question_hash=stem_hash("How to create a list in Python?"),
        )
    )
    db.commit()

    # Now Eve should only get q_pool_2
    served_after = agent.get_from_pool(db, "pool_user", "Python", "Lists", "Beginner", 2)
    assert len(served_after) == 1
    assert served_after[0].id == "q_pool_2"


def test_time_budget_fallback_when_llm_times_out():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    user = User(id="budget_user", name="Frank")
    db.add(user)
    db.commit()

    class TimingOutGateway:
        def chat(self, *args, **kwargs):
            raise Exception("Read timed out after 30 seconds")

    agent = PracticeAgent(gateway=TimingOutGateway())
    questions = agent.generate(
        {"subject": "Python", "topic": "Lists", "difficulty": "Beginner", "count": 3, "user_id": "budget_user"},
        db=db,
    )
    assert len(questions) == 3
    # All should be served gracefully from fallback bank
    assert all(q.source == "fallback" for q in questions)


