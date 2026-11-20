"""FastAPI Router for Teacher Administration: Parent Link Codes, Settings, and Unassigned Students."""
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend import config
from backend.database import get_db
from backend.models import User, Class, ParentLinkCode, SystemSetting
from backend.routes.auth_router import get_current_auth, require_role, log_audit, utc_now

logger = logging.getLogger("backend.routes.teacher")

router = APIRouter(prefix="/api/teacher", tags=["teacher"])


class CreateLinkCodeRequest(BaseModel):
    student_id: str = Field(..., description="Student user ID to generate code for")


class UpdateSettingsRequest(BaseModel):
    allow_self_signup: Optional[bool] = None
    require_class_code: Optional[bool] = None


@router.post("/link-codes")
def create_link_code(
    payload: CreateLinkCodeRequest,
    auth: Tuple[User, Any] = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db),
):
    """Generate a single-use 7-day link code for a student so their parent can link to them."""
    teacher, _ = auth
    student = db.query(User).filter(User.id == payload.student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    now = utc_now()
    expires_at = now + timedelta(days=7)
    code = f"LINK-{uuid.uuid4().hex[:6].upper()}"

    link_record = ParentLinkCode(
        code=code,
        student_id=student.id,
        teacher_id=teacher.id,
        expires_at=expires_at,
        used=False,
    )
    db.add(link_record)
    db.commit()

    log_audit(db, "parent_link_code_created", f"Created link code {code} for student {student.username}", user_id=teacher.id)

    return {
        "status": "ok",
        "code": code,
        "student_id": student.id,
        "student_username": student.username,
        "student_name": student.display_name or student.name,
        "expires_at": expires_at.isoformat(),
    }


@router.get("/link-codes")
def list_link_codes(
    auth: Tuple[User, Any] = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db),
):
    """List parent link codes created by this teacher."""
    teacher, _ = auth
    codes = db.query(ParentLinkCode).filter(ParentLinkCode.teacher_id == teacher.id).order_by(ParentLinkCode.created_at.desc()).all()

    now = utc_now()
    results = []
    for c in codes:
        exp = c.expires_at.replace(tzinfo=timezone.utc) if c.expires_at.tzinfo is None else c.expires_at
        is_expired = now > exp
        student = db.query(User).filter(User.id == c.student_id).first()
        results.append({
            "id": c.id,
            "code": c.code,
            "student_id": c.student_id,
            "student_username": student.username if student else "Unknown",
            "student_name": (student.display_name or student.name) if student else "Unknown",
            "used": c.used,
            "is_expired": is_expired,
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })

    return {"status": "ok", "codes": results}


@router.get("/unassigned-students")
def list_unassigned_students(
    auth: Tuple[User, Any] = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db),
):
    """Retrieve students who self-registered without a class code and need assignment."""
    students = (
        db.query(User)
        .filter(User.role == "student", User.class_id.is_(None), User.active == True)
        .order_by(User.created_at.desc())
        .all()
    )

    return {
        "status": "ok",
        "students": [
            {
                "id": s.id,
                "username": s.username or s.id,
                "display_name": s.display_name or s.name,
                "grade": s.grade or "Class 3",
                "avatar": s.avatar or "owl",
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in students
        ],
    }


@router.get("/settings")
def get_auth_settings(
    auth: Tuple[User, Any] = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db),
):
    """Get system signup settings."""
    s_signup = db.query(SystemSetting).filter(SystemSetting.key == "allow_self_signup").first()
    s_code = db.query(SystemSetting).filter(SystemSetting.key == "require_class_code").first()

    allow_self = (s_signup.value.lower() in ("true", "1")) if s_signup else getattr(config, "ALLOW_SELF_SIGNUP", True)
    req_code = (s_code.value.lower() in ("true", "1")) if s_code else getattr(config, "REQUIRE_CLASS_CODE", False)

    return {
        "status": "ok",
        "allow_self_signup": allow_self,
        "require_class_code": req_code,
    }


@router.post("/settings")
def update_auth_settings(
    payload: UpdateSettingsRequest,
    auth: Tuple[User, Any] = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db),
):
    """Update system signup settings."""
    teacher, _ = auth

    if payload.allow_self_signup is not None:
        rec = db.query(SystemSetting).filter(SystemSetting.key == "allow_self_signup").first()
        if not rec:
            rec = SystemSetting(key="allow_self_signup", value=str(payload.allow_self_signup).lower())
            db.add(rec)
        else:
            rec.value = str(payload.allow_self_signup).lower()

    if payload.require_class_code is not None:
        rec = db.query(SystemSetting).filter(SystemSetting.key == "require_class_code").first()
        if not rec:
            rec = SystemSetting(key="require_class_code", value=str(payload.require_class_code).lower())
            db.add(rec)
        else:
            rec.value = str(payload.require_class_code).lower()

    db.commit()
    log_audit(db, "settings_updated", f"Settings updated by {teacher.username}", user_id=teacher.id)

    return get_auth_settings(auth=auth, db=db)
