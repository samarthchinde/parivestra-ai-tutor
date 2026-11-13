"""SQLAlchemy database engine, session management and safe migrations."""
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import DATABASE_URL

logger = logging.getLogger("backend.database")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency for yielding database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    """Safely migrate SQLite database schema without dropping existing tables."""
    from backend import models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Safe column additions for SQLite tables
    with engine.connect() as conn:
        try:
            # Users table migrations
            res_users = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            existing_user_cols = {row[1] for row in res_users}
            for col_name, col_type in [
                ("display_name", "VARCHAR(100) DEFAULT 'Kid Explorer'"),
                ("avatar", "VARCHAR(50) DEFAULT 'owl'"),
                ("grade", "VARCHAR(20) DEFAULT 'Class 3'"),
                ("pin_hash", "VARCHAR(128)"),
                ("xp", "INTEGER DEFAULT 0"),
                ("streak", "INTEGER DEFAULT 1"),
            ]:
                if col_name not in existing_user_cols:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))

            # Courses table migrations
            res_courses = conn.execute(text("PRAGMA table_info(courses)")).fetchall()
            existing_course_cols = {row[1] for row in res_courses}
            for col_name, col_type in [
                ("board", "VARCHAR(50) DEFAULT 'CBSE'"),
                ("unit_id", "VARCHAR(100)"),
            ]:
                if col_name not in existing_course_cols:
                    conn.execute(text(f"ALTER TABLE courses ADD COLUMN {col_name} {col_type}"))

            # Course modules table migrations
            res_modules = conn.execute(text("PRAGMA table_info(course_modules)")).fetchall()
            existing_mod_cols = {row[1] for row in res_modules}
            for col_name, col_type in [
                ("chapter_number", "INTEGER DEFAULT 1"),
                ("learning_objectives_json", "TEXT DEFAULT '[]'"),
                ("prerequisites_json", "TEXT DEFAULT '[]'"),
            ]:
                if col_name not in existing_mod_cols:
                    conn.execute(text(f"ALTER TABLE course_modules ADD COLUMN {col_name} {col_type}"))

            # Course lessons table migrations
            res_lessons = conn.execute(text("PRAGMA table_info(course_lessons)")).fetchall()
            existing_les_cols = {row[1] for row in res_lessons}
            for col_name, col_type in [
                ("status", "VARCHAR(50) DEFAULT 'outline'"),
                ("source_citations_json", "TEXT DEFAULT '[]'"),
            ]:
                if col_name not in existing_les_cols:
                    conn.execute(text(f"ALTER TABLE course_lessons ADD COLUMN {col_name} {col_type}"))

            conn.commit()
        except Exception as e:
            logger.warning(f"Database migration notice: {e}")


def init_db():
    """Create database tables and apply safe migrations."""
    run_migrations()
