"""Tutor Agent: Answers from retrieved source chunks with hint ladder support and citations."""
import re
from typing import Any, Dict, Generator, List, Optional, Union
from pydantic import BaseModel, Field

from backend.llm.gateway import LLMGateway
from backend.rag.retriever import BaseRetriever, Chunk, get_default_retriever


class Citation(BaseModel):
    id: str
    title: str


class TutorInput(BaseModel):
    message: str
    session_id: str
    subject: Optional[str] = None
    topic: Optional[str] = None
    hint_level: int = Field(default=0, ge=0, le=4)
    history: List[Dict[str, str]] = Field(default_factory=list)


class TutorOutput(BaseModel):
    response: str
    citations: List[Citation]
    hint_level: int
    covered: bool = True
    source: str = "model"


SYSTEM_PROMPT = (
    "You are Parivestra AI Tutor, an encouraging educational assistant.\n"
    "RULES:\n"
    "1. Answer ONLY using the provided source excerpts.\n"
    "2. If the excerpts do not contain the answer, say honestly: 'I could not find information about this in the course material.'\n"
    "3. Never invent facts, hallucinate features, or speculate beyond the sources.\n"
    "4. Follow the specific hint ladder instruction provided in the prompt."
)

GREETING_WORDS = {
    "hi", "hello", "hey", "hola", "greetings", "good morning", "good afternoon",
    "good evening", "howdy", "sup", "yo"
}
THANKS_WORDS = {
    "thanks", "thank you", "thx", "appreciate it", "many thanks", "thank you so much",
    "thank you very much"
}


def check_greeting_or_thanks(message: str) -> Optional[str]:
    """Check if message is small talk (greeting or gratitude) without retrieving course chunks."""
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
        elif stripped.lower().startswith(("example:", "hint:", "keywords:", "subject/topic:")):
            capturing = False
        elif capturing and stripped:
            expl_lines.append(stripped)

    if expl_lines:
        text = " ".join(expl_lines).strip()
    else:
        # Fallback: remove lines starting with metadata keywords
        filtered = [
            l.strip() for l in lines
            if not l.strip().lower().startswith(("keywords:", "subject/topic:", "hint:", "example:"))
        ]
        text = " ".join([l for l in filtered if l]).strip()

    # Split into sentences and take at most 3
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    if sentences:
        selected = sentences[:3]
        result = " ".join(selected)
        if not result.endswith((".", "!", "?")):
            result += "."
        return result
    return text


class TutorAgent:
    """Answers educational questions strictly using retrieved chunks and pedagogical hints."""

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
                "HINT LEVEL 1 (Nudge): Provide a gentle 1-2 sentence nudge or thought-provoking question "
                "to point the student in the right direction. DO NOT give away the complete answer or solution."
            )
            return (
                "HINT LEVEL 2 (Clue): Give a bigger clue. Mention the key concept, syntax keyword, or rule "
                "from the source excerpts, but let the student complete the thought."
            )
        elif hint_level == 3:
            return (
                "HINT LEVEL 3 (Worked Step): Show a worked step or partial example from the sources. "
                "Demonstrate the first half of the logic or syntax."
            )
        else:
            return (
                "FULL EXPLANATION: Provide a clear, supportive, and comprehensive explanation with an example, "
                "strictly using the source excerpts."
            )

    def _prepare_context(self, input_data: TutorInput):
        # Retrieve chunks
        retrieved = self.retriever.retrieve(
            query=input_data.message,
            top_k=3,
            subject=input_data.subject,
            topic=input_data.topic,
        )

        if not retrieved:
            return None, []

        chunks: List[Chunk] = [c for c, _score in retrieved]
        citations = [Citation(id=c.id, title=c.title) for c in chunks]

        # Format retrieved context
        context_blocks = []
        for c in chunks:
            context_blocks.append(f"--- [Source: {c.id}] {c.title} ---\n{c.content}")
        context_str = "\n\n".join(context_blocks)

        hint_instr = self._build_hint_instruction(input_data.hint_level)

        user_content = (
            f"SOURCE EXCERPTS:\n{context_str}\n\n"
            f"PEDAGOGICAL INSTRUCTION:\n{hint_instr}\n\n"
            f"STUDENT QUESTION:\n{input_data.message}"
        )

        # Context window: system prompt + last 10 messages + current user prompt
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in input_data.history[-10:]:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        messages.append({"role": "user", "content": user_content})

        return messages, citations

    def explain(self, input_data: Union[TutorInput, dict]) -> TutorOutput:
        """Synchronous explanation generation."""
        if isinstance(input_data, dict):
            input_data = TutorInput(**input_data)

        # Handle greetings and thanks without retrieval or model calls
        chat_type = check_greeting_or_thanks(input_data.message)
        if chat_type == "greeting":
            return TutorOutput(
                response="Hello! I am your Parivestra AI Tutor. Ask me any concept question about Python, AI, Machine Learning, Networks, or Java, and I'll guide you step by step!",
                citations=[],
                hint_level=input_data.hint_level,
                covered=True,
                source="assistant",
            )
        elif chat_type == "thanks":
            return TutorOutput(
                response="You're very welcome! Keep asking questions or head over to the Practice tab to test your understanding.",
                citations=[],
                hint_level=input_data.hint_level,
                covered=True,
                source="assistant",
            )

        messages, citations = self._prepare_context(input_data)

        if not messages:
            return TutorOutput(
                response="I could not find information about this in the course material. I can only answer questions covered in the Parivestra knowledge base.",
                citations=[],
                hint_level=input_data.hint_level,
                covered=False,
                source="model",
            )

        try:
            raw_text = self.gateway.chat(messages, stream=False)
            return TutorOutput(
                response=raw_text.strip(),
                citations=citations,
                hint_level=input_data.hint_level,
                covered=True,
                source="model",
            )
        except Exception:
            # Clean fallback when LLM is offline
            retrieved = self.retriever.retrieve(
                query=input_data.message,
                top_k=1,
                subject=input_data.subject,
                topic=input_data.topic,
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
                fallback_text = (
                    "Offline mode: the AI model is not connected, and no matching course material was found. "
                    "Ask your instructor to start the AI model or run scripts/start-llm.ps1."
                )
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

        # Handle greetings and thanks directly
        chat_type = check_greeting_or_thanks(input_data.message)
        if chat_type == "greeting":
            msg = "Hello! I am your Parivestra AI Tutor. Ask me any concept question about Python, AI, Machine Learning, Networks, or Java, and I'll guide you step by step!"
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
            msg = "You're very welcome! Keep asking questions or head over to the Practice tab to test your understanding."
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
            msg = "I could not find information about this in the course material. I can only answer questions covered in the Parivestra knowledge base."
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
            token_gen = self.gateway.chat(messages, stream=True)
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
            # Clean fallback if LLM is offline
            retrieved = self.retriever.retrieve(
                query=input_data.message,
                top_k=1,
                subject=input_data.subject,
                topic=input_data.topic,
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
                fallback = (
                    "Offline mode: the AI model is not connected, and no matching course material was found. "
                    "Ask your instructor to start the AI model or run scripts/start-llm.ps1."
                )
                fallback_citations = []

            yield {"type": "token", "token": fallback}
            yield {
                "type": "done",
                "citations": fallback_citations,
                "hint_level": input_data.hint_level,
                "covered": bool(fallback_citations),
                "source": "offline",
            }
