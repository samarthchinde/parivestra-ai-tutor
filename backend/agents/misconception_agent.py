"""Misconception Agent: Matches incorrect answers to cataloged student misconceptions."""
import json
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

from backend.llm.gateway import LLMGateway


class Misconception(BaseModel):
    id: str
    topic: str
    wrong_belief: str
    correction: str


class MisconceptionInput(BaseModel):
    question: str
    selected_answer: str
    correct_answer: str
    topic: Optional[str] = None


class MisconceptionOutput(BaseModel):
    matched_id: Optional[str] = None
    wrong_belief: Optional[str] = None
    correction: Optional[str] = None


class MisconceptionAgent:
    """Detects if student mistake stems from a known conceptual misconception."""

    def __init__(
        self,
        misconceptions_path: Optional[Path] = None,
        gateway: Optional[LLMGateway] = None,
    ):
        if misconceptions_path is None:
            misconceptions_path = (
                Path(__file__).resolve().parent.parent.parent
                / "knowledge_base"
                / "misconceptions.json"
            )
        self.gateway = gateway or LLMGateway()
        self.misconceptions: List[Misconception] = []
        if misconceptions_path.exists():
            try:
                with open(misconceptions_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        self.misconceptions.append(Misconception(**item))
            except Exception as e:
                print(f"Error loading misconceptions: {e}")

    def match(self, input_data: Union[MisconceptionInput, dict]) -> MisconceptionOutput:
        """Match wrong answer to cataloged misconception list."""
        if isinstance(input_data, dict):
            input_data = MisconceptionInput(**input_data)
        if not self.misconceptions:
            return MisconceptionOutput()

        text = f"{input_data.question} {input_data.selected_answer} {input_data.topic or ''}".lower()
        words = set(re.findall(r"\w+", text))

        best_match: Optional[Misconception] = None
        best_overlap = 0

        # Calculate word overlap with wrong beliefs
        for m in self.misconceptions:
            m_words = set(re.findall(r"\w+", f"{m.wrong_belief} {m.topic}".lower()))
            overlap = len(words.intersection(m_words))
            if overlap > best_overlap and overlap >= 2:
                best_overlap = overlap
                best_match = m

        if best_match:
            return MisconceptionOutput(
                matched_id=best_match.id,
                wrong_belief=best_match.wrong_belief,
                correction=best_match.correction,
            )

        # Fallback to LLM matching if candidate is subtle
        try:
            candidates_summary = "\n".join(
                [f"- ID: {m.id} | Belief: {m.wrong_belief}" for m in self.misconceptions[:15]]
            )
            prompt = (
                f"Question: \"{input_data.question}\"\n"
                f"Student selected: \"{input_data.selected_answer}\"\n"
                f"Correct answer: \"{input_data.correct_answer}\"\n\n"
                f"Catalog of common misconceptions:\n{candidates_summary}\n\n"
                "If the student's mistake matches one of these misconceptions, reply with ONLY the ID. "
                "If none clearly match, reply with 'NONE'."
            )
            res = self.gateway.chat([{"role": "user", "content": prompt}], max_tokens=20, temperature=0.0)
            res_id = res.strip()
            for m in self.misconceptions:
                if m.id in res_id:
                    return MisconceptionOutput(
                        matched_id=m.id,
                        wrong_belief=m.wrong_belief,
                        correction=m.correction,
                    )
        except Exception:
            pass

        return MisconceptionOutput()
