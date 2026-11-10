"""Learning Path service: Computes level unlocks, mastery, XP, and streak."""
from datetime import datetime, timezone, timedelta
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.models import Attempt, Mastery


def load_learning_path_config() -> Dict[str, Any]:
    """Load level and milestone structure from knowledge_base/learning_path.json."""
    path_file = Path(__file__).resolve().parent.parent.parent / "knowledge_base" / "learning_path.json"
    if path_file.exists():
        with open(path_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"subject": "Python", "levels": []}


def calculate_xp_and_streak(attempts: List[Attempt]) -> Dict[str, Any]:
    """Calculate total XP, badges, and consecutive practice day streak."""
    if not attempts:
        return {"xp": 0, "streak_days": 0, "badge": "Novice Coder"}

    correct_count = sum(1 for a in attempts if a.correct)
    total_count = len(attempts)
    xp = (total_count * 20) + (correct_count * 50)

    # Calculate streak days from attempt timestamps
    attempt_dates = set()
    for a in attempts:
        if a.created_at:
            dt = a.created_at if a.created_at.tzinfo else a.created_at.replace(tzinfo=timezone.utc)
            attempt_dates.add(dt.date())

    sorted_dates = sorted(list(attempt_dates), reverse=True)
    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)

    streak = 0
    if sorted_dates:
        # If practised today or yesterday, streak is alive
        if sorted_dates[0] in (today, yesterday):
            expected = sorted_dates[0]
            for d in sorted_dates:
                if d == expected:
                    streak += 1
                    expected -= timedelta(days=1)
                else:
                    break

    # Badge tiers
    if xp >= 1500:
        badge = "Grandmaster"
    elif xp >= 800:
        badge = "Syntax Master"
    elif xp >= 400:
        badge = "Logic Knight"
    elif xp >= 150:
        badge = "Python Apprentice"
    else:
        badge = "Novice Coder"

    return {"xp": xp, "streak_days": streak, "badge": badge}


def get_learning_path(db: Session, user_id: str, rec_next_topic: Optional[str] = None) -> Dict[str, Any]:
    """Generate comprehensive level-wise learning path for the student."""
    config = load_learning_path_config()
    raw_levels = config.get("levels", [])

    # Fetch user mastery and attempts
    masteries = db.query(Mastery).filter(Mastery.user_id == user_id).all()
    mastery_by_topic = {m.topic.lower(): m for m in masteries}

    attempts = db.query(Attempt).filter(Attempt.user_id == user_id).order_by(Attempt.created_at.desc()).all()
    stats = calculate_xp_and_streak(attempts)

    processed_levels = []
    prev_level_qualified = True
    prev_level_name = ""

    for idx, lvl in enumerate(raw_levels):
        lvl_id = lvl["id"]
        lvl_name = lvl["name"]
        milestones = lvl.get("milestones", [])

        # Calculate milestone masteries for this level
        ms_data = []
        topic_scores = []
        all_topics_have_min_attempts = True
        completed_milestones = 0

        for ms in milestones:
            topic_key = ms["topic"].lower()
            m_record = mastery_by_topic.get(topic_key)

            if m_record:
                score = round(m_record.score, 1)
                attempts_cnt = m_record.attempts
                sufficient = attempts_cnt >= 3
                topic_scores.append(score)
                if not sufficient:
                    all_topics_have_min_attempts = False
                if sufficient and score >= 75.0:
                    completed_milestones += 1
            else:
                score = 0.0
                attempts_cnt = 0
                sufficient = False
                topic_scores.append(0.0)
                all_topics_have_min_attempts = False

            ms_data.append({
                "id": ms["id"],
                "title": ms["title"],
                "topic": ms["topic"],
                "description": ms.get("description", ""),
                "score": score,
                "attempts": attempts_cnt,
                "sufficient_data": sufficient,
            })

        avg_score = round(sum(topic_scores) / len(topic_scores), 1) if topic_scores else 0.0

        # Determine level status and unlock rules:
        # Level 1 is always unlocked.
        # Level N requires Level N-1 to have all topics with >= 3 attempts AND average score >= 60%
        if lvl_id == 1:
            status = "completed" if (all_topics_have_min_attempts and avg_score >= 80.0) else "in_progress"
            lock_reason = None
        else:
            if prev_level_qualified:
                status = "completed" if (all_topics_have_min_attempts and avg_score >= 80.0) else "in_progress"
                lock_reason = None
            else:
                status = "locked"
                lock_reason = f"Locked: Requires >= 60% average mastery with >= 3 attempts per topic in {prev_level_name}."

        # Current level qualification check for the next level
        current_level_qualifies = all_topics_have_min_attempts and (avg_score >= 60.0)
        prev_level_qualified = current_level_qualifies
        prev_level_name = lvl_name

        level_progress = round((completed_milestones / len(milestones)) * 100) if milestones else 0

        processed_levels.append({
            "id": lvl_id,
            "name": lvl_name,
            "description": lvl.get("description", ""),
            "status": status,
            "lock_reason": lock_reason,
            "average_score": avg_score,
            "progress_pct": level_progress,
            "milestones": ms_data,
        })

    # Recommended next topic
    next_step = rec_next_topic
    if not next_step:
        # Default to first in_progress milestone
        for lvl in processed_levels:
            if lvl["status"] == "in_progress":
                for m in lvl["milestones"]:
                    if not m["sufficient_data"] or m["score"] < 75:
                        next_step = f"Study {m['title']} ({m['topic']}) to advance {lvl['name']}."
                        break
                if next_step:
                    break

    return {
        "user_id": user_id,
        "xp": stats["xp"],
        "streak_days": stats["streak_days"],
        "badge": stats["badge"],
        "next_best_step": next_step or "Start Level 1 to build your foundations!",
        "levels": processed_levels,
    }

