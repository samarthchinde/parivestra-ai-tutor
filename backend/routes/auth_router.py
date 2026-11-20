"""FastAPI Router for Parivestra Authentication, Class Management, and Student Administration."""
import csv
import io
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend import config
from backend.database import get_db
from backend.models import User, Class, AuthSession, AuditLog, ParentChildLink, ParentLinkCode, SystemSetting
from backend.auth.validation import validate_username, validate_pin, validate_password, check_rate_limit
from backend.auth.security import (
    hash_secret,
    verify_secret,
    generate_session_token,
    hash_token,
    generate_pin,
    generate_password,
    generate_join_code,
)
from backend.auth.service import (
    resolve_session,
    check_and_record_failed_attempt,
    reset_failed_attempts,
    log_audit,
    utc_now,
)

logger = logging.getLogger("backend.routes.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ========================================================
# Pydantic Schemas
# ========================================================
class LoginRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    secret: str = Field(..., min_length=1, description="PIN for junior or password for middle/senior/adults")
    grade: Optional[str] = None


class SwitchGradeRequest(BaseModel):
    grade: str = Field(..., description="Target grade: Class 3 to Class 10")


class JoinClassRequest(BaseModel):
    code: str = Field(..., min_length=4)
    username: str = Field(..., min_length=2)
    secret: str = Field(..., min_length=4)
    display_name: Optional[str] = None
    avatar: Optional[str] = "owl"


class CreateClassRequest(BaseModel):
    name: str = Field(..., min_length=2)
    grade: str = Field(..., min_length=3)
    section: Optional[str] = "A"
    allow_grade_switch: Optional[bool] = True
    allow_join_by_code: Optional[bool] = False
    consent_confirmed: Optional[bool] = True


class UpdateClassRequest(BaseModel):
    name: Optional[str] = None
    allow_grade_switch: Optional[bool] = None
    allow_join_by_code: Optional[bool] = None
    consent_confirmed: Optional[bool] = None


class CreateStudentRequest(BaseModel):
    username: str = Field(..., min_length=2)
    display_name: Optional[str] = None
    grade: str = Field(..., min_length=3)
    class_id: Optional[str] = None
    secret: Optional[str] = None  # Auto-generated if not provided


class BulkImportRequest(BaseModel):
    csv_text: str = Field(..., description="CSV with columns: username,grade,section (or class_id)")


class ResetSecretRequest(BaseModel):
    new_secret: Optional[str] = None


class StudentRegisterRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    secret: str = Field(..., min_length=4)
    confirm_secret: Optional[str] = None
    grade: Optional[str] = "Class 3"
    avatar: Optional[str] = "owl"
    display_name: Optional[str] = None
    class_code: Optional[str] = None
    role: Optional[str] = None  # Defense against role escalation


class TeacherRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=8)
    invite_code: str = Field(..., min_length=1)


class ParentRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=8)
    child_username: Optional[str] = None
    link_code: Optional[str] = None



# ========================================================
# Session Extraction Dependency
# ========================================================
def get_session_token(request: Request) -> Optional[str]:
    """Extract session token from HttpOnly cookie or Authorization Bearer header."""
    # 1. Cookie
    try:
        cookie_token = request.cookies.get("session_token")
        if cookie_token:
            return cookie_token
    except Exception:
        pass

    # 2. Bearer Header
    try:
        auth_hdr = request.headers.get("authorization")
        if auth_hdr and isinstance(auth_hdr, str) and auth_hdr.lower().startswith("bearer "):
            return auth_hdr[7:].strip()
    except Exception:
        pass

    return None


def _extract_request_meta(request: Request):
    """Safely extract IP, User-Agent, and HTTPS status from Request without throwing KeyError."""
    try:
        raw_client = getattr(request, "client", None)
        ip = raw_client.host if raw_client and hasattr(raw_client, "host") else None
    except Exception:
        ip = None
    try:
        headers = getattr(request, "headers", None)
        user_agent = headers.get("User-Agent", "Web") if headers and hasattr(headers, "get") else "Web"
    except Exception:
        user_agent = "Web"
    try:
        url = getattr(request, "url", None)
        is_secure = (url.scheme == "https") if url and hasattr(url, "scheme") else False
    except Exception:
        is_secure = False
    return ip, user_agent, is_secure


def get_current_auth(
    request: Request,
    db: Session = Depends(get_db),
) -> Tuple[User, AuthSession]:
    """Verify session token and return (User, AuthSession).
    Enforces authentication when AUTH_REQUIRED is enabled.
    """
    token = get_session_token(request)
    ip, _, _ = _extract_request_meta(request)

    if token:
        res = resolve_session(db, token, ip=ip)
        if res:
            return res

    # Check if AUTH_REQUIRED is turned off (dev fallback)
    auth_required = getattr(config, "AUTH_REQUIRED", True)
    if not auth_required:
        # Backward compatibility for legacy tests / dev mode using X-User-Id
        uid = request.headers.get("X-User-Id", "student_default").strip()
        user = db.query(User).filter(User.id == uid).first()
        if not user:
            user = User(
                id=uid,
                username=uid,
                name="Dev Explorer",
                display_name="Dev Explorer",
                role="student",
                grade="Class 3",
                default_grade="Class 3",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Mock dummy session
        dummy_session = AuthSession(
            id=f"sess-dev-{uuid.uuid4().hex[:8]}",
            user_id=user.id,
            token_hash="dev-mock",
            active_grade=user.grade or "Class 3",
            expires_at=utc_now() + timedelta(days=1),
            last_seen_at=utc_now(),
        )
        return user, dummy_session

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please sign in.",
    )


def require_role(roles: List[str]):
    """Dependency factory restricting endpoints by user role (student, teacher, admin)."""
    def _role_checker(auth: Tuple[User, AuthSession] = Depends(get_current_auth)) -> Tuple[User, AuthSession]:
        user, sess = auth
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Requires one of roles {roles}",
            )
        return user, sess
    return _role_checker


# ========================================================
# Authentication Endpoints
# ========================================================
@router.post("/login")
def login(
    payload: LoginRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Authenticate student, teacher, or admin.
    Sets HttpOnly session cookie, applies rate limiting and 5-min lockout defense.
    """
    ip, user_agent, is_secure = _extract_request_meta(request)
    identifier = (payload.username or payload.email or "").strip().lower()

    if not identifier:
        raise HTTPException(status_code=400, detail="Username or email is required")

    # Look up user
    user = (
        db.query(User)
        .filter(
            (User.username.ilike(identifier)) | (User.email.ilike(identifier)) | (User.id == identifier)
        )
        .first()
    )

    if not user:
        # Return generic error to prevent username enumeration
        raise HTTPException(status_code=401, detail="That did not match. Try again or ask your teacher.")

    if not user.active:
        raise HTTPException(status_code=403, detail="Account is deactivated. Please contact your school administrator.")

    now = utc_now()

    # Check Lockout status
    if user.locked_until:
        locked_until = user.locked_until
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if now < locked_until:
            rem_secs = int((locked_until - now).total_seconds())
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account is temporarily locked. Try again in {rem_secs} seconds or ask your teacher.",
            )

    # Verify secret
    is_valid = verify_secret(payload.secret, user.password_hash)

    # Fallback check on legacy pin_hash for existing records
    if not is_valid and user.pin_hash:
        import hashlib
        legacy_hash = hashlib.sha256(payload.secret.strip().encode("utf-8")).hexdigest()
        if legacy_hash == user.pin_hash:
            is_valid = True
            # Auto-upgrade to bcrypt password_hash
            user.password_hash = hash_secret(payload.secret.strip())

    if not is_valid:
        is_locked, err_msg = check_and_record_failed_attempt(db, user, ip=ip)
        code = status.HTTP_429_TOO_MANY_REQUESTS if is_locked else status.HTTP_401_UNAUTHORIZED
        raise HTTPException(status_code=code, detail=err_msg)

    # Success: reset failed attempts
    reset_failed_attempts(db, user)

    # Determine Active Grade
    target_grade = (payload.grade or user.default_grade or user.grade or "Class 3").strip()
    digits = "".join(filter(str.isdigit, target_grade))
    if digits and 3 <= int(digits) <= 10:
        target_grade = f"Class {digits}"
    else:
        target_grade = "Class 3"

    # Enforce class grade lock if student's class forbids grade switching
    if user.role == "student" and user.class_id:
        assigned_cls = db.query(Class).filter(Class.id == user.class_id).first()
        if assigned_cls and not assigned_cls.allow_grade_switch:
            target_grade = assigned_cls.grade

    # Create Session Token
    raw_token = generate_session_token()
    tok_hash = hash_token(raw_token)
    session_hours = getattr(config, "SESSION_HOURS", 24)
    expires_at = now + timedelta(hours=session_hours)

    auth_sess = AuthSession(
        id=f"sess-{uuid.uuid4().hex[:12]}",
        user_id=user.id,
        token_hash=tok_hash,
        active_grade=target_grade,
        expires_at=expires_at,
        last_seen_at=now,
        device_label=user_agent[:100],
        created_at=now,
    )
    db.add(auth_sess)
    db.commit()

    # Set HttpOnly Cookie
    response.set_cookie(
        key="session_token",
        value=raw_token,
        httponly=True,
        samesite="lax",
        max_age=session_hours * 3600,
        secure=is_secure,
    )

    log_audit(db, "login_success", f"User logged in to {target_grade}", user_id=user.id, ip=ip)

    return {
        "status": "ok",
        "token": raw_token,
        "user": {
            "id": user.id,
            "username": user.username or user.id,
            "display_name": user.display_name or user.name,
            "role": user.role or "student",
            "avatar": user.avatar or "owl",
            "grade": target_grade,
            "default_grade": user.default_grade or user.grade or "Class 3",
            "active_grade": target_grade,
            "class_id": user.class_id,
            "xp": user.xp or 0,
            "streak": user.streak or 1,
        },
        "active_grade": target_grade,
    }


def issue_user_session(
    db: Session,
    user: User,
    target_grade: str,
    response: Response,
    user_agent: str,
    is_secure: bool,
    ip: Optional[str] = None,
    event: str = "login_success",
    detail: str = "User session created",
) -> dict:
    now = utc_now()
    raw_token = generate_session_token()
    tok_hash = hash_token(raw_token)
    session_hours = getattr(config, "SESSION_HOURS", 24)
    expires_at = now + timedelta(hours=session_hours)

    auth_sess = AuthSession(
        id=f"sess-{uuid.uuid4().hex[:12]}",
        user_id=user.id,
        token_hash=tok_hash,
        active_grade=target_grade,
        expires_at=expires_at,
        last_seen_at=now,
        device_label=user_agent[:100] if user_agent else "browser",
        created_at=now,
    )
    db.add(auth_sess)
    user.last_login_at = now
    db.commit()

    response.set_cookie(
        key="session_token",
        value=raw_token,
        httponly=True,
        samesite="lax",
        max_age=session_hours * 3600,
        secure=is_secure,
    )

    log_audit(db, event, detail, user_id=user.id, ip=ip)

    return {
        "status": "ok",
        "token": raw_token,
        "user": {
            "id": user.id,
            "username": user.username or user.id,
            "display_name": user.display_name or user.name,
            "role": user.role or "student",
            "avatar": user.avatar or "owl",
            "grade": target_grade,
            "default_grade": user.default_grade or user.grade or "Class 3",
            "active_grade": target_grade,
            "class_id": user.class_id,
            "xp": user.xp or 0,
            "streak": user.streak or 1,
        },
        "active_grade": target_grade,
    }


def _perform_child_link(db: Session, parent_id: str, child_username: str, link_code_str: str) -> User:
    now = utc_now()
    code_clean = link_code_str.strip().upper()
    link_record = db.query(ParentLinkCode).filter(ParentLinkCode.code == code_clean).first()
    if not link_record:
        raise HTTPException(status_code=400, detail="Invalid parent link code.")
    if link_record.used:
        raise HTTPException(status_code=400, detail="This link code has already been used.")

    expires_at = link_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if now > expires_at:
        raise HTTPException(status_code=400, detail="This link code has expired. Please ask the teacher for a new one.")

    child = db.query(User).filter(User.username.ilike(child_username.strip())).first()
    if not child or child.id != link_record.student_id:
        raise HTTPException(status_code=400, detail="Child username does not match the link code.")

    existing_link = db.query(ParentChildLink).filter(
        ParentChildLink.parent_id == parent_id,
        ParentChildLink.child_id == child.id,
    ).first()
    if not existing_link:
        new_link = ParentChildLink(parent_id=parent_id, child_id=child.id)
        db.add(new_link)

    link_record.used = True
    link_record.used_by_parent_id = parent_id
    db.commit()
    return child


@router.get("/username-available")
def check_username_available(
    username: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Rate-limited check for student username/nickname availability."""
    ip, _, _ = _extract_request_meta(request)
    if not check_rate_limit(f"useravail_{ip}", limit=30, window_seconds=60):
        raise HTTPException(status_code=429, detail="Too many checks. Please wait a minute.")

    valid, err = validate_username(username, db=db)
    if not valid:
        return {"available": False, "reason": err}
    return {"available": True, "message": "Nickname is available!"}


@router.post("/register")
def register_student(
    payload: StudentRegisterRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Self-registration for students.
    Validates nickname, enforces age-appropriate PIN/password rules, checks class codes,
    rejects role escalation, auto-creates session and logs audit event.
    """
    ip, user_agent, is_secure = _extract_request_meta(request)

    # 1. Rate limiting
    if not check_rate_limit(f"reg_student_{ip}", limit=10, window_seconds=60):
        raise HTTPException(status_code=429, detail="Too many registration attempts. Please wait a moment.")

    # 2. Defense against role escalation
    if payload.role and payload.role.strip().lower() != "student":
        log_audit(db, "role_escalation_attempt", f"Attempted role: {payload.role}", ip=ip)
        raise HTTPException(status_code=400, detail="Registration role escalation is forbidden.")

    # 3. System settings check
    allow_signup_rec = db.query(SystemSetting).filter(SystemSetting.key == "allow_self_signup").first()
    allow_self_signup = (allow_signup_rec.value.lower() in ("true", "1")) if allow_signup_rec else getattr(config, "ALLOW_SELF_SIGNUP", True)
    if not allow_self_signup:
        raise HTTPException(status_code=403, detail="Self-registration is currently disabled. Please ask your teacher to add you.")

    req_code_rec = db.query(SystemSetting).filter(SystemSetting.key == "require_class_code").first()
    require_class_code = (req_code_rec.value.lower() in ("true", "1")) if req_code_rec else getattr(config, "REQUIRE_CLASS_CODE", False)
    if require_class_code and not (payload.class_code and payload.class_code.strip()):
        raise HTTPException(status_code=400, detail="A class code from your teacher is required to create an account.")

    # 4. Username format & anti-PII check
    valid_name, name_err = validate_username(payload.username, db=db)
    if not valid_name:
        raise HTTPException(status_code=400, detail=name_err)

    # 5. Secret validation based on grade band
    grade_digits = "".join(filter(str.isdigit, payload.grade or "3"))
    grade_num = int(grade_digits) if grade_digits else 3
    is_junior = grade_num <= 5

    if is_junior:
        valid_pin, pin_err = validate_pin(payload.secret)
        if not valid_pin:
            raise HTTPException(status_code=400, detail=pin_err)
    else:
        valid_pw, pw_err = validate_password(payload.secret)
        if not valid_pw:
            raise HTTPException(status_code=400, detail=pw_err)

    if payload.confirm_secret and payload.confirm_secret != payload.secret:
        raise HTTPException(status_code=400, detail="Secrets do not match. Please verify your secret.")

    # 6. Optional Class Code lookup
    class_id = None
    if payload.class_code and payload.class_code.strip():
        code_clean = payload.class_code.strip().upper()
        found_cls = db.query(Class).filter(Class.join_code == code_clean).first()
        if not found_cls:
            raise HTTPException(status_code=400, detail=f"Class code '{code_clean}' not found. Please verify with your teacher.")
        class_id = found_cls.id

    # 7. Persist new student
    hashed_secret = hash_secret(payload.secret)
    cleaned_name = payload.username.strip()
    target_grade = payload.grade or "Class 3"

    new_user = User(
        id=f"user-{uuid.uuid4().hex[:12]}",
        username=cleaned_name,
        name=payload.display_name or cleaned_name,
        display_name=payload.display_name or cleaned_name,
        avatar=payload.avatar or "owl",
        role="student",
        grade=target_grade,
        default_grade=target_grade,
        class_id=class_id,
        pin_hash=hashed_secret if is_junior else None,
        password_hash=hashed_secret,
        active=True,
    )
    db.add(new_user)
    db.commit()

    return issue_user_session(
        db, new_user, target_grade, response, user_agent, is_secure, ip,
        event="account_created", detail=f"Student account created: {cleaned_name} ({target_grade})"
    )


@router.post("/register-teacher")
def register_teacher(
    payload: TeacherRegisterRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Register teacher with secret invite code."""
    ip, user_agent, is_secure = _extract_request_meta(request)

    if not check_rate_limit(f"reg_teacher_{ip}", limit=5, window_seconds=60):
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")

    expected_invite = getattr(config, "TEACHER_INVITE_CODE", "TEACH-PARIVESTRA-2026")
    if payload.invite_code.strip() != expected_invite:
        log_audit(db, "invalid_teacher_invite", f"Attempt with code: {payload.invite_code}", ip=ip)
        raise HTTPException(status_code=403, detail="Invalid teacher invite code.")

    valid_pw, pw_err = validate_password(payload.password)
    if not valid_pw:
        raise HTTPException(status_code=400, detail=pw_err)

    email_clean = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    new_teacher = User(
        id=f"teacher-{uuid.uuid4().hex[:12]}",
        username=email_clean.split("@")[0],
        email=email_clean,
        name=payload.name.strip(),
        display_name=payload.name.strip(),
        avatar="teacher",
        role="teacher",
        grade="Class 3",
        default_grade="Class 3",
        password_hash=hash_secret(payload.password),
        active=True,
    )
    db.add(new_teacher)
    db.commit()

    return issue_user_session(
        db, new_teacher, "Class 3", response, user_agent, is_secure, ip,
        event="teacher_account_created", detail=f"Teacher registered: {email_clean}"
    )


@router.post("/register-parent")
def register_parent(
    payload: ParentRegisterRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Register parent account with optional child link code."""
    ip, user_agent, is_secure = _extract_request_meta(request)

    if not check_rate_limit(f"reg_parent_{ip}", limit=5, window_seconds=60):
        raise HTTPException(status_code=429, detail="Too many attempts. Please try again later.")

    valid_pw, pw_err = validate_password(payload.password)
    if not valid_pw:
        raise HTTPException(status_code=400, detail=pw_err)

    email_clean = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    new_parent = User(
        id=f"parent-{uuid.uuid4().hex[:12]}",
        username=email_clean.split("@")[0],
        email=email_clean,
        name=payload.name.strip(),
        display_name=payload.name.strip(),
        avatar="parent",
        role="parent",
        grade="Class 3",
        default_grade="Class 3",
        password_hash=hash_secret(payload.password),
        active=True,
    )
    db.add(new_parent)
    db.commit()

    # Link child if provided during sign-up
    if payload.child_username and payload.link_code:
        try:
            _perform_child_link(db, new_parent.id, payload.child_username, payload.link_code)
        except HTTPException as e:
            # Let registration succeed even if link code had a typo, but log it
            log_audit(db, "parent_signup_link_failed", f"Failed child link: {e.detail}", user_id=new_parent.id)

    return issue_user_session(
        db, new_parent, "Class 3", response, user_agent, is_secure, ip,
        event="parent_account_created", detail=f"Parent registered: {email_clean}"
    )


class LinkChildRequestAuth(BaseModel):
    child_username: str = Field(..., min_length=2)
    link_code: str = Field(..., min_length=4)


@router.post("/parent/link-child")
def auth_link_child(
    payload: LinkChildRequestAuth,
    auth: Tuple[User, AuthSession] = Depends(require_role(["parent"])),
    db: Session = Depends(get_db),
):
    parent, _ = auth
    child = _perform_child_link(db, parent.id, payload.child_username, payload.link_code)
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


class CreateLinkCodeRequestAuth(BaseModel):
    student_id: str = Field(...)


@router.post("/teacher/link-codes")
def auth_create_link_code(
    payload: CreateLinkCodeRequestAuth,
    auth: Tuple[User, AuthSession] = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db),
):
    teacher, _ = auth
    student = db.query(User).filter(User.id == payload.student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    code = f"LINK-{uuid.uuid4().hex[:6].upper()}"
    now = utc_now()
    expires_at = now + timedelta(days=7)

    record = ParentLinkCode(
        code=code,
        student_id=student.id,
        teacher_id=teacher.id,
        expires_at=expires_at,
        used=False,
    )
    db.add(record)
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



@router.post("/logout")
def logout(
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Invalidate session and clear cookie."""
    token = get_session_token(request)
    ip, _, _ = _extract_request_meta(request)

    if token:
        tok_hash = hash_token(token)
        sess = db.query(AuthSession).filter(AuthSession.token_hash == tok_hash).first()
        if sess:
            log_audit(db, "logout", "User signed out", user_id=sess.user_id, ip=ip)
            db.delete(sess)
            db.commit()

    response.delete_cookie("session_token")
    return {"status": "ok", "message": "Signed out successfully"}


@router.get("/me")
def get_current_user_info(
    auth: Tuple[User, AuthSession] = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    """Return identity and class permissions for currently authenticated user."""
    user, sess = auth

    class_info = None
    allow_grade_switch = True

    if user.class_id:
        cls = db.query(Class).filter(Class.id == user.class_id).first()
        if cls:
            class_info = {
                "id": cls.id,
                "name": cls.name,
                "grade": cls.grade,
                "section": cls.section,
                "allow_grade_switch": cls.allow_grade_switch,
            }
            if user.role == "student":
                allow_grade_switch = cls.allow_grade_switch

    return {
        "status": "ok",
        "user": {
            "id": user.id,
            "username": user.username or user.id,
            "display_name": user.display_name or user.name,
            "email": user.email,
            "role": user.role or "student",
            "avatar": user.avatar or "owl",
            "default_grade": user.default_grade or user.grade or "Class 3",
            "active_grade": sess.active_grade,
            "allow_grade_switch": allow_grade_switch,
            "class": class_info,
            "xp": user.xp or 0,
            "streak": user.streak or 1,
        },
        "active_grade": sess.active_grade,
    }


@router.post("/guest")
def create_guest_session(
    payload: Dict[str, Any],
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Create a temporary guest/demo session (no persistent student data saved)."""
    grade = payload.get("grade", "Class 3").strip()
    digits = "".join(filter(str.isdigit, grade))
    target_grade = f"Class {digits}" if digits and 3 <= int(digits) <= 10 else "Class 3"

    # Guest user record
    guest_id = f"guest_{uuid.uuid4().hex[:8]}"
    guest_user = User(
        id=guest_id,
        username=guest_id,
        name="Guest Explorer",
        display_name="Guest Explorer",
        role="student",
        grade=target_grade,
        default_grade=target_grade,
        avatar="robot",
        active=True,
    )
    db.add(guest_user)
    db.commit()

    raw_token = generate_session_token()
    auth_sess = AuthSession(
        id=f"sess-{uuid.uuid4().hex[:12]}",
        user_id=guest_user.id,
        token_hash=hash_token(raw_token),
        active_grade=target_grade,
        expires_at=utc_now() + timedelta(hours=4),  # short duration for guest
        last_seen_at=utc_now(),
        device_label="Guest Session",
        created_at=utc_now(),
    )
    db.add(auth_sess)
    db.commit()

    response.set_cookie(
        key="session_token",
        value=raw_token,
        httponly=True,
        samesite="lax",
        max_age=14400,
        secure=getattr(getattr(request, "url", None), "scheme", "http") == "https",
    )

    return {
        "status": "ok",
        "token": raw_token,
        "is_guest": True,
        "user": {
            "id": guest_user.id,
            "username": "guest",
            "display_name": "Guest Explorer",
            "role": "student",
            "avatar": "robot",
            "active_grade": target_grade,
            "allow_grade_switch": True,
        },
        "active_grade": target_grade,
    }


@router.post("/switch-grade")
def switch_active_grade(
    payload: SwitchGradeRequest,
    auth: Tuple[User, AuthSession] = Depends(get_current_auth),
    db: Session = Depends(get_db),
):
    """Switch active grade on the authenticated session if permissions allow."""
    user, sess = auth
    target_grade = payload.grade.strip()
    digits = "".join(filter(str.isdigit, target_grade))
    if not (digits and 3 <= int(digits) <= 10):
        raise HTTPException(status_code=400, detail="Invalid grade. Must be between Class 3 and Class 10.")
    normalized_grade = f"Class {digits}"

    # Permission check for students
    if user.role == "student" and user.class_id:
        cls = db.query(Class).filter(Class.id == user.class_id).first()
        if cls and not cls.allow_grade_switch:
            if cls.grade != normalized_grade:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Your teacher has set learning to {cls.grade}. Grade switching is currently disabled.",
                )

    sess.active_grade = normalized_grade
    db.commit()

    log_audit(db, "grade_switch", f"User switched active grade to {normalized_grade}", user_id=user.id)

    return {
        "status": "ok",
        "active_grade": normalized_grade,
        "message": f"Switched to {normalized_grade}",
    }


@router.post("/join-class")
def join_class_by_code(
    payload: JoinClassRequest,
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Student joins a class using a teacher-provided join code."""
    code = payload.code.strip().upper()
    cls = db.query(Class).filter(Class.join_code == code).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class code not found. Check with your teacher.")

    if not cls.allow_join_by_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Joining by code is not enabled for this class. Ask your teacher to invite you.",
        )

    uname = payload.username.strip().lower()
    existing = db.query(User).filter(User.username == uname).first()
    if existing:
        raise HTTPException(status_code=400, detail="That username is already taken. Please choose another nickname.")

    # Create new student
    student_id = f"student_{uuid.uuid4().hex[:10]}"
    student = User(
        id=student_id,
        username=uname,
        name=payload.display_name or uname.title(),
        display_name=payload.display_name or uname.title(),
        avatar=payload.avatar or "owl",
        role="student",
        grade=cls.grade,
        default_grade=cls.grade,
        class_id=cls.id,
        password_hash=hash_secret(payload.secret),
        active=True,
    )
    db.add(student)
    db.commit()

    # Log them in automatically
    raw_token = generate_session_token()
    auth_sess = AuthSession(
        id=f"sess-{uuid.uuid4().hex[:12]}",
        user_id=student.id,
        token_hash=hash_token(raw_token),
        active_grade=cls.grade,
        expires_at=utc_now() + timedelta(hours=24),
        last_seen_at=utc_now(),
    )
    db.add(auth_sess)
    db.commit()

    response.set_cookie(
        key="session_token",
        value=raw_token,
        httponly=True,
        samesite="lax",
        max_age=86400,
        secure=getattr(getattr(request, "url", None), "scheme", "http") == "https",
    )

    log_audit(db, "account_created", f"Student joined class {cls.name} via code {code}", user_id=student.id)

    return {
        "status": "ok",
        "token": raw_token,
        "user": {
            "id": student.id,
            "username": student.username,
            "display_name": student.display_name,
            "role": "student",
            "active_grade": cls.grade,
            "class_id": cls.id,
        },
        "active_grade": cls.grade,
    }


# ========================================================
# Teacher & Administrator Endpoints
# ========================================================
@router.post("/teacher/classes")
def create_class(
    payload: CreateClassRequest,
    auth: Tuple[User, AuthSession] = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db),
):
    """Create a new classroom section with an auto-generated join code."""
    teacher, _ = auth
    class_id = f"class_{uuid.uuid4().hex[:8]}"
    join_code = generate_join_code()

    # Ensure unique join code
    while db.query(Class).filter(Class.join_code == join_code).first():
        join_code = generate_join_code()

    digits = "".join(filter(str.isdigit, payload.grade))
    norm_grade = f"Class {digits}" if digits else "Class 3"

    cls = Class(
        id=class_id,
        name=payload.name.strip(),
        grade=norm_grade,
        section=payload.section or "A",
        join_code=join_code,
        teacher_id=teacher.id,
        allow_grade_switch=payload.allow_grade_switch if payload.allow_grade_switch is not None else True,
        allow_join_by_code=payload.allow_join_by_code if payload.allow_join_by_code is not None else False,
        consent_confirmed=payload.consent_confirmed if payload.consent_confirmed is not None else True,
        created_at=utc_now(),
    )
    db.add(cls)
    db.commit()
    db.refresh(cls)

    log_audit(db, "class_created", f"Class {cls.name} ({cls.grade}) created with code {join_code}", user_id=teacher.id)

    return {"status": "ok", "class": {
        "id": cls.id,
        "name": cls.name,
        "grade": cls.grade,
        "section": cls.section,
        "join_code": cls.join_code,
        "allow_grade_switch": cls.allow_grade_switch,
        "allow_join_by_code": cls.allow_join_by_code,
        "consent_confirmed": cls.consent_confirmed,
    }}


@router.get("/teacher/classes")
def list_classes(
    auth: Tuple[User, AuthSession] = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db),
):
    """List classes belonging to current teacher (or all classes for admin)."""
    user, _ = auth
    query = db.query(Class)
    if user.role != "admin":
        query = query.filter(Class.teacher_id == user.id)

    classes = query.order_by(Class.grade, Class.section).all()

    res = []
    for c in classes:
        student_count = db.query(User).filter(User.class_id == c.id, User.active == True).count()
        res.append({
            "id": c.id,
            "name": c.name,
            "grade": c.grade,
            "section": c.section,
            "join_code": c.join_code,
            "allow_grade_switch": c.allow_grade_switch,
            "allow_join_by_code": c.allow_join_by_code,
            "consent_confirmed": c.consent_confirmed,
            "student_count": student_count,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    return {"status": "ok", "classes": res}


@router.get("/teacher/students")
def list_students(
    class_id: Optional[str] = None,
    auth: Tuple[User, AuthSession] = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db),
):
    """List students filtered optionally by class_id."""
    user, _ = auth
    query = db.query(User).filter(User.role == "student")
    if class_id:
        query = query.filter(User.class_id == class_id)
    elif user.role != "admin":
        teacher_class_ids = [c.id for c in db.query(Class).filter(Class.teacher_id == user.id).all()]
        if teacher_class_ids:
            query = query.filter(User.class_id.in_(teacher_class_ids))
        else:
            query = query.filter(User.id == "__none__")

    students = query.order_by(User.username).all()
    res = []
    for s in students:
        cls = db.query(Class).filter(Class.id == s.class_id).first() if s.class_id else None
        res.append({
            "id": s.id,
            "username": s.username or s.id,
            "display_name": s.display_name or s.name,
            "grade": s.grade or s.default_grade or "Class 3",
            "class_id": s.class_id,
            "class_name": cls.name if cls else "Unassigned",
            "failed_attempts": s.failed_attempts or 0,
            "is_locked": bool(s.locked_until and s.locked_until > utc_now()),
            "xp": s.xp or 0,
            "streak": s.streak or 1,
            "last_login_at": s.last_login_at.isoformat() if s.last_login_at else None,
        })
    return {"status": "ok", "students": res}


@router.put("/teacher/classes/{class_id}")
def update_class_settings(
    class_id: str,
    payload: UpdateClassRequest,
    auth: Tuple[User, AuthSession] = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db),
):
    """Update class configuration (e.g. toggle allow_grade_switch or allow_join_by_code)."""
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    if payload.name is not None:
        cls.name = payload.name.strip()
    if payload.allow_grade_switch is not None:
        cls.allow_grade_switch = payload.allow_grade_switch
    if payload.allow_join_by_code is not None:
        cls.allow_join_by_code = payload.allow_join_by_code
    if payload.consent_confirmed is not None:
        cls.consent_confirmed = payload.consent_confirmed

    db.commit()
    return {"status": "ok", "message": "Class updated successfully"}


@router.post("/teacher/students")
def create_student(
    payload: CreateStudentRequest,
    auth: Tuple[User, AuthSession] = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db),
):
    """Create a single student with auto-generated PIN or password shown once."""
    user, _ = auth
    uname = payload.username.strip().lower()

    existing = db.query(User).filter(User.username == uname).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Username '{uname}' already exists")

    digits = "".join(filter(str.isdigit, payload.grade))
    norm_grade = f"Class {digits}" if digits else "Class 3"
    grade_num = int(digits) if digits else 3

    # Generate secret if not provided: 4-digit PIN for Junior (3-5), password for Middle/Senior (6-10)
    raw_secret = payload.secret
    if not raw_secret:
        if grade_num <= 5:
            raw_secret = generate_pin(4)
        else:
            raw_secret = generate_password()

    student_id = f"student_{uuid.uuid4().hex[:10]}"
    student = User(
        id=student_id,
        username=uname,
        name=payload.display_name or uname.title(),
        display_name=payload.display_name or uname.title(),
        avatar="owl",
        role="student",
        grade=norm_grade,
        default_grade=norm_grade,
        class_id=payload.class_id,
        password_hash=hash_secret(raw_secret),
        active=True,
        created_at=utc_now(),
    )
    db.add(student)
    db.commit()

    log_audit(db, "account_created", f"Created student {uname} ({norm_grade})", user_id=user.id)

    return {
        "status": "ok",
        "student": {
            "id": student.id,
            "username": student.username,
            "display_name": student.display_name,
            "grade": student.grade,
            "class_id": student.class_id,
            "secret": raw_secret,  # One-time display
        },
    }


@router.post("/teacher/students/bulk")
def bulk_import_students(
    payload: BulkImportRequest,
    auth: Tuple[User, AuthSession] = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db),
):
    """Bulk import students from CSV lines: username,grade,section (or class_id).
    Returns list of created student accounts with one-time credentials for printing.
    """
    teacher, _ = auth
    f = io.StringIO(payload.csv_text.strip())
    reader = csv.reader(f)

    results = []
    errors = []

    for row_idx, row in enumerate(reader):
        if not row or not any(row):
            continue
        # Skip header if present
        if row_idx == 0 and any("user" in cell.lower() for cell in row):
            continue

        if len(row) < 2:
            errors.append(f"Row {row_idx + 1}: At least username and grade required")
            continue

        raw_uname = row[0].strip().lower()
        raw_grade = row[1].strip()
        raw_section = row[2].strip() if len(row) > 2 else "A"

        digits = "".join(filter(str.isdigit, raw_grade))
        norm_grade = f"Class {digits}" if digits else "Class 3"
        grade_num = int(digits) if digits else 3

        if db.query(User).filter(User.username == raw_uname).first():
            errors.append(f"Row {row_idx + 1}: Username '{raw_uname}' already exists")
            continue

        # Find or create class for this grade/section
        cls = db.query(Class).filter(Class.grade == norm_grade, Class.section == raw_section).first()
        if not cls:
            cls = Class(
                id=f"class_{uuid.uuid4().hex[:8]}",
                name=f"{norm_grade} {raw_section}",
                grade=norm_grade,
                section=raw_section,
                join_code=generate_join_code(),
                teacher_id=teacher.id,
                created_at=utc_now(),
            )
            db.add(cls)
            db.commit()

        # Generate secret
        raw_secret = generate_pin(4) if grade_num <= 5 else generate_password()

        student = User(
            id=f"student_{uuid.uuid4().hex[:10]}",
            username=raw_uname,
            name=raw_uname.title(),
            display_name=raw_uname.title(),
            avatar="owl",
            role="student",
            grade=norm_grade,
            default_grade=norm_grade,
            class_id=cls.id,
            password_hash=hash_secret(raw_secret),
            active=True,
            created_at=utc_now(),
        )
        db.add(student)
        db.commit()

        results.append({
            "username": raw_uname,
            "display_name": student.display_name,
            "grade": norm_grade,
            "section": raw_section,
            "class_name": cls.name,
            "secret": raw_secret,
        })

    log_audit(db, "bulk_import", f"Bulk imported {len(results)} students", user_id=teacher.id)

    return {
        "status": "ok",
        "imported_count": len(results),
        "students": results,
        "errors": errors,
    }


@router.post("/teacher/students/{student_id}/reset-secret")
def reset_student_secret(
    student_id: str,
    payload: Optional[ResetSecretRequest] = None,
    auth: Tuple[User, AuthSession] = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db),
):
    """Reset student's password or PIN, unlocking account and generating new secret."""
    user, _ = auth
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    digits = "".join(filter(str.isdigit, student.grade or "3"))
    grade_num = int(digits) if digits else 3

    new_secret = (payload.new_secret if payload else None)
    if not new_secret:
        new_secret = generate_pin(4) if grade_num <= 5 else generate_password()

    student.password_hash = hash_secret(new_secret)
    student.failed_attempts = 0
    student.locked_until = None
    db.commit()

    log_audit(db, "secret_reset", f"Reset secret for student {student.username}", user_id=user.id)

    return {
        "status": "ok",
        "username": student.username,
        "new_secret": new_secret,
    }


@router.get("/teacher/classes/{class_id}/login-cards")
def get_class_login_cards(
    class_id: str,
    auth: Tuple[User, AuthSession] = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db),
):
    """Retrieve printable student login cards with usernames, grade, and school name."""
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    students = db.query(User).filter(User.class_id == class_id, User.active == True).all()

    cards = [
        {
            "id": s.id,
            "username": s.username or s.id,
            "display_name": s.display_name,
            "avatar": s.avatar,
            "grade": s.grade,
            "class_name": cls.name,
            "secret_type": "PIN" if ("3" in s.grade or "4" in s.grade or "5" in s.grade) else "Password",
        }
        for s in students
    ]

    return {
        "status": "ok",
        "class": {
            "id": cls.id,
            "name": cls.name,
            "grade": cls.grade,
            "section": cls.section,
        },
        "cards": cards,
    }
