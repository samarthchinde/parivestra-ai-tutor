"""RAG Retrieval module using BM25 with extensible Retriever interface and Class 3-4 grade support."""
from abc import ABC, abstractmethod
import json
import os
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel
from rank_bm25 import BM25Okapi
from backend.config.bands import get_previous_grade


class Chunk(BaseModel):
    """Document chunk containing educational content and metadata."""
    id: str
    title: str
    subject: str
    topic: str
    content: str
    metadata: Dict[str, Any] = {}


class BaseRetriever(ABC):
    """Abstract base class for all RAG retrievers."""

    @abstractmethod
    def retrieve(
        self,
        query: str,
        top_k: int = 3,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
        grade: Optional[str] = None,
        revision_mode: bool = False,
    ) -> List[Tuple[Chunk, float]]:
        """Retrieve top-k relevant chunks for a given query, optionally filtered."""
        pass


def tokenize(text: str) -> List[str]:
    """Simple lowercase alphanumeric tokenizer."""
    return re.findall(r"\w+", text.lower())


def load_chunks_from_kb(kb_dir: Optional[Path] = None) -> List[Chunk]:
    """Load chunks from knowledge_base directory recursively (topics.json, .md, .txt)."""
    if kb_dir is None:
        kb_dir = Path(__file__).resolve().parent.parent.parent / "knowledge_base"

    chunks: List[Chunk] = []

    # 1. Load topics.json (if present)
    topics_file = kb_dir / "topics.json"
    if topics_file.exists():
        try:
            with open(topics_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            for item in data.get("topics", []):
                name = item.get("name", "General")
                chunk_id = f"topic_{name.lower().replace(' ', '_')}"
                keywords = item.get("keywords", [])
                content = (
                    f"Subject/Topic: {name}\n"
                    f"Keywords: {', '.join(keywords)}\n"
                    f"Explanation: {item.get('explanation', '')}\n"
                    f"Example: {item.get('example', '')}\n"
                    f"Hint: {item.get('hint', '')}"
                )
                chunks.append(
                    Chunk(
                        id=chunk_id,
                        title=name,
                        subject=name,
                        topic=name,
                        content=content.strip(),
                        metadata={"keywords": keywords, "source": "topics.json", "grade": "General"},
                    )
                )
        except Exception as e:
            print(f"Error loading topics.json: {e}")

    # 2. Load markdown files recursively (including grade3_4/)
    for md_file in kb_dir.rglob("*.md"):
        try:
            with open(md_file, "r", encoding="utf-8") as f:
                text = f.read()

            # Split on ## Chunk: or ## sections
            sections = re.split(r"\n(?=## Chunk:|\n## )", text)
            for idx, sec in enumerate(sections):
                sec = sec.strip()
                if not sec or sec.startswith("# "):
                    continue

                # Parse chunk headers
                chunk_id_match = re.search(r"## Chunk:\s*([^\n]+)", sec)
                title_match = re.search(r"Title:\s*([^\n]+)", sec)
                subject_match = re.search(r"Subject:\s*([^\n]+)", sec)
                topic_match = re.search(r"Topic:\s*([^\n]+)", sec)
                grade_match = re.search(r"Grade:\s*([^\n]+)", sec)
                keywords_match = re.search(r"Keywords:\s*([^\n]+)", sec)

                chunk_id = chunk_id_match.group(1).strip() if chunk_id_match else f"{md_file.stem}_{idx}"
                title = title_match.group(1).strip() if title_match else f"{md_file.stem} Section {idx}"
                subject = subject_match.group(1).strip() if subject_match else "General"
                topic = topic_match.group(1).strip() if topic_match else title
                grade = grade_match.group(1).strip() if grade_match else "General"
                keywords = [k.strip() for k in keywords_match.group(1).split(",")] if keywords_match else []

                # Clean lines
                clean_lines = []
                for line in sec.split("\n"):
                    if any(line.startswith(prefix) for prefix in [
                        "## Chunk:", "Title:", "Subject:", "Topic:", "Grade:", "Keywords:"
                    ]):
                        continue
                    clean_lines.append(line)
                content = "\n".join(clean_lines).strip()

                chunks.append(
                    Chunk(
                        id=chunk_id,
                        title=title,
                        subject=subject,
                        topic=topic,
                        content=content,
                        metadata={"source": md_file.name, "grade": grade, "keywords": keywords},
                    )
                )
        except Exception as e:
            print(f"Error reading {md_file.name}: {e}")

    # 3. Load txt files
    for txt_file in kb_dir.rglob("*.txt"):
        try:
            with open(txt_file, "r", encoding="utf-8") as f:
                content = f.read().strip()
            if content:
                chunks.append(
                    Chunk(
                        id=f"{txt_file.stem}_chunk",
                        title=txt_file.stem.replace("_", " ").title(),
                        subject="General",
                        topic=txt_file.stem,
                        content=content,
                        metadata={"source": txt_file.name, "grade": "General"},
                    )
                )
        except Exception as e:
            print(f"Error reading {txt_file.name}: {e}")

    # 4. Load CBSE curriculum standards as grounded chunks
    curr_dir = kb_dir / "curriculum"
    if curr_dir.exists():
        for cfile in curr_dir.rglob("*.json"):
            try:
                with open(cfile, "r", encoding="utf-8") as f:
                    cdata = json.load(f)
                c_grade = cdata.get("grade", "General")
                c_subject = cdata.get("subject", "General")
                for unit in cdata.get("units", []):
                    for ch in unit.get("chapters", []):
                        ch_id = ch.get("id", f"{cfile.stem}_{ch.get('chapter_number', 1)}")
                        ch_title = ch.get("title", "Chapter")
                        objs = ch.get("learning_objectives", [])
                        kws = ch.get("keywords", [])
                        content = (
                            f"Subject: {c_subject}\n"
                            f"Grade: {c_grade}\n"
                            f"Chapter: {ch_title}\n"
                            f"Learning Objectives: {'; '.join(objs)}\n"
                            f"Keywords: {', '.join(kws)}\n"
                            f"Key concepts: {ch_title} in CBSE {c_grade} {c_subject} curriculum covering {', '.join(objs)}."
                        )
                        chunks.append(
                            Chunk(
                                id=f"curr_{ch_id}",
                                title=ch_title,
                                subject=c_subject,
                                topic=ch_title,
                                content=content,
                                metadata={
                                    "source": cfile.name,
                                    "grade": c_grade,
                                    "chapter": ch_id,
                                    "keywords": kws,
                                    "objectives": objs,
                                    "type": "curriculum_standard",
                                },
                            )
                        )
            except Exception as e:
                print(f"Error reading curriculum {cfile.name}: {e}")

    return chunks


class BM25Retriever(BaseRetriever):
    """BM25-based document retriever implementing BaseRetriever with grade weighting."""

    def __init__(self, chunks: Optional[List[Chunk]] = None):
        self.chunks: List[Chunk] = chunks if chunks is not None else load_chunks_from_kb()
        self.corpus_tokens: List[List[str]] = [
            tokenize(f"{c.title} {c.subject} {c.topic} {' '.join(c.metadata.get('keywords', []))} {c.content}")
            for c in self.chunks
        ]
        if self.corpus_tokens:
            self.bm25 = BM25Okapi(self.corpus_tokens)
        else:
            self.bm25 = None

    def retrieve(
        self,
        query: str,
        top_k: int = 3,
        subject: Optional[str] = None,
        topic: Optional[str] = None,
        grade: Optional[str] = None,
        revision_mode: bool = False,
        min_score: float = 0.0,
    ) -> List[Tuple[Chunk, float]]:
        """Retrieve top scoring chunks for the query with optional filtering, grade preference, and revision mode."""
        if not self.chunks or not self.bm25:
            return []

        query_tokens = tokenize(query)
        if not query_tokens:
            return []

        scores = self.bm25.get_scores(query_tokens)
        scored_pairs = list(zip(self.chunks, scores))

        # Determine target and previous grade for revision mode
        prev_grade = get_previous_grade(grade) if grade else None

        filtered = []
        for chunk, score in scored_pairs:
            # Subject filter
            if subject and subject.lower() != "all" and chunk.subject.lower() != subject.lower():
                continue
            # Topic filter
            if topic and topic.lower() != "all" and topic.lower() not in chunk.topic.lower():
                continue

            chunk_grade = chunk.metadata.get("grade", "General")
            adj_score = float(score)

            if grade:
                c_grade_lower = chunk_grade.lower()
                target_grade_lower = grade.lower()
                prev_grade_lower = prev_grade.lower() if prev_grade else None

                if revision_mode:
                    # In revision mode, prioritize current grade and previous grade
                    if c_grade_lower == target_grade_lower:
                        adj_score *= 1.3
                    elif prev_grade_lower and c_grade_lower == prev_grade_lower:
                        adj_score *= 1.2
                    elif c_grade_lower != "general":
                        # Other non-adjacent grades get deprioritized
                        adj_score *= 0.6
                else:
                    # Standard mode: boost target grade
                    if c_grade_lower == target_grade_lower:
                        adj_score *= 1.4
                    elif c_grade_lower != "general":
                        # De-boost other grade chunks
                        adj_score *= 0.7

            filtered.append((chunk, adj_score))

        # Sort descending by score
        filtered.sort(key=lambda x: x[1], reverse=True)
        return filtered[:top_k]


# Singleton default retriever instance
_default_retriever: Optional[BM25Retriever] = None


def get_default_retriever() -> BM25Retriever:
    """Return singleton instance of BM25Retriever."""
    global _default_retriever
    if _default_retriever is None:
        _default_retriever = BM25Retriever()
    return _default_retriever
