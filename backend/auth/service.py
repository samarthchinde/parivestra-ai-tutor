"""Authentication service for session resolution, lockout protection, and audit logging."""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session

from backend import config
from backend.models import User, AuthSession, AuditLog, Class
from backend.auth.security import hash_token

logger = logging.getLogger("backend.auth.service")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def log_audit(
    db: Session,
    event: str,
    detail: str,
    user_id: Optional[str] = None,
    ip: Optional[str] = None,
):
    """Record an event to the audit log without sensitive data."""
    try:
        entry = AuditLog(
            user_id=user_id,
            event=event,
            detail=detail[:500] if detail else None,
            ip=ip,
            created_at=utc_now(),
        )
        db.add(entry)
        db.commit()
    except Exception as err:
        logger.error(f"Failed to record audit log: {err}")
        db.rollback()


def check_and_record_failed_attempt(
    db: Session,
    user: User,
    ip: Optional[str] = None,
) -> Tuple[bool, str]:
    """Increment failed attempts and apply 5-minute lockout if threshold (5) reached.
    Returns (is_locked_now, message).
    """
    now = utc_now()
    user.failed_attempts = (user.failed_attempts or 0) + 1

    if user.failed_attempts >= 5:
        user.locked_until = now + timedelta(minutes=5)
        db.commit()
        log_audit(
            db,
            event="lockout",
            detail=f"Account locked after {user.failed_attempts} failed attempts",
            user_id=user.id,
            ip=ip,
        )
        return True, "Account is temporarily locked for 5 minutes due to multiple failed attempts."

    db.commit()
    log_audit(
        db,
        event="login_failed",
        detail=f"Invalid credentials attempt #{user.failed_attempts}",
        user_id=user.id,
        ip=ip,
    )
    return False, "That did not match. Try again or ask your teacher."


def reset_failed_attempts(db: Session, user: User):
    """Reset failed attempts and unlock account on successful authentication."""
    user.failed_attempts = 0
    user.locked_until = None
    user.last_login_at = utc_now()
    db.commit()


def resolve_session(
    db: Session,
    token: str,
    ip: Optional[str] = None,
) -> Optional[Tuple[User, AuthSession]]:
    """Validate a session token: checks absolute expiry and idle timeout.
    Returns (User, AuthSession) or None.
    """
    if not token or not isinstance(token, str):
        return None

    tok_hash = hash_token(token.strip())
    session = db.query(AuthSession).filter(AuthSession.token_hash == tok_hash).first()
    if not session:
        return None

    now = utc_now()

    # Ensure tz-aware comparison
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    last_seen = session.last_seen_at
    if last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)

    # 1. Absolute expiry check
    if now > expires_at:
        db.delete(session)
        db.commit()
        return None

    user = db.query(User).filter(User.id == session.user_id, User.active == True).first()
    if not user:
        db.delete(session)
        db.commit()
        return None

    # 2. Idle timeout check: shorter for students (20 min) than teachers/admins (30 min)
    idle_limit = (
        getattr(config, "STUDENT_SESSION_IDLE_MINUTES", 20)
        if user.role == "student"
        else getattr(config, "SESSION_IDLE_MINUTES", 30)
    )
    if (now - last_seen) > timedelta(minutes=idle_limit):
        log_audit(db, "idle_timeout", f"Session expired due to inactivity ({idle_limit}m)", user_id=user.id, ip=ip)
        db.delete(session)
        db.commit()
        return None

    # Update last seen timestamp
    session.last_seen_at = now
    db.commit()

    return user, session
