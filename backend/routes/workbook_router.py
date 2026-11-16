"""FastAPI Router for Parivestra AI Workbooks (Grades 3 to 10).
Handles workbook metadata, unit learning, server-side activity checking (hidden answers),
reflection & self-checks with personal info guard, project capstone submissions,
glossary mastery, and certificate issuance.
"""
import json
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.database import get_db
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
from backend.llm.gateway import LLMGateway

logger = logging.getLogger("backend.workbook_router")

router = APIRouter(prefix="/api", tags=["AI Workbooks"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WORKBOOKS_DIR = os.path.join(BASE_DIR, "knowledge_base", "ai_workbooks")
ANSWERS_DIR = os.path.join(WORKBOOKS_DIR, "answers")


def utc_now():
    return datetime.now(timezone.utc)


def get_current_user_local(request: Request, db: Session = Depends(get_db)) -> User:
    """Helper to get or create student user."""
    user_id = request.headers.get("X-User-ID", "student_default")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = User(
            id=user_id,
            name="Kid Explorer",
            display_name="Kid Explorer",
            avatar="robot_pari",
            grade="Class 3",
            xp=0,
            streak=1,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def load_grade_data(grade: int) -> Dict[str, Any]:
    file_path = os.path.join(WORKBOOKS_DIR, f"grade{grade}.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Workbook for Grade {grade} not found")
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_grade_answers(grade: int) -> List[Dict[str, Any]]:
    file_path = os.path.join(ANSWERS_DIR, f"grade{grade}.json")
    if not os.path.exists(file_path):
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def check_personal_info_guard(text: str) -> Optional[str]:
    """Examines student input for phone, email, or physical address.
    Returns warning message if detected, or None if clean."""
    if not text:
        return None
    phone_pattern = r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{10}\b"
    email_pattern = r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
    address_pattern = r"\b(?:road|street|apt|apartment|sector|house no|pin code|pincode)\b"

    if re.search(phone_pattern, text):
        return "Personal info notice: Please do not enter phone numbers. Keep your private details safe!"
    if re.search(email_pattern, text):
        return "Personal info notice: Please do not enter email addresses. Keep your private details safe!"
    if re.search(address_pattern, text, re.IGNORECASE):
        return "Personal info notice: Please keep street addresses private."
    return None


# ---------------------------------------------------------
# Request Models
# ---------------------------------------------------------
class ActivityCheckRequest(BaseModel):
    answer: Any


class SelfCheckRequest(BaseModel):
    unit_number: int
    stars: int = Field(default=3, ge=1, le=3)


class ReflectionRequest(BaseModel):
    unit_number: int
    reflection_text: str


class ProjectSaveRequest(BaseModel):
    fields: Dict[str, Any]


class GlossaryMasteryRequest(BaseModel):
    grade: int
    term: str
    mastered: bool


class CertificateIssueRequest(BaseModel):
    grade: int
    student_name: str
    school_name: Optional[str] = "Parivestra School"
    teacher_name: Optional[str] = "Teacher"


# ---------------------------------------------------------
# 1. GET /api/workbook/{grade}
# ---------------------------------------------------------
@router.get("/workbook/{grade}")
def get_workbook(
    grade: int,
    user: User = Depends(get_current_user_local),
    db: Session = Depends(get_db),
):
    """Returns full workbook metadata, syllabus, units summary, and user progress."""
    wb = load_grade_data(grade)

    # Fetch user unit progress
    unit_prog = db.query(UnitProgress).filter(
        UnitProgress.user_id == user.id,
        UnitProgress.grade == grade,
    ).all()
    prog_map = {p.unit_number: p for p in unit_prog}

    # Fetch user glossary mastery count
    glossary_mastered_count = db.query(GlossaryMastery).filter(
        GlossaryMastery.user_id == user.id,
        GlossaryMastery.grade == grade,
        GlossaryMastery.mastered == True,
    ).count()

    # Fetch user certificate if exists
    cert = db.query(WorkbookCertificate).filter(
        WorkbookCertificate.user_id == user.id,
        WorkbookCertificate.grade == grade,
    ).first()

    # Augment units with progress
    augmented_units = []
    for u in wb.get("units", []):
        u_num = u.get("number")
        up = prog_map.get(u_num)
        augmented_units.append({
            "number": u_num,
            "title": u.get("title"),
            "big_idea": u.get("big_idea"),
            "page": u.get("page"),
            "self_check": u.get("self_check"),
            "activities_count": len(u.get("activities", [])),
            "status": up.status if up else "not_started",
            "stars": up.stars if up else 0,
            "completed_at": up.completed_at.isoformat() if up and up.completed_at else None,
        })

    return {
        "grade": grade,
        "edition_title": wb.get("edition_title"),
        "tagline": wb.get("tagline"),
        "colors": wb.get("colors"),
        "band": wb.get("band"),
        "welcome": wb.get("welcome"),
        "syllabus": wb.get("syllabus"),
        "units": augmented_units,
        "final_project": wb.get("final_project"),
        "glossary_count": len(wb.get("glossary", [])),
        "glossary_mastered_count": glossary_mastered_count,
        "certificate_issued": cert is not None,
        "certificate_id": cert.id if cert else None,
        "user": {
            "id": user.id,
            "display_name": user.display_name,
            "xp": user.xp,
            "streak": user.streak,
        },
    }


# ---------------------------------------------------------
# 2. GET /api/workbook/{grade}/units/{n}
# ---------------------------------------------------------
@router.get("/workbook/{grade}/units/{n}")
def get_workbook_unit(
    grade: int,
    n: int,
    user: User = Depends(get_current_user_local),
    db: Session = Depends(get_db),
):
    """Returns unit details, verbatim learn paragraphs, 3 new words, did you know,
    think & talk, and activities (without answer keys!)."""
    wb = load_grade_data(grade)
    matching_unit = None
    for u in wb.get("units", []):
        if u.get("number") == n:
            matching_unit = u
            break

    if not matching_unit:
        raise HTTPException(status_code=404, detail=f"Unit {n} for Grade {grade} not found")

    # Fetch user progress for this unit
    prog = db.query(UnitProgress).filter(
        UnitProgress.user_id == user.id,
        UnitProgress.grade == grade,
        UnitProgress.unit_number == n,
    ).first()

    # Fetch attempts on this unit's activities
    attempts = db.query(ActivityAttempt).filter(
        ActivityAttempt.user_id == user.id,
        ActivityAttempt.grade == grade,
        ActivityAttempt.unit_number == n,
    ).all()
    attempt_map = {}
    for a in attempts:
        attempt_map[a.activity_id] = {
            "is_correct": a.is_correct,
            "score": a.score,
            "feedback": a.feedback,
            "created_at": a.created_at.isoformat(),
        }

    # Fetch user reflection
    reflection = db.query(WorkbookReflection).filter(
        WorkbookReflection.user_id == user.id,
        WorkbookReflection.grade == grade,
        WorkbookReflection.unit_number == n,
        WorkbookReflection.type == "think_and_talk",
    ).first()

    # Clean activities (never leak solutions)
    safe_activities = []
    for act in matching_unit.get("activities", []):
        act_id = act.get("id")
        user_att = attempt_map.get(act_id)
        safe_activities.append({
            "id": act_id,
            "number": act.get("number"),
            "title": act.get("title"),
            "instruction": act.get("instruction"),
            "type": act.get("type"),
            "component": act.get("component"),
            "auto_checkable": act.get("auto_checkable"),
            "payload": act.get("payload", {}),
            "completed": user_att.get("is_correct", False) if user_att else False,
            "last_feedback": user_att.get("feedback") if user_att else None,
        })

    return {
        "grade": grade,
        "edition_title": wb.get("edition_title"),
        "colors": wb.get("colors"),
        "unit": {
            "id": matching_unit.get("id"),
            "number": matching_unit.get("number"),
            "title": matching_unit.get("title"),
            "big_idea": matching_unit.get("big_idea"),
            "page": matching_unit.get("page"),
            "learn_paragraphs": matching_unit.get("learn_paragraphs"),
            "new_words": matching_unit.get("new_words"),
            "did_you_know": matching_unit.get("did_you_know"),
            "think_and_talk": matching_unit.get("think_and_talk"),
            "self_check": matching_unit.get("self_check"),
            "activities": safe_activities,
            "user_progress": {
                "status": prog.status if prog else "not_started",
                "stars": prog.stars if prog else 0,
                "completed_at": prog.completed_at.isoformat() if prog and prog.completed_at else None,
                "reflection_text": reflection.reflection_text if reflection else None,
                "reflection_feedback": reflection.feedback if reflection else None,
            },
        },
    }


# ---------------------------------------------------------
# 3. POST /api/workbook/{grade}/activities/{id}/check
# ---------------------------------------------------------
@router.post("/workbook/{grade}/activities/{id}/check")
def check_activity(
    grade: int,
    id: str,
    req: ActivityCheckRequest,
    user: User = Depends(get_current_user_local),
    db: Session = Depends(get_db),
):
    """Server-side validation of activity answers. Compares against answer keys
    without ever exposing keys to the client before answer submission."""
    answers = load_grade_answers(grade)
    target_ans = None
    for a in answers:
        if a.get("activity_id") == id:
            target_ans = a
            break

    # Parse grade, unit, act_num from id e.g. "g3_u1_a1"
    parts = id.split("_")
    unit_num = int(parts[1][1:]) if len(parts) >= 2 else 1
    act_num = int(parts[2][1:]) if len(parts) >= 3 else 1

    is_correct = False
    score = 0.0
    feedback = "Good try! Keep exploring!"
    explanation = None
    xp_to_award = 0

    user_ans = req.answer

    if target_ans and target_ans.get("auto_checkable"):
        solution = target_ans.get("solution")
        explanation = target_ans.get("explanation")

        if isinstance(solution, dict) and isinstance(user_ans, dict):
            # Check dictionary match (e.g. tick table, match pairs)
            total_items = len(solution)
            correct_items = 0
            for k, expected_v in solution.items():
                actual_v = user_ans.get(k)
                if isinstance(expected_v, bool):
                    if actual_v == expected_v:
                        correct_items += 1
                elif isinstance(expected_v, str):
                    if actual_v and str(actual_v).strip().lower() == expected_v.strip().lower():
                        correct_items += 1
                elif isinstance(expected_v, list):
                    if actual_v and sorted([str(x).strip().lower() for x in actual_v]) == sorted([str(x).strip().lower() for x in expected_v]):
                        correct_items += 1

            if total_items > 0:
                score = round(correct_items / total_items, 2)
                is_correct = bool(score >= 0.75)
            else:
                is_correct = True
                score = 1.0

        elif isinstance(solution, list) and isinstance(user_ans, list):
            # Ordered steps or token list
            if [str(x).strip().lower() for x in user_ans] == [str(x).strip().lower() for x in solution]:
                is_correct = True
                score = 1.0
            else:
                is_correct = False
                score = 0.5
        else:
            # Fallback comparison
            is_correct = True
            score = 1.0

        if is_correct:
            feedback = "✨ Brilliant work! You got it right!"
            xp_to_award = 15
        else:
            feedback = "Almost there! Take another look at the clues and give it another try."
            xp_to_award = 5
    else:
        # Rubric / drawing / reflection activity
        is_correct = True
        score = 1.0
        feedback = "Great work! Your work has been saved for teacher review."
        xp_to_award = 15

    # Record ActivityAttempt
    attempt = ActivityAttempt(
        user_id=user.id,
        activity_id=id,
        grade=grade,
        unit_number=unit_num,
        activity_number=act_num,
        answer_json=json.dumps(user_ans if user_ans is not None else {}),
        is_correct=is_correct,
        score=score,
        feedback=feedback,
        needs_review=not (target_ans and target_ans.get("auto_checkable")),
    )
    db.add(attempt)

    # Award user XP
    user.xp = (user.xp or 0) + xp_to_award

    # Update UnitProgress
    prog = db.query(UnitProgress).filter(
        UnitProgress.user_id == user.id,
        UnitProgress.grade == grade,
        UnitProgress.unit_number == unit_num,
    ).first()
    if not prog:
        prog = UnitProgress(
            user_id=user.id,
            grade=grade,
            unit_number=unit_num,
            status="in_progress",
            xp_earned=xp_to_award,
        )
        db.add(prog)
    else:
        prog.status = "in_progress"
        prog.xp_earned = (prog.xp_earned or 0) + xp_to_award

    db.commit()
    db.refresh(user)

    return {
        "activity_id": id,
        "is_correct": is_correct,
        "score": score,
        "feedback": feedback,
        "explanation": explanation if is_correct else None,
        "xp_earned": xp_to_award,
        "user_xp": user.xp,
    }


# ---------------------------------------------------------
# 4. POST /api/workbook/{grade}/self-check
# ---------------------------------------------------------
@router.post("/workbook/{grade}/self-check")
def self_check_unit(
    grade: int,
    req: SelfCheckRequest,
    user: User = Depends(get_current_user_local),
    db: Session = Depends(get_db),
):
    """Saves 'I can' 1-3 star self check, updates unit completion and feeds Big Ideas."""
    prog = db.query(UnitProgress).filter(
        UnitProgress.user_id == user.id,
        UnitProgress.grade == grade,
        UnitProgress.unit_number == req.unit_number,
    ).first()

    xp_awarded = 15
    if not prog:
        prog = UnitProgress(
            user_id=user.id,
            grade=grade,
            unit_number=req.unit_number,
            status="completed",
            stars=req.stars,
            xp_earned=xp_awarded,
            completed_at=utc_now(),
        )
        db.add(prog)
    else:
        prog.stars = req.stars
        prog.status = "completed"
        prog.completed_at = utc_now()
        prog.xp_earned = (prog.xp_earned or 0) + xp_awarded

    # Record reflection record
    refl = WorkbookReflection(
        user_id=user.id,
        grade=grade,
        unit_number=req.unit_number,
        type="self_check",
        stars=req.stars,
        reflection_text=f"Rated {req.stars} stars on learning objective.",
    )
    db.add(refl)

    user.xp = (user.xp or 0) + xp_awarded
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "grade": grade,
        "unit_number": req.unit_number,
        "stars": req.stars,
        "status": "completed",
        "xp_earned": xp_awarded,
        "user_xp": user.xp,
    }


# ---------------------------------------------------------
# 5. POST /api/workbook/{grade}/reflection
# ---------------------------------------------------------
@router.post("/workbook/{grade}/reflection")
def submit_reflection(
    grade: int,
    req: ReflectionRequest,
    user: User = Depends(get_current_user_local),
    db: Session = Depends(get_db),
):
    """Think & Talk reflection submission with personal-info guard and encouraging feedback."""
    text = req.reflection_text.strip()
    
    # Check personal info guard
    pii_warning = check_personal_info_guard(text)
    if pii_warning:
        # Log incident without storing raw text
        incident = SafetyIncident(
            user_id=user.id,
            flag_type="personal_info",
        )
        db.add(incident)
        db.commit()
        return {
            "success": False,
            "flagged": True,
            "feedback": pii_warning,
            "xp_earned": 0,
            "user_xp": user.xp,
        }

    # Generate warm, grounded feedback
    feedback = "Wonderful thought! Sharing your ideas helps you think deeply about AI."
    try:
        import httpx
        gw = LLMGateway()
        # Quick non-blocking probe to avoid delay when LLM is offline
        probe = httpx.get(f"{gw.base_url}/models", timeout=0.5)
        if probe.status_code == 200:
            prompt = (
                f"You are Pari, a warm and encouraging robot buddy for children in Grade {grade}. "
                f"The child wrote this reflection for Unit {req.unit_number}: '{text}'. "
                "Write 2 cheerful, supportive sentences praising their thinking and asking one gentle follow-up question."
            )
            llm_res = gw.chat([{"role": "user", "content": prompt}], max_tokens=80)
            if llm_res and len(llm_res.strip()) > 10:
                feedback = llm_res.strip()
    except Exception as e:
        logger.debug(f"LLM reflection fallback active: {e}")

    # Save reflection
    refl = db.query(WorkbookReflection).filter(
        WorkbookReflection.user_id == user.id,
        WorkbookReflection.grade == grade,
        WorkbookReflection.unit_number == req.unit_number,
        WorkbookReflection.type == "think_and_talk",
    ).first()

    if not refl:
        refl = WorkbookReflection(
            user_id=user.id,
            grade=grade,
            unit_number=req.unit_number,
            type="think_and_talk",
            reflection_text=text,
            feedback=feedback,
        )
        db.add(refl)
    else:
        refl.reflection_text = text
        refl.feedback = feedback

    xp_awarded = 10
    user.xp = (user.xp or 0) + xp_awarded
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "feedback": feedback,
        "xp_earned": xp_awarded,
        "user_xp": user.xp,
    }


# ---------------------------------------------------------
# 6. Final Project Endpoints
# ---------------------------------------------------------
@router.get("/workbook/{grade}/project")
def get_project(
    grade: int,
    user: User = Depends(get_current_user_local),
    db: Session = Depends(get_db),
):
    """Fetches the student's project draft."""
    wb = load_grade_data(grade)
    template = wb.get("final_project", {})

    entry = db.query(ProjectEntry).filter(
        ProjectEntry.user_id == user.id,
        ProjectEntry.grade == grade,
    ).first()

    fields_data = json.loads(entry.fields_json) if entry and entry.fields_json else {}

    return {
        "grade": grade,
        "title": template.get("title", f"Grade {grade} Project"),
        "template": template,
        "status": entry.status if entry else "not_started",
        "fields": fields_data,
        "feedback": entry.feedback if entry else None,
        "score": entry.score if entry else 0,
        "submitted_at": entry.submitted_at.isoformat() if entry and entry.submitted_at else None,
    }


@router.put("/workbook/{grade}/project")
def save_project_draft(
    grade: int,
    req: ProjectSaveRequest,
    user: User = Depends(get_current_user_local),
    db: Session = Depends(get_db),
):
    """Saves student project draft."""
    wb = load_grade_data(grade)
    title = wb.get("final_project", {}).get("title", f"Grade {grade} Project")

    # Personal info check across text values
    for k, v in req.fields.items():
        if isinstance(v, str):
            warn = check_personal_info_guard(v)
            if warn:
                raise HTTPException(status_code=400, detail=warn)

    entry = db.query(ProjectEntry).filter(
        ProjectEntry.user_id == user.id,
        ProjectEntry.grade == grade,
    ).first()

    if not entry:
        entry = ProjectEntry(
            user_id=user.id,
            grade=grade,
            project_title=title,
            fields_json=json.dumps(req.fields),
            status="draft",
        )
        db.add(entry)
    else:
        entry.fields_json = json.dumps(req.fields)
        if entry.status == "not_started":
            entry.status = "draft"

    db.commit()
    return {"status": "saved", "message": "Project draft saved!"}


@router.post("/workbook/{grade}/project/submit")
def submit_project(
    grade: int,
    req: ProjectSaveRequest,
    user: User = Depends(get_current_user_local),
    db: Session = Depends(get_db),
):
    """Submits student project for teacher review."""
    wb = load_grade_data(grade)
    title = wb.get("final_project", {}).get("title", f"Grade {grade} Project")

    for k, v in req.fields.items():
        if isinstance(v, str):
            warn = check_personal_info_guard(v)
            if warn:
                raise HTTPException(status_code=400, detail=warn)

    entry = db.query(ProjectEntry).filter(
        ProjectEntry.user_id == user.id,
        ProjectEntry.grade == grade,
    ).first()

    if not entry:
        entry = ProjectEntry(
            user_id=user.id,
            grade=grade,
            project_title=title,
            fields_json=json.dumps(req.fields),
            status="submitted",
            submitted_at=utc_now(),
        )
        db.add(entry)
    else:
        entry.fields_json = json.dumps(req.fields)
        entry.status = "submitted"
        entry.submitted_at = utc_now()

    xp_awarded = 50
    user.xp = (user.xp or 0) + xp_awarded
    db.commit()
    db.refresh(user)

    return {
        "status": "submitted",
        "message": "Project submitted to teacher review queue!",
        "xp_earned": xp_awarded,
        "user_xp": user.xp,
    }


# ---------------------------------------------------------
# 7. Glossary Endpoints
# ---------------------------------------------------------
@router.get("/glossary")
def get_glossary(
    grade: Optional[int] = Query(None),
    user: User = Depends(get_current_user_local),
    db: Session = Depends(get_db),
):
    """Returns glossary terms for grade with user mastery flag."""
    target_grade = grade or 3
    wb = load_grade_data(target_grade)
    terms = wb.get("glossary", [])

    # Query masteries
    masteries = db.query(GlossaryMastery).filter(
        GlossaryMastery.user_id == user.id,
        GlossaryMastery.grade == target_grade,
    ).all()
    mastered_set = {m.term for m in masteries if m.mastered}

    augmented = []
    for t in terms:
        term_str = t.get("term")
        augmented.append({
            "term": term_str,
            "definition": t.get("definition"),
            "mastered": term_str in mastered_set,
        })

    return {
        "grade": target_grade,
        "total": len(augmented),
        "mastered_count": len(mastered_set),
        "terms": augmented,
    }


@router.patch("/glossary")
def update_glossary_term(
    req: GlossaryMasteryRequest,
    user: User = Depends(get_current_user_local),
    db: Session = Depends(get_db),
):
    """Toggles mastery flag for a glossary term."""
    mastery = db.query(GlossaryMastery).filter(
        GlossaryMastery.user_id == user.id,
        GlossaryMastery.grade == req.grade,
        GlossaryMastery.term == req.term,
    ).first()

    xp_awarded = 0
    if not mastery:
        mastery = GlossaryMastery(
            user_id=user.id,
            grade=req.grade,
            term=req.term,
            mastered=req.mastered,
        )
        db.add(mastery)
        if req.mastered:
            xp_awarded = 5
    else:
        if req.mastered and not mastery.mastered:
            xp_awarded = 5
        mastery.mastered = req.mastered

    if xp_awarded > 0:
        user.xp = (user.xp or 0) + xp_awarded

    db.commit()
    db.refresh(user)

    return {
        "status": "updated",
        "term": req.term,
        "mastered": req.mastered,
        "xp_earned": xp_awarded,
        "user_xp": user.xp,
    }


# ---------------------------------------------------------
# 8. Certificate Endpoints
# ---------------------------------------------------------
@router.get("/certificates")
def get_certificates(
    grade: Optional[int] = Query(None),
    user: User = Depends(get_current_user_local),
    db: Session = Depends(get_db),
):
    """Fetches issued certificates for user."""
    query = db.query(WorkbookCertificate).filter(WorkbookCertificate.user_id == user.id)
    if grade:
        query = query.filter(WorkbookCertificate.grade == grade)
    certs = query.all()

    return [
        {
            "id": c.id,
            "grade": c.grade,
            "student_name": c.student_name,
            "teacher_name": c.teacher_name,
            "school_name": c.school_name,
            "issued_at": c.issued_at.isoformat(),
        }
        for c in certs
    ]


@router.post("/certificates")
def issue_certificate(
    req: CertificateIssueRequest,
    user: User = Depends(get_current_user_local),
    db: Session = Depends(get_db),
):
    """Issues certificate of completion upon workbook completion."""
    cert_id = f"CERT-G{req.grade}-{uuid.uuid4().hex[:8].upper()}"

    cert = WorkbookCertificate(
        id=cert_id,
        user_id=user.id,
        grade=req.grade,
        student_name=req.student_name.strip(),
        teacher_name=req.teacher_name or "Teacher",
        school_name=req.school_name or "Parivestra School",
    )
    db.add(cert)

    xp_awarded = 100
    user.xp = (user.xp or 0) + xp_awarded

    db.commit()
    db.refresh(user)

    return {
        "id": cert.id,
        "grade": cert.grade,
        "student_name": cert.student_name,
        "teacher_name": cert.teacher_name,
        "school_name": cert.school_name,
        "issued_at": cert.issued_at.isoformat(),
        "xp_earned": xp_awarded,
        "user_xp": user.xp,
    }
