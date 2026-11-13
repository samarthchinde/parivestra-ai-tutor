"""Tutor Agent: Kid-Safe learning companion for Class 3 and Class 4 with safety filters and reading level checks."""
import re
from datetime import datetime, timezone
from typing import Any, Dict, Generator, List, Optional, Union
from pydantic import BaseModel, Field

from backend.llm.gateway import LLMGateway
from backend.rag.retriever import BaseRetriever, Chunk, get_default_retriever
from backend.database import SessionLocal
from backend.models import SafetyIncident


class Citation(BaseModel):
    id: str
    title: str


class TutorInput(BaseModel):
    message: str
    session_id: str
    subject: Optional[str] = None
    topic: Optional[str] = None
    grade: Optional[str] = "Class 3"
    hint_level: int = Field(default=0, ge=0, le=4)
    history: List[Dict[str, str]] = Field(default_factory=list)


class TutorOutput(BaseModel):
    response: str
    citations: List[Citation]
    hint_level: int
    covered: bool = True
    source: str = "model"


SYSTEM_PROMPT = (
    "You are Pari, an encouraging AI tutor for children in Class 3 and Class 4 (ages 8 to 10).\n"
    "RULES:\n"
    "1. Answer ONLY using the provided source excerpts.\n"
    "2. Use simple, friendly words. Maximum 3 short sentences.\n"
    "3. Explain one clear idea with a tiny real-life example.\n"
    "4. End with an encouraging small question to check understanding.\n"
    "5. If the excerpts do not contain the answer, say warmly: \"I'm not sure about that one. Let's ask your teacher!\"\n"
    "6. Never ask for personal data (address, phone, passwords, real names).\n"
    "7. Keep your tone cheerful, kind, and supportive."
)

GREETING_WORDS = {
    "hi", "hello", "hey", "hola", "greetings", "good morning", "good afternoon",
    "good evening", "howdy", "sup", "yo", "pari", "hi pari", "hello pari"
}
THANKS_WORDS = {
    "thanks", "thank you", "thx", "appreciate it", "many thanks", "thank you so much",
    "thank you pari", "thanks pari"
}

DISTRESS_PATTERNS = [
    r"\b(i am|i'm|feeling)\s+(sad|scared|afraid|lonely|hurt|crying|upset)\b",
    r"\b(nobody likes me|hate myself|bully|bullied|unsafe|danger)\b",
    r"\b(someone hurt me|bad touch|scared of)\b",
]

UNSAFE_PATTERNS = [
    r"\b(password|credit card|phone number|home address|where do you live)\b",
    r"(https?://\S+|www\.\S+)",
    r"\b(kill|gun|knife|weapon|blood|fight|hate|stupid|idiot)\b",
]


def check_greeting_or_thanks(message: str) -> Optional[str]:
    """Check if message is small talk without retrieving course chunks."""
    raw = message.strip().lower()
    cleaned = re.sub(r"[^\w\s]", "", raw).strip()
    words = cleaned.split()
    if not words:
        return None
    if cleaned in GREETING_WORDS or (len(words) <= 2 and words[0] in GREETING_WORDS):
        return "greeting"
    if cleaned in THANKS_WORDS or any(cleaned.startswith(w) for w in THANKS_WORDS):
        return "thanks"
    return None


def check_child_safety(message: str, user_id: str = "student_default") -> Optional[str]:
    """Examines child's input for distress or unsafe keywords.
    Logs incident with timestamp (never storing raw free text) and returns a protective response.
    """
    msg_lower = message.lower()

    # 1. Distress / Emotion check
    for pattern in DISTRESS_PATTERNS:
        if re.search(pattern, msg_lower):
            try:
                with SessionLocal() as db:
                    incident = SafetyIncident(
                        user_id=user_id,
                        flag_type="sensitive_emotion",
                        created_at=datetime.now(timezone.utc),
                    )
                    db.add(incident)
                    db.commit()
            except Exception:
                pass
            return (
                "I'm here with you! When you feel sad or worried, it really helps to talk with a grown-up you trust, "
                "like your parent or teacher. They care about you very much! 💛"
            )

    # 2. Unsafe words / Personal data request check
    for pattern in UNSAFE_PATTERNS:
        if re.search(pattern, msg_lower):
            try:
                with SessionLocal() as db:
                    incident = SafetyIncident(
                        user_id=user_id,
                        flag_type="inappropriate_content",
                        created_at=datetime.now(timezone.utc),
                    )
                    db.add(incident)
                    db.commit()
            except Exception:
                pass
            return "Let's keep our adventure safe and fun! We can learn exciting things in Maths, English, and EVS together. 🌟"

    return None


def verify_and_simplify_reading_level(text: str) -> str:
    """Ensures average sentence length is under 12 words for Class 3-4 children."""
    if not text:
        return ""
    # Strip any links or unsafe artifacts
    cleaned = re.sub(r"https?://\S+", "", text).strip()
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", cleaned) if s.strip()]
    if not sentences:
        return cleaned

    total_words = sum(len(s.split()) for s in sentences)
    avg_len = total_words / max(1, len(sentences))

    if avg_len <= 12:
        return " ".join(sentences[:3])

    # If sentences are too long, simplify by taking the cleanest first 2 short clauses
    simplified = []
    for s in sentences:
        words = s.split()
        if len(words) > 14:
            # Cut at first comma or conjunction
            comma_split = re.split(r"[,;]|\band\b", s)
            if comma_split and len(comma_split[0].split()) >= 3:
                simplified.append(comma_split[0].strip() + ".")
            else:
                simplified.append(" ".join(words[:11]) + ".")
        else:
            simplified.append(s)

    result = " ".join(simplified[:3])
    return result


def extract_clean_explanation(content: str) -> str:
    """Extract clean 2-3 sentence explanation from course chunk, stripping raw metadata headers."""
    if not content:
        return ""
    lines = content.splitlines()
    expl_lines = []
    capturing = False
    for line in lines:
        stripped = line.strip()
        if stripped.lower().startswith("explanation:"):
            capturing = True
            expl_lines.append(stripped[len("explanation:"):].strip())
        elif stripped.lower().startswith(("example:", "hint:", "keywords:", "subject/topic:", "grade:")):
            capturing = False
        elif capturing and stripped:
            expl_lines.append(stripped)

    if expl_lines:
        text = " ".join(expl_lines).strip()
    else:
        filtered = [
            l.strip() for l in lines
            if not l.strip().lower().startswith(("keywords:", "subject/topic:", "hint:", "example:", "grade:"))
        ]
        text = " ".join([l for l in filtered if l]).strip()

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    if sentences:
        selected = sentences[:2]
        result = " ".join(selected)
        if not result.endswith((".", "!", "?")):
            result += "."
        return result
    return text


class TutorAgent:
    """Answers educational questions strictly using retrieved chunks and pedagogical hints for Class 3-4."""

    def __init__(
        self,
        gateway: Optional[LLMGateway] = None,
        retriever: Optional[BaseRetriever] = None,
    ):
        self.gateway = gateway or LLMGateway()
        self.retriever = retriever or get_default_retriever()

    def _build_hint_instruction(self, hint_level: int) -> str:
        if hint_level == 1:
            return (
                "HINT LEVEL 1 (Tiny Nudge): Give one short, gentle question to point the child in the right direction. "
                "Do not give the answer."
            )
        elif hint_level == 2:
            return (
                "HINT LEVEL 2 (Helpful Clue): Mention the key word or rule from the course excerpts, "
                "then let the child complete it."
            )
        elif hint_level == 3:
            return (
                "HINT LEVEL 3 (Worked Step): Show the first step with a tiny friendly example from the excerpts."
            )
        else:
            return (
                "EXPLANATION: Explain in 2 to 3 short simple sentences with a fun real-life example. "
                "End with an encouraging question."
            )

    def _prepare_context(self, input_data: TutorInput):
        retrieved = self.retriever.retrieve(
            query=input_data.message,
            top_k=2,
            subject=input_data.subject,
            topic=input_data.topic,
            grade=input_data.grade,
        )

        if not retrieved:
            return None, []

        chunks: List[Chunk] = [c for c, _score in retrieved]
        citations = [Citation(id=c.id, title=c.title) for c in chunks]

        context_blocks = []
        for c in chunks:
            context_blocks.append(f"--- [Lesson: {c.title}] ---\n{c.content}")
        context_str = "\n\n".join(context_blocks)

        hint_instr = self._build_hint_instruction(input_data.hint_level)

        user_content = (
            f"LESSON MATERIAL:\n{context_str}\n\n"
            f"INSTRUCTION:\n{hint_instr}\n\n"
            f"STUDENT QUESTION:\n{input_data.message}"
        )

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in input_data.history[-6:]:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        messages.append({"role": "user", "content": user_content})

        return messages, citations

    def explain(self, input_data: Union[TutorInput, dict]) -> TutorOutput:
        """Synchronous explanation generation with safety filter and readability validation."""
        if isinstance(input_data, dict):
            input_data = TutorInput(**input_data)

        # 1. Child Safety Check
        safety_reply = check_child_safety(input_data.message, user_id=input_data.session_id)
        if safety_reply:
            return TutorOutput(
                response=safety_reply,
                citations=[],
                hint_level=input_data.hint_level,
                covered=True,
                source="assistant",
            )

        # 2. Greetings and Small Talk
        chat_type = check_greeting_or_thanks(input_data.message)
        if chat_type == "greeting":
            return TutorOutput(
                response="Hello! I am Pari, your Parivestra AI Tutor learning buddy. Ask me any question about Maths, English, or EVS, and we will explore it together! 🌟",
                citations=[],
                hint_level=input_data.hint_level,
                covered=True,
                source="assistant",
            )
        elif chat_type == "thanks":
            return TutorOutput(
                response="You're very welcome! Keep asking questions or let's try a fun game or practice quiz! 🚀",
                citations=[],
                hint_level=input_data.hint_level,
                covered=True,
                source="assistant",
            )

        # 3. Context Preparation
        messages, citations = self._prepare_context(input_data)

        if not messages:
            return TutorOutput(
                response="I'm not sure about that one. Let's ask your teacher! 🎒",
                citations=[],
                hint_level=input_data.hint_level,
                covered=False,
                source="model",
            )

        # 4. LLM Call with Reading-Level Verification
        try:
            raw_text = self.gateway.chat(messages, stream=False, max_tokens=180)
            clean_text = verify_and_simplify_reading_level(raw_text.strip())
            return TutorOutput(
                response=clean_text,
                citations=citations,
                hint_level=input_data.hint_level,
                covered=True,
                source="model",
            )
        except Exception:
            # Clean Kid-Safe Fallback when LLM is offline
            retrieved = self.retriever.retrieve(
                query=input_data.message,
                top_k=1,
                subject=input_data.subject,
                topic=input_data.topic,
                grade=input_data.grade,
            )
            if retrieved:
                best_chunk, _ = retrieved[0]
                clean_exp = extract_clean_explanation(best_chunk.content)
                fallback_text = (
                    f"Offline mode: the AI model is not connected. Here is what our course material says about {best_chunk.title}:\n\n"
                    f"{clean_exp}\n\n"
                    f"Ask your instructor to start the AI model or run scripts/start-llm.ps1."
                )
                fallback_citations = [Citation(id=best_chunk.id, title=best_chunk.title)]
            else:
                fallback_text = "Offline mode: the AI model is not connected. I'm not sure about that one. Let's ask your teacher! 🎒"
                fallback_citations = []

            return TutorOutput(
                response=fallback_text,
                citations=fallback_citations,
                hint_level=input_data.hint_level,
                covered=bool(fallback_citations),
                source="offline",
            )

    def explain_stream(
        self, input_data: Union[TutorInput, dict]
    ) -> Generator[Dict[str, Any], None, None]:
        if isinstance(input_data, dict):
            input_data = TutorInput(**input_data)

        # Safety Check
        safety_reply = check_child_safety(input_data.message, user_id=input_data.session_id)
        if safety_reply:
            yield {"type": "token", "token": safety_reply}
            yield {
                "type": "done",
                "citations": [],
                "hint_level": input_data.hint_level,
                "covered": True,
                "source": "assistant",
            }
            return

        # Greeting Check
        chat_type = check_greeting_or_thanks(input_data.message)
        if chat_type == "greeting":
            msg = "Hello! I am Pari, your Parivestra AI Tutor learning buddy. Ask me any question about Maths, English, or EVS, and we will explore it together! 🌟"
            yield {"type": "token", "token": msg}
            yield {
                "type": "done",
                "citations": [],
                "hint_level": input_data.hint_level,
                "covered": True,
                "source": "assistant",
            }
            return
        elif chat_type == "thanks":
            msg = "You're very welcome! Keep asking questions or let's try a fun game or practice quiz! 🚀"
            yield {"type": "token", "token": msg}
            yield {
                "type": "done",
                "citations": [],
                "hint_level": input_data.hint_level,
                "covered": True,
                "source": "assistant",
            }
            return

        messages, citations = self._prepare_context(input_data)

        if not messages:
            msg = "I'm not sure about that one. Let's ask your teacher! 🎒"
            yield {"type": "token", "token": msg}
            yield {
                "type": "done",
                "citations": [],
                "hint_level": input_data.hint_level,
                "covered": False,
                "source": "model",
            }
            return

        try:
            token_gen = self.gateway.chat(messages, stream=True, max_tokens=180)
            for token in token_gen:
                yield {"type": "token", "token": token}

            yield {
                "type": "done",
                "citations": [c.model_dump() for c in citations],
                "hint_level": input_data.hint_level,
                "covered": True,
                "source": "model",
            }
        except Exception:
            retrieved = self.retriever.retrieve(
                query=input_data.message,
                top_k=1,
                subject=input_data.subject,
                topic=input_data.topic,
                grade=input_data.grade,
            )
            if retrieved:
                best_chunk, _ = retrieved[0]
                clean_exp = extract_clean_explanation(best_chunk.content)
                fallback = (
                    f"Offline mode: the AI model is not connected. Here is what our course material says about {best_chunk.title}:\n\n"
                    f"{clean_exp}\n\n"
                    f"Ask your instructor to start the AI model or run scripts/start-llm.ps1."
                )
                fallback_citations = [Citation(id=best_chunk.id, title=best_chunk.title).model_dump()]
            else:
                fallback = "Offline mode: the AI model is not connected. I'm not sure about that one. Let's ask your teacher! 🎒"
                fallback_citations = []

            yield {"type": "token", "token": fallback}
            yield {
                "type": "done",
                "citations": fallback_citations,
                "hint_level": input_data.hint_level,
                "covered": bool(fallback_citations),
                "source": "offline",
            }
