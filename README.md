# Parivestra AI Tutor — Class 3 & Class 4 Learning Adventure

**Parivestra AI Tutor** is a premium, child-friendly AI learning companion and practice platform crafted specially for children in **Class 3 and Class 4 (ages 8 to 10)**. It pairs a warm, playful React 18 + Vite frontend with a modular FastAPI backend powered by a **Local LLM** (Gemma 4 served via llama-server / Unsloth), deterministic educational agents, BM25 retrieval across foundational school subjects (Maths, English, and EVS), an original owl mascot **Pari**, modular interactive **Courses**, animated **AI Video Stories**, a playful **Game Arena**, a discovery **Reading Library**, and a protected **Grown-ups & Teachers Portal**.

---

## What's New in the Class 3 & 4 Upgrade

1. **Original Mascot "Pari" (The Friendly Owl Guide)**:
   - Interactive SVG mascot with 5 distinct moods: `happy`, `thinking`, `cheering`, `sleepy`, and `oops`.
   - Pari guides students through quests, celebrates streaks, offers hints, and reacts gently to mistakes.

2. **Child Profile & 12 Animal Avatars**:
   - First-run onboarding flow (`OnboardingModal.jsx`) where children pick an animal avatar (`owl`, `fox`, `panda`, `lion`, `koala`, `bunny`, `cat`, etc.) and a friendly nickname.
   - Child privacy guaranteed: no real names, no photos, and no external trackers.

3. **Modular Interactive Courses**:
   - Class 3 & 4 curricula across **Maths**, **English**, and **Environmental Studies (EVS)**.
   - Each course features modular quests:
     - **Story Lessons**: Slide-by-slide illustrated readers with offline browser `SpeechSynthesis` ("Read it to me" audio).
     - **Practice Quests**: 1 question per screen with big touch buttons, instant cheering feedback, and star rewards.
     - **Hands-On Activities**: Real-world offline missions with step-by-step checklists and celebration buttons.
   - Course syllabus roadmap, module accordions, completed checkmarks, and XP progression.

4. **AI Videos & Animated SVG Story Player**:
   - Cinema-style video explore grid with subject filters and grade toggles.
   - **Interactive Story Player**: Animated SVG scene player (sun, clouds, water cycle, fraction pizza, nouns, plants) with synchronized speech narration, speed controls (0.8x, 1x), interactive prompts, and mini-quizzes.
   - **Local Video Streaming**: HTTP 206 Range request support (`/api/videos/{id}/stream`) for seekable classroom video lessons.

5. **Pari's Playful Game Arena (`/games`)**:
   - **Number Ninja**: Mental math times tables, place value addition, and fraction halves with combo streaks and 3 hearts.
   - **Spelling & Grammar Spark**: Noun hunting, rhyming word detection, and sentence fixing.
   - **Pari's Bug Hunt**: Child-friendly block logic, daily routine sequencing, and repeat loops.

6. **Discovery Reading Library (`/library`)**:
   - Illustrated storybooks, science discovery cards, and flashcards with built-in read-aloud modal narration.

7. **Protected Grown-ups & Teachers Portal (`/grown-ups`)**:
   - **Adult Gatekeeper**: Multi-digit math challenge or 4-digit PIN prevents accidental child access.
   - **Content Approval Workflow**: AI-generated courses and stories remain `draft` ("Needs teacher review") until approved by a teacher using the Admin Key (`ADMIN_KEY`).
   - **AI Course & Story Drafter**: Teachers can generate new 3-module syllabus outlines for Class 3 or 4.
   - **Child Safety Incident Log**: Sensitive keywords (distress, bullying, inappropriate content) trigger gentle adult referral and are logged with timestamps *without ever storing raw child text*.
   - **Accessibility Controls**: One-click toggles for Dyslexia-friendly font (`Lexend`) and Calm Mode (reduced animations).

8. **Design System & Zero Runtime CDNs**:
   - Self-hosted fonts (`@fontsource/baloo-2`, `@fontsource/nunito`, `@fontsource/lexend`) bundled locally.
   - 100% offline Web Audio synthesized chimes (`playSuccess`, `playNudge`, `playClick`).
   - Confetti bursts via `canvas-confetti`.

---

## Architecture Diagram

```text
+-----------------------------------------------------------------------------------+
|                            REACT 18 + VITE FRONTEND                               |
|   (Today's Adventure, Courses, AI Tutor Chat, Practice, Games, Videos, Library)  |
+-----------------------------------------------------------------------------------+
         |                                                       ^
         | HTTP / SSE Streams (X-User-Id, X-Admin-Key)           | Local Fallback
         v                                                       | (IndexedDB + 62 MCQs)
+-----------------------------------------------------------------------------------+
|                               FASTAPI BACKEND (/api)                              |
|   - CORS Middleware: http://localhost:5173                                        |
|   - Child Safety Filter & Reading-Level Verification (< 12 words per sentence)    |
|   - Teacher Admin Approval Gatekeeper (X-Admin-Key)                               |
|   - Endpoints: /courses, /videos, /tutor/chat, /practice, /admin/approve, etc.     |
+-----------------------------------------------------------------------------------+
         |                           |                            |
         v                           v                            v
+------------------+       +-------------------+       +--------------------+
|  AGENT PIPELINE  |       |   RAG RETRIEVAL   |       |   SQLITE DATABASE  |
| - RouterAgent    |       | - BM25Okapi       |       | (SQLAlchemy)       |
| - TutorAgent     | <---> | - grade3_4/       |       | - users, courses   |
| - PracticeAgent  |       |   maths, english, |       | - modules, lessons |
| - GraderAgent    |       |   evs.md          |       | - video_stories    |
| - Misconception  |       | - Grade Filtering |       | - videos, safety   |
| - ProgressAgent  |       | - Chunk Metadata  |       | - attempts, xp     |
+------------------+       +-------------------+       +--------------------+
         |
         v
+-----------------------------------------------------------------------------------+
|                        UNIFIED LLM GATEWAY (llm/gateway.py)                       |
|   - OpenAI-compatible endpoint (Default: http://127.0.0.1:8000/v1 for Gemma 4)    |
|   - Thinking/reasoning block stripping and auto-model detection                  |
|   - Streaming SSE tokens, 1x Retry, Fast Connect Timeouts, Call Latency Logging  |
+-----------------------------------------------------------------------------------+
                                     |
                                     v
                 +---------------------------------------+
                 |    LOCAL LLM SERVER (Host Machine)    |
                 |     llama-server.exe / llama.cpp      |
                 |     gemma-4-E2B-it-GGUF               |
                 +---------------------------------------+
```

---

## Key Features

1. **Deterministic Agents with Typed I/O**:
   - **`RouterAgent`**: Classifies input as `concept_question`, `practice_request`, `progress_question`, or `off_topic` using deterministic regex rules first, delegating to the LLM only for ambiguous inputs.
   - **`TutorAgent`**: Explains concepts grounded *strictly* in retrieved source excerpts. Never invents facts or hallucinates outside syllabus chunks. Features a 4-tier **Pedagogical Hint Ladder**:
     - *Hint Level 1*: Gentle nudge/question without giving away the answer.
     - *Hint Level 2*: Bigger clue highlighting key concept/rule.
     - *Hint Level 3*: Worked partial step or guided mini-example.
     - *Level 0 / Normal*: Full explanation with worked example.
     - *Source Citations*: Every answer returns verified chunk IDs and titles.
   - **`PracticeAgent`**: Generates MCQs dynamically from retrieved chunks, validated in code (valid JSON, exactly 4 unique options, 1 valid correct index). Retries up to 2 times before falling back to bundled questions.
   - **`GraderAgent`**: Deterministic code-based answer grading. The LLM is used only to write concise, encouraging explanations for incorrect selections.
   - **`MisconceptionAgent`**: Matches incorrect answers against 15 cataloged common student misconceptions (`knowledge_base/misconceptions.json`) to return actionable corrections.
   - **`ProgressAgent`**: Maintains topic mastery scores using a weighted moving average (`alpha = 0.3`). Only displays mastery after at least 3 attempts per topic. Computes weakest topics and recommended next steps.

2. **Grounded BM25 Retrieval (RAG)**:
   - Ingests `knowledge_base/topics.json`, `knowledge_base/python_notes.md`, and plain-text files into structured chunks with chunk IDs and titles.
   - Implements `BaseRetriever` interface so vector embeddings can be added seamlessly in V2.

3. **Resilient Local Offline Fallback**:
   - If the backend or local LLM server is unreachable, the React frontend seamlessly falls back to the bundled 62-question offline bank and browser IndexedDB storage without UI disruption.

---

## Setup Steps on Windows

### Prerequisites
- Python 3.10+ (tested on Python 3.11 and 3.13)
- Node.js 18+ (tested on Node 22)
- Git and PowerShell

### 1. Clone & Set Up Python Virtual Environment
```powershell
git clone <repo-url>
cd "parivestra ai tutor"

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install Python requirements
pip install -r requirements.txt
```

### 2. Set Up Frontend Dependencies
```powershell
npm install
```

### 3. Rebuild the Knowledge Base BM25 Index
```powershell
python scripts/ingest.py
```

---

## Pointing to Gemma 4 (Unsloth / Local Server)

All LLM configuration lives strictly in `.env`. No model names are hardcoded in the codebase.

### Option A: Local Unsloth / llama.cpp / vLLM Server (Default)
Create or edit `.env` in the project root:
```env
LLM_BASE_URL=http://localhost:8000/v1
LLM_MODEL=gemma-4
LLM_API_KEY=
LLM_TEMPERATURE=0.2
LLM_MAX_TOKENS=1024
LLM_PROVIDER=openai

DATABASE_URL=sqlite:///./parivestra.db
API_PORT=8001
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Option B: Ollama Fallback
If serving Gemma 4 or Qwen via Ollama:
```env
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434
LLM_MODEL=gemma:7b
```

---

## How to Run Everything on Windows

### 1. Start the FastAPI Backend (Port 8001)
Using PowerShell:
```powershell
.\scripts\dev-backend.ps1
```
Or directly with Uvicorn:
```powershell
uvicorn api:app --reload --port 8001
```
- Swagger API Docs: `http://localhost:8001/docs`
- Health Probe: `http://localhost:8001/api/health`

### 2. Start the Vite React Frontend (Port 5173)
In a second terminal window:
```powershell
.\scripts\dev-frontend.ps1
```
Or with npm:
```powershell
npm run dev
```
Open your browser to: **`http://localhost:5173`**

### 3. Run the Evaluation Benchmark
Evaluate the tutor on 20 Python benchmark questions:
```powershell
# Against live local LLM:
python eval/run_eval.py

# Or offline mock mode:
python eval/run_eval.py --mock-llm
```
Results and failure taxonomies (`retrieval`, `model`, `hallucination`, `latency`, `other`) are saved with timestamps to `eval/results/`.

### 4. Run the Pytest Test Suite
```powershell
pytest tests -v
```
All 37 agent, gateway, RAG, kids platform, and safety tests pass in under 5 seconds.

### 5. Running via Docker Compose
To run both backend and frontend inside containers (while connecting to your local Unsloth LLM running on the host):
```powershell
docker compose up --build
```
`host.docker.internal` is mapped so Docker containers communicate directly with your host machine's LLM server at port 8000.

---

## API Reference

All API routes validate payloads with Pydantic:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend status and LLM gateway reachability |
| `GET` | `/api/user/profile` | Student profile (avatar, nickname, grade, XP, streak) |
| `POST` | `/api/user/profile` | Update student profile and nickname |
| `GET` | `/api/courses` | List approved courses (or draft courses with `X-Admin-Key`) |
| `GET` | `/api/courses/{id}` | Course syllabus, modules, and lesson progress |
| `GET` | `/api/courses/{id}/lessons/{lesson_id}` | Fetch lesson slides, practice questions, or activities |
| `POST` | `/api/courses/{id}/lessons/{lesson_id}/complete` | Mark quest complete and award student XP |
| `POST` | `/api/courses/generate-draft` | (Teacher Admin) Draft 3-module course syllabus via LLM |
| `GET` | `/api/videos` | List approved animated stories and uploaded video lessons |
| `GET` | `/api/videos/story/{id}` | Fetch 5-6 animated SVG scenes with synchronized narration text |
| `POST` | `/api/videos/story/generate` | (Teacher Admin) Generate animated story scenes with reading check |
| `GET` | `/api/videos/{id}/stream` | Stream local video files with HTTP 206 Range seeking |
| `POST` | `/api/videos/upload` | (Teacher Admin) Upload MP4 or WebM video file (Max 200MB) |
| `GET` | `/api/admin/pending` | (Teacher Admin) Review draft courses, stories, and videos |
| `POST` | `/api/admin/approve` | (Teacher Admin) Publish/approve draft content |
| `POST` | `/api/tutor/chat` | Stream child-safe tutor responses via SSE with hint ladder |
| `POST` | `/api/practice/generate` | Generate validated MCQs (`{subject, topic, difficulty, count}`) |
| `POST` | `/api/practice/submit` | Grade MCQ in code, record attempt, match misconceptions, and award XP |
| `GET` | `/api/progress` | Topic mastery, recent attempts, and next recommended study topic |
| `POST` | `/ask` | Backward-compatible legacy endpoint returning `{success, topic, type, response}` |

### Client Identification (`X-User-Id` & `X-Admin-Key`)
The frontend automatically generates and persists a unique client identifier (`user_<random>`) in browser `localStorage`. It passes this in the `X-User-Id` HTTP header. Grown-ups and teachers authenticate to administrative endpoints via the `X-Admin-Key` header (`ADMIN_KEY=parivestra_admin_secret`).

---

## Verification & Test Results

- **Unit & Integration Tests**: 37/37 tests passing (`tests/`).
- **Benchmark Evaluation**: 20/20 questions evaluated, 90% citation correctness, 0% hallucination rate (`eval/run_eval.py`).
- **Frontend Build**: Vite production build bundles with zero errors (`npm run build`).
- **Child Privacy**: Zero external CDN calls, self-hosted typography, sensitive flags logged without child text.
- **Resilience**: Full backward-compatibility and offline fallback verified across all routes.
