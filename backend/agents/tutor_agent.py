"""Tutor Agent: Answers from retrieved source chunks with hint ladder support and citations."""
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


SYSTEM_PROMPT = (
    "You are Parivestra AI Tutor, an encouraging educational assistant.\n"
    "RULES:\n"
    "1. Answer ONLY using the provided source excerpts.\n"
    "2. If the excerpts do not contain the answer, say honestly: 'I could not find information about this in the course material.'\n"
    "3. Never invent facts, hallucinate features, or speculate beyond the sources.\n"
    "4. Follow the specific hint ladder instruction provided in the prompt."
)


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
        elif hint_level == 2:
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
        messages, citations = self._prepare_context(input_data)

        if not messages:
            return TutorOutput(
                response="I could not find information about this in the course material. I can only answer questions covered in the Parivestra knowledge base.",
                citations=[],
                hint_level=input_data.hint_level,
                covered=False,
            )

        try:
            raw_text = self.gateway.chat(messages, stream=False)
            return TutorOutput(
                response=raw_text.strip(),
                citations=citations,
                hint_level=input_data.hint_level,
                covered=True,
            )
        except Exception as e:
            # Fallback if LLM is offline or errors
            first_chunk = citations[0] if citations else None
            fallback_text = (
                f"Note: Local LLM service is currently offline. Here is the relevant material from the course:\n\n"
            )
            retrieved = self.retriever.retrieve(input_data.message, top_k=1)
            if retrieved:
                fallback_text += retrieved[0][0].content
            else:
                fallback_text = "I could not find information about this in the course material."

            return TutorOutput(
                response=fallback_text,
                citations=citations,
                hint_level=input_data.hint_level,
                covered=bool(citations),
            )

    def explain_stream(
        self, input_data: Union[TutorInput, dict]
    ) -> Generator[Dict[str, Any], None, None]:
        if isinstance(input_data, dict):
            input_data = TutorInput(**input_data)
        """
        Streaming explanation generator yielding SSE-compatible event dictionaries:
        - {"type": "token", "token": "..."}
        - {"type": "done", "citations": [...], "hint_level": ...}
        """
        messages, citations = self._prepare_context(input_data)

        if not messages:
            msg = "I could not find information about this in the course material. I can only answer questions covered in the Parivestra knowledge base."
            yield {"type": "token", "token": msg}
            yield {
                "type": "done",
                "citations": [],
                "hint_level": input_data.hint_level,
                "covered": False,
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
            }
        except Exception as e:
            # Fallback stream if LLM server is unreachable
            fallback = "Note: Local LLM is currently unreachable. "
            retrieved = self.retriever.retrieve(input_data.message, top_k=1)
            if retrieved:
                fallback += f"From course material [{retrieved[0][0].title}]:\n{retrieved[0][0].content}"
            else:
                fallback += "I could not find information about this in the course material."

            yield {"type": "token", "token": fallback}
            yield {
                "type": "done",
                "citations": [c.model_dump() for c in citations],
                "hint_level": input_data.hint_level,
                "covered": bool(citations),
            }
