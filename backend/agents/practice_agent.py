"""Practice Agent: Generates and strictly validates MCQs from retrieved sources."""
import json
import logging
import random
import re
import uuid
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

from backend.data.question_bank import load_bundled_questions
from backend.llm.gateway import LLMGateway
from backend.rag.retriever import BaseRetriever, get_default_retriever

logger = logging.getLogger("backend.agents.practice_agent")


class PracticeQuestion(BaseModel):
    id: str
    subject: str
    topic: str
    difficulty: str
    question: str
    options: List[str] = Field(..., min_length=4, max_length=4)
    answer: str
    correct_index: int = Field(..., ge=0, le=3)
    explanation: Optional[str] = None


class GeneratePracticeInput(BaseModel):
    subject: str = "Python"
    topic: Optional[str] = None
    difficulty: str = "Beginner"
    count: int = Field(default=5, ge=1, le=20)


class PracticeAgent:
    """Generates MCQs using LLM from retrieved sources with code validation and question bank fallback."""

    def __init__(
        self,
        gateway: Optional[LLMGateway] = None,
        retriever: Optional[BaseRetriever] = None,
    ):
        self.gateway = gateway or LLMGateway()
        self.retriever = retriever or get_default_retriever()
        self._bundled = load_bundled_questions()

    def _validate_question(
        self, raw: Dict[str, Any], subject: str, topic: Optional[str], difficulty: str
    ) -> Optional[PracticeQuestion]:
        """Validate question dictionary in code."""
        if not isinstance(raw, dict):
            return None

        q_text = raw.get("question")
        if not q_text or not isinstance(q_text, str) or len(q_text.strip()) < 8:
            return None

        options = raw.get("options")
        if not isinstance(options, list) or len(options) != 4:
            return None

        clean_options = [str(o).strip() for o in options]
        # Check no duplicates
        if len(set(clean_options)) != 4 or any(len(o) == 0 for o in clean_options):
            return None

        # Check correct answer / index
        correct_idx = raw.get("correct_index")
        answer = raw.get("answer")

        if correct_idx is not None and isinstance(correct_idx, int) and 0 <= correct_idx <= 3:
            answer = clean_options[correct_idx]
        elif answer and isinstance(answer, str) and answer.strip() in clean_options:
            correct_idx = clean_options.index(answer.strip())
            answer = answer.strip()
        else:
            return None

        q_topic = raw.get("topic") or topic or subject
        return PracticeQuestion(
            id=f"mcq_{uuid.uuid4().hex[:8]}",
            subject=subject,
            topic=q_topic,
            difficulty=difficulty,
            question=q_text.strip(),
            options=clean_options,
            answer=answer,
            correct_index=correct_idx,
            explanation=raw.get("explanation"),
        )

    def _get_fallback_questions(
        self, subject: str, difficulty: str, count: int
    ) -> List[PracticeQuestion]:
        """Fetch fallback questions from bundled question bank."""
        matches = [
            q for q in self._bundled
            if (subject.lower() in ("all", q["subject"].lower()))
            and (difficulty.lower() == q["difficulty"].lower())
        ]
        if not matches:
            # Match any difficulty for that subject
            matches = [
                q for q in self._bundled
                if subject.lower() in ("all", q["subject"].lower())
            ]
        if not matches:
            matches = self._bundled

        selected = random.sample(matches, min(count, len(matches)))
        return [
            PracticeQuestion(
                id=q["id"],
                subject=q["subject"],
                topic=q["topic"],
                difficulty=q["difficulty"],
                question=q["question"],
                options=q["options"],
                answer=q["answer"],
                correct_index=q["correct_index"],
            )
            for q in selected
        ]

    def generate(self, input_data: Union[GeneratePracticeInput, dict]) -> List[PracticeQuestion]:
        """Generate MCQs from retrieved sources with retry and fallback."""
        if isinstance(input_data, dict):
            input_data = GeneratePracticeInput(**input_data)
        query = f"{input_data.subject} {input_data.topic or ''} {input_data.difficulty}"
        retrieved = self.retriever.retrieve(
            query=query,
            top_k=4,
            subject=input_data.subject,
            topic=input_data.topic,
        )

        sources_text = "\n\n".join([f"[{c.id}] {c.content}" for c, _ in retrieved])

        prompt = (
            f"Generate {input_data.count} multiple-choice question(s) for subject '{input_data.subject}' "
            f"(topic: {input_data.topic or 'core concepts'}, difficulty: {input_data.difficulty}) based on these sources:\n"
            f"{sources_text}\n\n"
            "REQUIREMENTS:\n"
            "- Exactly 4 distinct options per question.\n"
            "- Exactly one correct answer indicated by correct_index (0 to 3).\n"
            "- Output valid JSON array ONLY in this format:\n"
            "[\n"
            "  {\n"
            "    \"question\": \"...\",\n"
            "    \"options\": [\"opt0\", \"opt1\", \"opt2\", \"opt3\"],\n"
            "    \"correct_index\": 1,\n"
            "    \"topic\": \"...\"\n"
            "  }\n"
            "]"
        )

        valid_questions: List[PracticeQuestion] = []
        # Try generation with up to 2 retries (total 3 attempts)
        for attempt in range(3):
            try:
                raw_resp = self.gateway.chat(
                    [{"role": "user", "content": prompt}],
                    max_tokens=1500,
                    temperature=0.3,
                )
                # Extract JSON array from response
                json_match = re.search(r"\[\s*\{.*\}\s*\]", raw_resp, re.DOTALL)
                if not json_match:
                    continue
                parsed = json.loads(json_match.group(0))
                if isinstance(parsed, list):
                    for item in parsed:
                        validated = self._validate_question(
                            item, input_data.subject, input_data.topic, input_data.difficulty
                        )
                        if validated:
                            valid_questions.append(validated)

                if len(valid_questions) >= input_data.count:
                    return valid_questions[: input_data.count]
            except Exception as e:
                logger.warning(f"Practice generation attempt {attempt + 1} error: {e}")

        # If generated count is insufficient, supplement from fallback question bank
        needed = input_data.count - len(valid_questions)
        if needed > 0:
            fallbacks = self._get_fallback_questions(
                input_data.subject, input_data.difficulty, needed
            )
            valid_questions.extend(fallbacks)

        return valid_questions[: input_data.count]
