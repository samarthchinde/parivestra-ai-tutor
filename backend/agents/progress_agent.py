"""Progress Agent: Manages topic mastery, weakness analysis, and learning recommendations."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.models import Attempt, Mastery


class TopicMastery(BaseModel):
    subject: str
    topic: str
    score: float
    attempts: int
    sufficient_data: bool  # True only if attempts >= 3


class ProgressSummary(BaseModel):
    user_id: str
    mastery_per_topic: List[TopicMastery]
    weakest_topics: List[Dict[str, Any]]
    recent_attempts: List[Dict[str, Any]]
    recommended_next_topic: str


class ProgressAgent:
    """Computes mastery using weighted moving average and generates learning recommendations."""

    def __init__(self, alpha: float = 0.3):
        # alpha is weight for new attempt, (1 - alpha) for historical score
        self.alpha = alpha

    def update_mastery(
        self,
        db: Session,
        user_id: str,
        subject: str,
        topic: str,
        correct: bool,
        grade: Optional[str] = "Class 3",
    ) -> TopicMastery:
        """Update topic mastery using weighted moving average."""
        query = db.query(Mastery).filter(
            Mastery.user_id == user_id,
            Mastery.subject == subject,
            Mastery.topic == topic,
        )
        if grade:
            query = query.filter(Mastery.grade == grade)
        mastery = query.first()

        attempt_score = 100.0 if correct else 0.0

        if not mastery:
            mastery = Mastery(
                user_id=user_id,
                grade=grade or "Class 3",
                subject=subject,
                topic=topic,
                score=attempt_score,
                attempts=1,
            )
            db.add(mastery)
        else:
            mastery.attempts += 1
            if grade and not mastery.grade:
                mastery.grade = grade
            mastery.score = round(
                (1.0 - self.alpha) * mastery.score + self.alpha * attempt_score, 1
            )

        db.commit()
        db.refresh(mastery)

        return TopicMastery(
            subject=mastery.subject,
            topic=mastery.topic,
            score=mastery.score,
            attempts=mastery.attempts,
            sufficient_data=mastery.attempts >= 3,
        )

    def get_progress_summary(
        self,
        db: Session,
        user_id: str,
        grade: Optional[str] = None,
    ) -> ProgressSummary:
        """Calculate comprehensive progress summary for a student, scoped by grade if provided."""
        m_query = db.query(Mastery).filter(Mastery.user_id == user_id)
        a_query = db.query(Attempt).filter(Attempt.user_id == user_id)

        if grade:
            m_query = m_query.filter(Mastery.grade == grade)
            a_query = a_query.filter(Attempt.grade == grade)

        all_masteries = m_query.all()

        mastery_list: List[TopicMastery] = []
        for m in all_masteries:
            mastery_list.append(
                TopicMastery(
                    subject=m.subject,
                    topic=m.topic,
                    score=round(m.score, 1),
                    attempts=m.attempts,
                    sufficient_data=m.attempts >= 3,
                )
            )

        # Recent attempts
        attempts = (
            a_query
            .order_by(Attempt.created_at.desc())
            .limit(20)
            .all()
        )

        recent_attempts_list = [
            {
                "id": a.id,
                "subject": a.subject,
                "topic": a.topic,
                "difficulty": a.difficulty,
                "question_id": a.question_id,
                "selected": a.selected,
                "correct": a.correct,
                "hints_used": a.hints_used,
                "time_taken": a.time_taken,
                "misconception_id": a.misconception_id,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in attempts
        ]

        # Weakest topics:
        # Prioritize topics with >= 3 attempts and score < 70
        qualified_weak = [
            {"topic": m.topic, "subject": m.subject, "score": m.score, "attempts": m.attempts}
            for m in mastery_list
            if m.sufficient_data and m.score < 75.0
        ]
        qualified_weak.sort(key=lambda x: x["score"])

        # If none have >= 3 attempts, look at mistake count in recent attempts
        if not qualified_weak:
            error_counts: Dict[str, int] = {}
            for a in attempts:
                if not a.correct:
                    error_counts[a.topic] = error_counts.get(a.topic, 0) + 1
            sorted_errors = sorted(error_counts.items(), key=lambda x: x[1], reverse=True)
            weakest_topics = [
                {"topic": topic, "subject": "Python", "errors": count}
                for topic, count in sorted_errors[:3]
            ]
        else:
            weakest_topics = qualified_weak[:3]

        # Recommended next topic
        if weakest_topics:
            rec = f"Revise {weakest_topics[0]['topic']} to strengthen your conceptual foundation."
        elif mastery_list:
            top_scorer = max(mastery_list, key=lambda m: m.score)
            rec = f"Great work on {top_scorer.topic}! Try Intermediate or Advanced practice."
        else:
            rec = "Start by exploring Python Basics and testing your knowledge in Practice!"

        return ProgressSummary(
            user_id=user_id,
            mastery_per_topic=mastery_list,
            weakest_topics=weakest_topics,
            recent_attempts=recent_attempts_list,
            recommended_next_topic=rec,
        )

