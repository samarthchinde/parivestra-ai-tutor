"""FastAPI Application for Parivestra AI Tutor."""
import json
import logging
from pathlib import Path
import threading
from typing import Any, Dict, List, Optional
import uuid
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
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
from backend.agents.learning_path_service import get_learning_path
from backend.agents.game_service import BugHuntGameService
from backend.agents.grader_agent import GradeInput
from backend.agents.misconception_agent import MisconceptionInput
from backend.agents.practice_agent import GeneratePracticeInput
from backend.agents.router_agent import RouterInput
from backend.agents.tutor_agent import TutorInput
from backend.data.question_bank import load_bundled_questions
from backend.database import get_db, init_db
from backend.llm.gateway import LLMGateway
from backend.models import Attempt, GeneratedQuestion, Message, ResourceModel, Session as SessionModel, User
from backend.rag.retriever import get_default_retriever
from backend.agents.resource_service import (
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE_BYTES,
    index_resource,
    sanitize_filename,
    unindex_resource,
    validate_file_meta,
)

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

@app.on_event("startup")
def startup_prewarm_pool():
    def _warm():
        try:
            from backend.database import SessionLocal
            db = SessionLocal()
            try:
                existing = db.query(GeneratedQuestion).filter(GeneratedQuestion.status == "ready").count()
                if existing < 4:
                    logger.info("Startup: pre-warming question pool in background...")
                    for topic in ["Lists", "Functions"]:
                        practice_agent.refill_pool(db=db, subject="Python", topic=topic, difficulty="Beginner", target_count=2)
            finally:
                db.close()
        except Exception as e:
            logger.debug(f"Startup prewarm background error: {e}")

    threading.Thread(target=_warm, daemon=True).start()

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
game_service = BugHuntGameService(gateway=gateway, progress_agent=progress_agent)

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


def check_is_admin(x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key")) -> bool:
    """Check whether caller provided valid admin access key."""
    if not x_admin_key or not config.ADMIN_KEY:
        return False
    return x_admin_key.strip() == config.ADMIN_KEY.strip()


def require_admin(is_admin: bool = Depends(check_is_admin)):
    """Enforce admin privileges for administrative endpoints."""
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required. Provide valid X-Admin-Key header.",
        )
    return True


# ---------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------
class LegacyQuestion(BaseModel):
    question: str


class ResourceUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    tags: Optional[List[str]] = None
    approved: Optional[bool] = None


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


class PoolRefillRequest(BaseModel):
    subject: Optional[str] = "Python"
    topic: Optional[str] = "Lists"
    difficulty: Optional[str] = "Beginner"
    count: Optional[int] = 3


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


class GameStartRequest(BaseModel):
    topic: Optional[str] = None


class GameAnswerRequest(BaseModel):
    session_id: str
    selected_line: int
    selected_bug_type: str
    time_taken_seconds: Optional[float] = 10.0


class GameHintRequest(BaseModel):
    session_id: str


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
    db: Session = Depends(get_db),
):
    """Generate multiple-choice questions with deduplication and adaptive difficulty."""
    questions = practice_agent.generate(
        GeneratePracticeInput(
            subject=req.subject,
            topic=req.topic,
            difficulty=req.difficulty,
            count=req.count,
            user_id=user.id,
        ),
        db=db,
    )
    # Cache generated questions for grading lookup
    for q in questions:
        question_cache[q.id] = q.model_dump()

    return {"questions": [q.model_dump() for q in questions]}


@app.post("/api/practice/pool/refill")
def practice_pool_refill(
    req: PoolRefillRequest,
    admin: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin-only: refill the background question pool with pre-validated questions."""
    count = practice_agent.refill_pool(
        db=db,
        subject=req.subject or "Python",
        topic=req.topic or "Lists",
        difficulty=req.difficulty or "Beginner",
        target_count=req.count or 3,
    )
    return {"success": True, "added_count": count}


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


@app.get("/api/learning-path")
def get_learning_path_endpoint(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return game-style learning path roadmap, level unlock status, XP, streak, and next step."""
    prog = progress_agent.get_progress_summary(db=db, user_id=user.id)
    return get_learning_path(db=db, user_id=user.id, rec_next_topic=prog.recommended_next_topic)


@app.post("/api/games/bughunt/start")
def game_bughunt_start(
    req: GameStartRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start a new Bug Hunt Arena game session."""
    return game_service.start_game(db=db, user=user, topic=req.topic)


@app.post("/api/games/bughunt/answer")
def game_bughunt_answer(
    req: GameAnswerRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit an answer for the current Bug Hunt round."""
    res = game_service.submit_answer(
        db=db,
        user=user,
        session_id=req.session_id,
        selected_line=req.selected_line,
        selected_bug_type=req.selected_bug_type,
        time_taken_seconds=req.time_taken_seconds or 10.0,
    )
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/games/bughunt/hint")
def game_bughunt_hint(
    req: GameHintRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a subtle hint from the Game Master for 25 points."""
    res = game_service.get_hint(db=db, session_id=req.session_id)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.get("/api/games/leaderboard")
def game_leaderboard(
    limit: int = 10,
    db: Session = Depends(get_db),
):
    """Return top Bug Hunt scores."""
    return game_service.get_leaderboard(db=db, limit=limit)


# ---------------------------------------------------------
# Institute Resource Library Endpoints
# ---------------------------------------------------------
@app.post("/api/resources")
async def upload_resource(
    file: UploadFile = File(...),
    title: str = Form(...),
    subject: str = Form("Python"),
    topic: str = Form("General"),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form("[]"),
    is_admin: bool = Depends(check_is_admin),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload an educational document (PDF, MD, TXT) up to 10MB.
    Admin uploads are automatically approved and indexed into the BM25 tutor knowledge base.
    """
    clean_filename = sanitize_filename(file.filename or "document.txt")

    # Read content to check file size safely
    content_bytes = await file.read()
    file_size = len(content_bytes)

    is_valid, ext, err_msg = validate_file_meta(clean_filename, file_size)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    # Path traversal protection: safe unique file name inside RESOURCES_DIR
    res_id = f"res_{uuid.uuid4().hex[:12]}"
    stored_name = f"{res_id}{ext}"
    stored_path = config.RESOURCES_DIR / stored_name

    # Write file to storage
    with open(stored_path, "wb") as f:
        f.write(content_bytes)

    # Parse tags safely
    parsed_tags = []
    if tags:
        try:
            parsed_tags = json.loads(tags) if tags.strip().startswith("[") else [t.strip() for t in tags.split(",") if t.strip()]
        except Exception:
            parsed_tags = [t.strip() for t in tags.split(",") if t.strip()]

    # Admins get auto-approved
    approved = bool(is_admin)

    resource = ResourceModel(
        id=res_id,
        title=title.strip(),
        description=description.strip() if description else None,
        subject=subject.strip(),
        topic=topic.strip(),
        tags=json.dumps(parsed_tags),
        file_type=ext.replace(".", ""),
        original_filename=clean_filename,
        stored_path=str(stored_path),
        file_size=file_size,
        uploader=user.name or ("Admin" if is_admin else "Faculty"),
        approved=approved,
        indexed_chunks_count=0,
    )
    db.add(resource)
    db.commit()
    db.refresh(resource)

    # If approved on upload, index immediately into BM25 retriever
    if approved:
        try:
            chunk_count = index_resource(resource, get_default_retriever())
            resource.indexed_chunks_count = chunk_count
            db.commit()
        except Exception as e:
            logger.error(f"Failed to auto-index resource {res_id}: {e}")

    return {
        "id": resource.id,
        "title": resource.title,
        "description": resource.description,
        "subject": resource.subject,
        "topic": resource.topic,
        "tags": parsed_tags,
        "file_type": resource.file_type,
        "original_filename": resource.original_filename,
        "file_size": resource.file_size,
        "uploader": resource.uploader,
        "approved": resource.approved,
        "indexed_chunks_count": resource.indexed_chunks_count,
        "created_at": resource.created_at.isoformat() if resource.created_at else None,
    }


@app.get("/api/resources")
def list_resources(
    subject: Optional[str] = None,
    topic: Optional[str] = None,
    approved: Optional[bool] = None,
    is_admin: bool = Depends(check_is_admin),
    db: Session = Depends(get_db),
):
    """
    List library resources. Students only see approved resources;
    Admins can view both approved and pending resources.
    """
    query = db.query(ResourceModel)

    if not is_admin:
        # Students only see approved resources
        query = query.filter(ResourceModel.approved == True)
    elif approved is not None:
        query = query.filter(ResourceModel.approved == approved)

    if subject and subject.lower() != "all":
        query = query.filter(ResourceModel.subject.ilike(f"%{subject}%"))

    if topic and topic.lower() != "all":
        query = query.filter(ResourceModel.topic.ilike(f"%{topic}%"))

    resources = query.order_by(ResourceModel.created_at.desc()).all()

    return [
        {
            "id": r.id,
            "title": r.title,
            "description": r.description,
            "subject": r.subject,
            "topic": r.topic,
            "tags": json.loads(r.tags) if r.tags else [],
            "file_type": r.file_type,
            "original_filename": r.original_filename,
            "file_size": r.file_size,
            "uploader": r.uploader,
            "approved": r.approved,
            "indexed_chunks_count": r.indexed_chunks_count,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in resources
    ]


@app.get("/api/resources/{resource_id}")
def get_resource_detail(
    resource_id: str,
    is_admin: bool = Depends(check_is_admin),
    db: Session = Depends(get_db),
):
    """Retrieve metadata for a specific resource."""
    resource = db.query(ResourceModel).filter(ResourceModel.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
    if not resource.approved and not is_admin:
        raise HTTPException(status_code=403, detail="Resource pending review.")

    return {
        "id": resource.id,
        "title": resource.title,
        "description": resource.description,
        "subject": resource.subject,
        "topic": resource.topic,
        "tags": json.loads(resource.tags) if resource.tags else [],
        "file_type": resource.file_type,
        "original_filename": resource.original_filename,
        "file_size": resource.file_size,
        "uploader": resource.uploader,
        "approved": resource.approved,
        "indexed_chunks_count": resource.indexed_chunks_count,
        "created_at": resource.created_at.isoformat() if resource.created_at else None,
    }


@app.get("/api/resources/{resource_id}/download")
def download_resource(
    resource_id: str,
    is_admin: bool = Depends(check_is_admin),
    db: Session = Depends(get_db),
):
    """Download the resource file safely."""
    resource = db.query(ResourceModel).filter(ResourceModel.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")
    if not resource.approved and not is_admin:
        raise HTTPException(status_code=403, detail="Resource is not approved for student access.")

    path = Path(resource.stored_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Underlying file not found on server disk.")

    media_type = "application/pdf" if resource.file_type == "pdf" else "text/plain"
    return FileResponse(
        path=str(path),
        filename=resource.original_filename,
        media_type=media_type,
    )


@app.patch("/api/resources/{resource_id}")
def update_resource(
    resource_id: str,
    req: ResourceUpdateRequest,
    admin: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin-only: update metadata, toggle approval, and sync BM25 retrieval index."""
    resource = db.query(ResourceModel).filter(ResourceModel.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")

    if req.title is not None:
        resource.title = req.title.strip()
    if req.description is not None:
        resource.description = req.description.strip()
    if req.subject is not None:
        resource.subject = req.subject.strip()
    if req.topic is not None:
        resource.topic = req.topic.strip()
    if req.tags is not None:
        resource.tags = json.dumps(req.tags)

    if req.approved is not None and req.approved != resource.approved:
        resource.approved = req.approved
        if req.approved:
            # Index into BM25
            chunk_count = index_resource(resource, get_default_retriever())
            resource.indexed_chunks_count = chunk_count
        else:
            # Unindex from BM25
            unindex_resource(resource.id, get_default_retriever())
            resource.indexed_chunks_count = 0

    db.commit()
    db.refresh(resource)

    return {
        "id": resource.id,
        "title": resource.title,
        "description": resource.description,
        "subject": resource.subject,
        "topic": resource.topic,
        "tags": json.loads(resource.tags) if resource.tags else [],
        "file_type": resource.file_type,
        "original_filename": resource.original_filename,
        "file_size": resource.file_size,
        "uploader": resource.uploader,
        "approved": resource.approved,
        "indexed_chunks_count": resource.indexed_chunks_count,
        "created_at": resource.created_at.isoformat() if resource.created_at else None,
    }


@app.delete("/api/resources/{resource_id}")
def delete_resource(
    resource_id: str,
    admin: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin-only: delete resource, remove from BM25 index, and delete stored file."""
    resource = db.query(ResourceModel).filter(ResourceModel.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")

    # 1. Unindex from BM25
    unindex_resource(resource.id, get_default_retriever())

    # 2. Delete file on disk
    file_path = Path(resource.stored_path)
    if file_path.exists():
        try:
            os.remove(file_path)
        except Exception as e:
            logger.warning(f"Failed to delete file {file_path}: {e}")

    # 3. Delete database record
    db.delete(resource)
    db.commit()

    return {"success": True, "message": f"Resource '{resource.title}' deleted and unindexed."}


@app.post("/api/resources/{resource_id}/reindex")
def reindex_resource_endpoint(
    resource_id: str,
    admin: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin-only: reindex resource chunks into BM25 retriever."""
    resource = db.query(ResourceModel).filter(ResourceModel.id == resource_id).first()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found.")

    unindex_resource(resource.id, get_default_retriever())
    if resource.approved:
        count = index_resource(resource, get_default_retriever())
        resource.indexed_chunks_count = count
        db.commit()
    else:
        count = 0

    return {"success": True, "indexed_chunks_count": count}


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
