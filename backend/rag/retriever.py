"""RAG Retrieval module using BM25 with extensible Retriever interface."""
from abc import ABC, abstractmethod
import json
import os
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel
from rank_bm25 import BM25Okapi


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
    ) -> List[Tuple[Chunk, float]]:
        """Retrieve top-k relevant chunks for a given query, optionally filtered."""
        pass


def tokenize(text: str) -> List[str]:
    """Simple lowercase alphanumeric tokenizer."""
    return re.findall(r"\w+", text.lower())


def load_chunks_from_kb(kb_dir: Optional[Path] = None) -> List[Chunk]:
    """Load chunks from knowledge_base directory (topics.json, .md, .txt)."""
    if kb_dir is None:
        kb_dir = Path(__file__).resolve().parent.parent.parent / "knowledge_base"

    chunks: List[Chunk] = []

    # 1. Load topics.json
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
                        metadata={"keywords": keywords, "source": "topics.json"},
                    )
                )
        except Exception as e:
            print(f"Error loading topics.json: {e}")

    # 2. Load markdown files
    for md_file in kb_dir.glob("*.md"):
        try:
            with open(md_file, "r", encoding="utf-8") as f:
                text = f.read()

            # Split on ## Chunk: or ## sections
            sections = re.split(r"\n(?=## Chunk:|\n## )", text)
            for idx, sec in enumerate(sections):
                sec = sec.strip()
                if not sec or sec.startswith("# "):
                    continue

                # Parse chunk header if present
                chunk_id_match = re.search(r"## Chunk:\s*([^\n]+)", sec)
                title_match = re.search(r"Title:\s*([^\n]+)", sec)
                subject_match = re.search(r"Subject:\s*([^\n]+)", sec)
                topic_match = re.search(r"Topic:\s*([^\n]+)", sec)

                chunk_id = chunk_id_match.group(1).strip() if chunk_id_match else f"{md_file.stem}_{idx}"
                title = title_match.group(1).strip() if title_match else f"{md_file.stem} Section {idx}"
                subject = subject_match.group(1).strip() if subject_match else "Python"
                topic = topic_match.group(1).strip() if topic_match else title

                # Strip metadata lines from content for clean text
                clean_lines = []
                for line in sec.split("\n"):
                    if any(line.startswith(prefix) for prefix in ["## Chunk:", "Title:", "Subject:", "Topic:"]):
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
                        metadata={"source": md_file.name},
                    )
                )
        except Exception as e:
            print(f"Error reading {md_file.name}: {e}")

    # 3. Load txt files
    for txt_file in kb_dir.glob("*.txt"):
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
                        metadata={"source": txt_file.name},
                    )
                )
        except Exception as e:
            print(f"Error reading {txt_file.name}: {e}")

    return chunks


class BM25Retriever(BaseRetriever):
    """BM25-based document retriever implementing BaseRetriever."""

    def __init__(self, chunks: Optional[List[Chunk]] = None):
        self.chunks: List[Chunk] = chunks if chunks is not None else load_chunks_from_kb()
        self.corpus_tokens: List[List[str]] = [
            tokenize(f"{c.title} {c.subject} {c.topic} {c.content}")
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
        min_score: float = 0.0,
    ) -> List[Tuple[Chunk, float]]:
        """Retrieve top scoring chunks for the query with optional filtering."""
        if not self.chunks or not self.bm25:
            return []

        query_tokens = tokenize(query)
        if not query_tokens:
            return []

        scores = self.bm25.get_scores(query_tokens)
        scored_pairs = list(zip(self.chunks, scores))

        # Filter by subject or topic if provided
        filtered = []
        for chunk, score in scored_pairs:
            if subject and subject.lower() != "all" and chunk.subject.lower() != subject.lower():
                continue
            if topic and topic.lower() != "all" and topic.lower() not in chunk.topic.lower():
                continue
            filtered.append((chunk, float(score)))

        # Sort descending by BM25 score
        filtered.sort(key=lambda x: x[1], reverse=True)
        return filtered[:top_k]

    def _rebuild_index(self):
        """Re-tokenize corpus and reinitialize BM25Okapi."""
        self.corpus_tokens = [
            tokenize(f"{c.title} {c.subject} {c.topic} {c.content}")
            for c in self.chunks
        ]
        if self.corpus_tokens:
            self.bm25 = BM25Okapi(self.corpus_tokens)
        else:
            self.bm25 = None

    def add_chunks(self, new_chunks: List[Chunk]):
        """Add new document chunks and refresh BM25 index."""
        if not new_chunks:
            return
        existing_ids = {c.id for c in self.chunks}
        for chk in new_chunks:
            if chk.id in existing_ids:
                self.chunks = [c for c in self.chunks if c.id != chk.id]
            self.chunks.append(chk)
            existing_ids.add(chk.id)
        self._rebuild_index()

    def remove_chunks_by_id(self, chunk_ids: List[str]):
        """Remove chunks matching the provided chunk IDs and refresh index."""
        if not chunk_ids:
            return
        ids_set = set(chunk_ids)
        orig_len = len(self.chunks)
        self.chunks = [c for c in self.chunks if c.id not in ids_set]
        if len(self.chunks) != orig_len:
            self._rebuild_index()



# Singleton default retriever instance
_default_retriever: Optional[BM25Retriever] = None


def get_default_retriever() -> BM25Retriever:
    """Return singleton instance of BM25Retriever."""
    global _default_retriever
    if _default_retriever is None:
        _default_retriever = BM25Retriever()
    return _default_retriever
