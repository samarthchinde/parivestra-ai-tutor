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

    # Safe column additions for SQLite users table
    with engine.connect() as conn:
        try:
            result = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            existing_cols = {row[1] for row in result}

            new_columns = [
                ("display_name", "VARCHAR(100) DEFAULT 'Kid Explorer'"),
                ("avatar", "VARCHAR(50) DEFAULT 'owl'"),
                ("grade", "VARCHAR(20) DEFAULT 'Class 3'"),
                ("pin_hash", "VARCHAR(128)"),
                ("xp", "INTEGER DEFAULT 0"),
                ("streak", "INTEGER DEFAULT 1"),
            ]

            for col_name, col_type in new_columns:
                if col_name not in existing_cols:
                    logger.info(f"Migrating users table: adding column {col_name}")
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
        except Exception as e:
            logger.warning(f"Database migration notice: {e}")


def init_db():
    """Create database tables and apply safe migrations."""
    run_migrations()
