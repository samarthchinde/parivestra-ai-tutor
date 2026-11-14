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
    revision_mode: bool = False


class TutorOutput(BaseModel):
    response: str
    citations: List[Citation]
    hint_level: int
    covered: bool = True
    source: str = "model"


from backend.config.bands import get_band_for_grade, get_reading_limit, normalize_grade

BAND_SYSTEM_PROMPTS = {
    "junior": (
        "You are Pari, an encouraging AI tutor for children in Class 3 to 5 (ages 8 to 11).\n"
        "RULES:\n"
        "1. Answer ONLY using the provided source excerpts.\n"
        "2. Use simple, friendly words. Maximum 3 short sentences.\n"
        "3. Explain one clear idea with a tiny real-life example.\n"
        "4. End with an encouraging small question to check understanding.\n"
        "5. If the excerpts do not contain the answer, say warmly: \"I'm not sure about that one. Let's ask your teacher!\"\n"
        "6. Never ask for personal data (address, phone, passwords, real names).\n"
        "7. Keep your tone cheerful, kind, and supportive."
    ),
    "middle": (
        "You are Pari, a clear and patient AI study mentor for middle school students in Class 6 to 8 (ages 11 to 14).\n"
        "RULES:\n"
        "1. Answer strictly grounded in the provided course excerpts.\n"
        "2. Explain concepts in clear, logical, short steps.\n"
        "3. Provide structured reasoning and intuitive real-world examples.\n"
        "4. Conclude with a helpful check question to reinforce the learning objective.\n"
        "5. If excerpts lack the necessary answer, state clearly: \"This concept is not in our current chapter notes. Consult your teacher or syllabus library.\"\n"
        "6. Never ask for personal data.\n"
        "7. Maintain a supportive, motivating, and academically encouraging tone."
    ),
    "senior": (
        "You are an intelligent, focused academic AI tutor for high school students in Class 9 and 10 preparing for CBSE examinations.\n"
        "RULES:\n"
        "1. Answer strictly and accurately using the provided curriculum source material.\n"
        "2. Provide concise, conceptually rigorous explanations highlighting key terms, principles, formulas, and definitions.\n"
        "3. Always cite specific source excerpts when stating facts.\n"
        "4. Follow the progressive hint ladder when requested (gentle cue -> rule/formula -> worked step).\n"
        "5. If the information is not in the source texts, state: \"This topic is not covered in the current syllabus excerpts.\"\n"
        "6. Maintain an exam-aware, intellectually respectful, and concise academic tone."
    ),
}

SYSTEM_PROMPT = BAND_SYSTEM_PROMPTS["junior"]


def get_system_prompt_for_grade(grade: Optional[str]) -> str:
    band = get_band_for_grade(grade or "Class 3")
    return BAND_SYSTEM_PROMPTS.get(band, BAND_SYSTEM_PROMPTS["junior"])


GREETING_WORDS = {
    "hi", "hello", "hey", "hola", "greetings", "good morning", "good afternoon",
    "good evening", "howdy", "sup", "yo", "pari", "hi pari", "hello pari"
}
THANKS_WORDS = {
    "thanks", "thank you", "thx", "appreciate it", "many thanks", "thank you so much",
    "thank you pari", "thanks pari"
}

DISTRESS_PATTERNS = [
    r"\b(i am|i'm|feeling|feel)\s+(sad|scared|afraid|lonely|hurt|crying|upset|depressed|hopeless|anxious|stressed|overwhelmed|worthless)\b",
    r"\b(nobody likes me|hate myself|hurt myself|suicide|kill myself|bully|bullied|bullies|unsafe|danger|abuse|assault)\b",
    r"\b(someone hurt me|bad touch|scared of|failing my exams|cannot take this anymore|want to disappear|panic attack)\b",
]

UNSAFE_PATTERNS = [
    r"\b(password|credit card|phone number|home address|where do you live)\b",
    r"(https?://\S+|www\.\S+)",
    r"\b(gun|knife|weapon|blood|fight|hate|stupid|idiot)\b",
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


def check_child_safety(message: str, user_id: str = "student_default", grade: str = "Class 3") -> Optional[str]:
    """Examines student input for distress or unsafe keywords across all grades (3-10).
    Logs incident with timestamp and flag type ONLY (never storing raw free text).
    Returns an empathetic, protective response tailored by age band.
    """
    msg_lower = message.lower()
    band = get_band_for_grade(grade)

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

            if band == "junior":
                return (
                    "I'm here with you! When you feel sad or worried, it really helps to talk with a grown-up you trust, "
                    "like your parent or teacher. They care about you very much! 💛"
                )
            else:
                return (
                    "You are not alone, and it is completely okay to feel overwhelmed sometimes. "
                    "Please talk with a grown-up you trust — such as a parent, a teacher, or a school counsellor. "
                    "You can also reach out anytime to a confidential student support helpline (such as Tele-MANAS at 14416 or Childline 1098). "
                    "Taking care of your well-being is always the most important thing. 💛"
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
            return "Let's keep our learning space safe and focused! We can explore any topic from your syllabus together. 🌟"

    return None


def verify_and_simplify_reading_level(text: str, grade: str = "Class 3") -> str:
    """Ensures average sentence length adheres to band limit (12 for Junior, 16 for Middle, 20 for Senior)."""
    if not text:
        return ""
    cleaned = re.sub(r"https?://\S+", "", text).strip()
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", cleaned) if s.strip()]
    if not sentences:
        return cleaned

    limit = get_reading_limit(grade)
    total_words = sum(len(s.split()) for s in sentences)
    avg_len = total_words / max(1, len(sentences))

    if avg_len <= limit:
        return " ".join(sentences[:4])

    simplified = []
    for s in sentences:
        words = s.split()
        if len(words) > limit + 2:
            comma_split = re.split(r"[,;]|\band\b", s)
            if comma_split and 3 <= len(comma_split[0].split()) <= limit:
                simplified.append(comma_split[0].strip() + ".")
            else:
                simplified.append(" ".join(words[:limit - 1]) + "...")
        else:
            simplified.append(s)

    result = " ".join(simplified[:4])
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
            revision_mode=input_data.revision_mode,
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

        sys_prompt = get_system_prompt_for_grade(input_data.grade)
        messages = [{"role": "system", "content": sys_prompt}]
        for msg in input_data.history[-6:]:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        messages.append({"role": "user", "content": user_content})

        return messages, citations

    def explain(self, input_data: Union[TutorInput, dict]) -> TutorOutput:
        """Synchronous explanation generation with safety filter and readability validation."""
        if isinstance(input_data, dict):
            input_data = TutorInput(**input_data)

        # 1. Safety Check (all grades 3-10)
        safety_reply = check_child_safety(
            input_data.message,
            user_id=input_data.session_id,
            grade=input_data.grade or "Class 3",
        )
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
            band = get_band_for_grade(input_data.grade or "Class 3")
            if band == "senior":
                greet = "Hello! I am your Parivestra AI Tutor. How can I help you with your studies or exam preparation today?"
            elif band == "middle":
                greet = "Hi there! I am Pari, your study mentor. Which concept or problem would you like to explore today?"
            else:
                greet = "Hello! I am Pari, your Parivestra AI Tutor learning buddy. Ask me any question about Maths, English, or EVS, and we will explore it together! 🌟"
            return TutorOutput(
                response=greet,
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
            band = get_band_for_grade(input_data.grade or "Class 3")
            msg = "This topic is not covered in our current course notes. Please check with your teacher or the Library." if band != "junior" else "I'm not sure about that one. Let's ask your teacher! 🎒"
            return TutorOutput(
                response=msg,
                citations=[],
                hint_level=input_data.hint_level,
                covered=False,
                source="model",
            )

        # 4. LLM Call with Reading-Level Verification
        try:
            raw_text = self.gateway.chat(messages, stream=False, max_tokens=220)
            clean_text = verify_and_simplify_reading_level(raw_text.strip(), grade=input_data.grade or "Class 3")
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
                revision_mode=input_data.revision_mode,
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
        safety_reply = check_child_safety(
            input_data.message,
            user_id=input_data.session_id,
            grade=input_data.grade or "Class 3",
        )
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
            band = get_band_for_grade(input_data.grade or "Class 3")
            if band == "senior":
                msg = "Hello! I am your Parivestra AI Tutor. How can I help you with your studies or exam preparation today?"
            elif band == "middle":
                msg = "Hi there! I am Pari, your study mentor. Which concept or problem would you like to explore today?"
            else:
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
                revision_mode=input_data.revision_mode,
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
