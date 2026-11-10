"""Practice Agent: Generates MCQs with 1-question-per-call, thinking disabled,
time budget, deduplication, adaptive difficulty, background question pool,
robust JSON extraction/repair, and fallback.
"""
import ast
import hashlib
import json
import logging
import random
import re
import threading
import time
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple, Union
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.data.question_bank import load_bundled_questions
from backend.llm.gateway import LLMGateway
from backend.models import Attempt, GeneratedQuestion, UserSeenQuestion
from backend.rag.retriever import BaseRetriever, Chunk, get_default_retriever

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
    source: str = "ai"  # "ai" or "fallback"


class GeneratePracticeInput(BaseModel):
    subject: str = "Python"
    topic: Optional[str] = None
    difficulty: str = "Beginner"
    count: int = Field(default=5, ge=1, le=20)
    user_id: Optional[str] = "student_default"


def normalize_stem(stem: str) -> str:
    """Normalize question text for hashing and overlap comparison."""
    clean = re.sub(r"[^\w\s]", "", stem.lower())
    return " ".join(clean.split())


def stem_hash(stem: str) -> str:
    """Compute deterministic SHA-256 hash of normalized question stem."""
    return hashlib.sha256(normalize_stem(stem).encode("utf-8")).hexdigest()


def calculate_jaccard_overlap(stem1: str, stem2: str) -> float:
    """Calculate token overlap (Jaccard similarity) between two question stems."""
    tokens1 = set(normalize_stem(stem1).split())
    tokens2 = set(normalize_stem(stem2).split())
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union)


def calculate_source_overlap(correct_answer: str, explanation: Optional[str], source_content: str) -> float:
    """Calculate keyword overlap between correct answer/explanation and source material."""
    if not source_content:
        return 1.0
    tokens = set(re.findall(r"\w+", (correct_answer + " " + (explanation or "")).lower()))
    if not tokens:
        return 0.5
    src_tokens = set(re.findall(r"\w+", source_content.lower()))
    overlap = tokens.intersection(src_tokens)
    return len(overlap) / len(tokens)


def extract_and_repair_json(raw_text: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Extract and repair JSON object from model output.
    Handles code fences, trailing commas, and partial structures.
    Returns (parsed_dict, error_message).
    """
    if not raw_text or not isinstance(raw_text, str):
        return None, "empty_raw_text"

    text = raw_text.strip()
    # Strip markdown code fences
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*```$", "", text, flags=re.MULTILINE)

    # 1. Look for first { ... } block
    start_idx = text.find("{")
    if start_idx != -1:
        depth = 0
        end_idx = -1
        in_string = False
        escape = False
        for i in range(start_idx, len(text)):
            c = text[i]
            if c == '"' and not escape:
                in_string = not in_string
            elif not in_string:
                if c == '{':
                    depth += 1
                elif c == '}':
                    depth -= 1
                    if depth == 0:
                        end_idx = i + 1
                        break
            escape = (c == '\\' and not escape)

        candidate = text[start_idx:end_idx] if end_idx != -1 else text[start_idx:]
        # Remove trailing commas
        cleaned = re.sub(r",\s*([\]}])", r"\1", candidate)

        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict):
                return parsed, None
        except Exception:
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, dict):
                    return parsed, None
            except Exception:
                pass

    # 2. Try direct json.loads (or list of dicts)
    try:
        direct = json.loads(text)
        if isinstance(direct, dict):
            return direct, None
        if isinstance(direct, list) and len(direct) > 0 and isinstance(direct[0], dict):
            return direct[0], None
    except Exception:
        pass

    # 3. Fallback regex field recovery
    try:
        q_match = re.search(r'"question"\s*:\s*"(.*?)"\s*,\s*"options"', text, re.DOTALL)
        if not q_match:
            q_match = re.search(r'"question"\s*:\s*"([^"]+)"', text)
        opts_match = re.search(r'"options"\s*:\s*\[(.*?)\]', text, re.DOTALL)
        idx_match = re.search(r'"correct_index"\s*:\s*(\d+)', text)
        topic_match = re.search(r'"topic"\s*:\s*"([^"]+)"', text)
        if q_match and opts_match and idx_match:
            opts_raw = re.findall(r'"([^"]+)"', opts_match.group(1))
            if len(opts_raw) == 4:
                return {
                    "question": q_match.group(1).strip().replace('\\n', '\n').replace('\\"', '"'),
                    "options": [o.strip() for o in opts_raw],
                    "correct_index": int(idx_match.group(1)),
                    "topic": topic_match.group(1).strip() if topic_match else "General",
                }, None
    except Exception as e:
        logger.debug(f"Regex json extraction failed: {e}")

    return None, "invalid_json"


def compute_adaptive_difficulty(
    db: Optional[Session], user_id: str, topic: str, requested_difficulty: str
) -> str:
    """
    Adaptive difficulty:
    - If last 3 answers in topic are correct -> move up one difficulty.
    - If 2 of last 3 are incorrect -> move down one difficulty.
    """
    if not db or not user_id or not hasattr(db, "query"):
        return requested_difficulty

    try:
        recent = (
            db.query(Attempt)
            .filter(Attempt.user_id == user_id, Attempt.topic == topic)
            .order_by(Attempt.created_at.desc())
            .limit(3)
            .all()
        )

        if len(recent) < 3:
            return requested_difficulty

        all_correct = all(a.correct for a in recent)
        wrong_count = sum(1 for a in recent if not a.correct)

        difficulties = ["Beginner", "Intermediate", "Advanced"]
        current_idx = difficulties.index(requested_difficulty) if requested_difficulty in difficulties else 0

        if all_correct and current_idx < len(difficulties) - 1:
            new_diff = difficulties[current_idx + 1]
            logger.info(f"Adaptive difficulty promoted {user_id} on {topic} from {requested_difficulty} to {new_diff}")
            return new_diff
        elif wrong_count >= 2 and current_idx > 0:
            new_diff = difficulties[current_idx - 1]
            logger.info(f"Adaptive difficulty demoted {user_id} on {topic} from {requested_difficulty} to {new_diff}")
            return new_diff
    except Exception as e:
        logger.warning(f"Error computing adaptive difficulty: {e}")

    return requested_difficulty


class PracticeAgent:
    """Generates MCQs with 1-at-a-time generation, time budget, question pool, and robust fallback."""

    ANGLES = [
        "concept_explanation",
        "code_output_prediction",
        "find_the_bug",
        "syntax_rule",
        "edge_case_behavior",
    ]

    def __init__(
        self,
        gateway: Optional[LLMGateway] = None,
        retriever: Optional[BaseRetriever] = None,
    ):
        self.gateway = gateway or LLMGateway()
        self.retriever = retriever or get_default_retriever()
        self._bundled = load_bundled_questions()

    def _get_user_seen_stems_and_hashes(
        self, db: Optional[Session], user_id: str
    ) -> Tuple[List[str], Set[str]]:
        """Retrieve the last 20 question stems and all seen hashes for this user."""
        if not db or not user_id or not hasattr(db, "query"):
            return [], set()

        try:
            seen_records = (
                db.query(UserSeenQuestion)
                .filter(UserSeenQuestion.user_id == user_id)
                .order_by(UserSeenQuestion.seen_at.desc())
                .limit(20)
                .all()
            )
            seen_hashes = {r.question_hash for r in seen_records}

            seen_stems = []
            if seen_records:
                q_ids = [r.question_id for r in seen_records]
                gen_q_rows = db.query(GeneratedQuestion).filter(GeneratedQuestion.id.in_(q_ids)).all()
                seen_stems = [q.stem for q in gen_q_rows]

            return seen_stems, seen_hashes
        except Exception as e:
            logger.warning(f"Error reading seen questions: {e}")
            return [], set()

    def _is_duplicate(
        self,
        stem: str,
        seen_stems: List[str],
        seen_hashes: Set[str],
        current_batch_stems: List[str],
    ) -> Tuple[bool, Optional[str]]:
        """Check duplicate using SHA-256 hash and Jaccard token overlap (> 0.8)."""
        q_hash = stem_hash(stem)
        if q_hash in seen_hashes:
            return True, "duplicate_hash_seen"

        for past_stem in seen_stems + current_batch_stems:
            if calculate_jaccard_overlap(stem, past_stem) > 0.8:
                return True, f"duplicate_token_overlap_with_{past_stem[:30]}"

        return False, None

    def _validate_question_with_reason(
        self,
        raw: Dict[str, Any],
        subject: str,
        target_topic: str,
        difficulty: str,
        source_chunk: Optional[Chunk] = None,
    ) -> Tuple[Optional[PracticeQuestion], Optional[str]]:
        """Validate question structure, options, index, and topic. Returns (question, reject_reason)."""
        if not isinstance(raw, dict):
            return None, "invalid_json_structure"

        q_text = raw.get("question")
        if not q_text or not isinstance(q_text, str) or len(q_text.strip()) < 10:
            return None, "invalid_question_stem"

        options = raw.get("options")
        if not isinstance(options, list) or len(options) != 4:
            return None, f"option_count_not_4 (got {len(options) if isinstance(options, list) else type(options)})"

        clean_options = [str(o).strip() for o in options]
        if len(set(clean_options)) != 4 or any(len(o) == 0 for o in clean_options):
            return None, "duplicate_or_empty_options"

        correct_idx = raw.get("correct_index")
        answer = raw.get("answer")

        if correct_idx is not None and isinstance(correct_idx, int) and 0 <= correct_idx <= 3:
            answer = clean_options[correct_idx]
        elif answer and isinstance(answer, str) and answer.strip() in clean_options:
            correct_idx = clean_options.index(answer.strip())
            answer = answer.strip()
        else:
            return None, f"correct_index_out_of_range (got {correct_idx})"

        # Check source keyword overlap and log score
        explanation = raw.get("explanation")
        if source_chunk:
            overlap_score = calculate_source_overlap(answer, explanation, source_chunk.content)
            logger.info(f"Source keyword overlap score: {overlap_score:.2f} for question '{q_text[:40]}...'")
            if overlap_score < 0.05:
                return None, f"low_source_overlap ({overlap_score:.2f})"

        q_topic = raw.get("topic") or target_topic or subject
        question_obj = PracticeQuestion(
            id=f"mcq_{uuid.uuid4().hex[:10]}",
            subject=subject,
            topic=q_topic,
            difficulty=difficulty,
            question=q_text.strip(),
            options=clean_options,
            answer=answer,
            correct_index=correct_idx,
            explanation=explanation,
            source="ai",
        )
        return question_obj, None

    def _validate_question(
        self,
        raw: Dict[str, Any],
        subject: str,
        target_topic: str,
        difficulty: str,
        source_chunk: Optional[Chunk] = None,
    ) -> Optional[PracticeQuestion]:
        """Backward-compatible validation returning PracticeQuestion or None."""
        question, reason = self._validate_question_with_reason(
            raw, subject, target_topic, difficulty, source_chunk
        )
        if reason:
            logger.info(f"Question rejected during validation: {reason}")
        return question

    def _generate_one_question(
        self,
        subject: str,
        topic: str,
        difficulty: str,
        source_chunk: Optional[Chunk],
        seen_stems: List[str],
        seen_hashes: Set[str],
        session_stems: List[str],
    ) -> Tuple[Optional[PracticeQuestion], Optional[str]]:
        """Generate ONE question per model call with thinking disabled and max_tokens=500."""
        angle = random.choice(self.ANGLES)
        seed_val = random.randint(1000, 99999)

        exclusion_note = ""
        if seen_stems:
            exclusion_note = f"Avoid repeating recent concepts: {', '.join(seen_stems[-3:])}."

        source_text = source_chunk.content[:400] if source_chunk else f"Python {topic} fundamental concepts."

        prompt = (
            f"You are an assessment author for {subject}.\n"
            f"Generate exactly 1 multiple-choice question for topic '{topic}' (difficulty: {difficulty}, angle: {angle}, seed: {seed_val}).\n"
            f"SOURCE:\n{source_text}\n"
            f"{exclusion_note}\n\n"
            "RULES:\n"
            "- Exactly 4 distinct options.\n"
            "- Exactly one correct answer indicated by correct_index (0 to 3).\n"
            "- Respond with JSON ONLY in this format:\n"
            "{\n"
            "  \"question\": \"Question text here?\",\n"
            "  \"options\": [\"Option 0\", \"Option 1\", \"Option 2\", \"Option 3\"],\n"
            "  \"correct_index\": 0,\n"
            "  \"explanation\": \"Why this answer is correct\",\n"
            f"  \"topic\": \"{topic}\"\n"
            "}"
        )

        t_start = time.perf_counter()
        prompt_size = len(prompt)

        try:
            raw_resp = self.gateway.chat(
                [{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.7,
                enable_thinking=False,
            )
            time_taken = time.perf_counter() - t_start
            raw_preview = (raw_resp[:500] if raw_resp else "")

            logger.info(
                f"[PracticeGen] Prompt: {prompt_size} chars | Time: {time_taken:.2f}s | "
                f"Raw preview: {repr(raw_preview[:120])}"
            )

            parsed_json, json_err = extract_and_repair_json(raw_resp)
            if not parsed_json:
                logger.warning(f"[PracticeGen] Question rejected: {json_err}. Raw output: {repr(raw_preview)}")
                return None, json_err

            question, val_err = self._validate_question_with_reason(
                raw=parsed_json,
                subject=subject,
                target_topic=topic,
                difficulty=difficulty,
                source_chunk=source_chunk,
            )
            if not question:
                logger.warning(f"[PracticeGen] Question rejected: {val_err}. Question: {repr(parsed_json.get('question'))}")
                return None, val_err

            is_dup, dup_reason = self._is_duplicate(question.question, seen_stems, seen_hashes, session_stems)
            if is_dup:
                logger.warning(f"[PracticeGen] Question rejected: {dup_reason}. Question: '{question.question}'")
                return None, dup_reason

            logger.info(f"[PracticeGen] Successfully generated valid question in {time_taken:.2f}s: '{question.question[:60]}'")
            return question, None

        except Exception as e:
            time_taken = time.perf_counter() - t_start
            logger.warning(f"[PracticeGen] Generation failed after {time_taken:.2f}s: {e}")
            return None, str(e)

    def _get_fallback_questions(
        self,
        subject: str,
        difficulty: str,
        count: int,
        seen_hashes: Set[str],
    ) -> List[PracticeQuestion]:
        """Fetch fallback questions from bundled question bank, excluding seen questions."""
        matches = [
            q for q in self._bundled
            if (subject.lower() in ("all", q["subject"].lower()))
            and (difficulty.lower() == q["difficulty"].lower())
            and stem_hash(q["question"]) not in seen_hashes
        ]
        if not matches:
            matches = [
                q for q in self._bundled
                if subject.lower() in ("all", q["subject"].lower())
                and stem_hash(q["question"]) not in seen_hashes
            ]
        if not matches:
            matches = self._bundled

        if len(matches) < count:
            remaining = [q for q in self._bundled if q not in matches]
            matches.extend(remaining)

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
                source="fallback",
            )
            for q in selected
        ]

    def get_from_pool(
        self,
        db: Session,
        user_id: str,
        subject: str,
        topic: str,
        difficulty: str,
        count: int,
    ) -> List[PracticeQuestion]:
        """Serve ready, pre-generated unseen questions from the question pool."""
        if not db or not hasattr(db, "query"):
            return []

        try:
            # Get user seen hashes
            user_seen = {
                r.question_hash
                for r in db.query(UserSeenQuestion.question_hash)
                .filter(UserSeenQuestion.user_id == user_id)
                .all()
            }

            pool_rows = (
                db.query(GeneratedQuestion)
                .filter(
                    GeneratedQuestion.status == "ready",
                    GeneratedQuestion.subject.ilike(subject),
                    GeneratedQuestion.topic.ilike(f"%{topic}%"),
                    GeneratedQuestion.difficulty.ilike(difficulty),
                )
                .order_by(GeneratedQuestion.created_at.desc())
                .limit(count * 3)
                .all()
            )

            results: List[PracticeQuestion] = []
            for row in pool_rows:
                if row.question_hash not in user_seen:
                    try:
                        options = json.loads(row.options)
                        results.append(
                            PracticeQuestion(
                                id=row.id,
                                subject=row.subject,
                                topic=row.topic,
                                difficulty=row.difficulty,
                                question=row.stem,
                                options=options,
                                answer=options[row.correct_index] if 0 <= row.correct_index < len(options) else options[0],
                                correct_index=row.correct_index,
                                source="ai",
                            )
                        )
                        if len(results) >= count:
                            break
                    except Exception:
                        continue

            return results
        except Exception as e:
            logger.warning(f"Error serving from question pool: {e}")
            return []

    def refill_pool(
        self,
        db: Session,
        subject: str = "Python",
        topic: str = "Lists",
        difficulty: str = "Beginner",
        target_count: int = 3,
    ) -> int:
        """Background generator to replenish question pool with ready questions."""
        if not db or not hasattr(db, "query"):
            return 0

        logger.info(f"Starting pool refill: {subject} / {topic} / {difficulty} (target: {target_count})")
        retrieved = self.retriever.retrieve(f"{subject} {topic}", top_k=3, subject=subject)
        source_chunk = retrieved[0][0] if retrieved else None

        generated_count = 0
        for _ in range(target_count):
            q, err = self._generate_one_question(
                subject=subject,
                topic=topic,
                difficulty=difficulty,
                source_chunk=source_chunk,
                seen_stems=[],
                seen_hashes=set(),
                session_stems=[],
            )
            if q:
                try:
                    q_hash = stem_hash(q.question)
                    record = GeneratedQuestion(
                        id=q.id,
                        subject=q.subject,
                        topic=q.topic,
                        difficulty=q.difficulty,
                        question_hash=q_hash,
                        stem=q.question,
                        options=json.dumps(q.options),
                        correct_index=q.correct_index,
                        source_chunk_id=source_chunk.id if source_chunk else None,
                        status="ready",
                    )
                    db.add(record)
                    db.commit()
                    generated_count += 1
                except Exception as db_err:
                    logger.warning(f"Failed to commit pool question: {db_err}")
                    db.rollback()

        logger.info(f"Pool refill completed: added {generated_count} questions.")
        return generated_count

    def generate(
        self,
        input_data: Union[GeneratePracticeInput, dict],
        db: Optional[Session] = None,
    ) -> List[PracticeQuestion]:
        """
        Generate questions within a 30s budget:
        1. Serve from question pool if available (<0.1s).
        2. Generate 1 question at a time using local LLM.
        3. If 30s budget expires or LLM fails, fill remaining from unseen bundled questions.
        4. Trigger background pool refill.
        """
        if isinstance(input_data, dict):
            input_data = GeneratePracticeInput(**input_data)

        target_topic = input_data.topic or "Lists"
        user_id = input_data.user_id or "student_default"
        start_time = time.perf_counter()
        TIME_BUDGET_SECONDS = 30.0

        # Compute adaptive difficulty
        effective_diff = compute_adaptive_difficulty(db, user_id, target_topic, input_data.difficulty)

        # Retrieve candidate chunks
        retrieved = self.retriever.retrieve(
            f"{input_data.subject} {target_topic}",
            top_k=6,
            subject=input_data.subject,
        )
        sampled_chunks = [c for c, _ in retrieved] if retrieved else []

        seen_stems, seen_hashes = self._get_user_seen_stems_and_hashes(db, user_id)
        valid_questions: List[PracticeQuestion] = []
        session_stems: List[str] = []

        # 1. Check pool for ready unseen questions
        if db and hasattr(db, "query"):
            pool_qs = self.get_from_pool(
                db=db,
                user_id=user_id,
                subject=input_data.subject,
                topic=target_topic,
                difficulty=effective_diff,
                count=input_data.count,
            )
            for pq in pool_qs:
                valid_questions.append(pq)
                session_stems.append(pq.question)
                seen_hashes.add(stem_hash(pq.question))
            if valid_questions:
                logger.info(f"Served {len(valid_questions)} question(s) instantly from question pool.")

        # 2. Live generation for remaining questions (1 at a time)
        needed = input_data.count - len(valid_questions)
        loop_count = 0
        max_attempts = needed * 2  # At most 2 attempts per needed question

        while needed > 0 and loop_count < max_attempts:
            loop_count += 1
            elapsed = time.perf_counter() - start_time
            # Leave 3 seconds margin for database writes & fallback
            if elapsed >= (TIME_BUDGET_SECONDS - 3.0):
                logger.warning(f"Time budget ({TIME_BUDGET_SECONDS}s) reached after {elapsed:.2f}s. Exiting generation loop.")
                break

            source_chunk = random.choice(sampled_chunks) if sampled_chunks else None
            q, err = self._generate_one_question(
                subject=input_data.subject,
                topic=target_topic,
                difficulty=effective_diff,
                source_chunk=source_chunk,
                seen_stems=seen_stems,
                seen_hashes=seen_hashes,
                session_stems=session_stems,
            )

            if q:
                valid_questions.append(q)
                session_stems.append(q.question)
                seen_hashes.add(stem_hash(q.question))
                needed = input_data.count - len(valid_questions)

        # 3. Fallback to bundled bank if still needed
        needed = input_data.count - len(valid_questions)
        if needed > 0:
            logger.info(f"Supplementing {needed} question(s) from bundled bank (time taken so far: {time.perf_counter() - start_time:.2f}s).")
            fallbacks = self._get_fallback_questions(
                input_data.subject, effective_diff, needed, seen_hashes
            )
            valid_questions.extend(fallbacks)

        final_questions = valid_questions[: input_data.count]

        # 4. Record generated and seen questions in database
        if db and hasattr(db, "query") and user_id:
            try:
                for q in final_questions:
                    q_hash = stem_hash(q.question)
                    existing = db.query(GeneratedQuestion).filter(GeneratedQuestion.id == q.id).first()
                    if not existing:
                        gen_record = GeneratedQuestion(
                            id=q.id,
                            subject=q.subject,
                            topic=q.topic,
                            difficulty=q.difficulty,
                            question_hash=q_hash,
                            stem=q.question,
                            options=json.dumps(q.options),
                            correct_index=q.correct_index,
                            source_chunk_id=sampled_chunks[0].id if sampled_chunks else None,
                            status="used",
                        )
                        db.add(gen_record)

                    seen_record = UserSeenQuestion(
                        user_id=user_id,
                        question_id=q.id,
                        question_hash=q_hash,
                    )
                    db.add(seen_record)
                db.commit()
            except Exception as db_err:
                logger.warning(f"Failed to record seen questions to database: {db_err}")
                db.rollback()

        # 5. Background pool refill task if pool is low
        if db and hasattr(db, "query"):
            def async_refill():
                try:
                    from backend.database import SessionLocal
                    bg_db = SessionLocal()
                    try:
                        self.refill_pool(
                            db=bg_db,
                            subject=input_data.subject,
                            topic=target_topic,
                            difficulty=effective_diff,
                            target_count=2,
                        )
                    finally:
                        bg_db.close()
                except Exception as bg_err:
                    logger.debug(f"Background pool refill thread error: {bg_err}")

            threading.Thread(target=async_refill, daemon=True).start()

        total_time = time.perf_counter() - start_time
        logger.info(f"generate() completed in {total_time:.2f}s returning {len(final_questions)} questions.")
        return final_questions
