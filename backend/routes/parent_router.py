"""FastAPI Router for Parivestra Read-Only Parent Portal.
STRICT PRIVACY: Parents can only access data for linked children, and NEVER have access to chat logs.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models import (
    User,
    ParentChildLink,
    ParentLinkCode,
    Attempt,
    Mastery,
    UnitProgress,
    WorkbookCertificate,
    LessonProgress,
    VideoWatch,
)
from backend.routes.auth_router import get_current_auth, require_role, log_audit, utc_now

logger = logging.getLogger("backend.routes.parent")

router = APIRouter(prefix="/api/parent", tags=["parent"])


# ----------------------------------------------------
# Pydantic Schemas
# ----------------------------------------------------
class LinkChildRequest(BaseModel):
    child_username: str = Field(..., min_length=2)
    link_code: str = Field(..., min_length=4)


# ----------------------------------------------------
# Helper to enforce parent-child access boundary
# ----------------------------------------------------
def verify_parent_access(parent_id: str, child_id: str, db: Session) -> User:
    """Verifies that parent is linked to the child. Raises 403 if unlinked or forbidden."""
    link = (
        db.query(ParentChildLink)
        .filter(
            ParentChildLink.parent_id == parent_id,
            ParentChildLink.child_id == child_id,
        )
        .first()
    )
    if not link:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not authorized to view this student's data.",
        )

    child = db.query(User).filter(User.id == child_id, User.role == "student").first()
    if not child:
        raise HTTPException(status_code=404, detail="Student not found.")
    return child


# ----------------------------------------------------
# Endpoints
# ----------------------------------------------------
@router.post("/link-child")
def link_child(
    payload: LinkChildRequest,
    auth: Tuple[User, Any] = Depends(require_role(["parent"])),
    db: Session = Depends(get_db),
):
    """Link a student account to the authenticated parent using a single-use 7-day teacher code."""
    parent, _ = auth
    now = utc_now()
    code_clean = payload.link_code.strip().upper()

    link_record = db.query(ParentLinkCode).filter(ParentLinkCode.code == code_clean).first()
    if not link_record:
        raise HTTPException(status_code=400, detail="Invalid parent link code.")

    if link_record.used:
        raise HTTPException(status_code=400, detail="This link code has already been used.")

    expires_at = link_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if now > expires_at:
        raise HTTPException(status_code=400, detail="This link code has expired. Please ask the teacher for a fresh code.")

    child = db.query(User).filter(User.username.ilike(payload.child_username.strip())).first()
    if not child or child.id != link_record.student_id:
        raise HTTPException(
            status_code=400,
            detail="Child username does not match the student associated with this link code.",
        )

    # Check if already linked
    existing = (
        db.query(ParentChildLink)
        .filter(
            ParentChildLink.parent_id == parent.id,
            ParentChildLink.child_id == child.id,
        )
        .first()
    )
    if not existing:
        new_link = ParentChildLink(parent_id=parent.id, child_id=child.id)
        db.add(new_link)

    link_record.used = True
    link_record.used_by_parent_id = parent.id
    db.commit()

    log_audit(db, "parent_child_linked", f"Parent {parent.id} linked child {child.username}", user_id=parent.id)

    return {
        "status": "ok",
        "message": f"Successfully linked {child.display_name or child.username}!",
        "child": {
            "id": child.id,
            "username": child.username,
            "display_name": child.display_name or child.name,
            "grade": child.grade,
            "avatar": child.avatar,
        },
    }


@router.get("/children")
def list_linked_children(
    auth: Tuple[User, Any] = Depends(require_role(["parent"])),
    db: Session = Depends(get_db),
):
    """Retrieve all students linked to the current parent account."""
    parent, _ = auth
    links = db.query(ParentChildLink).filter(ParentChildLink.parent_id == parent.id).all()
    child_ids = [l.child_id for l in links]

    children = db.query(User).filter(User.id.in_(child_ids)).all() if child_ids else []

    return {
        "status": "ok",
        "children": [
            {
                "id": c.id,
                "username": c.username or c.id,
                "display_name": c.display_name or c.name,
                "grade": c.grade or "Class 3",
                "avatar": c.avatar or "owl",
                "xp": c.xp or 0,
                "streak": c.streak or 1,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in children
        ],
    }


@router.get("/children/{child_id}/report-card")
def get_child_report_card(
    child_id: str,
    auth: Tuple[User, Any] = Depends(require_role(["parent"])),
    db: Session = Depends(get_db),
):
    """Read-only student report card for linked parent.
    STRICT PRIVACY: Enforces parent-child link. Zero chat logs returned.
    """
    parent, _ = auth
    child = verify_parent_access(parent.id, child_id, db)

    # 1. Practice statistics
    attempts = db.query(Attempt).filter(Attempt.user_id == child.id).all()
    total_attempts = len(attempts)
    correct_attempts = sum(1 for a in attempts if (a.score or 0) >= 0.7)
    accuracy = round((correct_attempts / total_attempts) * 100) if total_attempts > 0 else 0

    # Accuracy by subject
    subject_stats = {}
    for a in attempts:
        subj = a.subject or "General"
        if subj not in subject_stats:
            subject_stats[subj] = {"total": 0, "correct": 0}
        subject_stats[subj]["total"] += 1
        if (a.score or 0) >= 0.7:
            subject_stats[subj]["correct"] += 1

    subject_breakdown = [
        {
            "subject": subj,
            "total": s["total"],
            "correct": s["correct"],
            "accuracy": round((s["correct"] / s["total"]) * 100) if s["total"] > 0 else 0,
        }
        for subj, s in subject_stats.items()
    ]

    # 2. Mastery count
    masteries = db.query(Mastery).filter(Mastery.user_id == child.id).all()
    mastered_count = sum(1 for m in masteries if (m.mastery_level or 0) >= 0.8)

    # 3. Workbook progress
    unit_progs = (
        db.query(UnitProgress)
        .filter(
            UnitProgress.user_id == child.id,
            (UnitProgress.status == "completed") | (UnitProgress.completed_at.isnot(None)),
        )
        .all()
    )
    units_completed = len(unit_progs)

    # 4. Certificates
    certs = db.query(WorkbookCertificate).filter(WorkbookCertificate.user_id == child.id).all()
    certificates_data = [
        {
            "id": c.id,
            "grade": c.grade,
            "student_name": c.student_name,
            "issued_at": c.issued_at.isoformat() if c.issued_at else None,
        }
        for c in certs
    ]

    # 5. Weekly Activity Summary (past 7 days)
    seven_days_ago = utc_now() - timedelta(days=7)
    recent_attempts = sum(
        1 for a in attempts if a.created_at and (
            a.created_at.replace(tzinfo=timezone.utc) if a.created_at.tzinfo is None else a.created_at
        ) > seven_days_ago
    )

    return {
        "status": "ok",
        "student": {
            "id": child.id,
            "username": child.username,
            "display_name": child.display_name or child.name,
            "grade": child.grade,
            "avatar": child.avatar,
            "xp": child.xp or 0,
            "streak": child.streak or 1,
            "last_login_at": child.last_login_at.isoformat() if child.last_login_at else None,
        },
        "weekly_summary": {
            "recent_activities": recent_attempts,
            "streak_days": child.streak or 1,
            "total_xp": child.xp or 0,
        },
        "practice": {
            "total_questions": total_attempts,
            "correct_answers": correct_attempts,
            "accuracy_percent": accuracy,
            "subjects": subject_breakdown,
        },
        "workbook": {
            "units_completed": units_completed,
            "total_units": 8,
            "percent": round((units_completed / 8) * 100),
            "certificates": certificates_data,
        },
        "mastery": {
            "concepts_mastered": mastered_count,
        },
    }


@router.get("/children/{child_id}/progress")
def get_child_progress(
    child_id: str,
    auth: Tuple[User, Any] = Depends(require_role(["parent"])),
    db: Session = Depends(get_db),
):
    """Detailed completion metrics for courses, lessons, and workbooks."""
    parent, _ = auth
    child = verify_parent_access(parent.id, child_id, db)

    units = db.query(UnitProgress).filter(UnitProgress.user_id == child.id).all()
    lessons = db.query(LessonProgress).filter(LessonProgress.user_id == child.id).all()
    videos = db.query(VideoWatch).filter(VideoWatch.user_id == child.id).all()

    return {
        "status": "ok",
        "child_id": child.id,
        "workbook_units": [
            {
                "grade": u.grade,
                "unit_number": u.unit_number,
                "completed": (u.status == "completed") or (u.completed_at is not None),
                "status": u.status,
                "stars": u.stars or 0,
                "completed_at": u.completed_at.isoformat() if u.completed_at else None,
            }
            for u in units
        ],
        "lessons_completed": sum(1 for l in lessons if l.completed),
        "videos_watched": len(videos),
    }
