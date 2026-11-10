# Parivestra AI Tutor (V1 & V2 Features)

**Parivestra AI Tutor** is an intelligent AI tutoring, gamified learning path, and adaptive practice platform for students (Parivestra *Course Factory & Education Agents* track). It pairs a responsive React 18 + Vite frontend with a modular FastAPI backend that queries a **Local LLM** (Gemma 4 served via Unsloth / llama.cpp / vLLM) with deterministic agent pipelines, BM25 retrieval-augmented generation (RAG), progressive hint ladders, misconception detection, adaptive question generation, an interactive coding game, an institute resource library, and weighted topic mastery tracking.

---

## Architecture Diagram

```text
+-----------------------------------------------------------------------------------+
|                            REACT 18 + VITE FRONTEND                               |
|   (Dashboard, Interactive Tutor Chat, Adaptive Practice, Learning Path Roadmap,   |
|    Bug Hunt Arena Game, Institute Library, Progress Analytics, Settings)          |
+-----------------------------------------------------------------------------------+
         |                                                       ^
         | HTTP / SSE Streams (X-User-Id, X-Admin-Key)           | Local Fallback
         v                                                       | (IndexedDB + Bundled MCQs)
+-----------------------------------------------------------------------------------+
|                               FASTAPI BACKEND (/api)                              |
|   - CORS Middleware: http://localhost:5173                                        |
|   - Structured Pydantic validation & Global Error Handler                         |
|   - Endpoints: /health, /tutor/chat, /practice/generate, /practice/submit,        |
|     /learning-path, /games/bughunt/*, /resources/*, /progress, etc.               |
+-----------------------------------------------------------------------------------+
         |                           |                            |
         v                           v                            v
+------------------+       +-------------------+       +--------------------+
|  AGENT PIPELINE  |       |   RAG RETRIEVAL   |       |   SQLITE DATABASE  |
| - RouterAgent    |       | - BM25Okapi       |       | (SQLAlchemy)       |
| - TutorAgent     | <---> | - Dynamic Index   |       | - users, sessions  |
| - PracticeAgent  |       |   (KB + Approved  |       | - messages         |
| - GraderAgent    |       |    Resources)     |       | - attempts, mastery|
| - Misconception  |       | - topics.json     |       | - generated_qs     |
| - ProgressAgent  |       |   *.md, *.txt     |       | - user_seen_qs     |
| - GameService    |       | - scripts/ingest  |       | - game_sessions    |
| - ResourceService|       +-------------------+       | - game_scores      |
+------------------+                                   | - resources        |
         |                                             | - llm_logs         |
         v                                             +--------------------+
+-----------------------------------------------------------------------------------+
|                        UNIFIED LLM GATEWAY (llm/gateway.py)                       |
|   - OpenAI-compatible endpoint (Default: http://localhost:8000/v1 for Gemma 4)   |
|   - Auto-model detection via /v1/models                                           |
|   - Strips <thought> / <think> reasoning tags from sync & streaming output        |
|   - 1x Retry, Fast Connect Timeouts, Detailed Latency & Error Logging             |
+-----------------------------------------------------------------------------------+
                                     |
                                     v
                 +---------------------------------------+
                 |    LOCAL LLM SERVER (Host Machine)    |
                 |  llama-server.exe (Gemma 4 GGUF)      |
                 |  Default Port: 8000                   |
                 +---------------------------------------+
```

---

## Implemented Highlights

### 1. Local LLM Gateway & Gemma 4 Integration
- **Direct OpenAI-compatible server**: `scripts/start-llm.ps1` runs Unsloth's bundled `llama-server.exe` on port 8000 using `gemma-4-E2B-it-UD-Q4_K_XL.gguf`.
- **Auto-Model Detection**: Gateway automatically detects and activates available models if `LLM_MODEL` is omitted or changes.
- **Thinking Tag Suppression**: Gemma 4 reasoning output (`<thought>...</thought>` or `<think>...</think>`) is cleanly stripped in real-time from both synchronous responses and SSE token streams.
- **Rich Health Probe**: `/api/health` returns status, model name, response latency, base URL, and exact error diagnostics, displayed as an interactive tooltip on the top-header status badge.

### 2. Level-Wise Gamified Learning Path
- **Roadmap Architecture**: Full game-style roadmap in `src/pages/LearningPath.jsx` populated via `GET /api/learning-path` and configured in `knowledge_base/learning_path.json`.
- **Level Unlock Rules**: Level $N$ unlocks strictly when Level $N-1$ has an average mastery $\ge 60\%$ with at least 3 attempts per topic. Clear reason cards are displayed for locked levels.
- **Direct Action Buttons**: Each milestone includes direct navigation to:
  - **"Learn with Tutor"**: Opens AI Tutor with that topic selected.
  - **"Practice"**: Opens Practice with that topic.
  - **"Play"**: Launches the Bug Hunt Arena for that topic.
- **Student Stats**: Calculates XP, level rank badges (e.g., Novice Coder, Byte Explorer, Logic Artisan), and daily practice streak counter. Shows a "Next Best Step" card powered by `ProgressAgent`.

### 3. Non-Repeating Adaptive Practice Engine
- **Deduplication Engine**: Rejects repeats using SHA-256 normalized question stem hashes and Jaccard token overlap threshold ($> 0.8$).
- **Seen History & Diversity**: Tracks seen questions in `user_seen_questions` and `generated_questions` tables, excluding user's last 20 seen stems per prompt, and randomizing top-$N$ source chunk sampling and pedagogical angles (e.g. concept, code-output, find-the-bug, syntax-rule).
- **Adaptive Difficulty**: Automatically promotes difficulty (Beginner $\to$ Intermediate $\to$ Advanced) on 3 consecutive correct answers in a topic; demotes if 2 of the last 3 answers are incorrect.
- **"New Set" Guarantee**: Consecutive sets never repeat identical questions. Displays "✨ AI Generated" or "Offline Question Set" badges.

### 4. Bug Hunt Arena (Interactive Coding Game)
- **Safe Code Inspection**: Static verification using Python's `ast.parse` and code validation. **Never executes user or generated code**.
- **Arcade Mechanics**: 3 lives (heart HUD), streak multiplier (up to $2.0\times$), speed bonus ($+30$ points for quick answers), Game Master persona with real-time feedback reactions.
- **Hint Penalty**: Non-spoiler Game Master hints deduct 25 points from round score.
- **Mastery Sync**: Automatically records game attempts and syncs topic mastery into `Attempt` and `Mastery` tables.
- **Leaderboard**: `GET /api/games/leaderboard` tracks top scores and rounds cleared.

### 5. Institute Resource Library
- **Admin vs Student Access**: Role enforced by `X-Admin-Key` header matching `ADMIN_KEY` in `.env` (configurable in `Settings` page). Students have read-only download access; Admins can upload, approve, unapprove, reindex, and delete.
- **Multi-Format Uploads**: Supports PDF (via `pypdf` / `fitz`), Markdown (`.md`), and plain text (`.txt`) up to 10 MB, stored securely in `data/resources/` with path traversal defense.
- **Dynamic BM25 Indexing**: Approving a resource immediately chunks the text and adds it to the active BM25 retriever index so the Tutor can ground answers in faculty material. Unapproving or deleting instantly removes it from the index.
- **Rich Card Interface**: Search by title/topic, subject filtering, file type icons, download buttons, and "Indexed by AI Tutor" badges.

---

## Windows Setup & Execution

### Prerequisites
- Python 3.10+ (tested on Python 3.11 and 3.13)
- Node.js 18+ (tested on Node 22)
- PowerShell

### 1. Launch the Local LLM Server (Gemma 4)
In a dedicated PowerShell window:
```powershell
.\scripts\start-llm.ps1
```
This runs `llama-server.exe` on `http://localhost:8000` with the Gemma 4 GGUF model and OpenAI-compatible `/v1` endpoint.

### 2. Configure Environment (`.env`)
Ensure `.env` contains:
```env
LLM_BASE_URL=http://localhost:8000/v1
LLM_MODEL=gemma-4
LLM_TEMPERATURE=0.2
LLM_MAX_TOKENS=1024
LLM_PROVIDER=openai

DATABASE_URL=sqlite:///./parivestra.db
API_PORT=8001
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Secret Admin Key for Faculty / Institute Library
ADMIN_KEY=parivestra_admin_secret
```

### 3. Start Backend & Frontend
Terminal 1 (FastAPI Backend on Port 8001):
```powershell
.\scripts\dev-backend.ps1
# Or: uvicorn api:app --reload --port 8001
```

Terminal 2 (Vite React Frontend on Port 5173):
```powershell
.\scripts\dev-frontend.ps1
# Or: npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## API Reference

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Backend status, LLM model, reachability, latency, and error diagnostics |
| `GET` | `/api/subjects` | Public | Available subjects and curriculum topics |
| `POST` | `/api/tutor/chat` | Public | Stream tutor responses with SSE, source citations, and hint ladders |
| `GET` | `/api/learning-path` | Student | Roadmap levels, unlock statuses, milestones, XP, streak, and next step |
| `POST` | `/api/practice/generate` | Student | Generate non-repeating MCQs with adaptive difficulty & deduplication |
| `POST` | `/api/practice/submit` | Student | Grade MCQ in code, record attempt, match misconceptions, update mastery |
| `POST` | `/api/games/bughunt/start` | Student | Start new Bug Hunt Arena session with 3 lives and code challenge |
| `POST` | `/api/games/bughunt/answer` | Student | Grade bug line diagnosis, calculate speed bonus & multipliers |
| `POST` | `/api/games/bughunt/hint` | Student | Request subtle Game Master hint (-25 pts) |
| `GET` | `/api/games/leaderboard` | Public | Top Bug Hunt player scores and rounds cleared |
| `GET` | `/api/resources` | Public | List educational resources (students see approved; admins see all) |
| `POST` | `/api/resources` | Admin / Student | Upload PDF, MD, or TXT (up to 10 MB); auto-indexes if admin |
| `GET` | `/api/resources/{id}/download` | Public | Download original resource document |
| `PATCH` | `/api/resources/{id}` | Admin | Update metadata or toggle approval (automatically indexes/unindexes BM25) |
| `DELETE` | `/api/resources/{id}` | Admin | Delete resource file and remove chunks from BM25 index |
| `POST` | `/api/resources/{id}/reindex` | Admin | Rebuild BM25 index for specific resource |
| `GET` | `/api/progress` | Student | Overall topic mastery, weakest topics, attempts history, next recommendation |

---

## Verification & Test Suite

Run all tests with pytest:
```powershell
pytest tests -v
```
**Results: 43/43 tests passing** (original 23 + learning path + practice dedup/adaptive + game arena + resources library).

Run production frontend build:
```powershell
npm run build
```
**Results: Vite production build succeeded in ~4s with 0 errors.**
