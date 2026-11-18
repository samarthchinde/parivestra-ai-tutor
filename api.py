"""FastAPI Application for Parivestra Kids AI Tutor & Learning Platform."""
import hashlib
import json
import logging
import os
from pathlib import Path
import re
import uuid
from typing import Any, Dict, List, Optional
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend import config
from backend.agents import (
    GraderAgent,
    MisconceptionAgent,
    PracticeAgent,
    ProgressAgent,
    RouterAgent,
    TutorAgent,
)
from backend.agents.grader_agent import GradeInput
from backend.agents.misconception_agent import MisconceptionInput
from backend.agents.practice_agent import GeneratePracticeInput
from backend.agents.router_agent import RouterInput
from backend.agents.tutor_agent import TutorInput
from backend.data.question_bank import load_bundled_questions
from backend.data.seed_courses import seed_default_courses
from backend.database import SessionLocal, get_db, init_db
from backend.llm.gateway import LLMGateway
from backend.rag.retriever import get_default_retriever
from backend.models import (
    Attempt,
    Course,
    CourseLesson,
    CourseModule,
    LessonProgress,
    Mastery,
    Message,
    SafetyIncident,
    Session as SessionModel,
    User,
    Video,
    VideoStory,
    VideoWatch,
    UnitProgress,
    GlossaryMastery,
    WorkbookCertificate,
)
from backend.video.provider import StoryPlayerProvider
from backend.routes.workbook_router import router as workbook_router
from backend.routes.auth_router import router as auth_router
from backend.auth.dependencies import get_current_user, get_active_grade

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

# Initialize database schema and migrations
init_db()

# Seed default Class 3 and Class 4 courses
with SessionLocal() as db_session:
    try:
        seed_default_courses(db_session)
    except Exception as e:
        logger.warning(f"Notice during course seeding: {e}")

app = FastAPI(
    title="Parivestra AI Tutor & Kids Learning API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Include Authentication and AI Workbooks routers
app.include_router(auth_router)
app.include_router(workbook_router)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS + ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
gateway = LLMGateway()
retriever = get_default_retriever()
router_agent = RouterAgent(gateway=gateway)
tutor_agent = TutorAgent(gateway=gateway)
practice_agent = PracticeAgent(gateway=gateway)
grader_agent = GraderAgent(gateway=gateway)
misconception_agent = MisconceptionAgent(gateway=gateway)
progress_agent = ProgressAgent()
story_provider = StoryPlayerProvider()

# Question bank lookup cache
bundled_questions = load_bundled_questions()
question_cache: Dict[str, Dict[str, Any]] = {q["id"]: q for q in bundled_questions}


# Global exception handler returning structured errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": str(exc),
            "type": type(exc).__name__,
            "path": request.url.path,
        },
    )


# ---------------------------------------------------------
# Dependencies: verify_admin (ADMIN_KEY fallback)
# ---------------------------------------------------------
# Dependency: Admin Key Authorization
def verify_admin(
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
):
    expected_key = getattr(config, "ADMIN_KEY", "parivestra_admin_secret")
    if not x_admin_key or not isinstance(x_admin_key, str) or x_admin_key.strip() != expected_key.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Valid X-Admin-Key header required.",
        )
    return True


def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.strip().encode("utf-8")).hexdigest()


# ---------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------
class LegacyQuestion(BaseModel):
    question: str


class TutorChatRequest(BaseModel):
    session_id: str = Field(..., description="Unique chat session ID")
    message: str = Field(..., description="Student message text")
    subject: Optional[str] = "Maths"
    topic: Optional[str] = None
    grade: Optional[str] = "Class 3"
    hint_level: Optional[int] = Field(default=0, ge=0, le=4)
    revision_mode: Optional[bool] = False


class PracticeGenerateRequest(BaseModel):
    subject: str = "Maths"
    topic: Optional[str] = None
    difficulty: str = "Beginner"
    count: int = Field(default=5, ge=1, le=20)
    grade: Optional[str] = "Class 3"


class PracticeSubmitRequest(BaseModel):
    question_id: str
    selected: str
    hints_used: Optional[int] = 0
    time_taken: Optional[float] = 0.0
    subject: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    grade: Optional[str] = None
    question: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    avatar: Optional[str] = None
    grade: Optional[str] = None


class GrownUpsVerifyRequest(BaseModel):
    pin: Optional[str] = None
    answer: Optional[str] = None  # For simple maths question challenge


class GrownUpsSetPinRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=6)


class LessonCompleteRequest(BaseModel):
    score: Optional[float] = 100.0


class CourseDraftRequest(BaseModel):
    subject: str = "Maths"
    grade: str = "Class 3"
    topic: str = "Shapes and Patterns"


class StoryGenerateRequest(BaseModel):
    subject: str = "EVS"
    grade: str = "Class 3"
    topic: str = "The Water Cycle"


class AdminApproveRequest(BaseModel):
    item_type: str  # 'course' or 'story'
    item_id: str


# ---------------------------------------------------------
# Core Endpoints
# ---------------------------------------------------------
@app.get("/")
def home():
    return {
        "app": "Parivestra Kids AI Learning Platform",
        "version": "2.0.0",
        "status": "online",
        "mascot": "Pari the Owl",
        "docs": "/docs",
    }


@app.get("/api/health")
def health_check():
    """Return backend status and LLM reachability."""
    llm_health = gateway.health_check()
    return {
        "status": "ok",
        "backend": "online",
        "llm": llm_health,
    }


# ---------------------------------------------------------
# User Profile & Identity
# ---------------------------------------------------------
@app.get("/api/user/profile")
def get_user_profile(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "display_name": user.display_name or user.name,
        "avatar": user.avatar or "owl",
        "grade": user.grade or "Class 3",
        "xp": user.xp or 0,
        "streak": user.streak or 1,
        "has_pin": bool(user.pin_hash),
    }


@app.post("/api/user/profile")
def update_user_profile(
    req: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.display_name is not None:
        user.display_name = req.display_name.strip()[:30]
        user.name = user.display_name
    if req.avatar is not None:
        user.avatar = req.avatar
    if req.grade is not None:
        user.grade = req.grade

    db.commit()
    db.refresh(user)
    return {
        "status": "updated",
        "user": {
            "id": user.id,
            "display_name": user.display_name,
            "avatar": user.avatar,
            "grade": user.grade,
            "xp": user.xp,
            "streak": user.streak,
        },
    }


@app.post("/api/user/reset")
def reset_user_progress(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Resets attempts, mastery, lesson progress and XP for the current child profile."""
    db.query(Attempt).filter(Attempt.user_id == user.id).delete()
    db.query(Mastery).filter(Mastery.user_id == user.id).delete()
    db.query(LessonProgress).filter(LessonProgress.user_id == user.id).delete()
    db.query(VideoWatch).filter(VideoWatch.user_id == user.id).delete()
    user.xp = 0
    user.streak = 1
    db.commit()
    return {"status": "reset", "message": "Child progress reset successfully"}


# ---------------------------------------------------------
# Grown-ups Gate & Admin Auth
# ---------------------------------------------------------
@app.post("/api/auth/grown-ups/verify")
def verify_grown_ups(
    req: GrownUpsVerifyRequest,
    user: User = Depends(get_current_user),
):
    """Verifies 4-digit PIN or simple adult math answer (e.g. 7 + 8 = 15)."""
    # 1. If PIN provided and user has set pin
    if req.pin and user.pin_hash:
        if hash_pin(req.pin) == user.pin_hash:
            return {"authenticated": True, "method": "pin"}
        return JSONResponse(status_code=400, content={"authenticated": False, "error": "Incorrect PIN"})

    # 2. If simple math question challenge answered (e.g. 15)
    if req.answer and req.answer.strip() in ["15", "12", "18", "21"]:
        return {"authenticated": True, "method": "math_challenge"}

    # Default fallback: allow math challenge
    return JSONResponse(status_code=400, content={"authenticated": False, "error": "Invalid PIN or challenge answer"})


@app.post("/api/auth/grown-ups/set-pin")
def set_grown_ups_pin(
    req: GrownUpsSetPinRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.pin_hash = hash_pin(req.pin)
    db.commit()
    return {"status": "pin_set", "message": "Grown-ups PIN updated successfully"}


# ---------------------------------------------------------
# Subjects Directory (Grade Scoped)
# ---------------------------------------------------------
@app.get("/api/subjects")
def get_subjects(active_grade: str = Depends(get_active_grade)):
    """Return available subjects scoped for the active grade, plus backward-compatible legacy subjects."""
    if not isinstance(active_grade, str):
        active_grade = "Class 3"

    digits = "".join(filter(str.isdigit, active_grade))
    grade_num = int(digits) if digits else 3

    if grade_num <= 5:
        # Classes 3 to 5: Maths, English, EVS, AI & Future Skills
        core_subjects = [
            {
                "id": "maths",
                "name": "Maths",
                "color": "#4C8DF6",
                "description": "Numbers, Place Value, Fun Addition, Shapes and Multiplication.",
                "topics": ["Numbers", "Addition", "Multiplication", "Fractions", "Shapes", "Patterns"],
            },
            {
                "id": "english",
                "name": "English",
                "color": "#FF7A66",
                "description": "Naming words (Nouns), Doing words (Verbs), Adjectives, and Sentences.",
                "topics": ["Nouns", "Verbs", "Adjectives", "Sentences", "Punctuation", "Reading"],
            },
            {
                "id": "evs",
                "name": "EVS",
                "color": "#3CCFA6",
                "description": "Living Plants, Animals & Habitats, Water Cycle, and Healthy Bodies.",
                "topics": ["Plants", "Animals", "Water", "Human Body", "Weather", "Community"],
            },
            {
                "id": "ai-skills",
                "name": "AI & Future Skills",
                "color": "#8B5CF6",
                "description": "Smart Machines, Sensors, How AI Sees, and Robot Rules.",
                "topics": ["Smart Machines", "Sensors", "Patterns", "Computer Vision", "Chatbots", "AI Ethics"],
            },
        ]
    elif 6 <= grade_num <= 8:
        # Classes 6 to 8: Maths, English, Science, Social Science, AI & Future Skills
        core_subjects = [
            {
                "id": "maths",
                "name": "Maths",
                "color": "#4C8DF6",
                "description": "Integers, Algebra, Linear Equations, Geometry and Data Handling.",
                "topics": ["Integers", "Algebra", "Equations", "Geometry", "Mensuration", "Data Handling"],
            },
            {
                "id": "english",
                "name": "English",
                "color": "#FF7A66",
                "description": "Grammar, Active/Passive Voice, Clauses, Reading and Creative Writing.",
                "topics": ["Tenses", "Voice", "Clauses", "Comprehension", "Creative Writing", "Vocabulary"],
            },
            {
                "id": "science",
                "name": "Science",
                "color": "#10B981",
                "description": "Motion, Light & Electricity, Living Organisms, Acids and Chemical Reactions.",
                "topics": ["Motion", "Light", "Electricity", "Organisms", "Acids & Bases", "Force"],
            },
            {
                "id": "social-science",
                "name": "Social Science",
                "color": "#F59E0B",
                "description": "Our Past, Globe & Maps, Indian Constitution, and Earth Resources.",
                "topics": ["History", "Geography", "Civics", "Resources", "Constitution"],
            },
            {
                "id": "ai-skills",
                "name": "AI & Future Skills",
                "color": "#8B5CF6",
                "description": "AI Project Cycle, Computer Vision, NLP, and Data Bias.",
                "topics": ["AI Project Cycle", "Computer Vision", "NLP", "Machine Learning", "Data Ethics"],
            },
        ]
    else:
        # Classes 9 and 10: Maths, English, Science, Social Science, AI & Future Skills
        core_subjects = [
            {
                "id": "maths",
                "name": "Maths",
                "color": "#4C8DF6",
                "description": "Real Numbers, Polynomials, Coordinate Geometry, Trigonometry and Statistics.",
                "topics": ["Real Numbers", "Polynomials", "Geometry", "Trigonometry", "Statistics", "Probability"],
            },
            {
                "id": "english",
                "name": "English",
                "color": "#FF7A66",
                "description": "Analytical Reading, Formal Writing, Advanced Grammar and Literature.",
                "topics": ["Analytical Reading", "Writing Skills", "Advanced Grammar", "Literature Studies"],
            },
            {
                "id": "science",
                "name": "Science",
                "color": "#10B981",
                "description": "Physics (Optics & Electricity), Chemistry (Reactions & Carbon), Biology (Life Processes).",
                "topics": ["Light & Optics", "Electricity", "Chemical Reactions", "Carbon Compounds", "Life Processes", "Genetics"],
            },
            {
                "id": "social-science",
                "name": "Social Science",
                "color": "#F59E0B",
                "description": "Contemporary World History, Democratic Politics, Economics and Resources.",
                "topics": ["India & World History", "Democratic Politics", "Economics", "Resource Development"],
            },
            {
                "id": "ai-skills",
                "name": "AI & Future Skills",
                "color": "#8B5CF6",
                "description": "Data Science & Pandas, Deep Learning Basics, Model Evaluation, and AI Law.",
                "topics": ["Data Science", "Neural Networks", "Model Evaluation", "AI Ethics & Law", "Future Careers"],
            },
        ]

    # Preserved for backward compatibility
    legacy_subjects = [
        {
            "id": "python",
            "name": "Python",
            "color": "#8A63F2",
            "description": "Beginner friendly visual coding and computer commands.",
            "topics": ["Introduction", "Variables", "Lists", "Functions"],
        },
        {
            "id": "ai",
            "name": "Artificial Intelligence",
            "color": "#6366F1",
            "description": "Principles and applications of intelligent systems.",
            "topics": ["Artificial Intelligence", "Machine Learning"],
        },
        {
            "id": "networks",
            "name": "Computer Networks",
            "color": "#0EA5E9",
            "description": "Protocols, topologies, and network architecture.",
            "topics": ["Networking Basics", "OSI Model"],
        },
    ]

    return {
        "grade": active_grade,
        "subjects": core_subjects + legacy_subjects,
    }


# ---------------------------------------------------------
# AI Tutor Chat
# ---------------------------------------------------------
@app.post("/api/tutor/chat")
def tutor_chat(
    req: TutorChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Streams the kid-safe tutor reply with Server-Sent Events."""
    session_obj = (
        db.query(SessionModel)
        .filter(SessionModel.id == req.session_id, SessionModel.user_id == user.id)
        .first()
    )
    if not session_obj:
        session_obj = SessionModel(
            id=req.session_id,
            user_id=user.id,
            title=f"Exploring {req.topic or req.subject or 'Adventure'}",
        )
        db.add(session_obj)
        db.commit()

    user_msg_db = Message(
        session_id=req.session_id,
        role="user",
        content=req.message,
    )
    db.add(user_msg_db)
    db.commit()

    recent_msgs = (
        db.query(Message)
        .filter(Message.session_id == req.session_id)
        .order_by(Message.created_at.asc())
        .limit(8)
        .all()
    )
    history_dicts = [{"role": m.role, "content": m.content} for m in recent_msgs]

    tutor_input = TutorInput(
        message=req.message,
        session_id=req.session_id,
        subject=req.subject,
        topic=req.topic,
        grade=req.grade or user.grade or "Class 3",
        hint_level=req.hint_level or 0,
        history=history_dicts,
        revision_mode=bool(req.revision_mode),
    )

    def sse_event_stream():
        full_response_tokens = []
        final_meta = {}
        for event in tutor_agent.explain_stream(tutor_input):
            if event["type"] == "token":
                full_response_tokens.append(event["token"])
                yield f"data: {json.dumps(event)}\n\n"
            elif event["type"] == "done":
                final_meta = event
                yield f"data: {json.dumps(event)}\n\n"

        try:
            with Session(db.get_bind()) as save_db:
                assistant_msg = Message(
                    session_id=req.session_id,
                    role="assistant",
                    content="".join(full_response_tokens),
                    metadata_json=json.dumps(final_meta),
                )
                save_db.add(assistant_msg)
                # Award 5 XP for thoughtful interaction
                u = save_db.query(User).filter(User.id == user.id).first()
                if u:
                    u.xp = (u.xp or 0) + 5
                save_db.commit()
        except Exception as err:
            logger.warning(f"Failed to persist message/xp: {err}")

    return StreamingResponse(sse_event_stream(), media_type="text/event-stream")


# ---------------------------------------------------------
# Practice & Games
# ---------------------------------------------------------
@app.post("/api/practice/generate")
def practice_generate(
    req: PracticeGenerateRequest,
    user: User = Depends(get_current_user),
):
    questions = practice_agent.generate(
        GeneratePracticeInput(
            subject=req.subject,
            topic=req.topic,
            difficulty=req.difficulty,
            count=req.count,
        )
    )
    for q in questions:
        question_cache[q.id] = q.model_dump()

    return {"questions": [q.model_dump() for q in questions]}


@app.post("/api/practice/submit")
def practice_submit(
    req: PracticeSubmitRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cached = question_cache.get(req.question_id, {})
    question_text = req.question or cached.get("question", "Unknown Question")
    options = req.options or cached.get("options", [])
    correct_answer = req.correct_answer or cached.get("answer", "")
    subject = req.subject or cached.get("subject", "Maths")
    topic = req.topic or cached.get("topic", "General")
    difficulty = req.difficulty or cached.get("difficulty", "Beginner")

    grade_res = grader_agent.grade(
        GradeInput(
            question=question_text,
            options=options,
            correct_answer=correct_answer,
            selected_answer=req.selected,
            topic=topic,
        )
    )

    misconception_res = None
    if not grade_res.is_correct:
        m_out = misconception_agent.match(
            MisconceptionInput(
                question=question_text,
                selected_answer=req.selected,
                correct_answer=correct_answer,
                topic=topic,
            )
        )
        if m_out.matched_id:
            misconception_res = m_out.model_dump()

    target_grade = req.grade or user.default_grade or user.grade or "Class 3"
    attempt = Attempt(
        user_id=user.id,
        grade=target_grade,
        subject=subject,
        topic=topic,
        difficulty=difficulty,
        question_id=req.question_id,
        selected=req.selected,
        correct=grade_res.is_correct,
        hints_used=req.hints_used or 0,
        time_taken=req.time_taken or 0.0,
        misconception_id=misconception_res["matched_id"] if misconception_res else None,
    )
    db.add(attempt)

    # Award XP: 15 on correct, 5 on attempt
    earned_xp = 15 if grade_res.is_correct else 5
    user.xp = (user.xp or 0) + earned_xp
    db.commit()

    updated_mastery = progress_agent.update_mastery(
        db=db,
        user_id=user.id,
        subject=subject,
        topic=topic,
        correct=grade_res.is_correct,
        grade=target_grade,
    )

    return {
        "correct": grade_res.is_correct,
        "correct_answer": grade_res.correct_answer,
        "selected": req.selected,
        "explanation": grade_res.explanation,
        "misconception": misconception_res,
        "mastery": updated_mastery.model_dump(),
        "earned_xp": earned_xp,
        "total_xp": user.xp,
    }


# ---------------------------------------------------------
# Courses & Lessons
# ---------------------------------------------------------
@app.get("/api/courses")
def get_courses(
    grade: Optional[str] = None,
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    active_grade: str = Depends(get_active_grade),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Course)
    # If not admin, students only see approved/published courses
    expected_key = getattr(config, "ADMIN_KEY", "parivestra_admin_secret")
    is_admin = isinstance(x_admin_key, str) and x_admin_key.strip() == expected_key.strip()
    if not is_admin:
        query = query.filter(Course.status.in_(["approved", "published"]))

    effective_grade = grade if isinstance(grade, str) else (active_grade if isinstance(active_grade, str) else getattr(user, "default_grade", None) or getattr(user, "grade", "Class 3"))
    if effective_grade and str(effective_grade).lower() != "all":
        query = query.filter(Course.grade == str(effective_grade))

    courses = query.order_by(Course.created_at.asc()).all()

    # Calculate completed lessons for student
    completed_ids = {
        lp.lesson_id for lp in db.query(LessonProgress).filter(
            LessonProgress.user_id == user.id, LessonProgress.status == "completed"
        ).all()
    }

    results = []
    for c in courses:
        all_lesson_ids = [l.id for m in c.modules for l in m.lessons]
        total = len(all_lesson_ids)
        done = sum(1 for lid in all_lesson_ids if lid in completed_ids)
        pct = round((done / total * 100)) if total > 0 else 0

        results.append({
            "id": c.id,
            "title": c.title,
            "subject": c.subject,
            "grade": c.grade,
            "description": c.description,
            "cover_key": c.cover_key,
            "status": c.status,
            "needs_review": c.needs_review,
            "total_lessons": total,
            "completed_lessons": done,
            "progress_percentage": pct,
        })

    return {"courses": results}


@app.get("/api/courses/{course_id}")
def get_course_detail(
    course_id: str,
    active_grade: str = Depends(get_active_grade),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    effective_grade = active_grade if isinstance(active_grade, str) else (getattr(user, "default_grade", None) or getattr(user, "grade", "Class 3"))
    # If student cannot switch grades and course is from another grade
    if getattr(user, "role", "student") == "student" and getattr(user, "class_id", None):
        from backend.models import Class as ClassModel
        cls = db.query(ClassModel).filter(ClassModel.id == user.class_id).first()
        if cls and not cls.allow_grade_switch and course.grade != cls.grade:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This course is from {course.grade}. Your teacher has locked learning to {cls.grade}.",
            )

    completed_ids = {
        lp.lesson_id for lp in db.query(LessonProgress).filter(
            LessonProgress.user_id == user.id, LessonProgress.status == "completed"
        ).all()
    }

    modules_data = []
    for mod in course.modules:
        lessons_data = []
        for les in mod.lessons:
            lessons_data.append({
                "id": les.id,
                "title": les.title,
                "type": les.type,
                "topic": les.topic,
                "position": les.position,
                "xp": les.xp,
                "is_completed": les.id in completed_ids,
            })
        modules_data.append({
            "id": mod.id,
            "title": mod.title,
            "position": mod.position,
            "lessons": lessons_data,
        })

    return {
        "id": course.id,
        "title": course.title,
        "subject": course.subject,
        "grade": course.grade,
        "description": course.description,
        "cover_key": course.cover_key,
        "status": course.status,
        "needs_review": course.needs_review,
        "modules": modules_data,
    }


@app.get("/api/courses/{course_id}/lessons/{lesson_id}")
def get_lesson_content(
    course_id: str,
    lesson_id: str,
    active_grade: str = Depends(get_active_grade),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    course = db.query(Course).filter(Course.id == course_id).first()
    if course and getattr(user, "role", "student") == "student" and getattr(user, "class_id", None):
        from backend.models import Class as ClassModel
        cls = db.query(ClassModel).filter(ClassModel.id == user.class_id).first()
        if cls and not cls.allow_grade_switch and course.grade != cls.grade:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This lesson is from {course.grade}. Your teacher has locked learning to {cls.grade}.",
            )

    parsed_content = {}
    if lesson.content_json:
        try:
            parsed_content = json.loads(lesson.content_json)
        except Exception:
            parsed_content = {"raw": lesson.content_json}

    return {
        "id": lesson.id,
        "title": lesson.title,
        "type": lesson.type,
        "topic": lesson.topic,
        "xp": lesson.xp,
        "content": parsed_content,
    }


@app.post("/api/courses/{course_id}/lessons/{lesson_id}/complete")
def complete_lesson(
    course_id: str,
    lesson_id: str,
    req: LessonCompleteRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lesson = db.query(CourseLesson).filter(CourseLesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    course = db.query(Course).filter(Course.id == course_id).first()
    course_grade = course.grade if course else "Class 3"

    prog = db.query(LessonProgress).filter(
        LessonProgress.user_id == user.id, LessonProgress.lesson_id == lesson_id
    ).first()

    first_time = False
    if not prog:
        first_time = True
        prog = LessonProgress(
            user_id=user.id,
            lesson_id=lesson_id,
            grade=course_grade,
            status="completed",
            score=req.score or 100.0,
        )
        db.add(prog)
    else:
        prog.status = "completed"
        prog.grade = course_grade
        prog.score = max(prog.score, req.score or 100.0)

    # Award XP on first completion
    xp_awarded = lesson.xp if first_time else 5
    user.xp = (user.xp or 0) + xp_awarded
    db.commit()

    return {
        "status": "completed",
        "lesson_id": lesson_id,
        "xp_awarded": xp_awarded,
        "total_xp": user.xp,
    }


@app.get("/api/courses/progress")
def get_courses_progress(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    completed = db.query(LessonProgress).filter(
        LessonProgress.user_id == user.id, LessonProgress.status == "completed"
    ).all()
    return {
        "completed_count": len(completed),
        "completed_lessons": [p.lesson_id for p in completed],
    }


# ---------------------------------------------------------
# Admin Course Draft Generation (LLM Outline)
# ---------------------------------------------------------
@app.post("/api/courses/generate-draft")
def generate_course_draft(
    req: CourseDraftRequest,
    is_admin: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Uses LLM to draft a 3-module Class 3-4 course outline as draft needing review."""
    prompt = (
        f"Create a 3-module course syllabus for children in {req.grade} about {req.subject}: '{req.topic}'.\n"
        "Return ONLY a valid JSON object matching this schema:\n"
        "{\n"
        "  \"title\": \"Course Title\",\n"
        "  \"description\": \"1 sentence description\",\n"
        "  \"modules\": [\n"
        "    {\n"
        "      \"title\": \"Module 1 Title\",\n"
        "      \"lessons\": [\n"
        "        {\"title\": \"Lesson 1\", \"type\": \"story\", \"xp\": 20},\n"
        "        {\"title\": \"Lesson 2\", \"type\": \"practice\", \"xp\": 25},\n"
        "        {\"title\": \"Lesson 3\", \"type\": \"activity\", \"xp\": 15}\n"
        "      ]\n"
        "    }\n"
        "  ]\n"
        "}"
    )

    try:
        raw_res = gateway.chat([{"role": "user", "content": prompt}], stream=False, max_tokens=600)
        json_match = re.search(r"\{[\s\S]*\}", raw_res)
        if json_match:
            data = json.loads(json_match.group(0))
        else:
            raise ValueError("No JSON block found in response")
    except Exception as e:
        logger.warning(f"Draft course fallback due to: {e}")
        data = {
            "title": f"Fun with {req.topic}",
            "description": f"Learn key foundational concepts about {req.topic} with Pari!",
            "modules": [
                {
                    "title": f"Module 1: Introduction to {req.topic}",
                    "lessons": [
                        {"title": f"Exploring {req.topic}", "type": "story", "xp": 20},
                        {"title": f"Practice with {req.topic}", "type": "practice", "xp": 25},
                    ],
                }
            ],
        }

    course_id = f"c_{uuid.uuid4().hex[:8]}"
    course = Course(
        id=course_id,
        title=data.get("title", f"Fun with {req.topic}"),
        subject=req.subject,
        grade=req.grade,
        description=data.get("description", ""),
        cover_key=req.subject.lower(),
        status="draft",
        needs_review=True,
    )
    db.add(course)
    db.flush()

    for m_idx, m_data in enumerate(data.get("modules", [])[:3]):
        mod_id = f"m_{uuid.uuid4().hex[:8]}"
        module = CourseModule(
            id=mod_id,
            course_id=course.id,
            title=m_data.get("title", f"Module {m_idx + 1}"),
            position=m_idx + 1,
        )
        db.add(module)
        db.flush()

        for l_idx, l_data in enumerate(m_data.get("lessons", [])[:3]):
            lesson = CourseLesson(
                id=f"l_{uuid.uuid4().hex[:8]}",
                module_id=module.id,
                title=l_data.get("title", f"Lesson {l_idx + 1}"),
                type=l_data.get("type", "story"),
                topic=req.topic,
                position=l_idx + 1,
                xp=l_data.get("xp", 20),
            )
            db.add(lesson)

    db.commit()
    return {"status": "draft_created", "course_id": course.id, "needs_review": True}


@app.post("/api/courses/{course_id}/modules/{module_id}/generate")
def generate_course_module_draft_endpoint(
    course_id: str,
    module_id: str,
    is_admin: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Uses LLM to generate grounded lessons for a specific module/chapter."""
    from backend.courses.generator import generate_module_draft
    result = generate_module_draft(
        course_id=course_id,
        module_id=module_id,
        db=db,
        gateway=gateway,
        retriever=retriever,
    )
    return result


@app.get("/api/courses/coverage")
def get_courses_coverage(
    grade: Optional[str] = None,
    subject: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Reports course and chapter coverage: total chapters, outline vs draft vs approved vs published,
    and chapters needing source material per grade & subject."""
    query = db.query(Course)
    if grade and grade.lower() != "all":
        query = query.filter(Course.grade == grade)
    if subject and subject.lower() != "all":
        query = query.filter(Course.subject.ilike(subject))
    courses = query.all()

    total_courses = len(courses)
    total_chapters = 0
    status_counts = {"outline": 0, "draft": 0, "approved": 0, "published": 0}
    by_grade = {}
    by_subject = {}
    needing_sources = []

    for c in courses:
        g = c.grade
        s = c.subject
        if g not in by_grade:
            by_grade[g] = {"total_courses": 0, "total_chapters": 0, "outline": 0, "draft": 0, "approved": 0, "published": 0}
        if s not in by_subject:
            by_subject[s] = {"total_courses": 0, "total_chapters": 0, "outline": 0, "draft": 0, "approved": 0, "published": 0}

        by_grade[g]["total_courses"] += 1
        by_subject[s]["total_courses"] += 1

        for m in c.modules:
            total_chapters += 1
            by_grade[g]["total_chapters"] += 1
            by_subject[s]["total_chapters"] += 1

            mod_status = c.status
            if not m.lessons or all(l.type == "outline" for l in m.lessons):
                mod_status = "outline"
            elif any(l.status == "draft" for l in m.lessons) or c.status == "draft":
                mod_status = "draft"
            elif c.status in ("approved", "published"):
                mod_status = c.status

            if mod_status in status_counts:
                status_counts[mod_status] += 1
                by_grade[g][mod_status] = by_grade[g].get(mod_status, 0) + 1
                by_subject[s][mod_status] = by_subject[s].get(mod_status, 0) + 1

            # Check if retriever has sources for this chapter
            sources = retriever.retrieve(query=m.title, top_k=1, subject=c.subject, grade=c.grade)
            if not sources:
                needing_sources.append({
                    "course_id": c.id,
                    "course_title": c.title,
                    "module_id": m.id,
                    "module_title": m.title,
                    "grade": c.grade,
                    "subject": c.subject,
                })

    ready = status_counts["approved"] + status_counts["published"]
    coverage_pct = round((ready / total_chapters * 100), 1) if total_chapters > 0 else 0.0

    return {
        "total_courses": total_courses,
        "total_chapters": total_chapters,
        "status_counts": status_counts,
        "coverage_percentage": coverage_pct,
        "by_grade": by_grade,
        "by_subject": by_subject,
        "needing_sources_count": len(needing_sources),
        "needing_sources": needing_sources,
    }


# ---------------------------------------------------------
# Dynamic Curriculum & Learning Path Endpoints
# ---------------------------------------------------------
@app.get("/api/curriculum/{board}/{grade}/{subject}")
def get_curriculum_endpoint(
    board: str,
    grade: str,
    subject: str,
    db: Session = Depends(get_db),
):
    """Retrieves standard curriculum units and topological learning path order."""
    from backend.curriculum.loader import load_curriculum, get_chapters_for_learning_path
    data = load_curriculum(board=board, grade=grade, subject=subject)
    if not data:
        raise HTTPException(status_code=404, detail=f"Curriculum not found for {board} {grade} {subject}")

    path = get_chapters_for_learning_path(board=board, grade=grade, subject=subject)
    return {
        "board": data.get("board", board),
        "grade": data.get("grade", grade),
        "subject": data.get("subject", subject),
        "units": data.get("units", []),
        "learning_path": path,
    }


@app.post("/api/library/upload")
async def upload_library_resource(
    file: UploadFile = File(...),
    grade: str = Form(...),
    subject: str = Form(...),
    chapter: Optional[str] = Form(None),
    is_admin: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Uploads teacher textbook notes or lesson resources to Library and updates retriever index."""
    from backend.rag.retriever import Chunk
    filename = secure_filename(file.filename) if "secure_filename" in globals() else file.filename.replace(" ", "_")
    content_bytes = await file.read()
    try:
        content_text = content_bytes.decode("utf-8")
    except Exception:
        content_text = content_bytes.decode("latin-1", errors="ignore")

    save_dir = Path("knowledge_base") / "library" / grade.lower().replace(" ", "_") / subject.lower()
    save_dir.mkdir(parents=True, exist_ok=True)
    file_path = save_dir / filename
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content_text)

    # Ingest directly into active retriever
    chunk_id = f"lib_{grade.lower()}_{subject.lower()}_{file_path.stem}"
    new_chunk = Chunk(
        id=chunk_id,
        title=file_path.stem.replace("_", " ").title(),
        subject=subject,
        topic=chapter or file_path.stem.replace("_", " ").title(),
        content=content_text,
        metadata={
            "source": filename,
            "grade": grade,
            "chapter": chapter or "general",
            "type": "teacher_upload",
        },
    )
    retriever.chunks.append(new_chunk)
    # Re-tokenize bm25
    from backend.rag.retriever import tokenize
    from rank_bm25 import BM25Okapi
    retriever.corpus_tokens.append(
        tokenize(f"{new_chunk.title} {new_chunk.subject} {new_chunk.topic} {new_chunk.content}")
    )
    retriever.bm25 = BM25Okapi(retriever.corpus_tokens)

    return {
        "status": "uploaded",
        "filename": filename,
        "grade": grade,
        "subject": subject,
        "chapter": chapter,
        "chunk_id": chunk_id,
    }




# ---------------------------------------------------------
# Videos & Story Lessons
# ---------------------------------------------------------
@app.get("/api/videos")
def get_videos(
    grade: Optional[str] = None,
    subject: Optional[str] = None,
    active_grade: str = Depends(get_active_grade),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Video).filter(Video.status == "approved")
    target_grade = grade if isinstance(grade, str) else (active_grade if isinstance(active_grade, str) else getattr(user, "default_grade", None) or getattr(user, "grade", "Class 3"))
    if target_grade and str(target_grade).lower() != "all":
        query = query.filter(Video.grade == str(target_grade))
    if subject and str(subject).lower() != "all":
        query = query.filter(Video.subject.ilike(str(subject)))

    videos = query.order_by(Video.created_at.desc()).all()

    # Also retrieve approved stories for player matching target_grade
    story_query = db.query(VideoStory).filter(VideoStory.status == "approved")
    if target_grade and str(target_grade).lower() != "all":
        story_query = story_query.filter(VideoStory.grade == str(target_grade))
    stories = story_query.all()

    return {
        "videos": [
            {
                "id": v.id,
                "title": v.title,
                "subject": v.subject,
                "grade": v.grade,
                "topic": v.topic,
                "description": v.description,
                "duration_sec": v.duration_sec,
                "thumbnail": v.thumbnail,
            }
            for v in videos
        ],
        "stories": [
            {
                "id": s.id,
                "title": f"Story: {s.topic}",
                "topic": s.topic,
                "subject": s.subject,
                "grade": s.grade,
                "scene_count": len(json.loads(s.scenes_json)),
            }
            for s in stories
        ],
    }


@app.get("/api/videos/story/{story_id}")
def get_story_detail(story_id: str, db: Session = Depends(get_db)):
    story = db.query(VideoStory).filter(VideoStory.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return {
        "id": story.id,
        "topic": story.topic,
        "grade": story.grade,
        "subject": story.subject,
        "scenes": json.loads(story.scenes_json),
        "status": story.status,
    }


@app.post("/api/videos/story/generate")
def generate_story(
    req: StoryGenerateRequest,
    is_admin: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Admin-only: Generates 5-6 animated story scenes with simple words and reading level check."""
    story_out = story_provider.generate_story(
        topic=req.topic,
        grade=req.grade,
        subject=req.subject,
    )

    story_id = f"story_{uuid.uuid4().hex[:8]}"
    story = VideoStory(
        id=story_id,
        topic=story_out.topic,
        grade=story_out.grade,
        subject=story_out.subject,
        scenes_json=json.dumps([s.model_dump() for s in story_out.scenes]),
        status="draft",
        needs_review=True,
    )
    db.add(story)
    db.commit()
    return {"status": "story_generated", "story_id": story_id, "needs_review": True}


@app.get("/api/videos/{video_id}/stream")
def stream_video(video_id: str, request: Request, db: Session = Depends(get_db)):
    """Streams uploaded local video with HTTP Range request support for seeking."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video record not found")

    video_dir = Path("data/videos")
    file_path = video_dir / video.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video file missing from data/videos storage")

    file_size = file_path.stat().st_size
    range_header = request.headers.get("range")
    content_type = "video/webm" if video.filename.endswith(".webm") else "video/mp4"

    if range_header:
        range_match = re.search(r"bytes=(\d+)-(\d*)", range_header)
        start = int(range_match.group(1)) if range_match else 0
        end = int(range_match.group(2)) if range_match and range_match.group(2) else file_size - 1
        length = end - start + 1

        def iter_range():
            with open(file_path, "rb") as f:
                f.seek(start)
                left = length
                while left > 0:
                    read_len = min(64 * 1024, left)
                    data = f.read(read_len)
                    if not data:
                        break
                    left -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length),
            "Content-Type": content_type,
        }
        return StreamingResponse(iter_range(), status_code=206, headers=headers)
    else:
        def iter_full():
            with open(file_path, "rb") as f:
                while chunk := f.read(64 * 1024):
                    yield chunk

        headers = {
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Content-Type": content_type,
        }
        return StreamingResponse(iter_full(), status_code=200, headers=headers)


@app.post("/api/videos/upload")
async def upload_video(
    title: str = Form(...),
    subject: str = Form(...),
    grade: str = Form(...),
    topic: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    is_admin: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Admin-only: Uploads mp4 or webm video (max 200MB) securely into data/videos/."""
    ext = Path(file.filename).suffix.lower()
    if ext not in [".mp4", ".webm"]:
        raise HTTPException(status_code=400, detail="Only .mp4 and .webm video files are permitted.")

    video_dir = Path("data/videos")
    video_dir.mkdir(parents=True, exist_ok=True)

    stored_name = f"{uuid.uuid4().hex}{ext}"
    target_path = video_dir / stored_name

    total_bytes = 0
    max_bytes = 200 * 1024 * 1024  # 200 MB limit

    with open(target_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            total_bytes += len(chunk)
            if total_bytes > max_bytes:
                target_path.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="Video exceeds maximum size limit of 200 MB.")
            buffer.write(chunk)

    video_id = f"vid_{uuid.uuid4().hex[:8]}"
    video = Video(
        id=video_id,
        title=title,
        subject=subject,
        grade=grade,
        topic=topic or title,
        description=description,
        filename=stored_name,
        duration_sec=120,
        status="approved",
    )
    db.add(video)
    db.commit()
    return {"status": "uploaded", "video_id": video.id, "filename": stored_name}


# ---------------------------------------------------------
# Admin Approval Queue & Safety Management
# ---------------------------------------------------------
@app.get("/api/admin/queue")
def get_admin_queue(
    is_admin: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Returns content requiring teacher review and safety incident flags."""
    courses_review = db.query(Course).filter(Course.needs_review == True).all()
    stories_review = db.query(VideoStory).filter(VideoStory.needs_review == True).all()
    safety_incidents = db.query(SafetyIncident).order_by(SafetyIncident.created_at.desc()).limit(20).all()

    return {
        "courses": [
            {
                "id": c.id,
                "title": c.title,
                "subject": c.subject,
                "grade": c.grade,
                "status": c.status,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in courses_review
        ],
        "stories": [
            {
                "id": s.id,
                "topic": s.topic,
                "subject": s.subject,
                "grade": s.grade,
                "status": s.status,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in stories_review
        ],
        "safety_incidents": [
            {
                "id": inc.id,
                "flag_type": inc.flag_type,
                "timestamp": inc.created_at.isoformat() if inc.created_at else None,
            }
            for inc in safety_incidents
        ],
    }


@app.post("/api/admin/approve")
def approve_content(
    req: AdminApproveRequest,
    is_admin: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    if req.item_type == "course":
        course = db.query(Course).filter(Course.id == req.item_id).first()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        course.status = "approved"
        course.needs_review = False
        db.commit()
        return {"status": "approved", "item_id": req.item_id}
    elif req.item_type == "story":
        story = db.query(VideoStory).filter(VideoStory.id == req.item_id).first()
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")
        story.status = "approved"
        story.needs_review = False
        db.commit()
        return {"status": "approved", "item_id": req.item_id}

    raise HTTPException(status_code=400, detail="Invalid item_type")


# ---------------------------------------------------------
# Progress, Report Card & Legacy Endpoints
# ---------------------------------------------------------
@app.get("/api/progress")
def get_progress(
    grade: Optional[str] = None,
    active_grade: str = Depends(get_active_grade),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_grade = grade if isinstance(grade, str) else (active_grade if isinstance(active_grade, str) else getattr(user, "default_grade", None) or getattr(user, "grade", "Class 3"))
    summary = progress_agent.get_progress_summary(db=db, user_id=user.id, grade=target_grade).model_dump()
    summary["active_grade"] = target_grade
    summary["total_xp_across_grades"] = getattr(user, "xp", 0) or 0
    return summary


@app.get("/api/report-card")
def get_report_card(
    grade: Optional[str] = None,
    active_grade: str = Depends(get_active_grade),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns comprehensive report card for the requested/active grade.
    Includes per-subject averages, mastery, lessons completed, workbook units completed, stars, and recent activity.
    """
    raw_grade = grade if isinstance(grade, str) else (active_grade if isinstance(active_grade, str) else getattr(user, "default_grade", None) or getattr(user, "grade", "Class 3"))
    digits = "".join(filter(str.isdigit, str(raw_grade)))
    grade_num = int(digits) if digits else 3
    norm_grade = f"Class {grade_num}"

    # 1. Attempts and scores by subject in this grade
    attempts = db.query(Attempt).filter(Attempt.user_id == user.id, Attempt.grade == norm_grade).all()
    subject_attempts = {}
    for a in attempts:
        subject_attempts.setdefault(a.subject, []).append(a)

    # 2. Masteries for this grade
    masteries = db.query(Mastery).filter(Mastery.user_id == user.id, Mastery.grade == norm_grade).all()
    subject_mastery = {}
    for m in masteries:
        subject_mastery.setdefault(m.subject, []).append(m.score)

    # Compile subjects metrics
    if grade_num <= 5:
        expected_subs = ["Maths", "English", "EVS", "AI & Future Skills"]
    elif 6 <= grade_num <= 8:
        expected_subs = ["Maths", "English", "Science", "Social Science", "AI & Future Skills"]
    else:
        expected_subs = ["Maths", "English", "Science", "Social Science", "AI & Future Skills"]

    all_subject_names = list(set(expected_subs + list(subject_attempts.keys()) + list(subject_mastery.keys())))

    subject_cards = []
    for sub in sorted(all_subject_names):
        sub_atts = subject_attempts.get(sub, [])
        total_quizzes = len(sub_atts)
        correct_count = sum(1 for a in sub_atts if a.correct)
        quiz_avg = round((correct_count / total_quizzes * 100), 1) if total_quizzes > 0 else 0.0

        scores = subject_mastery.get(sub, [])
        avg_mastery = round(sum(scores) / len(scores), 1) if scores else 0.0

        subject_cards.append({
            "subject": sub,
            "quiz_attempts": total_quizzes,
            "quiz_accuracy": quiz_avg,
            "mastery_score": avg_mastery,
            "status": "Proficient" if avg_mastery >= 75 or quiz_avg >= 75 else "Developing" if (total_quizzes > 0 or scores) else "Not Started",
        })

    # 3. Lessons completed for courses of this grade
    lessons_done = (
        db.query(LessonProgress)
        .filter(LessonProgress.user_id == user.id, LessonProgress.grade == norm_grade, LessonProgress.status == "completed")
        .count()
    )

    # 4. Workbook units and stars in this grade
    wb_units = db.query(UnitProgress).filter(UnitProgress.user_id == user.id, UnitProgress.grade == grade_num).all()
    wb_completed = sum(1 for u in wb_units if u.status == "completed")
    wb_stars = sum(u.stars or 0 for u in wb_units)

    # 5. Glossary words mastered in this grade
    words_mastered = (
        db.query(GlossaryMastery)
        .filter(GlossaryMastery.user_id == user.id, GlossaryMastery.grade == grade_num, GlossaryMastery.mastered == True)
        .count()
    )

    # 6. Certificates earned in this grade
    certs = (
        db.query(WorkbookCertificate)
        .filter(WorkbookCertificate.user_id == user.id, WorkbookCertificate.grade == grade_num)
        .all()
    )

    # 7. Recent activity in this grade
    recent = (
        db.query(Attempt)
        .filter(Attempt.user_id == user.id, Attempt.grade == norm_grade)
        .order_by(Attempt.created_at.desc())
        .limit(10)
        .all()
    )
    recent_activity = [
        {
            "id": r.id,
            "subject": r.subject,
            "topic": r.topic,
            "correct": r.correct,
            "time_taken": r.time_taken,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in recent
    ]

    total_grade_xp = sum(15 if a.correct else 5 for a in attempts) + (wb_completed * 20) + (lessons_done * 20)

    return {
        "status": "ok",
        "student": {
            "id": user.id,
            "display_name": user.display_name or user.name,
            "avatar": user.avatar or "owl",
            "grade": norm_grade,
        },
        "grade": norm_grade,
        "grade_num": grade_num,
        "subjects": subject_cards,
        "lessons_completed": lessons_done,
        "workbook_units_completed": wb_completed,
        "workbook_stars": wb_stars,
        "words_mastered": words_mastered,
        "certificates_count": len(certs),
        "grade_xp": total_grade_xp,
        "total_xp_across_grades": user.xp or 0,
        "streak": user.streak or 1,
        "recent_activity": recent_activity,
    }


@app.post("/ask")
def ask_legacy(data: LegacyQuestion):
    """Legacy backward-compatible endpoint for POST /ask."""
    out = tutor_agent.explain(
        TutorInput(
            message=data.question,
            session_id="legacy_session",
            hint_level=0,
        )
    )
    return {
        "success": True,
        "topic": "General",
        "type": "AI Tutor Response",
        "response": out.response,
        "citations": [c.model_dump() for c in out.citations],
    }
