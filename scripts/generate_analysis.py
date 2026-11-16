"""Generate comprehensive docs/workbook-analysis.md for Step 0."""
import fitz
import json
import re
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKBOOKS_DIR = os.path.join(BASE_DIR, "docs", "workbooks")
DOCS_DIR = os.path.join(BASE_DIR, "docs")

GRADE_META = {
    3: {
        "title": "AI Explorers",
        "tagline": "Notice · Sort · Think",
        "colors": {"primary": "#F97316", "secondary": "#0D9488", "bg": "#FFF7ED", "robot": "#F97316"},
        "band": "junior (Grades 3-5)"
    },
    4: {
        "title": "AI Builders",
        "tagline": "Data · Train · Decide",
        "colors": {"primary": "#0284C7", "secondary": "#F59E0B", "bg": "#F0F9FF", "robot": "#0284C7"},
        "band": "junior (Grades 3-5)"
    },
    5: {
        "title": "AI Innovators",
        "tagline": "Learn · Create · Lead",
        "colors": {"primary": "#8B5CF6", "secondary": "#EC4899", "bg": "#F5F3FF", "robot": "#8B5CF6"},
        "band": "junior (Grades 3-5)"
    },
    6: {
        "title": "AI Thinkers",
        "tagline": "Scope · Collect · Explore",
        "colors": {"primary": "#0E7490", "secondary": "#EA580C", "bg": "#ECFEFF", "robot": "#0E7490"},
        "band": "middle (Grades 6-8)"
    },
    7: {
        "title": "AI Makers",
        "tagline": "See · Read · Code",
        "colors": {"primary": "#BE185D", "secondary": "#3B82F6", "bg": "#FDF2F8", "robot": "#BE185D"},
        "band": "middle (Grades 6-8)"
    },
    8: {
        "title": "AI Engineers",
        "tagline": "Train · Evaluate · Improve",
        "colors": {"primary": "#4338CA", "secondary": "#D97706", "bg": "#EEF2FF", "robot": "#4338CA"},
        "band": "middle (Grades 6-8)"
    },
    9: {
        "title": "AI Analysts",
        "tagline": "Analyse · Model · Question",
        "colors": {"primary": "#DC2626", "secondary": "#0284C7", "bg": "#FEF2F2", "robot": "#DC2626"},
        "band": "senior (Grades 9-10)"
    },
    10: {
        "title": "AI Leaders",
        "tagline": "Build · Evaluate · Lead",
        "colors": {"primary": "#1E293B", "secondary": "#D97706", "bg": "#F8FAFC", "robot": "#1E293B"},
        "band": "senior (Grades 9-10)"
    },
}

def classify_activity(title, instruction, lines, grade, unit, act_num):
    text = (title + " " + instruction + " " + " ".join(lines)).lower()
    
    # 1. Fill in blanks (check before 'box' so 'words in the box' doesn't map to sort_boxes)
    if "fill in the blanks" in text or "use the words in the box" in text or "word bank" in text:
        return {
            "component": "FillBlanksActivity",
            "type": "fill_blanks",
            "auto_checkable": True,
            "desc": "Sentence cloze with word bank pills or text input"
        }

    # 2. Canvas / Drawing / Sketch / Poster
    if "draw a robot" in text or "draw your" in text or "draw a flowchart" in text or "draw a network" in text or "poster" in text or "sketch" in text or "draw bounding boxes" in text:
        return {
            "component": "DrawingCanvasActivity",
            "type": "drawing_canvas",
            "auto_checkable": False,
            "desc": "Digital canvas with pen/color palette, sticker badges, and image save"
        }

    # 3. Matching pairs
    if "match" in text or "draw a line" in text:
        return {
            "component": "MatchPairsActivity",
            "type": "match_pairs",
            "auto_checkable": True,
            "desc": "Interactive pairing lines or drag-to-pair between left and right terms"
        }

    # 4. Tables / True False / Classification / Tick
    if "tick the box" in text or "tick fair" in text or "tick true" in text or "tick the right" in text or "true or false" in text or "rule or learning" in text or "active or passive" in text or "strong or weak" in text or "helpful or harmful" in text or "share or keep private" in text:
        if "say why" in text or "fair or unfair" in text:
            return {
                "component": "TickTableReasonActivity",
                "type": "tick_table_reason",
                "auto_checkable": False,
                "desc": "Tick binary choice (Fair/Unfair) + text reflection with teacher rubric"
            }
        return {
            "component": "TickTableActivity",
            "type": "tick_table",
            "auto_checkable": True,
            "desc": "Multi-item selection table (AI/Not AI, True/False, Rule/Learning) with instant check"
        }

    # 5. Sorting / grouping into boxes
    if "sort" in text or "living or non-living" in text or "fly, swim" in text or "which domain" in text or "which ai domain" in text or "which type of learning" in text or "structured or unstructured" in text or "split the data" in text or "clusters" in text:
        return {
            "component": "SortBoxesActivity",
            "type": "sort_boxes",
            "auto_checkable": True,
            "desc": "Drag-and-drop or tap-to-place items into categorized bucket cards"
        }

    # 6. Step ordering
    if "order" in text or "put the steps in order" in text or "number the" in text:
        return {
            "component": "OrderStepsActivity",
            "type": "order_steps",
            "auto_checkable": True,
            "desc": "Drag-to-reorder algorithmic sequence steps with instant check and hint"
        }

    # 7. Patterns
    if "what comes next" in text or "pattern" in text:
        return {
            "component": "PatternCompletionActivity",
            "type": "pattern_completion",
            "auto_checkable": True,
            "desc": "Sequence pattern identification with next-item slot"
        }

    # 8. Grid / robot path navigation
    if "reach the star" in text or "grid" in text or "help pari" in text or "pari code blocks" in text:
        return {
            "component": "PathGridActivity",
            "type": "path_grid",
            "auto_checkable": True,
            "desc": "Interactive 2D robot grid with directional arrow sequence planner"
        }

    # 9. Charts / survey / tally
    if "survey" in text or "chart" in text or "pictograph" in text or "plot the survey" in text or "books read this month" in text or "read your graph" in text:
        return {
            "component": "DataChartActivity",
            "type": "data_chart",
            "auto_checkable": True,
            "desc": "Interactive pictograph / bar graph / survey tally with data reader"
        }

    # 10. Math / stats / probability
    if "calculate" in text or "pixel maths" in text or "accuracy" in text or "probability" in text or "mean" in text or "spot the outlier" in text or "f1" in text or "precision" in text or "compute the perceptron" in text:
        return {
            "component": "MathStatsActivity",
            "type": "math_stats",
            "auto_checkable": True,
            "desc": "Formula calculations (mean, outlier, metrics, perceptron) with step validator"
        }

    # 11. Pixels & computer vision
    if "pixel" in text or "convolution" in text or "be the computer" in text or "find the features" in text:
        return {
            "component": "PixelsVisionActivity",
            "type": "pixels_vision",
            "auto_checkable": True,
            "desc": "Grid pixel matrix editor, convolution filter kernel, and feature detector"
        }

    # 12. ML Labs (Decision trees, confusion matrix, trainer)
    if "animal guesser" in text or "your own tree" in text or "confusion matrix" in text or "be the trainer" in text or "be a neuron" in text or "ice cream sales" in text:
        return {
            "component": "MLLabActivity",
            "type": "ml_lab",
            "auto_checkable": True,
            "desc": "Interactive decision tree traversal, confusion matrix explorer, and neuron simulation"
        }

    # 13. Python playground
    if "python" in text or "trace the" in text or "predict the output" in text or "pandas" in text or "write code" in text or "relu" in text or "read the workflow" in text:
        return {
            "component": "PythonPlaygroundActivity",
            "type": "python_playground",
            "auto_checkable": True,
            "desc": "Client-side sandboxed code runner with trace questions and stdout checker"
        }

    # 14. Chatbot builder / language AI
    if "chatbot" in text or "bot replies" in text or "intent" in text or "tokenise" in text or "sentiment" in text or "bag of words" in text or "run the pipeline" in text or "design a rag" in text:
        return {
            "component": "ChatbotBuilderActivity",
            "type": "chatbot_builder",
            "auto_checkable": True if ("tokenise" in text or "sentiment" in text or "bag of words" in text) else False,
            "desc": "NLP tokeniser/sentiment classifier or multi-turn dialog test playground"
        }

    # 15. Prompt lab / Fact or Fake
    if "prompt" in text or "stop check" in text or "engineer the prompt" in text:
        return {
            "component": "PromptLabActivity",
            "type": "prompt_lab",
            "auto_checkable": False,
            "desc": "Prompt iteration arena with quality rubric and simulated model feedback"
        }

    # 16. Fallback open response
    return {
        "component": "ReflectionActivity",
        "type": "reflection_input",
        "auto_checkable": False,
        "desc": "Structured multi-part text response with personal-info guard & teacher review"
    }

def main():
    report_lines = []
    report_lines.append("# Parivestra AI & Future Skills Workbooks: Comprehensive Analysis")
    report_lines.append("")
    report_lines.append("> Analysis and digital transformation specification for all 8 official Parivestra Workbooks (Grades 3 to 10).")
    report_lines.append("")
    report_lines.append("## Executive Summary")
    report_lines.append("- **Total Workbooks**: 8 (Grades 3 to 10)")
    report_lines.append("- **Structure per Workbook**: Exactly 22 pages (Cover, Welcome, Syllabus, 8 Units x 2 pages = 16 pages, Final Project, Glossary, Certificate)")
    report_lines.append("- **Total Units**: 64 (8 units per grade)")
    report_lines.append("- **Total Activities**: 128 (2 activities per unit)")
    report_lines.append("- **Total New Words / Glossary Terms**: 192 (24 per grade, 3 per unit)")
    report_lines.append("- **Total Final Projects**: 8 guided capstones with grade-specific templates")
    report_lines.append("- **Total Certificates**: 8 completion certificates with student avatar & teacher sign-off")
    report_lines.append("")

    # Color Palettes Table
    report_lines.append("## 1. Grade Color Themes & Mascot Styling")
    report_lines.append("| Grade | Title | Age Band | Tagline | Primary Color | Secondary Color | Background | Robot Hue |")
    report_lines.append("|---|---|---|---|---|---|---|---|")
    for g, meta in GRADE_META.items():
        c = meta["colors"]
        report_lines.append(f"| Grade {g} | **{meta['title']}** | {meta['band']} | `{meta['tagline']}` | `{c['primary']}` | `{c['secondary']}` | `{c['bg']}` | `{c['robot']}` |")
    report_lines.append("")

    all_units = []
    total_auto = 0
    total_rubric = 0

    # Extract all units
    for g in range(3, 11):
        pdf_path = os.path.join(WORKBOOKS_DIR, f"grade{g}.pdf")
        doc = fitz.open(pdf_path)
        
        # Glossary terms for grade
        p_gloss = doc[20]
        gloss_blocks = p_gloss.get_text("blocks")
        gloss_terms = []
        for b in gloss_blocks:
            lines = [l.strip() for l in b[4].strip().split("\n") if l.strip()]
            if len(lines) >= 2 and not any(h in lines[0] for h in ["GLOSSARY", "My AI word", "More AI words", "Parivestra"]):
                gloss_terms.append({"term": lines[0], "definition": " ".join(lines[1:])})

        for u in range(1, 9):
            l_idx = 2 * u + 1
            a_idx = 2 * u + 2
            l_raw = doc[l_idx].get_text()
            a_raw = doc[a_idx].get_text()

            # Unit title & big idea
            tm = re.search(r"U\s*N\s*I\s*T\s*" + str(u) + r"\s*\n+([^\n]+)", l_raw)
            title = tm.group(1).strip() if tm else f"Unit {u}"
            bm = re.search(r"Big idea\s*[·•:]\s*([^\n]+)", l_raw)
            big_idea = bm.group(1).strip() if bm else "Societal Impact"

            # Learn text
            learn_sec = ""
            if "Let's learn" in l_raw:
                sub = l_raw.split("Let's learn", 1)[1]
                end = re.search(r"(New words|Did you know\?|Think & talk|U\s*N\s*I\s*T)", sub)
                learn_sec = sub[:end.start()].strip() if end else sub.strip()
            learn_text = " ".join([p.strip() for p in learn_sec.split("\n") if p.strip()])

            # New words (3 words)
            nw_list = []
            if len(gloss_terms) == 24:
                # 3 words corresponding to unit (u-1)*3 .. u*3
                p_blocks = doc[l_idx].get_text("blocks")
                for b in p_blocks:
                    txt = b[4].strip()
                    lines = [line.strip() for line in txt.split("\n") if line.strip()]
                    if len(lines) >= 2 and not any(h in lines[0] for h in ["Let's learn", "New words", "Did you know", "Think & talk", "Parivestra", "U N I T", "Big idea"]):
                        if len(lines[0].split()) <= 4 and len(nw_list) < 3:
                            nw_list.append((lines[0], " ".join(lines[1:])))
            if len(nw_list) < 3:
                nw_list = [(t["term"], t["definition"]) for t in gloss_terms[(u-1)*3:u*3]]

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

            # Objective ("I can")
            im = re.search(r"I can\s+([^\n]+)", a_raw)
            ican = ("I can " + im.group(1).strip()) if im else f"I can understand {title}."

            # Activities
            acts = []
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
                
                cl = classify_activity(act_title, instruction, content, g, u, act_num)
                if cl["auto_checkable"]:
                    total_auto += 1
                else:
                    total_rubric += 1
                    
                acts.append({
                    "num": act_num,
                    "title": act_title,
                    "instruction": instruction,
                    "content": content,
                    "classification": cl
                })

            all_units.append({
                "grade": g,
                "unit": u,
                "title": title,
                "big_idea": big_idea,
                "learn": learn_text,
                "new_words": nw_list,
                "did_you_know": dyk,
                "think_and_talk": tt,
                "ican": ican,
                "activities": acts
            })

    # Summary of activities
    report_lines.append("## 2. Activity Engine Coverage (128 Activities)")
    report_lines.append(f"- **Total Activities**: 128")
    report_lines.append(f"- **Auto-checkable Activities**: {total_auto} (evaluated instantly client-side / server validation)")
    report_lines.append(f"- **Teacher-Rubric / Reflection Activities**: {total_rubric} (scored via structured criteria & feedback)")
    report_lines.append("")
    report_lines.append("### Component Type Breakdown")
    report_lines.append("| Component | Type Identifier | Description | Validation Mode |")
    report_lines.append("|---|---|---|---|")
    report_lines.append("| `TickTableActivity` | `tick_table` | Multi-item selection, binary categorization (AI/Not AI, True/False) | Auto-checked |")
    report_lines.append("| `MatchPairsActivity` | `match_pairs` | Interactive pairing line / drag target | Auto-checked |")
    report_lines.append("| `SortBoxesActivity` | `sort_boxes` | Bucket sorting into 2-3 categorized boxes | Auto-checked |")
    report_lines.append("| `FillBlanksActivity` | `fill_blanks` | Sentence cloze with word bank pills | Auto-checked |")
    report_lines.append("| `OrderStepsActivity` | `order_steps` | Drag-to-reorder algorithmic sequence | Auto-checked |")
    report_lines.append("| `PatternCompletionActivity` | `pattern_completion` | Sequence pattern predictor | Auto-checked |")
    report_lines.append("| `PathGridActivity` | `path_grid` | 2D robot grid maze with command arrow queue | Auto-checked |")
    report_lines.append("| `DataChartActivity` | `data_chart` | Interactive pictograph / bar graph / survey tally | Auto-checked |")
    report_lines.append("| `MathStatsActivity` | `math_stats` | Mean, outlier, probability, accuracy formula calculators | Auto-checked |")
    report_lines.append("| `PixelsVisionActivity` | `pixels_vision` | Pixel grid coloring, convolution filter kernel, bounding box | Auto-checked |")
    report_lines.append("| `MLLabActivity` | `ml_lab` | Train-and-test split, decision tree brancher, neuron simulation | Auto-checked |")
    report_lines.append("| `PythonPlaygroundActivity` | `python_playground` | Client-side sandboxed code runner with trace questions and stdout checker | Auto-checked |")
    report_lines.append("| `ChatbotBuilderActivity` | `chatbot_builder` | Dialog turns, NLP intent, entity & fallback editor | Rubric / Auto |")
    report_lines.append("| `PromptLabActivity` | `prompt_lab` | Prompt iteration, rewriting, STOP-framework checker | Teacher Rubric / Local LLM |")
    report_lines.append("| `TickTableReasonActivity` | `tick_table_reason` | Choice selection + justification text | Teacher Rubric |")
    report_lines.append("| `DrawingCanvasActivity` | `drawing_canvas` | Freeform digital sketchpad with undo, pen width, and export | Teacher Rubric |")
    report_lines.append("| `ReflectionActivity` | `reflection_input` | Multi-step text reflection with personal data guard | Teacher Rubric |")
    report_lines.append("")

    # 64 Units Matrix
    report_lines.append("## 3. Comprehensive 64-Unit Curriculum Matrix")
    report_lines.append("")
    for u in all_units:
        g = u["grade"]
        un = u["unit"]
        meta = GRADE_META[g]
        report_lines.append(f"### Grade {g} ({meta['title']}) · Unit {un}: {u['title']}")
        report_lines.append(f"- **Big Idea**: `{u['big_idea']}`")
        report_lines.append(f"- **Learning Objective**: {u['ican']}")
        report_lines.append(f"- **New Words**: " + ", ".join([f"**{w[0]}** ({w[1]})" for w in u["new_words"]]))
        report_lines.append(f"- **Did You Know?**: *\"{u['did_you_know']}\"*")
        report_lines.append(f"- **Think & Talk**: *\"{u['think_and_talk']}\"*")
        report_lines.append("- **Activities**:")
        for a in u["activities"]:
            cl = a["classification"]
            mode_badge = "✅ Auto-check" if cl["auto_checkable"] else "📝 Rubric/Reflection"
            report_lines.append(f"  - **Activity {a['num']}: {a['title']}** [{mode_badge}] (`{cl['component']}`)")
            report_lines.append(f"    - *Prompt*: {a['instruction']}")
            if a["content"]:
                report_lines.append(f"    - *Items/Context*: {'; '.join(a['content'][:6])}")
        report_lines.append("")

    # Final Projects Breakdown
    report_lines.append("## 4. Final Projects Specifications (8 Guided Templates)")
    projects = [
        {
            "grade": 3,
            "title": "My Helper Robot",
            "objective": "Use what I learned to plan my own AI helper idea.",
            "fields": [
                {"name": "robot_name", "label": "Robot name", "type": "text"},
                {"name": "job_description", "label": "What job will it do?", "type": "textarea"},
                {"name": "sensors", "label": "Which sensors will it use? (see, hear, touch…)", "type": "tags"},
                {"name": "steps", "label": "Write 3 steps it will follow", "type": "ordered_list", "count": 3},
                {"name": "safety_rule", "label": "One safety rule for your robot", "type": "text"},
                {"name": "drawing", "label": "Draw your robot", "type": "canvas"}
            ]
        },
        {
            "grade": 4,
            "title": "Build a Classroom Chatbot",
            "objective": "Design rules and conversational flows for an educational assistant.",
            "fields": [
                {"name": "bot_name", "label": "Chatbot name and job", "type": "text"},
                {"name": "target_users", "label": "Who will use it?", "type": "text"},
                {"name": "dialog_pairs", "label": "Script: 4 questions and replies (User asks / Bot replies)", "type": "dialog_table", "pairs": 4},
                {"name": "decision_tree", "label": "A decision tree for one tricky question", "type": "tree_builder"}
            ]
        },
        {
            "grade": 5,
            "title": "AI for Good Project",
            "objective": "Design an AI idea that solves a real problem in your school or community.",
            "fields": [
                {"name": "problem", "label": "The problem", "type": "textarea"},
                {"name": "beneficiaries", "label": "Who it helps", "type": "text"},
                {"name": "data_needed", "label": "What data the AI needs", "type": "textarea"},
                {"name": "ai_mechanism", "label": "How the AI helps", "type": "textarea"},
                {"name": "prototype_screen", "label": "Prototype: draw the app screen", "type": "canvas"},
                {"name": "fairness_check", "label": "Fairness check: who might it leave out?", "type": "textarea"},
                {"name": "friend_test", "label": "Test: what did a friend say?", "type": "textarea"}
            ]
        },
        {
            "grade": 6,
            "title": "Smart School Problem Canvas",
            "objective": "Scope a real school operational challenge using the 4Ws framework.",
            "fields": [
                {"name": "problem_title", "label": "Problem title", "type": "text"},
                {"name": "who", "label": "Who has the problem?", "type": "text"},
                {"name": "what", "label": "What is the problem?", "type": "textarea"},
                {"name": "where", "label": "Where does it happen?", "type": "text"},
                {"name": "why", "label": "Why does solving it matter?", "type": "textarea"},
                {"name": "cycle_diagram", "label": "Draw the AI Project Cycle for your idea", "type": "cycle_mapper"}
            ]
        },
        {
            "grade": 7,
            "title": "Paper Sentiment Detector",
            "objective": "Build a lexicon-based rule system and evaluate accuracy on test cases.",
            "fields": [
                {"name": "positive_words", "label": "List 5 positive words", "type": "word_list", "count": 5},
                {"name": "negative_words", "label": "List 5 negative words", "type": "word_list", "count": 5},
                {"name": "decision_rule", "label": "Your rule: how will you decide positive, negative or neutral?", "type": "textarea"},
                {"name": "evaluation_table", "label": "Test it on 4 real reviews (Review, Detector prediction, Correct?)", "type": "eval_table", "rows": 4}
            ]
        },
        {
            "grade": 8,
            "title": "Predict and Evaluate",
            "objective": "Define features, label, split, and calculate a confusion matrix with accuracy.",
            "fields": [
                {"name": "task", "label": "Task: what will your model predict?", "type": "text"},
                {"name": "features", "label": "Features (inputs)", "type": "tags"},
                {"name": "labels", "label": "Label (output) and classes", "type": "text"},
                {"name": "split", "label": "Training and test split", "type": "split_slider"},
                {"name": "confusion_matrix", "label": "Confusion Matrix (TP, FN, FP, TN)", "type": "matrix_input"},
                {"name": "accuracy_improvement", "label": "Accuracy and one improvement", "type": "textarea"}
            ]
        },
        {
            "grade": 9,
            "title": "Data-to-Insight Report",
            "objective": "Analyze a structured dataset, calculate summary statistics, and visualize distributions.",
            "fields": [
                {"name": "research_question", "label": "Question you want to answer", "type": "text"},
                {"name": "dataset_info", "label": "Data you collected (source, size, columns)", "type": "textarea"},
                {"name": "cleaning_steps", "label": "Cleaning steps you did", "type": "textarea"},
                {"name": "statistics", "label": "Key statistics (mean, median, spread)", "type": "stats_grid"},
                {"name": "chart", "label": "Chart: sketch it here", "type": "chart_builder"},
                {"name": "insights", "label": "Insight and one limitation", "type": "textarea"}
            ]
        },
        {
            "grade": 10,
            "title": "Capstone: AI Solution Pitch",
            "objective": "Comprehensive ML model pitch including governance, ethics, and system architecture.",
            "fields": [
                {"name": "problem_users", "label": "Problem and users", "type": "textarea"},
                {"name": "data_governance", "label": "Data: source, size, consent", "type": "textarea"},
                {"name": "model_approach", "label": "Model approach and why", "type": "textarea"},
                {"name": "metric_target", "label": "Evaluation metric and target (e.g. recall ≥ 0.9)", "type": "text"},
                {"name": "responsible_ai", "label": "Responsible AI checks", "type": "checklist"},
                {"name": "architecture", "label": "Prototype sketch or system diagram", "type": "diagram_builder"},
                {"name": "pitch_line", "label": "30-second pitch line", "type": "text"}
            ]
        }
    ]

    for p in projects:
        report_lines.append(f"### Grade {p['grade']}: {p['title']}")
        report_lines.append(f"- **Goal**: {p['objective']}")
        report_lines.append("- **Template Fields**:")
        for f in p["fields"]:
            report_lines.append(f"  - `{f['name']}` ({f['label']}) &rarr; Component: `{f['type']}`")
        report_lines.append("")

    # Plan of Files
    report_lines.append("## 5. File Plan (Add, Modify, Keep)")
    report_lines.append("### Files to Add")
    report_lines.append("- `knowledge_base/ai_workbooks/grade{3..10}.json`: Structured unit data, verbatim text, activities, glossary.")
    report_lines.append("- `knowledge_base/ai_workbooks/answers/grade{3..10}.json`: Server-side answer keys & rubrics (`needs_review=True`).")
    report_lines.append("- `knowledge_base/ai_workbooks/overlays/grade{3..10}.json`: Bounding box and coordinate overlays for page renders.")
    report_lines.append("- `scripts/import_workbooks.py`: Automated extractor & validator pipeline.")
    report_lines.append("- `src/components/Mascot.jsx`: Vector SVG robot Pari with states (idle, happy, cheering, thinking, waving) and per-grade colors.")
    report_lines.append("- `src/components/workbook/ActivityEngine.jsx`: Dispatcher and component suite for all 17 activity interaction patterns.")
    report_lines.append("- `src/components/workbook/FinalProjectBuilder.jsx`: Guided builder for all 8 grade capstones.")
    report_lines.append("- `src/components/workbook/WorkbookReflection.jsx`: Think & Talk and I can self-assessment with safety filter.")
    report_lines.append("- `src/pages/WorkbookHome.jsx`: Workbook overview, unit progress grid, glossary progress, certificate status.")
    report_lines.append("- `src/pages/WorkbookUnit.jsx`: Interactive unit reader (Learn tab, Practice Activities tab, Reflect tab).")
    report_lines.append("- `src/pages/WordBank.jsx`: Digital glossary with mastered/unmastered badges and audio pronunciation.")
    report_lines.append("- `src/pages/CertificateView.jsx`: Printable/shareable certificate generator with SVG graphics and signatures.")
    report_lines.append("- `eval/workbook_questions.json`: Ground truth dataset of 100+ questions across the 8 grades.")
    report_lines.append("- `tests/test_ai_workbooks.py`: Comprehensive test suite verifying all 64 units, 128 activities, and APIs.")
    report_lines.append("")
    report_lines.append("### Files to Modify")
    report_lines.append("- `src/styles/tokens.css`: Add color tokens for all 8 grades and band variables.")
    report_lines.append("- `src/data/navigation.js`: Add AI Workbooks nav item linked to current grade.")
    report_lines.append("- `src/App.jsx`: Register `/workbook`, `/workbook/:grade/unit/:unitNumber`, `/workbook/word-bank`, `/workbook/certificate` routes.")
    report_lines.append("- `backend/models.py` & `backend/database.py`: Add `UnitProgress`, `ActivityAttempt`, `WorkbookReflection`, `ProjectEntry`, `GlossaryMastery`, `WorkbookCertificate` models.")
    report_lines.append("- `api.py`: Expose endpoints for workbook retrieval, server-side answer checking, reflection saving, project submission, and certificate generation.")
    report_lines.append("- `backend/rag/retriever.py`: Index all 64 workbook units with structured citations (`Grade {g} · Unit {u} · {title} · p.{page}`).")
    report_lines.append("- `src/pages/GrownUps.jsx`: Add teacher workbook guides, pacing, answer review queue, and project scoring.")
    report_lines.append("- `src/pages/Tutor.jsx`: Add 'Ask Pari' workbook tutor mode grounded in the student's current grade and unit.")
    report_lines.append("")
    report_lines.append("### Files to Keep Untouched")
    report_lines.append("- Existing 37 pytest tests in `tests/test_*.py` must pass continuously without modification.")
    report_lines.append("- Existing Python course material (`knowledge_base/topics.json`), practice generation, and local LLM gateway (`backend/llm/gateway.py`).")
    report_lines.append("- Existing child safety guardrails, rate limiters, and admin key auth mechanisms.")
    report_lines.append("")

    with open(os.path.join(DOCS_DIR, "workbook-analysis.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(report_lines))

    print(f"Successfully generated docs/workbook-analysis.md with {len(all_units)} units and {total_auto + total_rubric} activities.")

if __name__ == "__main__":
    main()
