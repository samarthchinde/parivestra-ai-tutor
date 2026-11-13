"""SQLAlchemy Database Models for Parivestra Kids Learning Platform."""
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
    name = Column(String(100), default="Kid Explorer")
    display_name = Column(String(100), default="Kid Explorer")
    avatar = Column(String(50), default="owl")
    grade = Column(String(20), default="Class 3")
    pin_hash = Column(String(128), nullable=True)
    xp = Column(Integer, default=0)
    streak = Column(Integer, default=1)
    created_at = Column(DateTime, default=utc_now)

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="user", cascade="all, delete-orphan")
    masteries = relationship("Mastery", back_populates="user", cascade="all, delete-orphan")
    lesson_progresses = relationship("LessonProgress", back_populates="user", cascade="all, delete-orphan")
    video_watches = relationship("VideoWatch", back_populates="user", cascade="all, delete-orphan")


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


# ========================================================
# COURSES & LESSONS MODELS
# ========================================================
class Course(Base):
    __tablename__ = "courses"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    subject = Column(String(100), nullable=False)
    grade = Column(String(50), nullable=False)  # Class 3, Class 4
    description = Column(Text, nullable=True)
    cover_key = Column(String(100), default="maths")
    status = Column(String(50), default="draft")  # draft, approved, published
    needs_review = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    modules = relationship("CourseModule", back_populates="course", cascade="all, delete-orphan", order_by="CourseModule.position")


class CourseModule(Base):
    __tablename__ = "course_modules"

    id = Column(String(64), primary_key=True, index=True)
    course_id = Column(String(64), ForeignKey("courses.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    position = Column(Integer, default=0)

    course = relationship("Course", back_populates="modules")
    lessons = relationship("CourseLesson", back_populates="module", cascade="all, delete-orphan", order_by="CourseLesson.position")


class CourseLesson(Base):
    __tablename__ = "course_lessons"

    id = Column(String(64), primary_key=True, index=True)
    module_id = Column(String(64), ForeignKey("course_modules.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    type = Column(String(50), default="story")  # story, video, practice, activity, game
    content_json = Column(Text, nullable=True)  # JSON payload for story slides / questions / activity instructions
    video_id = Column(String(64), nullable=True)
    topic = Column(String(100), nullable=True)
    position = Column(Integer, default=0)
    xp = Column(Integer, default=20)

    module = relationship("CourseModule", back_populates="lessons")


class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    lesson_id = Column(String(64), nullable=False, index=True)
    status = Column(String(50), default="completed")  # in_progress, completed
    score = Column(Float, default=100.0)
    completed_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="lesson_progresses")


# ========================================================
# VIDEO & STORY MODELS
# ========================================================
class Video(Base):
    __tablename__ = "videos"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    subject = Column(String(100), nullable=False)
    grade = Column(String(50), nullable=False)  # Class 3, Class 4
    topic = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    filename = Column(String(255), nullable=False)
    thumbnail = Column(String(255), nullable=True)
    duration_sec = Column(Integer, default=0)
    status = Column(String(50), default="approved")  # draft, approved
    created_at = Column(DateTime, default=utc_now)


class VideoWatch(Base):
    __tablename__ = "video_watches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    video_id = Column(String(64), ForeignKey("videos.id"), nullable=False, index=True)
    seconds = Column(Integer, default=0)
    completed = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="video_watches")


class VideoStory(Base):
    __tablename__ = "video_stories"

    id = Column(String(64), primary_key=True, index=True)
    topic = Column(String(100), nullable=False)
    grade = Column(String(50), nullable=False)
    subject = Column(String(100), nullable=False)
    scenes_json = Column(Text, nullable=False)  # 5-6 scenes JSON
    status = Column(String(50), default="draft")  # draft, approved
    needs_review = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)


# ========================================================
# CHILD SAFETY INCIDENT LOG (NO RAW FREE TEXT STORED)
# ========================================================
class SafetyIncident(Base):
    __tablename__ = "safety_incidents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), nullable=False, index=True)
    flag_type = Column(String(50), nullable=False)  # sensitive_emotion, personal_info, inappropriate
    created_at = Column(DateTime, default=utc_now)
