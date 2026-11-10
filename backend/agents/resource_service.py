"""Resource Service for Institute Resource Library.
Handles safe file uploads, extraction (PDF, MD, TXT), path traversal defense,
and dynamic indexing/unindexing with BM25 retriever.
"""
import json
import logging
import os
from pathlib import Path
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from backend import config
from backend.models import ResourceModel
from backend.rag.retriever import Chunk, get_default_retriever

logger = logging.getLogger("backend.agents.resource_service")

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".md", ".txt"}


def sanitize_filename(filename: str) -> str:
    """Sanitize original filename to strip directory traversal characters."""
    # Strip any directory separators and keep only basename
    basename = Path(filename).name
    # Strip dangerous characters
    clean = re.sub(r"[^\w\.\-\s]", "_", basename).strip()
    return clean or "document"


def validate_file_meta(filename: str, file_size: int) -> Tuple[bool, Optional[str], Optional[str]]:
    """Validate file extension and size. Returns (is_valid, ext, error_message)."""
    if file_size > MAX_FILE_SIZE_BYTES:
        return False, None, f"File size ({file_size / (1024*1024):.1f} MB) exceeds maximum allowed 10 MB limit."

    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, None, f"Unsupported file type '{ext}'. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}."

    return True, ext, None


def extract_text_from_file(file_path: Path, file_type: str) -> str:
    """Extract text from PDF, Markdown, or plain text file."""
    if not file_path.exists():
        raise FileNotFoundError(f"Resource file not found at {file_path}")

    ext = file_type.lower().strip(".")

    if ext in ["txt", "md"]:
        for enc in ["utf-8", "latin-1", "cp1252"]:
            try:
                with open(file_path, "r", encoding=enc) as f:
                    return f.read()
            except UnicodeDecodeError:
                continue
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()

    elif ext == "pdf":
        text_parts = []
        # Try pypdf first
        try:
            from pypdf import PdfReader
            reader = PdfReader(str(file_path))
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            if text_parts:
                return "\n\n".join(text_parts).strip()
        except Exception as e:
            logger.warning(f"pypdf extraction failed on {file_path}: {e}")

        # Try fitz / pymupdf fallback
        try:
            import fitz
            doc = fitz.open(str(file_path))
            for page in doc:
                text_parts.append(page.get_text())
            doc.close()
            return "\n\n".join(text_parts).strip()
        except Exception as e:
            logger.error(f"PyMuPDF extraction failed on {file_path}: {e}")
            raise RuntimeError(f"Could not extract text from PDF: {e}")

    raise ValueError(f"Cannot extract text from unsupported file type: {ext}")


def chunk_text(text: str, resource_id: str, title: str, subject: str, topic: str, max_chunk_chars: int = 800) -> List[Chunk]:
    """Split extracted text into well-formed Chunk objects."""
    clean = text.strip()
    if not clean:
        return []

    # Split by double newlines or paragraph breaks
    paragraphs = re.split(r"\n\s*\n", clean)
    chunks: List[Chunk] = []
    current_text = []
    current_length = 0
    chunk_idx = 1

    for p in paragraphs:
        p_str = p.strip()
        if not p_str:
            continue

        if current_length + len(p_str) > max_chunk_chars and current_text:
            content = "\n\n".join(current_text)
            chunks.append(
                Chunk(
                    id=f"{resource_id}_c{chunk_idx}",
                    title=f"{title} (Part {chunk_idx})",
                    subject=subject,
                    topic=topic,
                    content=content,
                    metadata={"source": title, "resource_id": resource_id, "part": chunk_idx},
                )
            )
            chunk_idx += 1
            current_text = [p_str]
            current_length = len(p_str)
        else:
            current_text.append(p_str)
            current_length += len(p_str)

    if current_text:
        content = "\n\n".join(current_text)
        chunks.append(
            Chunk(
                id=f"{resource_id}_c{chunk_idx}",
                title=f"{title} (Part {chunk_idx})" if chunk_idx > 1 else title,
                subject=subject,
                topic=topic,
                content=content,
                metadata={"source": title, "resource_id": resource_id, "part": chunk_idx},
            )
        )

    return chunks


def index_resource(resource: ResourceModel, retriever=None) -> int:
    """Extract, chunk, and index an approved resource into BM25 retriever."""
    if retriever is None:
        retriever = get_default_retriever()

    file_path = Path(resource.stored_path)
    if not file_path.exists():
        logger.warning(f"Cannot index resource {resource.id}: file does not exist at {file_path}")
        return 0

    text = extract_text_from_file(file_path, resource.file_type)
    chunks = chunk_text(
        text=text,
        resource_id=resource.id,
        title=resource.title,
        subject=resource.subject,
        topic=resource.topic,
    )

    if chunks:
        retriever.add_chunks(chunks)
        logger.info(f"Indexed {len(chunks)} chunks for resource '{resource.title}' ({resource.id})")
        return len(chunks)
    return 0


def unindex_resource(resource_id: str, retriever=None):
    """Remove all chunks belonging to resource from BM25 retriever."""
    if retriever is None:
        retriever = get_default_retriever()

    matching_chunk_ids = [
        c.id for c in retriever.chunks
        if c.metadata.get("resource_id") == resource_id or c.id.startswith(f"{resource_id}_")
    ]
    if matching_chunk_ids:
        retriever.remove_chunks_by_id(matching_chunk_ids)
        logger.info(f"Removed {len(matching_chunk_ids)} chunks for resource {resource_id}")

