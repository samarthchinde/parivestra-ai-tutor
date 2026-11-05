"""Evaluation script for Parivestra AI Tutor.

Evaluates accuracy, citation correctness, hallucination rate, latency,
tokens per answer, and categorizes failure taxonomies.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import time
from typing import Any, Dict, List

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.agents.tutor_agent import TutorAgent, TutorInput, Citation, TutorOutput  # noqa: E402
from backend.rag.retriever import get_default_retriever  # noqa: E402


def evaluate_response(
    question_item: Dict[str, Any],
    output_response: str,
    output_citations: List[Dict[str, str]],
    latency_ms: float,
    all_chunks_dict: Dict[str, Any],
) -> Dict[str, Any]:
    """Score individual answer and assign failure taxonomy if needed."""
    expected_chunk = question_item["expected_chunk"]
    key_points = question_item["key_points"]

    # 1. Citation Correctness
    cited_ids = [c["id"] for c in output_citations]
    citation_correct = expected_chunk in cited_ids

    # 2. Key Points / Accuracy
    response_lower = output_response.lower()
    points_covered = [
        kp for kp in key_points if any(token in response_lower for token in kp.lower().split())
    ]
    coverage_ratio = len(points_covered) / len(key_points) if key_points else 1.0
    accurate = coverage_ratio >= 0.60

    # 3. Hallucination check
    # Check if the answer claims something explicitly contradictory or claims knowledge when chunk was absent
    hallucinated = False
    if not cited_ids and len(output_response) > 80 and "could not find" not in response_lower:
        hallucinated = True

    # 4. Token estimation
    tokens = len(output_response.split())

    # 5. Failure taxonomy: retrieval, model, hallucination, latency, other
    failure_taxonomy = None
    if not accurate or not citation_correct:
        if not citation_correct:
            failure_taxonomy = "retrieval"
        elif hallucinated:
            failure_taxonomy = "hallucination"
        elif latency_ms > 10000:
            failure_taxonomy = "latency"
        elif not accurate:
            failure_taxonomy = "model"
        else:
            failure_taxonomy = "other"

    return {
        "id": question_item["id"],
        "question": question_item["question"],
        "expected_chunk": expected_chunk,
        "cited_chunks": cited_ids,
        "citation_correct": citation_correct,
        "accurate": accurate,
        "coverage_ratio": round(coverage_ratio, 2),
        "hallucinated": hallucinated,
        "tokens": tokens,
        "latency_ms": round(latency_ms, 2),
        "failure_taxonomy": failure_taxonomy,
        "response_preview": output_response[:140] + "..." if len(output_response) > 140 else output_response,
    }


def main():
    parser = argparse.ArgumentParser(description="Parivestra AI Tutor Evaluation")
    parser.add_argument("--mock-llm", action="store_true", help="Simulate LLM response from retrieved chunks")
    args = parser.parse_args()

    print("=" * 60)
    print("PARIVESTRA AI TUTOR - EVALUATION HARNESS")
    if args.mock_llm:
        print("MODE: Mock LLM (Fast offline verification)")
    else:
        print("MODE: Live LLM Gateway")
    print("=" * 60)

    eval_dir = ROOT_DIR / "eval"
    questions_file = eval_dir / "questions.json"
    results_dir = eval_dir / "results"
    results_dir.mkdir(parents=True, exist_ok=True)

    with open(questions_file, "r", encoding="utf-8") as f:
        questions = json.load(f)

    print(f"Loaded {len(questions)} evaluation questions from {questions_file}")

    tutor = TutorAgent()
    retriever = get_default_retriever()
    chunks_dict = {c.id: c for c in retriever.chunks}

    eval_results = []
    total_latency = 0.0
    total_tokens = 0

    for idx, q_item in enumerate(questions, 1):
        print(f"[{idx:02d}/{len(questions)}] Evaluating: \"{q_item['question'][:45]}...\"")
        start = time.perf_counter()

        if args.mock_llm:
            retrieved = retriever.retrieve(q_item["question"], top_k=2, subject="Python")
            cited_chunks = [Citation(id=c.id, title=c.title) for c, _ in retrieved]
            if retrieved:
                simulated_response = f"Based on verified course material: {retrieved[0][0].content}"
            else:
                simulated_response = "I could not find information about this in the course material."
            tutor_out = TutorOutput(
                response=simulated_response,
                citations=cited_chunks,
                hint_level=0,
            )
            time.sleep(0.02)
        else:
            tutor_out = tutor.explain(
                TutorInput(
                    message=q_item["question"],
                    session_id=f"eval_{q_item['id']}",
                    subject="Python",
                    hint_level=0,
                )
            )

        latency_ms = (time.perf_counter() - start) * 1000

        result = evaluate_response(
            question_item=q_item,
            output_response=tutor_out.response,
            output_citations=[c.model_dump() for c in tutor_out.citations],
            latency_ms=latency_ms,
            all_chunks_dict=chunks_dict,
        )

        total_latency += latency_ms
        total_tokens += result["tokens"]
        eval_results.append(result)

        status_flag = "PASS" if (result["accurate"] and result["citation_correct"]) else "FAIL"
        print(f"       -> Status: {status_flag} | Citations: {result['citation_correct']} | Latency: {latency_ms:.0f}ms")

    # Calculate Aggregate Metrics
    n = len(questions)
    citation_accuracy = sum(1 for r in eval_results if r["citation_correct"]) / n * 100
    overall_accuracy = sum(1 for r in eval_results if r["accurate"]) / n * 100
    hallucination_rate = sum(1 for r in eval_results if r["hallucinated"]) / n * 100
    avg_latency = total_latency / n
    avg_tokens = total_tokens / n

    failures = [r for r in eval_results if r["failure_taxonomy"] is not None]
    taxonomy_counts = {}
    for f in failures:
        tax = f["failure_taxonomy"]
        taxonomy_counts[tax] = taxonomy_counts.get(tax, 0) + 1

    summary = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_questions": n,
        "metrics": {
            "citation_correctness_pct": round(citation_accuracy, 2),
            "concept_accuracy_pct": round(overall_accuracy, 2),
            "hallucination_rate_pct": round(hallucination_rate, 2),
            "average_latency_ms": round(avg_latency, 2),
            "average_tokens_per_answer": round(avg_tokens, 1),
        },
        "taxonomy_failures": taxonomy_counts,
        "results": eval_results,
    }

    # Save timestamped report
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    report_file = results_dir / f"eval_{timestamp_str}.json"
    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 60)
    print("EVALUATION SUMMARY REPORT")
    print("=" * 60)
    print(f"Total Questions Evaluated:  {n}")
    print(f"Citation Correctness:      {citation_accuracy:.1f}%")
    print(f"Concept Accuracy:          {overall_accuracy:.1f}%")
    print(f"Hallucination Rate:        {hallucination_rate:.1f}%")
    print(f"Average Latency:           {avg_latency:.1f} ms")
    print(f"Average Tokens / Answer:   {avg_tokens:.1f}")
    print(f"Failure Breakdown:         {taxonomy_counts}")
    print(f"Results saved to:          {report_file}")
    print("=" * 60)


if __name__ == "__main__":
    main()
