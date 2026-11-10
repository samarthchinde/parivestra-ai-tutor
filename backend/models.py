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


class GeneratedQuestion(Base):
    __tablename__ = "generated_questions"

    id = Column(String(64), primary_key=True, index=True)
    subject = Column(String(100), nullable=False)
    topic = Column(String(100), nullable=False)
    difficulty = Column(String(50), nullable=False)
    question_hash = Column(String(64), index=True, nullable=False)
    stem = Column(Text, nullable=False)
    options = Column(Text, nullable=False)  # JSON list
    correct_index = Column(Integer, nullable=False)
    source_chunk_id = Column(String(64), nullable=True)
    status = Column(String(20), default="ready", index=True)
    created_at = Column(DateTime, default=utc_now)


class UserSeenQuestion(Base):
    __tablename__ = "user_seen_questions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    question_id = Column(String(64), nullable=False)
    question_hash = Column(String(64), index=True, nullable=False)
    seen_at = Column(DateTime, default=utc_now)


class GameSession(Base):
    __tablename__ = "game_sessions"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    game_type = Column(String(50), default="bughunt")
    score = Column(Integer, default=0)
    lives = Column(Integer, default=3)
    streak = Column(Integer, default=0)
    round_number = Column(Integer, default=1)
    current_snippet = Column(Text, nullable=False)
    current_buggy_line = Column(Integer, nullable=False)
    current_bug_type = Column(String(50), nullable=False)
    current_explanation = Column(Text, nullable=False)
    current_topic = Column(String(100), default="Python")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)


class GameScore(Base):
    __tablename__ = "game_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    user_name = Column(String(100), default="Student")
    score = Column(Integer, default=0)
    rounds_cleared = Column(Integer, default=0)
    played_at = Column(DateTime, default=utc_now)


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


class ResourceModel(Base):
    __tablename__ = "resources"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String(100), default="Python", index=True)
    topic = Column(String(100), default="General", index=True)
    tags = Column(Text, default="[]")  # JSON list
    file_type = Column(String(20), nullable=False)  # pdf, md, txt
    original_filename = Column(String(255), nullable=False)
    stored_path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)
    uploader = Column(String(100), default="Faculty")
    approved = Column(Boolean, default=False, index=True)
    indexed_chunks_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)

