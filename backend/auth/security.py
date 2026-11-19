"""Security and cryptographic utilities for Parivestra Authentication."""
import bcrypt
import hashlib
import random
import secrets
import string
from typing import Optional


def hash_secret(secret: str) -> str:
    """Hash password or PIN using bcrypt."""
    if not secret:
        raise ValueError("Secret cannot be empty")
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(secret.encode("utf-8"), salt).decode("utf-8")


def verify_secret(plain_secret: str, hashed_secret: Optional[str]) -> bool:
    """Verify plain password or PIN against bcrypt hash with constant-time protection."""
    if not plain_secret or not hashed_secret:
        return False
    try:
        return bcrypt.checkpw(plain_secret.encode("utf-8"), hashed_secret.encode("utf-8"))
    except Exception:
        return False


def generate_session_token() -> str:
    """Generate 32-byte cryptographically secure URL-safe random token."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """Hash session token using SHA-256 for secure database lookup."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_pin(digits: int = 4) -> str:
    """Generate random numeric PIN for junior grades (Classes 3 to 5)."""
    return "".join(secrets.choice(string.digits) for _ in range(digits))


def generate_password() -> str:
    """Generate memorable child-friendly password for middle/senior grades."""
    adjectives = ["swift", "bright", "clever", "cosmic", "brave", "solar", "lunar", "super", "happy", "golden"]
    nouns = ["robot", "star", "falcon", "tiger", "explorer", "wizard", "galaxy", "rocket", "comet", "spark"]
    num = secrets.randbelow(900) + 100  # 3-digit number
    return f"{secrets.choice(adjectives)}-{secrets.choice(nouns)}-{num}"


def generate_join_code(prefix: str = "PARI") -> str:
    """Generate unique 8-character uppercase class join code."""
    chars = "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(4))
    return f"{prefix}-{chars}"

