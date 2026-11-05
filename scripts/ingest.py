"""Script to rebuild and verify RAG index from knowledge base."""
import sys
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.rag.retriever import BM25Retriever, load_chunks_from_kb  # noqa: E402


def main():
    print("=" * 50)
    print("PARIVESTRA AI TUTOR - RAG INGESTION & INDEX BUILD")
    print("=" * 50)

    kb_dir = ROOT_DIR / "knowledge_base"
    print(f"Loading knowledge base from: {kb_dir}")

    chunks = load_chunks_from_kb(kb_dir)
    print(f"Total chunks indexed: {len(chunks)}")
    for chunk in chunks:
        print(f" - [{chunk.id}] {chunk.title} ({chunk.subject} / {chunk.topic})")

    retriever = BM25Retriever(chunks)
    test_queries = [
        "How are variables created in Python?",
        "What is machine learning?",
        "Explain function default arguments",
    ]

    print("\n--- Verifying Retrieval Samples ---")
    for q in test_queries:
        print(f"\nQuery: '{q}'")
        results = retriever.retrieve(q, top_k=2)
        if not results:
            print("  No matches found!")
        for rank, (c, score) in enumerate(results, 1):
            print(f"  #{rank} [Score: {score:.3f}] [{c.id}] {c.title}")

    print("\nIngestion and index build complete!")


if __name__ == "__main__":
    main()

