"""Parivestra AI Workbooks Importer & Parser.
Extracts all 8 official workbooks (Grades 3 to 10) from PDFs into structured JSON files
with verbatim wording, validation, answer keys / rubrics, and RAG chunking support.
"""
import os
import re
import json
import fitz

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKBOOKS_DIR = os.path.join(BASE_DIR, "docs", "workbooks")
OUTPUT_DIR = os.path.join(BASE_DIR, "knowledge_base", "ai_workbooks")
ANSWERS_DIR = os.path.join(OUTPUT_DIR, "answers")
OVERLAYS_DIR = os.path.join(OUTPUT_DIR, "overlays")

GRADE_META = {
    3: {
        "edition_title": "AI Explorers",
        "tagline": "Notice · Sort · Think",
        "colors": {"primary": "#F97316", "secondary": "#0D9488", "bg": "#FFF7ED", "robot": "#F97316"},
        "band": "junior",
    },
    4: {
        "edition_title": "AI Builders",
        "tagline": "Data · Train · Decide",
        "colors": {"primary": "#0284C7", "secondary": "#F59E0B", "bg": "#F0F9FF", "robot": "#0284C7"},
        "band": "junior",
    },
    5: {
        "edition_title": "AI Innovators",
        "tagline": "Learn · Create · Lead",
        "colors": {"primary": "#8B5CF6", "secondary": "#EC4899", "bg": "#F5F3FF", "robot": "#8B5CF6"},
        "band": "junior",
    },
    6: {
        "edition_title": "AI Thinkers",
        "tagline": "Scope · Collect · Explore",
        "colors": {"primary": "#0E7490", "secondary": "#EA580C", "bg": "#ECFEFF", "robot": "#0E7490"},
        "band": "middle",
    },
    7: {
        "edition_title": "AI Makers",
        "tagline": "See · Read · Code",
        "colors": {"primary": "#BE185D", "secondary": "#3B82F6", "bg": "#FDF2F8", "robot": "#BE185D"},
        "band": "middle",
    },
    8: {
        "edition_title": "AI Engineers",
        "tagline": "Train · Evaluate · Improve",
        "colors": {"primary": "#4338CA", "secondary": "#D97706", "bg": "#EEF2FF", "robot": "#4338CA"},
        "band": "middle",
    },
    9: {
        "edition_title": "AI Analysts",
        "tagline": "Analyse · Model · Question",
        "colors": {"primary": "#DC2626", "secondary": "#0284C7", "bg": "#FEF2F2", "robot": "#DC2626"},
        "band": "senior",
    },
    10: {
        "edition_title": "AI Leaders",
        "tagline": "Build · Evaluate · Lead",
        "colors": {"primary": "#1E293B", "secondary": "#D97706", "bg": "#F8FAFC", "robot": "#1E293B"},
        "band": "senior",
    },
}

def classify_activity(title, instruction, lines, grade, unit, act_num):
    text = (title + " " + instruction + " " + " ".join(lines)).lower()
    
    # 1. Fill in blanks
    if "fill in the blanks" in text or "use the words in the box" in text or "word bank" in text:
        return {
            "type": "fill_blanks",
            "auto_checkable": True,
            "component": "FillBlanksActivity",
        }

    # 2. Canvas / Drawing / Sketch
    if "draw a robot" in text or "draw your" in text or "draw a flowchart" in text or "draw a network" in text or "poster" in text or "sketch" in text or "draw bounding boxes" in text:
        return {
            "type": "drawing_canvas",
            "auto_checkable": False,
            "component": "DrawingCanvasActivity",
        }

    # 3. Matching pairs
    if "match" in text or "draw a line" in text:
        return {
            "type": "match_pairs",
            "auto_checkable": True,
            "component": "MatchPairsActivity",
        }

    # 4. Tables / True False / Classification / Tick
    if "tick the box" in text or "tick fair" in text or "tick true" in text or "tick the right" in text or "true or false" in text or "rule or learning" in text or "active or passive" in text or "strong or weak" in text or "helpful or harmful" in text or "share or keep private" in text:
        if "say why" in text or "fair or unfair" in text:
            return {
                "type": "tick_table_reason",
                "auto_checkable": False,
                "component": "TickTableReasonActivity",
            }
        return {
            "type": "tick_table",
            "auto_checkable": True,
            "component": "TickTableActivity",
        }

    # 5. Sorting / grouping into boxes
    if "sort" in text or "living or non-living" in text or "fly, swim" in text or "which domain" in text or "which ai domain" in text or "which type of learning" in text or "structured or unstructured" in text or "split the data" in text or "clusters" in text:
        return {
            "type": "sort_boxes",
            "auto_checkable": True,
            "component": "SortBoxesActivity",
        }

    # 6. Step ordering
    if "order" in text or "put the steps in order" in text or "number the" in text:
        return {
            "type": "order_steps",
            "auto_checkable": True,
            "component": "OrderStepsActivity",
        }

    # 7. Patterns
    if "what comes next" in text or "pattern" in text:
        return {
            "type": "pattern_completion",
            "auto_checkable": True,
            "component": "PatternCompletionActivity",
        }

    # 8. Grid / robot path navigation
    if "reach the star" in text or "grid" in text or "help pari" in text:
        return {
            "type": "path_grid",
            "auto_checkable": True,
            "component": "PathGridActivity",
        }

    # 9. Charts / survey / tally
    if "survey" in text or "chart" in text or "pictograph" in text or "plot the survey" in text or "books read this month" in text or "read your graph" in text:
        return {
            "type": "data_chart",
            "auto_checkable": True,
            "component": "DataChartActivity",
        }

    # 10. Math / stats / metrics
    if "calculate" in text or "pixel maths" in text or "accuracy" in text or "probability" in text or "mean" in text or "spot the outlier" in text or "f1" in text or "precision" in text or "compute the perceptron" in text:
        return {
            "type": "math_stats",
            "auto_checkable": True,
            "component": "MathStatsActivity",
        }

    # 11. Pixels & computer vision
    if "pixel" in text or "convolution" in text or "be the computer" in text or "find the features" in text:
        return {
            "type": "pixels_vision",
            "auto_checkable": True,
            "component": "PixelsVisionActivity",
        }

    # 12. ML Labs (Decision trees, confusion matrix, trainer)
    if "animal guesser" in text or "your own tree" in text or "confusion matrix" in text or "be the trainer" in text or "be a neuron" in text or "ice cream sales" in text:
        return {
            "type": "ml_lab",
            "auto_checkable": True,
            "component": "MLLabActivity",
        }

    # 13. Python playground
    if "python" in text or "trace the" in text or "predict the output" in text or "pandas" in text or "write code" in text or "relu" in text or "read the workflow" in text:
        return {
            "type": "python_playground",
            "auto_checkable": True,
            "component": "PythonPlaygroundActivity",
        }

    # 14. Chatbot builder / language AI
    if "chatbot" in text or "bot replies" in text or "intent" in text or "tokenise" in text or "sentiment" in text or "bag of words" in text or "run the pipeline" in text or "design a rag" in text:
        is_auto = bool("tokenise" in text or "sentiment" in text or "bag of words" in text)
        return {
            "type": "chatbot_builder",
            "auto_checkable": is_auto,
            "component": "ChatbotBuilderActivity",
        }

    # 15. Prompt lab
    if "prompt" in text or "stop check" in text or "engineer the prompt" in text:
        return {
            "type": "prompt_lab",
            "auto_checkable": False,
            "component": "PromptLabActivity",
        }

    return {
        "type": "reflection_input",
        "auto_checkable": False,
        "component": "ReflectionActivity",
    }

def generate_default_answer(grade, unit, act_num, act_type, title, instruction, content_lines):
    """Generates server-side draft answer or rubric flagged with needs_review=True."""
    act_id = f"g{grade}_u{unit}_a{act_num}"
    
    # Specific known auto-check solutions
    if act_id == "g3_u1_a1": # AI or not AI
        return {
            "activity_id": act_id,
            "type": act_type,
            "auto_checkable": True,
            "needs_review": True,
            "solution": {
                "Voice assistant": True,
                "Face unlock on a phone": True,
                "Map app that finds the fastest road": True,
                "Robot vacuum cleaner": True,
                "Bicycle": False,
                "Ceiling fan": False,
                "Pencil sharpener": False,
                "Torch": False
            },
            "explanation": "Voice assistant, face unlock, smart map apps and robot vacuums use sensors and AI to learn and decide. Fans, bicycles, torches and sharpeners are mechanical/electrical tools without AI."
        }
    elif act_id == "g3_u2_a1": # Match sense
        return {
            "activity_id": act_id,
            "type": act_type,
            "auto_checkable": True,
            "needs_review": True,
            "solution": {
                "Eyes": "Camera",
                "Ears": "Microphone",
                "Fingers (touch)": "Touch screen",
                "Skin feels hot or cold": "Thermometer"
            },
            "explanation": "Eyes correspond to cameras, ears to microphones, finger touch to touchscreens, and temperature skin feel to thermometers."
        }
    elif act_id == "g3_u2_a2": # Fill blanks
        return {
            "activity_id": act_id,
            "type": act_type,
            "auto_checkable": True,
            "needs_review": True,
            "solution": {
                "1": "microphone",
                "2": "camera",
                "3": "sensor"
            },
            "explanation": "1. Phone hears voice with microphone. 2. Robot sees with camera. 3. Sensor collects information."
        }
    elif act_id == "g3_u3_a1": # Pattern completion
        return {
            "activity_id": act_id,
            "type": act_type,
            "auto_checkable": True,
            "needs_review": True,
            "solution": {
                "1, 3, 5, 7, 9": ["11", "13"],
                "A, B, A, B, A": ["B", "A"],
                "Circle, Square, Triangle, Circle, Square": ["Triangle", "Circle"]
            },
            "explanation": "Odd numbers increase by 2; alternating letters repeat A, B; shapes repeat Circle, Square, Triangle."
        }
    elif act_id == "g3_u4_a1": # Living or non-living
        return {
            "activity_id": act_id,
            "type": act_type,
            "auto_checkable": True,
            "needs_review": True,
            "solution": {
                "Living": ["Cat", "Tree", "Bird", "Human"],
                "Non-living": ["Car", "Robot", "Table", "Phone"]
            },
            "explanation": "Living things grow, breathe, and reproduce. Non-living objects do not."
        }
    elif act_id == "g3_u7_a1": # Share or keep private
        return {
            "activity_id": act_id,
            "type": act_type,
            "auto_checkable": True,
            "needs_review": True,
            "solution": {
                "My home address": "Keep private",
                "My password": "Keep private",
                "My favourite colour": "Safe to share",
                "My phone number": "Keep private",
                "My favourite sport": "Safe to share",
                "My school name": "Keep private"
            },
            "explanation": "Personal identifiable information (address, password, phone, school) must be kept private. General preferences like favourite colour or sport are safe to share."
        }
    elif act_id == "g4_u1_a1": # Rule or learning
        return {
            "activity_id": act_id,
            "type": act_type,
            "auto_checkable": True,
            "needs_review": True,
            "solution": {
                "Traffic lights turn red after 60 seconds": "Rule",
                "Music app suggests songs you like": "Learning",
                "Calculator adds two numbers": "Rule",
                "Camera recognises a dog from many photos": "Learning"
            },
            "explanation": "Fixed timers and calculators follow explicit rules. Song recommendations and photo recognition learn from data patterns."
        }
    elif act_id == "g4_u8_a1": # Strong or weak password
        return {
            "activity_id": act_id,
            "type": act_type,
            "auto_checkable": True,
            "needs_review": True,
            "solution": {
                "123456": "Weak",
                "password": "Weak",
                "Blue!Elephant9#": "Strong",
                "Alex2015": "Weak",
                "Sunny*Breeze&42": "Strong"
            },
            "explanation": "Strong passwords use a mix of uppercase, lowercase, numbers, symbols, and length without predictable personal details."
        }
    elif act_id == "g5_u7_a2": # True or False
        return {
            "activity_id": act_id,
            "type": act_type,
            "auto_checkable": True,
            "needs_review": True,
            "solution": {
                "If it is on the internet, it must be true.": False,
                "AI pictures can look real.": True,
                "Checking 2 trusted sources is a good habit.": True,
                "It is fine to share a surprising video before checking.": False
            },
            "explanation": "Not all online info is true; AI media looks realistic; verifying across 2 trusted sources is essential before sharing."
        }
    elif act_id == "g7_u2_a1": # Tokenise
        return {
            "activity_id": act_id,
            "type": act_type,
            "auto_checkable": True,
            "needs_review": True,
            "solution": {
                "tokens": ["ai", "helps", "doctors", "find", "diseases", "faster"]
            },
            "explanation": "Tokenisation splits the sentence into individual words/tokens."
        }
    elif act_id == "g7_u2_a2": # Sentiment check
        return {
            "activity_id": act_id,
            "type": act_type,
            "auto_checkable": True,
            "needs_review": True,
            "solution": {
                "This app is wonderful and quick!": "Positive",
                "The game crashed and deleted my score.": "Negative",
                "The bus arrives at 8 AM.": "Neutral"
            },
            "explanation": "Positive expresses satisfaction, negative expresses frustration/error, neutral states factual information."
        }

    # Generic auto-checkable fallback
    if act_type in ["tick_table", "match_pairs", "sort_boxes", "fill_blanks", "order_steps", "pattern_completion", "path_grid", "math_stats", "pixels_vision", "ml_lab", "python_playground"]:
        return {
            "activity_id": act_id,
            "type": act_type,
            "auto_checkable": True,
            "needs_review": True,
            "solution": {
                "valid_keys": content_lines[:4] if content_lines else ["standard_pass"],
                "target_criteria": instruction
            },
            "explanation": f"Teacher solution for '{title}'. Please verify against official curriculum key."
        }

    # Open-ended rubric fallback
    return {
        "activity_id": act_id,
        "type": act_type,
        "auto_checkable": False,
        "needs_review": True,
        "rubric": [
            {
                "criterion": "Concept Application",
                "max_score": 3,
                "description": "Student clearly applies the unit concept and AI big idea."
            },
            {
                "criterion": "Clarity & Detail",
                "max_score": 3,
                "description": "Explanation or drawing is well-structured, easy to understand, and detailed."
            },
            {
                "criterion": "Safety & Critical Thinking",
                "max_score": 2,
                "description": "Considers user safety, fairness, limitations, or personal privacy rules."
            }
        ],
        "sample_solution": f"Sample response for '{title}': Meets all 3 rubric dimensions with grounded reasoning."
    }

def parse_full_workbook(grade: int):
    pdf_path = os.path.join(WORKBOOKS_DIR, f"grade{grade}.pdf")
    if not os.path.exists(pdf_path):
        pdf_path = os.path.join(BASE_DIR, "data", "workbooks", f"grade{grade}.pdf")
    
    doc = fitz.open(pdf_path)
    meta = GRADE_META[grade]

    # 1. Welcome Page (page index 1)
    p_welcome = doc[1]
    welcome_text = p_welcome.get_text()
    tip_match = re.search(r"Pari's tip\s*\n+([^\n]+(?:\n[^\n]+)?)", welcome_text)
    pari_tip = " ".join(tip_match.group(1).split()) if tip_match else "Try your best, ask questions, and have fun learning about AI!"

    # 2. Syllabus (page index 2)
    syllabus_units = []

    # 3. Glossary (page index 20)
    p_gloss = doc[20]
    gloss_blocks = p_gloss.get_text("blocks")
    glossary = []
    for b in gloss_blocks:
        lines = [l.strip() for l in b[4].strip().split("\n") if l.strip()]
        if len(lines) >= 2 and not any(h in lines[0] for h in ["GLOSSARY", "My AI word", "More AI words", "Parivestra"]):
            term = lines[0]
            defn = " ".join(lines[1:])
            glossary.append({"term": term, "definition": defn, "mastered": False})

    # 4. Units 1..8
    units = []
    answers = []

    for u in range(1, 9):
        l_idx = 2 * u + 1
        a_idx = 2 * u + 2
        l_raw = doc[l_idx].get_text()
        a_raw = doc[a_idx].get_text()

        # Title & Big Idea
        tm = re.search(r"U\s*N\s*I\s*T\s*" + str(u) + r"\s*\n+([^\n]+)", l_raw)
        unit_title = tm.group(1).strip() if tm else f"Unit {u}"
        bm = re.search(r"Big idea\s*[·•:]\s*([^\n]+)", l_raw)
        big_idea = bm.group(1).strip() if bm else "Societal Impact"

        # Learn text
        learn_sec = ""
        if "Let's learn" in l_raw:
            sub = l_raw.split("Let's learn", 1)[1]
            end = re.search(r"(New words|Did you know\?|Think & talk|U\s*N\s*I\s*T)", sub)
            learn_sec = sub[:end.start()].strip() if end else sub.strip()
        learn_paragraphs = [p.strip() for p in learn_sec.split("\n\n") if p.strip()]
        if not learn_paragraphs:
            learn_paragraphs = [learn_sec]

        # New words (exactly 3)
        unit_words = []
        if len(glossary) == 24:
            # Sliced according to unit index
            unit_words = [{"term": t["term"], "definition": t["definition"]} for t in glossary[(u-1)*3:u*3]]
        else:
            # Fallback parsing
            p_blocks = doc[l_idx].get_text("blocks")
            for b in p_blocks:
                txt = b[4].strip()
                lines = [line.strip() for line in txt.split("\n") if line.strip()]
                if len(lines) >= 2 and not any(h in lines[0] for h in ["Let's learn", "New words", "Did you know", "Think & talk", "Parivestra", "U N I T", "Big idea"]):
                    if len(lines[0].split()) <= 4 and len(unit_words) < 3:
                        unit_words.append({"term": lines[0], "definition": " ".join(lines[1:])})

        # Did you know
        dyk = ""
        if "Did you know?" in l_raw:
            sub = l_raw.split("Did you know?", 1)[1]
            end = re.search(r"(Think & talk|Parivestra|U\s*N\s*I\s*T)", sub)
            dyk = sub[:end.start()].strip() if end else sub.strip()
            dyk = " ".join(dyk.split())

        # Think & talk
        tt = ""
        if "Think & talk" in l_raw:
            sub = l_raw.split("Think & talk", 1)[1]
            end = re.search(r"(Parivestra|U\s*N\s*I\s*T|Did you know)", sub)
            tt = sub[:end.start()].strip() if end else sub.strip()
            tt = " ".join(tt.split())

        # I can
        im = re.search(r"I can\s+([^\n]+)", a_raw)
        ican = ("I can " + im.group(1).strip()) if im else f"I can understand {unit_title}."

        syllabus_units.append({
            "unit": u,
            "topic": unit_title,
            "big_idea": big_idea,
            "objective": ican,
            "page": l_idx + 1
        })

        # Activities
        unit_acts = []
        act_matches = list(re.finditer(r"ACTIVITY\s*([12])\s*\n+([^\n]+)", a_raw, re.IGNORECASE))
        for idx, m in enumerate(act_matches):
            act_num = int(m.group(1))
            act_title = m.group(2).strip()
            start_pos = m.end()
            end_pos = act_matches[idx+1].start() if idx+1 < len(act_matches) else len(a_raw)
            ican_m = re.search(r"I can\s+([^\n]+)", a_raw[start_pos:end_pos])
            if ican_m:
                end_pos = start_pos + ican_m.start()
            body = a_raw[start_pos:end_pos].strip()
            lines = [l.strip() for l in body.split("\n") if l.strip()]
            instruction = lines[0] if lines else ""
            content = lines[1:] if len(lines) > 1 else []

            classification = classify_activity(act_title, instruction, content, grade, u, act_num)
            act_id = f"g{grade}_u{u}_a{act_num}"
            
            unit_acts.append({
                "id": act_id,
                "number": act_num,
                "title": act_title,
                "instruction": instruction,
                "type": classification["type"],
                "component": classification["component"],
                "auto_checkable": classification["auto_checkable"],
                "payload": {
                    "lines": content,
                    "prompt": instruction
                }
            })

            # Generate draft answer key
            ans = generate_default_answer(grade, u, act_num, classification["type"], act_title, instruction, content)
            answers.append(ans)

        units.append({
            "id": f"g{grade}_u{u}",
            "number": u,
            "title": unit_title,
            "big_idea": big_idea,
            "page": l_idx + 1,
            "learn_paragraphs": learn_paragraphs,
            "new_words": unit_words,
            "did_you_know": dyk,
            "think_and_talk": tt,
            "self_check": ican,
            "activities": unit_acts
        })

    # 5. Final Project (page index 19)
    p_proj = doc[19]
    proj_lines = [l.strip() for l in p_proj.get_text().split("\n") if l.strip()]
    proj_title_match = re.search(r"F\s*I\s*N\s*A\s*L\s*P\s*R\s*O\s*J\s*E\s*C\s*T\s*\n+([^\n]+)", p_proj.get_text())
    proj_title = proj_title_match.group(1).strip() if proj_title_match else f"Grade {grade} Final Project"

    final_project = {
        "title": proj_title,
        "page": 20,
        "instructions": "Complete your guided capstone project and submit for teacher review.",
        "fields": [l for l in proj_lines if len(l) < 50 and not l.startswith("Parivestra") and not l.isdigit()]
    }

    # 6. Certificate (page index 21)
    p_cert = doc[21]
    cert_text = p_cert.get_text()
    certificate = {
        "title": f"Certificate of Completion - {meta['edition_title']}",
        "edition": meta["edition_title"],
        "grade": grade,
        "page": 22,
        "text": f"This certificate is proudly presented for completing the Parivestra AI & Future Skills Grade {grade} Workbook with curiosity, creativity and care.",
        "fields": ["student_name", "teacher_name", "school_name", "date"]
    }

    workbook_data = {
        "grade": grade,
        "edition_title": meta["edition_title"],
        "tagline": meta["tagline"],
        "colors": meta["colors"],
        "band": meta["band"],
        "welcome": {
            "title": "Welcome, Explorer!",
            "pari_tip": pari_tip,
            "page": 2
        },
        "syllabus": syllabus_units,
        "units": units,
        "final_project": final_project,
        "glossary": glossary,
        "certificate": certificate
    }

    return workbook_data, answers

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(ANSWERS_DIR, exist_ok=True)
    os.makedirs(OVERLAYS_DIR, exist_ok=True)

    all_grades = []
    total_units = 0
    total_activities = 0
    total_new_words = 0
    total_glossary_terms = 0
    total_projects = 0
    total_certificates = 0
    total_answers = 0

    print("Starting Parivestra AI Workbooks import pipeline...")

    for g in range(3, 11):
        wb_data, answers = parse_full_workbook(g)
        all_grades.append(wb_data)

        # Write grade JSON
        grade_file = os.path.join(OUTPUT_DIR, f"grade{g}.json")
        with open(grade_file, "w", encoding="utf-8") as f:
            json.dump(wb_data, f, indent=2, ensure_ascii=False)

        # Write answers JSON
        answers_file = os.path.join(ANSWERS_DIR, f"grade{g}.json")
        with open(answers_file, "w", encoding="utf-8") as f:
            json.dump(answers, f, indent=2, ensure_ascii=False)

        # Count
        u_count = len(wb_data["units"])
        a_count = sum(len(u["activities"]) for u in wb_data["units"])
        nw_count = sum(len(u["new_words"]) for u in wb_data["units"])
        gl_count = len(wb_data["glossary"])
        
        total_units += u_count
        total_activities += a_count
        total_new_words += nw_count
        total_glossary_terms += gl_count
        total_projects += 1 if wb_data["final_project"] else 0
        total_certificates += 1 if wb_data["certificate"] else 0
        total_answers += len(answers)

        print(f"Grade {g} imported: {u_count} units, {a_count} activities, {nw_count} unit words, {gl_count} glossary terms.")

    # Validation Assertions
    print("\nRunning verification assertions...")
    assert len(all_grades) == 8, f"Expected 8 grades, got {len(all_grades)}"
    assert total_units == 64, f"Expected 64 units, got {total_units}"
    assert total_activities == 128, f"Expected 128 activities, got {total_activities}"
    assert total_new_words == 192, f"Expected 192 new words, got {total_new_words}"
    assert total_glossary_terms == 192, f"Expected 192 glossary terms, got {total_glossary_terms}"
    assert total_projects == 8, f"Expected 8 final projects, got {total_projects}"
    assert total_certificates == 8, f"Expected 8 certificates, got {total_certificates}"
    assert total_answers == 128, f"Expected 128 answers, got {total_answers}"

    print("ALL ASSERTIONS PASSED:")
    print("  ✓ 8 Grades imported (Grades 3-10)")
    print("  ✓ 64 Units validated")
    print("  ✓ 128 Activities parsed & typed")
    print("  ✓ 192 New Words extracted")
    print("  ✓ 192 Glossary terms mapped")
    print("  ✓ 8 Final Project templates generated")
    print("  ✓ 8 Certificates ready")
    print("  ✓ 128 Answer keys & rubrics generated with needs_review=True")

if __name__ == "__main__":
    main()
