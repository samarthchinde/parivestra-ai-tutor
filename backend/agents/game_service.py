"""Bug Hunt Arena: Learning game service with safe AST validation,
scoring, Game Master reactions, and progress integration.
"""
import ast
import json
import logging
from pathlib import Path
import random
import re
import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.agents.progress_agent import ProgressAgent
from backend.llm.gateway import LLMGateway
from backend.models import Attempt, GameScore, GameSession, User

logger = logging.getLogger("backend.agents.game_service")

ALLOWED_BUG_TYPES = [
    "syntax",
    "logic",
    "off-by-one",
    "type_error",
    "name_error",
    "index_error",
    "key_error",
    "immutable_error",
    "wrong_output",
]

GAME_MASTER_CORRECT_REACTIONS = [
    "Bullseye! Your code-sleuth instincts are sharper than ever.",
    "Brilliant catch! The compiler breathes a sigh of relief.",
    "Incredible precision! That sneaky bug never stood a chance.",
    "Spot on! You dismantled that bug before it could corrupt memory.",
    "Masterful observation! Keep this fiery streak burning.",
]

GAME_MASTER_WRONG_REACTIONS = [
    "Ouch! That bug slipped right through our net. Shake it off and hunt the next one!",
    "Almost had it! Bugs love hiding in plain sight—keep your focus keen.",
    "A minor setback! Even senior architects run into wild bugs. Let's reclaim that life!",
    "Watch your step! That line was a diversion—re-read the variables closely.",
]


def load_fallback_bugs() -> List[Dict[str, Any]]:
    """Load built-in 15 verified snippets from knowledge_base/game_bugs.json."""
    bugs_file = Path(__file__).resolve().parent.parent.parent / "knowledge_base" / "game_bugs.json"
    if bugs_file.exists():
        with open(bugs_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def validate_bug_snippet(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Safely validate generated bug snippet in code using Python's AST parser.
    NEVER execute generated code.
    """
    if not isinstance(raw, dict):
        return None

    snippet = raw.get("snippet", "").strip()
    if not snippet:
        return None

    lines = snippet.splitlines()
    if len(lines) < 3 or len(lines) > 10:
        return None

    buggy_line = raw.get("buggy_line")
    if not isinstance(buggy_line, int) or buggy_line < 1 or buggy_line > len(lines):
        return None

    bug_type = str(raw.get("bug_type", "")).strip().lower()
    if bug_type not in ALLOWED_BUG_TYPES:
        return None

    # Safe AST validation without executing code
    if bug_type == "syntax":
        # Syntax bug should fail ast.parse
        try:
            ast.parse(snippet)
            # If it parsed without error, it is not a true syntax bug
            return None
        except SyntaxError:
            pass
    else:
        # Runtime/logic bugs must be syntactically valid python
        try:
            ast.parse(snippet)
        except SyntaxError:
            return None

    return {
        "snippet": snippet,
        "buggy_line": buggy_line,
        "bug_type": bug_type,
        "explanation": raw.get("explanation", "Code contains a bug on this line."),
        "hint": raw.get("hint", "Review the variable assignments and operations on this line."),
        "topic": raw.get("topic", "Python"),
    }


class BugHuntGameService:
    """Manages game rounds, scoring, Game Master persona, and persistence."""

    def __init__(self, gateway: Optional[LLMGateway] = None, progress_agent: Optional[ProgressAgent] = None):
        self.gateway = gateway or LLMGateway()
        self.progress_agent = progress_agent or ProgressAgent()
        self._fallback_bugs = load_fallback_bugs()

    def _generate_snippet(self, round_num: int, topic: Optional[str] = None) -> Dict[str, Any]:
        """Generate a validated bug snippet with LLM, falling back to bundled pool."""
        target_topic = topic or random.choice(["Lists", "Control Flow", "Functions", "Dictionaries", "Data Types", "OOP"])
        target_bug_type = random.choice(ALLOWED_BUG_TYPES)

        prompt = (
            f"You are a coding game level designer. Create a 4 to 8 line Python snippet with EXACTLY ONE bug for round {round_num}.\n"
            f"Topic: {target_topic}, Expected Bug Type: {target_bug_type}.\n\n"
            "RULES:\n"
            "- Exactly 4 to 8 lines of realistic Python code.\n"
            "- Exactly ONE buggy line.\n"
            f"- Bug type must be one of: {ALLOWED_BUG_TYPES}\n"
            "- Respond with JSON ONLY in this format:\n"
            "{\n"
            "  \"snippet\": \"def calculate(x):\\n    return x + 1\",\n"
            "  \"buggy_line\": 2,\n"
            "  \"bug_type\": \"type_error\",\n"
            "  \"explanation\": \"...\",\n"
            "  \"hint\": \"...\",\n"
            "  \"topic\": \"" + target_topic + "\"\n"
            "}"
        )

        for attempt in range(3):
            try:
                raw_resp = self.gateway.chat(
                    [{"role": "user", "content": prompt}],
                    max_tokens=600,
                    temperature=0.3,
                )
                json_match = re.search(r"\{.*\}", raw_resp, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    validated = validate_bug_snippet(parsed)
                    if validated:
                        return validated
            except Exception as e:
                logger.warning(f"Game snippet generation attempt {attempt + 1} failed: {e}")

        # Fallback to curated bugs
        if self._fallback_bugs:
            chosen = random.choice(self._fallback_bugs)
            return {
                "snippet": chosen["snippet"],
                "buggy_line": chosen["buggy_line"],
                "bug_type": chosen["bug_type"],
                "explanation": chosen["explanation"],
                "hint": chosen.get("hint", "Review the operations on this line."),
                "topic": chosen.get("topic", "Python"),
            }

        # Hardcoded emergency fallback
        return {
            "snippet": "scores = [10, 20, 30]\nprint(scores[5])",
            "buggy_line": 2,
            "bug_type": "index_error",
            "explanation": "List index 5 is out of range for a 3-element list.",
            "hint": "Check the list length and accessed index.",
            "topic": "Lists",
        }

    def start_game(self, db: Session, user: User, topic: Optional[str] = None) -> Dict[str, Any]:
        """Start a new Bug Hunt Arena game session."""
        session_id = f"game_{uuid.uuid4().hex[:12]}"
        snippet_data = self._generate_snippet(round_num=1, topic=topic)

        # Get personal best
        best_record = (
            db.query(GameScore)
            .filter(GameScore.user_id == user.id)
            .order_by(GameScore.score.desc())
            .first()
        )
        personal_best = best_record.score if best_record else 0

        game_session = GameSession(
            id=session_id,
            user_id=user.id,
            game_type="bughunt",
            score=0,
            lives=3,
            streak=0,
            round_number=1,
            current_snippet=snippet_data["snippet"],
            current_buggy_line=snippet_data["buggy_line"],
            current_bug_type=snippet_data["bug_type"],
            current_explanation=snippet_data["explanation"],
            current_topic=snippet_data["topic"],
            is_active=True,
        )
        db.add(game_session)
        db.commit()

        lines = snippet_data["snippet"].splitlines()

        # Notice: correct line and bug_type are NOT exposed to the client!
        return {
            "session_id": session_id,
            "round_number": 1,
            "snippet": snippet_data["snippet"],
            "lines_count": len(lines),
            "topic": snippet_data["topic"],
            "lives": 3,
            "score": 0,
            "streak": 0,
            "personal_best": personal_best,
            "allowed_bug_types": ALLOWED_BUG_TYPES,
        }

    def submit_answer(
        self,
        db: Session,
        user: User,
        session_id: str,
        selected_line: int,
        selected_bug_type: str,
        time_taken_seconds: float = 10.0,
    ) -> Dict[str, Any]:
        """Grade round answer, calculate multipliers, update streak, lives, and record progress."""
        session = db.query(GameSession).filter(GameSession.id == session_id, GameSession.is_active == True).first()
        if not session:
            return {"error": "Invalid or expired game session."}

        correct_line = session.current_buggy_line
        correct_type = session.current_bug_type
        topic = session.current_topic

        was_line_correct = selected_line == correct_line
        was_type_correct = selected_bug_type.strip().lower() == correct_type.strip().lower()

        points_awarded = 0
        if was_line_correct:
            # 100 base + 50 bonus for bug type + streak multiplier + speed bonus
            streak_multiplier = min(2.0, 1.0 + (session.streak * 0.1))
            speed_bonus = max(0, int(30 - min(30, time_taken_seconds)))
            base_points = 100 + (50 if was_type_correct else 0)
            points_awarded = int((base_points * streak_multiplier) + speed_bonus)

            session.score += points_awarded
            session.streak += 1
            reaction = random.choice(GAME_MASTER_CORRECT_REACTIONS)
        else:
            session.lives -= 1
            session.streak = 0
            reaction = random.choice(GAME_MASTER_WRONG_REACTIONS)

        # Update Mastery and record Attempt in database
        self.progress_agent.update_mastery(
            db=db,
            user_id=user.id,
            subject="Python",
            topic=topic,
            correct=was_line_correct,
        )

        attempt = Attempt(
            user_id=user.id,
            subject="Python",
            topic=topic,
            difficulty="Intermediate",
            question_id=f"bughunt_{session.round_number}_{session.id[:6]}",
            selected=f"Line {selected_line} ({selected_bug_type})",
            correct=was_line_correct,
            hints_used=0,
            time_taken=time_taken_seconds,
        )
        db.add(attempt)

        game_over = session.lives <= 0
        personal_best = 0

        if game_over:
            session.is_active = False
            # Record final game score
            score_entry = GameScore(
                user_id=user.id,
                user_name=user.name or "Student",
                score=session.score,
                rounds_cleared=session.round_number - 1,
            )
            db.add(score_entry)
            db.commit()

            # Query new personal best
            best_record = (
                db.query(GameScore)
                .filter(GameScore.user_id == user.id)
                .order_by(GameScore.score.desc())
                .first()
            )
            personal_best = best_record.score if best_record else session.score

            return {
                "was_line_correct": was_line_correct,
                "was_type_correct": was_type_correct,
                "correct_line": correct_line,
                "correct_bug_type": correct_type,
                "points_awarded": points_awarded,
                "current_score": session.score,
                "lives_remaining": 0,
                "streak": 0,
                "game_over": True,
                "personal_best": personal_best,
                "is_new_high_score": session.score >= personal_best,
                "explanation": session.current_explanation,
                "reaction": f"Game Over! Final Score: {session.score}. You cleared {session.round_number - 1} bug rounds!",
                "next_round": None,
            }

        # Prepare next round
        session.round_number += 1
        next_snippet_data = self._generate_snippet(round_num=session.round_number)
        session.current_snippet = next_snippet_data["snippet"]
        session.current_buggy_line = next_snippet_data["buggy_line"]
        session.current_bug_type = next_snippet_data["bug_type"]
        session.current_explanation = next_snippet_data["explanation"]
        session.current_topic = next_snippet_data["topic"]
        db.commit()

        return {
            "was_line_correct": was_line_correct,
            "was_type_correct": was_type_correct,
            "correct_line": correct_line,
            "correct_bug_type": correct_type,
            "points_awarded": points_awarded,
            "current_score": session.score,
            "lives_remaining": session.lives,
            "streak": session.streak,
            "game_over": False,
            "explanation": session.current_explanation,
            "reaction": reaction,
            "next_round": {
                "round_number": session.round_number,
                "snippet": session.current_snippet,
                "lines_count": len(session.current_snippet.splitlines()),
                "topic": session.current_topic,
                "lives": session.lives,
                "score": session.score,
                "streak": session.streak,
            },
        }

    def get_hint(self, db: Session, session_id: str) -> Dict[str, Any]:
        """Provide a non-spoiler hint costing 25 points."""
        session = db.query(GameSession).filter(GameSession.id == session_id, GameSession.is_active == True).first()
        if not session:
            return {"error": "Invalid session."}

        # Deduct 25 points
        session.score = max(0, session.score - 25)
        db.commit()

        hint_text = f"Examine how the {session.current_topic} syntax handles edge conditions on this snippet."
        try:
            prompt = (
                f"Give a subtle, 1-sentence hint for finding this bug without giving away line {session.current_buggy_line} "
                f"or bug type '{session.current_bug_type}'.\nCode:\n{session.current_snippet}"
            )
            raw = self.gateway.chat([{"role": "user", "content": prompt}], max_tokens=60, temperature=0.2)
            if raw and len(raw.strip()) > 10:
                hint_text = raw.strip()
        except Exception:
            pass

        return {"hint": hint_text, "score": session.score}

    def get_leaderboard(self, db: Session, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetch top-10 leaderboard scores."""
        records = (
            db.query(GameScore)
            .order_by(GameScore.score.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "rank": idx + 1,
                "user_name": r.user_name or f"Coder #{r.id}",
                "score": r.score,
                "rounds_cleared": r.rounds_cleared,
                "played_at": r.played_at.isoformat() if r.played_at else None,
            }
            for idx, r in enumerate(records)
        ]
