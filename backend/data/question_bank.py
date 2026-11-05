"""Loader for bundled fallback question bank from src/assessment/questionBank.js."""
from pathlib import Path
import re
from typing import Any, Dict, List


def load_bundled_questions() -> List[Dict[str, Any]]:
    """Parse question objects from src/assessment/questionBank.js."""
    qb_path = Path(__file__).resolve().parent.parent.parent / "src" / "assessment" / "questionBank.js"
    if not qb_path.exists():
        return []

    content = qb_path.read_text(encoding="utf-8")
    pattern = re.compile(
        r'topic:\s*["\']([^"\']+)["\'],\s*'
        r'difficulty:\s*["\']([^"\']+)["\'],\s*'
        r'question:\s*["\']([^"\']+)["\'],\s*'
        r'options:\s*\[(.*?)\]\s*,\s*'
        r'answer:\s*["\']([^"\']+)["\']',
        re.DOTALL,
    )

    questions = []
    idx = 1
    for match in pattern.finditer(content):
        topic = match.group(1).strip()
        difficulty = match.group(2).strip()
        question = match.group(3).strip()
        options_raw = match.group(4)
        answer = match.group(5).strip()

        # Parse options
        options = [
            opt.strip().strip('"').strip("'")
            for opt in re.findall(r'["\']([^"\']+)["\']', options_raw)
        ]

        if len(options) == 4 and answer in options:
            questions.append({
                "id": f"bundled_{idx}",
                "subject": topic,
                "topic": topic,
                "difficulty": difficulty,
                "question": question,
                "options": options,
                "answer": answer,
                "correct_index": options.index(answer),
            })
            idx += 1

    return questions

