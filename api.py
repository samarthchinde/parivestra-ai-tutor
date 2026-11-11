"""FastAPI Application for Parivestra AI Tutor."""
import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
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
from backend.database import get_db, init_db
from backend.llm.gateway import LLMGateway
from backend.models import Attempt, Message, Session as SessionModel, User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("api")

# Initialize SQLite database
init_db()

app = FastAPI(
    title="Parivestra AI Tutor API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

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
router_agent = RouterAgent(gateway=gateway)
tutor_agent = TutorAgent(gateway=gateway)
practice_agent = PracticeAgent(gateway=gateway)
grader_agent = GraderAgent(gateway=gateway)
misconception_agent = MisconceptionAgent(gateway=gateway)
progress_agent = ProgressAgent()

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


# Dependency: User Identity from X-User-Id header
def get_current_user(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    db: Session = Depends(get_db),
) -> User:
    uid = x_user_id.strip() if x_user_id and x_user_id.strip() else "student_default"
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        user = User(id=uid, name="Student")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


# ---------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------
class LegacyQuestion(BaseModel):
    question: str


class TutorChatRequest(BaseModel):
    session_id: str = Field(..., description="Unique chat session ID")
    message: str = Field(..., description="Student message text")
    subject: Optional[str] = "Python"
    topic: Optional[str] = None
    hint_level: Optional[int] = Field(default=0, ge=0, le=4)


class PracticeGenerateRequest(BaseModel):
    subject: str = "Python"
    topic: Optional[str] = None
    difficulty: str = "Beginner"
    count: int = Field(default=5, ge=1, le=20)


class PracticeSubmitRequest(BaseModel):
    question_id: str
    selected: str
    hints_used: Optional[int] = 0
    time_taken: Optional[float] = 0.0
    subject: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None
    question: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None


# ---------------------------------------------------------
# Endpoints
# ---------------------------------------------------------
@app.get("/")
def home():
    return {
        "app": "Parivestra AI Tutor",
        "version": "1.0.0",
        "status": "online",
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


@app.get("/api/subjects")
def get_subjects():
    """Return available subjects and their topics."""
    return {
        "subjects": [
            {
                "id": "python",
                "name": "Python",
                "description": "General-purpose programming language for web, automation, and AI.",
                "topics": [
                    "Introduction",
                    "Variables",
                    "Data Types",
                    "Strings",
                    "Lists",
                    "Dictionaries",
                    "Tuples and Sets",
                    "Functions",
                    "Control Flow",
                    "OOP",
                    "Error Handling",
                    "Modules",
                ],
            },
            {
                "id": "ai",
                "name": "Artificial Intelligence",
                "description": "Principles and applications of intelligent systems.",
                "topics": [
                    "Artificial Intelligence",
                    "Machine Learning",
                    "Computer Vision",
                    "Natural Language Processing",
                ],
            },
            {
                "id": "ml",
                "name": "Machine Learning",
                "description": "Learning patterns from data and making predictive models.",
                "topics": [
                    "Supervised Learning",
                    "Unsupervised Learning",
                    "Model Evaluation",
                    "Neural Networks",
                ],
            },
            {
                "id": "networks",
                "name": "Computer Networks",
                "description": "Protocols, topologies, and network architecture.",
                "topics": [
                    "Networking Basics",
                    "OSI Model",
                    "TCP/IP",
                    "Routing and DNS",
                ],
            },
            {
                "id": "java",
                "name": "Java",
                "description": "Object-oriented programming language for enterprise and Android.",
                "topics": [
                    "Java Basics",
                    "Object-Oriented Programming",
                    "Collections Framework",
                    "Exception Handling",
                ],
            },
        ]
    }


@app.post("/api/tutor/chat")
def tutor_chat(
    req: TutorChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Streams the tutor reply with Server-Sent Events.
    Final event includes citations and hint level.
    """
    # 1. Ensure session exists in DB
    session_obj = (
        db.query(SessionModel)
        .filter(SessionModel.id == req.session_id, SessionModel.user_id == user.id)
        .first()
    )
    if not session_obj:
        session_obj = SessionModel(
            id=req.session_id,
            user_id=user.id,
            title=f"Chat about {req.topic or req.subject or 'Concepts'}",
        )
        db.add(session_obj)
        db.commit()

    # 2. Record user message
    user_msg_db = Message(
        session_id=req.session_id,
        role="user",
        content=req.message,
    )
    db.add(user_msg_db)
    db.commit()

    # 3. Fetch last 10 messages for context
    recent_msgs = (
        db.query(Message)
        .filter(Message.session_id == req.session_id)
        .order_by(Message.created_at.asc())
        .limit(10)
        .all()
    )
    history_dicts = [{"role": m.role, "content": m.content} for m in recent_msgs]

    # 4. Route check (informative classification)
    route_res = router_agent.route(RouterInput(message=req.message))
    logger.info(f"Routed message as: {route_res.category} (confidence: {route_res.confidence})")

    tutor_input = TutorInput(
        message=req.message,
        session_id=req.session_id,
        subject=req.subject,
        topic=req.topic,
        hint_level=req.hint_level or 0,
        history=history_dicts,
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

        # Record assistant reply to database
        try:
            with Session(db.get_bind()) as save_db:
                assistant_msg = Message(
                    session_id=req.session_id,
                    role="assistant",
                    content="".join(full_response_tokens),
                    metadata_json=json.dumps(final_meta),
                )
                save_db.add(assistant_msg)
                save_db.commit()
        except Exception as err:
            logger.warning(f"Failed to persist assistant message to DB: {err}")

    return StreamingResponse(sse_event_stream(), media_type="text/event-stream")


@app.post("/api/practice/generate")
def practice_generate(
    req: PracticeGenerateRequest,
    user: User = Depends(get_current_user),
):
    """Generate multiple-choice questions from knowledge sources."""
    questions = practice_agent.generate(
        GeneratePracticeInput(
            subject=req.subject,
            topic=req.topic,
            difficulty=req.difficulty,
            count=req.count,
        )
    )
    # Cache generated questions for grading lookup
    for q in questions:
        question_cache[q.id] = q.model_dump()

    return {"questions": [q.model_dump() for q in questions]}


@app.post("/api/practice/submit")
def practice_submit(
    req: PracticeSubmitRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Grade student answer, record attempt, update mastery,
    check misconceptions, and return comprehensive result.
    """
    cached = question_cache.get(req.question_id, {})
    question_text = req.question or cached.get("question", "Unknown Question")
    options = req.options or cached.get("options", [])
    correct_answer = req.correct_answer or cached.get("answer", "")
    subject = req.subject or cached.get("subject", "Python")
    topic = req.topic or cached.get("topic", "General")
    difficulty = req.difficulty or cached.get("difficulty", "Beginner")

    # 1. Deterministic grading in code
    grade_res = grader_agent.grade(
        GradeInput(
            question=question_text,
            options=options,
            correct_answer=correct_answer,
            selected_answer=req.selected,
            topic=topic,
        )
    )

    # 2. Check misconception if incorrect
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

    # 3. Record attempt in database
    attempt = Attempt(
        user_id=user.id,
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
    db.commit()

    # 4. Update topic mastery
    updated_mastery = progress_agent.update_mastery(
        db=db,
        user_id=user.id,
        subject=subject,
        topic=topic,
        correct=grade_res.is_correct,
    )

    return {
        "correct": grade_res.is_correct,
        "correct_answer": grade_res.correct_answer,
        "selected": req.selected,
        "explanation": grade_res.explanation,
        "misconception": misconception_res,
        "mastery": updated_mastery.model_dump(),
    }


@app.get("/api/progress")
def get_progress(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return mastery per topic, weakest topics, recent attempts and recommendations."""
    return progress_agent.get_progress_summary(db=db, user_id=user.id).model_dump()


# Legacy endpoint backward compatibility
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
        "topic": "Python",
        "type": "AI Tutor Response",
        "response": out.response,
        "citations": [c.model_dump() for c in out.citations],
    }
