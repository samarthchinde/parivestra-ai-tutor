"""FastAPI dependencies for user authentication, session resolution, and active grade scoping."""
import logging
from typing import Optional, Tuple
from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend import config
from backend.database import get_db
from backend.models import User, Class, AuthSession
from backend.auth.service import resolve_session, utc_now

logger = logging.getLogger("backend.auth.dependencies")


def extract_session_token(request: Request) -> Optional[str]:
    """Extract token from cookie or Authorization Bearer header."""
    try:
        cookie_token = request.cookies.get("session_token")
        if cookie_token:
            return cookie_token
    except Exception:
        pass

    try:
        auth_hdr = request.headers.get("authorization")
        if auth_hdr and isinstance(auth_hdr, str) and auth_hdr.lower().startswith("bearer "):
            return auth_hdr[7:].strip()
    except Exception:
        pass

    return None


def get_current_user(
    request: Request,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Resolve current user:
    1. First checks authenticated session token.
    2. Falls back to X-User-Id when AUTH_REQUIRED is false or for legacy compatibility.
    """
    token = extract_session_token(request, authorization)
    ip = request.client.host if request.client else None

    if token:
        res = resolve_session(db, token, ip=ip)
        if res:
            return res[0]

    auth_required = getattr(config, "AUTH_REQUIRED", True)

    # If auth is not strictly required or request passes X-User-Id header in dev/test mode
    if not auth_required or x_user_id:
        uid = (x_user_id or "student_default").strip()
        user = db.query(User).filter(User.id == uid).first()
        if not user:
            user = User(
                id=uid,
                username=uid,
                name="Kid Explorer",
                display_name="Kid Explorer",
                avatar="owl",
                role="student",
                grade="Class 3",
                default_grade="Class 3",
                xp=0,
                streak=1,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please sign in.",
    )


def get_active_grade(
    request: Request,
    grade: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> str:
    """Resolve the active grade for content scoping and enforce student class permissions.
    If student's class forbids grade switching, forces the class grade and rejects unauthorized requests with 403.
    """
    query_grade = request.query_params.get("grade")
    requested = query_grade or grade

    # If not passed as param, check session's active grade
    token = extract_session_token(request, request.headers.get("Authorization"))
    session = None
    if token:
        sess_tuple = resolve_session(db, token)
        if sess_tuple:
            _, session = sess_tuple

    if not requested and session and session.active_grade:
        requested = session.active_grade
    elif not requested:
        requested = user.default_grade or user.grade or "Class 3"

    digits = "".join(filter(str.isdigit, str(requested)))
    norm_grade = f"Class {digits}" if digits and 3 <= int(digits) <= 10 else "Class 3"

    # Enforce class grade lock if student's teacher disabled switching
    if user.role == "student" and user.class_id:
        assigned_cls = db.query(Class).filter(Class.id == user.class_id).first()
        if assigned_cls and not assigned_cls.allow_grade_switch:
            if assigned_cls.grade != norm_grade:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied: Learning is locked to {assigned_cls.grade} by your teacher.",
                )

    return norm_grade
