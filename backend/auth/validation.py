"""Validation, Anti-PII, Rate-Limiting, and Security Checks for Parivestra Authentication."""
import re
import time
from typing import Optional, Tuple
from sqlalchemy.orm import Session

# Profanity blocklist for kid-safe usernames
PROFANITY_LIST = {
    "badword", "damn", "crap", "hell", "stupid", "idiot", "hate", "ugly",
    "kill", "loser", "jerk", "dumb", "fool", "nude", "sex", "porn", "xxx",
    "admin", "root", "system", "moderator", "superuser"
}

# Rate limiting storage (in-memory sliding window): key -> list of float timestamps
_RATE_LIMIT_BUCKETS: dict[str, list[float]] = {}


def check_rate_limit(key: str, limit: int = 15, window_seconds: int = 60) -> bool:
    """Check if an action is within allowed rate limit. Returns True if permitted, False if exceeded."""
    now = time.time()
    cutoff = now - window_seconds
    timestamps = _RATE_LIMIT_BUCKETS.get(key, [])
    # Filter out timestamps outside window
    timestamps = [t for t in timestamps if t > cutoff]
    if len(timestamps) >= limit:
        _RATE_LIMIT_BUCKETS[key] = timestamps
        return False
    timestamps.append(now)
    _RATE_LIMIT_BUCKETS[key] = timestamps
    return True


def validate_username(username: str, db: Optional[Session] = None) -> Tuple[bool, Optional[str]]:
    """Validate student nickname or username.
    Rules:
    - 3-20 characters
    - Alphanumeric, underscores, hyphens only (no spaces)
    - Anti-PII: No emails, no phone numbers, no real full names with spaces
    - Profanity filter
    - Case-insensitive uniqueness check against database if provided
    """
    if not username or not isinstance(username, str):
        return False, "Username is required."

    cleaned = username.strip()
    if len(cleaned) < 3:
        return False, "Username must be at least 3 characters."
    if len(cleaned) > 20:
        return False, "Username must be 20 characters or fewer."

    # Must match ^[a-zA-Z0-9_-]+$
    if not re.match(r"^[a-zA-Z0-9_-]+$", cleaned):
        return False, "Username may only contain letters, numbers, hyphens (-), and underscores (_)."

    # Anti-PII: Block email patterns
    if "@" in cleaned or re.search(r"\.(com|org|net|edu|gov|io|in|co)\b", cleaned, re.IGNORECASE):
        return False, "For safety, please choose a friendly nickname instead of an email address."

    # Anti-PII: Block phone numbers (7 or more consecutive digits)
    if re.search(r"\d{7,}", cleaned):
        return False, "For safety, please do not use phone numbers in your username."

    # Profanity & reserved keywords check
    lower_name = cleaned.lower()
    for word in PROFANITY_LIST:
        if word in lower_name:
            return False, f"The nickname '{cleaned}' is not permitted. Please pick a kid-friendly nickname."

    # Uniqueness check in DB
    if db is not None:
        from backend.models import User
        existing = db.query(User).filter(User.username.ilike(cleaned)).first()
        if existing:
            return False, f"Nickname '{cleaned}' is already taken. Please try another one!"

    return True, None


def validate_pin(pin: str) -> Tuple[bool, Optional[str]]:
    """Validate a 4-digit student PIN.
    Rejects:
    - Non-digits
    - Length other than 4
    - All identical digits (e.g., 0000, 1111, 2222)
    - Sequential ascending/descending (e.g., 1234, 4321, 2345, 9876)
    - Simple repeated pairs (e.g., 1212, 1122, 1313)
    """
    if not pin or not isinstance(pin, str):
        return False, "A 4-digit PIN is required."

    pin = pin.strip()
    if not pin.isdigit():
        return False, "PIN must consist of numbers only."

    if len(pin) != 4:
        return False, "PIN must be exactly 4 digits."

    # All identical digits
    if len(set(pin)) == 1:
        return False, "PIN is too simple. Do not use repeated numbers like '0000' or '1111'."

    # Sequential checks
    digits = [int(c) for c in pin]
    is_asc = all(digits[i] + 1 == digits[i + 1] for i in range(len(digits) - 1))
    is_desc = all(digits[i] - 1 == digits[i + 1] for i in range(len(digits) - 1))
    if is_asc or is_desc:
        return False, "PIN is too easy to guess. Avoid consecutive numbers like '1234' or '4321'."

    # Common weak PINs
    common_weak = {
        "1212", "1122", "1313", "1414", "2024", "2025", "2026", "2580", "0852", "0123", "9876"
    }
    if pin in common_weak:
        return False, "PIN is too easy to guess. Please choose a more unique combination."

    return True, None


def validate_password(password: str) -> Tuple[bool, Optional[str]]:
    """Validate a middle/senior student, teacher, or parent password.
    Rules:
    - At least 8 characters
    - Cannot be purely numbers
    - Cannot be trivial known weak passwords
    """
    if not password or not isinstance(password, str):
        return False, "Password is required."

    if len(password) < 8:
        return False, "Password must be at least 8 characters long."

    if password.isdigit():
        return False, "Password cannot be numbers only. Include letters for security."

    trivial = {
        "password", "password123", "12345678", "qwertyuiop", "admin123",
        "welcome123", "parivestra", "student123", "teacher123"
    }
    if password.lower() in trivial:
        return False, "Password is too common. Please pick a stronger password."

    return True, None
