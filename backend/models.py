"""SQLAlchemy Database Models."""
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from backend.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(100), default="Student")
    created_at = Column(DateTime, default=utc_now)

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="user", cascade="all, delete-orphan")
    masteries = relationship("Mastery", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), default="Learning Session")
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), ForeignKey("sessions.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # system, user, assistant
    content = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)  # JSON string for citations, hint_level, etc.
    created_at = Column(DateTime, default=utc_now)

    session = relationship("Session", back_populates="messages")


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    subject = Column(String(100), nullable=False)
    topic = Column(String(100), nullable=False)
    difficulty = Column(String(50), nullable=False)
    question_id = Column(String(100), nullable=False)
    selected = Column(String(255), nullable=False)
    correct = Column(Boolean, nullable=False)
    hints_used = Column(Integer, default=0)
    time_taken = Column(Float, default=0.0)
    misconception_id = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="attempts")


class Mastery(Base):
    __tablename__ = "mastery"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    subject = Column(String(100), nullable=False)
    topic = Column(String(100), nullable=False)
    score = Column(Float, default=0.0)
    attempts = Column(Integer, default=0)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="masteries")


class LLMLog(Base):
    __tablename__ = "llm_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model = Column(String(100), nullable=False)
    latency_ms = Column(Float, nullable=False)
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    success = Column(Boolean, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
