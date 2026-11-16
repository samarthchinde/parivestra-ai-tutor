"""Unit and integration tests for Parivestra AI Workbooks (Grades 3 to 10)."""
import json
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.models import (
    ActivityAttempt,
    GlossaryMastery,
    ProjectEntry,
    SafetyIncident,
    UnitProgress,
    User,
    WorkbookCertificate,
    WorkbookReflection,
)
from backend.rag.retriever import BM25Retriever
from backend.routes.workbook_router import (
    ActivityCheckRequest,
    CertificateIssueRequest,
    GlossaryMasteryRequest,
    ProjectSaveRequest,
    ReflectionRequest,
    SelfCheckRequest,
    check_activity,
    get_certificates,
    get_glossary,
    get_workbook,
    get_workbook_unit,
    issue_certificate,
    save_project_draft,
    self_check_unit,
    submit_project,
    submit_reflection,
    update_glossary_term,
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKBOOKS_DIR = os.path.join(BASE_DIR, "knowledge_base", "ai_workbooks")
ANSWERS_DIR = os.path.join(WORKBOOKS_DIR, "answers")


@pytest.fixture
def wb_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    user = User(
        id="test_wb_student",
        name="Test Explorer",
        display_name="Test Explorer",
        avatar="robot_pari",
        grade="Class 3",
        xp=0,
        streak=1,
    )
    db.add(user)
    db.commit()
    return db


def test_workbook_files_and_counts():
    """Verify all 8 workbooks, 64 units, 128 activities, and 192 terms."""
    total_units = 0
    total_activities = 0
    total_new_words = 0
    total_glossary = 0

    for g in range(3, 11):
        g_path = os.path.join(WORKBOOKS_DIR, f"grade{g}.json")
        assert os.path.exists(g_path), f"Grade {g} file missing"
        with open(g_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        assert data["grade"] == g
        assert len(data["units"]) == 8
        total_units += len(data["units"])

        for u in data["units"]:
            assert len(u["activities"]) == 2
            assert len(u["new_words"]) == 3
            total_activities += len(u["activities"])
            total_new_words += len(u["new_words"])

        assert len(data["glossary"]) == 24
        total_glossary += len(data["glossary"])

    assert total_units == 64
    assert total_activities == 128
    assert total_new_words == 192
    assert total_glossary == 192


def test_answer_keys_generated_with_needs_review():
    """Verify all 8 answer files exist and have needs_review=True."""
    total_answers = 0
    for g in range(3, 11):
        ans_path = os.path.join(ANSWERS_DIR, f"grade{g}.json")
        assert os.path.exists(ans_path), f"Answers file missing for grade {g}"
        with open(ans_path, "r", encoding="utf-8") as f:
            answers = json.load(f)
        assert len(answers) == 16  # 8 units * 2 activities = 16
        total_answers += len(answers)
        for a in answers:
            assert a.get("needs_review") is True

    assert total_answers == 128


def test_bm25_retriever_workbook_citations():
    """Verify retriever indexes all 64 units and returns structured citations."""
    retriever = BM25Retriever()
    wb_chunks = [c for c in retriever.chunks if c.metadata.get("type") == "ai_workbook"]
    assert len(wb_chunks) == 64

    # Query matching Grade 3 Unit 2
    results = retriever.retrieve("sensors help machines see, hear and feel", top_k=1, grade="3")
    assert len(results) > 0
    top_chunk, score = results[0]
    citation = top_chunk.metadata.get("citation")
    assert "Grade 3 · Unit 2 · How Machines Sense · p.6" in citation


def test_get_workbook_metadata(wb_db):
    user = wb_db.query(User).filter(User.id == "test_wb_student").first()
    data = get_workbook(grade=3, user=user, db=wb_db)
    assert data["grade"] == 3
    assert data["edition_title"] == "AI Explorers"
    assert len(data["units"]) == 8
    assert data["colors"]["primary"] == "#F97316"
    assert data["glossary_count"] == 24


def test_get_workbook_unit_no_leaked_answers(wb_db):
    user = wb_db.query(User).filter(User.id == "test_wb_student").first()
    res = get_workbook_unit(grade=3, n=1, user=user, db=wb_db)
    unit = res["unit"]
    assert unit["number"] == 1
    assert unit["title"] == "Smart or Not?"
    assert len(unit["activities"]) == 2

    # Verify no solutions or answers are exposed to student
    for act in unit["activities"]:
        assert "solution" not in act
        assert "expected_answers" not in act
        assert "rubric" not in act


def test_check_activity_auto_scoring_and_xp(wb_db):
    user = wb_db.query(User).filter(User.id == "test_wb_student").first()
    initial_xp = user.xp

    # Test correct answer on Grade 3 Unit 1 Activity 1
    req = ActivityCheckRequest(
        answer={
            "Voice assistant": True,
            "Face unlock on a phone": True,
            "Map app that finds the fastest road": True,
            "Robot vacuum cleaner": True,
            "Bicycle": False,
            "Ceiling fan": False,
            "Pencil sharpener": False,
            "Torch": False,
        }
    )
    res = check_activity(grade=3, id="g3_u1_a1", req=req, user=user, db=wb_db)
    assert res["is_correct"] is True
    assert res["score"] == 1.0
    assert res["xp_earned"] == 15
    assert user.xp == initial_xp + 15

    # Check attempt record in DB
    att = wb_db.query(ActivityAttempt).filter(ActivityAttempt.activity_id == "g3_u1_a1").first()
    assert att is not None
    assert att.is_correct is True


def test_self_check_and_reflection_safety(wb_db):
    user = wb_db.query(User).filter(User.id == "test_wb_student").first()

    # 1. Self check rating
    sc_res = self_check_unit(grade=3, req=SelfCheckRequest(unit_number=1, stars=3), user=user, db=wb_db)
    assert sc_res["success"] is True
    assert sc_res["stars"] == 3

    prog = wb_db.query(UnitProgress).filter(UnitProgress.unit_number == 1).first()
    assert prog.status == "completed"
    assert prog.stars == 3

    # 2. Reflection with clean text
    refl_res = submit_reflection(
        grade=3,
        req=ReflectionRequest(unit_number=1, reflection_text="Robots use sensors to notice things!"),
        user=user,
        db=wb_db,
    )
    assert refl_res["success"] is True
    assert len(refl_res["feedback"]) > 5

    # 3. Reflection with personal info (phone)
    pii_res = submit_reflection(
        grade=3,
        req=ReflectionRequest(unit_number=1, reflection_text="Call me at 9876543210 for my robot ideas"),
        user=user,
        db=wb_db,
    )
    assert pii_res["success"] is False
    assert pii_res["flagged"] is True
    assert "phone" in pii_res["feedback"].lower()

    # Verify safety incident was recorded
    incident = wb_db.query(SafetyIncident).filter(SafetyIncident.user_id == user.id).first()
    assert incident is not None
    assert incident.flag_type == "personal_info"


def test_project_draft_and_submission(wb_db):
    user = wb_db.query(User).filter(User.id == "test_wb_student").first()

    # Save draft
    fields = {
        "robot_name": "HelperBot 3000",
        "job_description": "Helps water plants on the balcony",
        "sensors": "Soil moisture sensor and camera",
    }
    save_res = save_project_draft(grade=3, req=ProjectSaveRequest(fields=fields), user=user, db=wb_db)
    assert save_res["status"] == "saved"

    entry = wb_db.query(ProjectEntry).filter(ProjectEntry.grade == 3).first()
    assert entry.status == "draft"

    # Submit project
    sub_res = submit_project(grade=3, req=ProjectSaveRequest(fields=fields), user=user, db=wb_db)
    assert sub_res["status"] == "submitted"
    assert sub_res["xp_earned"] == 50
    wb_db.refresh(entry)
    assert entry.status == "submitted"


def test_glossary_mastery_and_certificate(wb_db):
    user = wb_db.query(User).filter(User.id == "test_wb_student").first()

    # Master a glossary term
    up_res = update_glossary_term(
        req=GlossaryMasteryRequest(grade=3, term="Algorithm", mastered=True),
        user=user,
        db=wb_db,
    )
    assert up_res["mastered"] is True
    assert up_res["xp_earned"] == 5

    gl = get_glossary(grade=3, user=user, db=wb_db)
    assert gl["mastered_count"] == 1
    algo_term = next(t for t in gl["terms"] if t["term"] == "Algorithm")
    assert algo_term["mastered"] is True

    # Issue Certificate
    cert_res = issue_certificate(
        req=CertificateIssueRequest(grade=3, student_name="Aarav Sharma", school_name="Parivestra Academy"),
        user=user,
        db=wb_db,
    )
    assert "CERT-G3-" in cert_res["id"]
    assert cert_res["student_name"] == "Aarav Sharma"
    assert cert_res["xp_earned"] == 100

    certs = get_certificates(grade=3, user=user, db=wb_db)
    assert len(certs) == 1
    assert certs[0]["student_name"] == "Aarav Sharma"
