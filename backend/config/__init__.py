"""Application Configuration."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(ROOT_DIR / ".env")

LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "http://localhost:8000/v1")
LLM_MODEL: str = os.getenv("LLM_MODEL", "gemma-4")
LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.2"))
LLM_MAX_TOKENS: int = int(os.getenv("LLM_MAX_TOKENS", "1024"))
LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "openai").lower()

DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{ROOT_DIR / 'parivestra.db'}")
ADMIN_KEY: str = os.getenv("ADMIN_KEY", "parivestra_admin_secret")
AUTH_REQUIRED: bool = os.getenv("AUTH_REQUIRED", "true").lower() in ("true", "1", "yes")
SECRET_KEY: str = os.getenv("SECRET_KEY", "parivestra_super_secure_secret_key_2026")
SESSION_HOURS: int = int(os.getenv("SESSION_HOURS", "24"))
SESSION_IDLE_MINUTES: int = int(os.getenv("SESSION_IDLE_MINUTES", "30"))
STUDENT_SESSION_IDLE_MINUTES: int = int(os.getenv("STUDENT_SESSION_IDLE_MINUTES", "20"))

CORS_ORIGINS: list[str] = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

