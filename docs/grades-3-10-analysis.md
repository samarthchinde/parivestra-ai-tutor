# Parivestra AI Tutor — Grades 3 to 10 Upgrade Architectural Analysis

## 1. Executive Summary
This document provides the architectural analysis and implementation plan to expand **Parivestra AI Tutor** from supporting Classes 3-4 (ages 8-10) to supporting **Classes 3 through 10 (ages 8 to 16)** with many courses per class. The upgrade implements age-appropriate design and pedagogical banding (**Junior: 3-5**, **Middle: 6-8**, **Senior: 9-10**), data-driven curriculum structures (CBSE standard), automated idempotent course shell generation, a strict source-grounded draft course generation pipeline, grade-aware RAG retrieval with previous-grade revision mode, and expanded teacher oversight tools.

---

## 2. Places That Currently Assume Class 3 or 4

### A. Database Models & Schema
- `backend/models.py`:
  - `User.grade`: Defaulted to `"Class 3"` with String(20). Needs safe migration to accept `"Class 3"` through `"Class 10"`.
  - `Course.grade`, `Video.grade`, `VideoStory.grade`: String(50), seeded only with `"Class 3"` and `"Class 4"`.
  - `Course.status`: Handled `"draft"`, `"approved"`, `"published"`. Must add `"outline"` status to represent course shells awaiting content generation.
- `backend/database.py`:
  - Initial column addition set default `Class 3`. Must verify any existing rows and ensure schema migration is completely non-destructive.

### B. Onboarding & User Profile
- `src/components/OnboardingModal.jsx`:
  - Hardcoded array `["Class 3", "Class 4"]` with childish emojis and "Ages 8-9", "Ages 9-10".
  - Needs selector covering Class 3 to Class 10 with age bands.
- `src/api/client.js`: Default fallback `"Class 3"`.
- `src/components/AppLayout.jsx`: Shows "Class 3" default and displays child-scale mascot universally.

### C. Backend API Endpoints & Handlers
- `api.py`:
  - `get_subjects()`: Returns Maths, English, EVS and legacy Python. Must dynamically supply subjects per grade:
    - Classes 3-5: Maths, English, EVS
    - Classes 6-8: Maths, English, Science, Social Science
    - Classes 9-10: Maths, English, Science (Physics, Chemistry, Biology units), Social Science
  - `get_courses()`, `get_videos()`, `get_current_user()`: Fallback default grade is `"Class 3"`.
  - `generate_course_draft()`: Prompt hardcoded to "children in Class 3-4".

### D. RAG Retrieval & Knowledge Base
- `backend/rag/retriever.py`:
  - Scans `knowledge_base/grade3_4/` directory.
  - Regex boosting specifically targets `Class 3` and `Class 4`.
  - Chunks lack structured subject, grade, and chapter metadata.
  - No concept of revision mode to retrieve foundational concepts from the preceding grade.

### E. Tutor Agent & Reading Level Checks
- `backend/agents/tutor_agent.py`:
  - System prompt: `"You are Pari, an encouraging AI tutor for children in Class 3 and Class 4 (ages 8 to 10)..."`.
  - Readability check (`verify_and_simplify_reading_level`): Hardcoded sentence limit of 12 words.
  - Tone: Uniformly childish and simplified. While perfect for Junior (3-5), it would alienate a Class 9 or 10 student preparing for board exams.

### F. Safety & Distress Filter
- `backend/agents/tutor_agent.py`:
  - Pattern matching currently tailored to younger children's emotional language.
  - Response text refers only to "your parent or teacher".
  - Needs extension for adolescents (academic pressure, exam stress, adolescent distress, referral to counsellors or trusted adults), strictly preserving privacy by logging flags and timestamps only without student text.

### G. Seed Courses & Question Generation
- `backend/data/seed_courses.py`: Contains 4 Class 3-4 courses (`c3_maths_numbers`, `c3_eng_grammar`, `c4_evs_plants`, `c4_maths_mult`).
- `backend/agents/practice_agent.py`: Generic difficulty generation lacking band-specific formatting (e.g., picture-like vs exam-style MCQs with assertions/reasons).

### H. UI, Themes & Mascot
- `src/styles/tokens.css`: Warm cream and bubbly candy colors suitable for elementary kids.
- `src/pages/Dashboard.jsx`, `Courses.jsx`, `Games.jsx`, `LearningPath.jsx`, `Progress.jsx`, `Library.jsx`: Copy references "safari", "quest", and Elementary school topics.

---

## 3. Curriculum and Course Data Model

### A. Age Bands Configuration
Three age bands configured centrally in `src/config/bands.js` and `backend/config/bands.py`:

| Feature | Junior (Classes 3–5) | Middle (Classes 6–8) | Senior (Classes 9–10) |
| :--- | :--- | :--- | :--- |
| **Ages** | 8 – 11 | 11 – 14 | 14 – 16 |
| **Subjects** | Maths, English, EVS | Maths, English, Science, Social Science | Maths, English, Science (Physics, Chemistry, Biology), Social Science |
| **Theme / Look** | Playful, warm cream `#FFF9F0`, bright pastel accents | Calmer slate/teal/indigo `#F8FAFC`, clean cards, moderate density | Modern minimal focused `#F1F5F9`, high-density study layout |
| **Mascot (Pari)** | Large (110–130px), cheerful, conversational | Medium (60–80px), helper pill, polite | Small / subtle (36–48px), study badge, optional |
| **Typography** | Baloo 2 headings, Nunito body | Lexend headings, Nunito body | Lexend / Inter, clean academic sizing |
| **Tutor Tone** | Cheerful, tiny examples, encouraging | Clear, step-by-step, structured reasoning | Concise, exam-aware, grounded, board-focused |
| **Reading Level** | Average sentence $\le$ 12 words | Average sentence $\le$ 16 words | Average sentence $\le$ 20 words |
| **Practice Style** | 1 question per screen, touch cards | Multi-step problem solving, progressive hints | Exam-style MCQs, assertion-reasoning, case-based |
| **Games** | Number Ninja, Word Spark, Bug Hunt | Number Ninja (advanced), Word Spark, Bug Hunt | Quiz Sprint (rapid timed revision) |

### B. Curriculum JSON Schema (`knowledge_base/curriculum/cbse/class{N}/{subject}.json`)
```json
{
  "board": "CBSE",
  "grade": "Class 9",
  "subject": "Science",
  "units": [
    {
      "id": "c9_sci_u1",
      "title": "Matter - Its Nature and Behaviour",
      "sub_discipline": "Chemistry",
      "chapters": [
        {
          "id": "c9_sci_ch01",
          "chapter_number": 1,
          "title": "Matter in Our Surroundings",
          "learning_objectives": [
            "Understand physical nature of matter and states of matter",
            "Explain evaporation and factors affecting it"
          ],
          "prerequisites": [],
          "keywords": ["matter", "solid", "liquid", "gas", "evaporation", "latent heat"],
          "needs_review": true
        }
      ]
    }
  ]
}
```

---

## 4. File-by-File Upgrade Plan

### Files to ADD
1. `backend/config/bands.py`: Central backend age bands specification and helper functions.
2. `src/config/bands.js`: Central frontend age bands specification and theme configurations.
3. `knowledge_base/curriculum/cbse/`: CBSE curriculum definitions for Classes 3 through 10 across all designated subjects.
4. `backend/curriculum/loader.py`: Curriculum loader, schema validation, prerequisite cycle detection (DAG validation).
5. `scripts/build_course_shells.py`: Idempotent script building course shells (`outline` status) from curriculum JSONs.
6. `backend/courses/generator.py`: Draft lesson generator with source retrieval, LLM schema verification, and fallbacks.
7. `scripts/generate_course_drafts.py`: Background/batch script for course draft generation with resume capabilities.
8. `knowledge_base/curriculum/samples/`: Fully authored sample courses (2 per band = 6 total) with verified original content.
9. `tests/test_grades_3_10_and_bands.py`: Comprehensive test suite for bands, curriculum, generation, safety, and retrieval.

### Files to MODIFY
1. `backend/models.py`: Add `outline` status to `Course.status`, add curriculum link columns.
2. `backend/database.py`: Verify safe column handling.
3. `backend/agents/tutor_agent.py`: Implement band-aware system prompts, readability verification ($\le 12, 16, 20$ words), and adolescent distress safety detection.
4. `backend/rag/retriever.py`: Add grade/subject filtering, chunk metadata parsing, and previous-grade revision retrieval mode.
5. `api.py`: Add endpoints for curriculum, course draft generation, coverage dashboard, band config, and bulk upload.
6. `src/styles/tokens.css`: Add `[data-band="junior"]`, `[data-band="middle"]`, `[data-band="senior"]` CSS variables.
7. `src/components/AppLayout.jsx`: Bind `data-band` attribute to root container, render band-aware mascot and layout density.
8. `src/components/OnboardingModal.jsx`: Expand grade picker from Class 3 to Class 10 with age bands.
9. `src/pages/Dashboard.jsx`: Band-aware view (Junior: adventure quest; Middle: topic explorer; Senior: exam prep & mastery).
10. `src/pages/Courses.jsx`: Support Class 3-10 filters, subject filtering, and "Revise earlier class" shelf.
11. `src/pages/Tutor.jsx`: Band-appropriate quick question prompts and tone.
12. `src/pages/Practice.jsx`: Band-aware question rendering and senior exam-style practice.
13. `src/pages/Games.jsx`: Grade-scaled question pools and senior "Quiz Sprint" mode.
14. `src/pages/LearningPath.jsx`: Dynamic graph-based prerequisite unlocking from curriculum data.
15. `src/pages/Library.jsx`: Support Classes 3-10, chapter tagging, and bulk resource assignment.
16. `src/pages/Progress.jsx`: Band-appropriate achievement terminology (Quests -> Modules/Chapters).
17. `src/pages/GrownUps.jsx`: Course management table with outline/draft/published filters, coverage dashboard, and guided draft generator flow.
18. `src/api/client.js`: Client functions for curriculum, generation, and coverage.

### Files NOT to Touch
- `backend/llm/gateway.py` (working unified gateway).
- `scripts/start-llm.ps1` (llama-server startup).
- Existing 37 unit tests in `tests/` (must all continue passing without regression).

