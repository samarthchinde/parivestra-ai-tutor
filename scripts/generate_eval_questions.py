"""Generates 128 comprehensive evaluation questions across all 8 grades for eval/workbook_questions.json."""
import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KB_DIR = os.path.join(BASE_DIR, "knowledge_base", "ai_workbooks")
EVAL_DIR = os.path.join(BASE_DIR, "eval")

questions = []

for g in range(3, 11):
    grade_file = os.path.join(KB_DIR, f"grade{g}.json")
    with open(grade_file, "r", encoding="utf-8") as f:
        wb = json.load(f)

    for u in wb["units"]:
        u_num = u["number"]
        u_title = u["title"]
        p_num = u["page"]
        expected_chunk = f"wb_g{g}_u{u_num}"
        expected_citation = f"Grade {g} · Unit {u_num} · {u_title} · p.{p_num}"
        terms = [w["term"] for w in u["new_words"]]

        # Question 1: Think & talk or concept exploration
        tt = u.get("think_and_talk", "").strip()
        q1_text = tt if tt else f"Explain the key idea of {u_title}."
        questions.append({
            "id": f"eval_g{g}_u{u_num}_q1",
            "grade": str(g),
            "unit": u_num,
            "question": q1_text,
            "expected_chunk": expected_chunk,
            "expected_citation": expected_citation,
            "key_points": terms[:2] + [u.get("big_idea", "")]
        })

        # Question 2: Objective and definition check
        first_term = terms[0] if terms else u_title
        first_defn = u["new_words"][0]["definition"] if u["new_words"] else u_title
        questions.append({
            "id": f"eval_g{g}_u{u_num}_q2",
            "grade": str(g),
            "unit": u_num,
            "question": f"What is {first_term} and why is it important in {u_title}?",
            "expected_chunk": expected_chunk,
            "expected_citation": expected_citation,
            "key_points": [first_term] + first_defn.split()[:3]
        })

print(f"Generated {len(questions)} evaluation questions across 8 grades.")
with open(os.path.join(EVAL_DIR, "workbook_questions.json"), "w", encoding="utf-8") as f:
    json.dump(questions, f, indent=2)
print("Saved to eval/workbook_questions.json.")

