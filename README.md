# Parivestra AI Tutor (V1)

**Parivestra AI Tutor** is an intelligent AI tutoring and adaptive practice platform for students (Parivestra *Course Factory & Education Agents* track). It pairs a responsive React 18 + Vite frontend with a modular FastAPI backend that queries a **Local LLM** (Gemma 4 served via Unsloth / llama.cpp / vLLM) with deterministic agent pipelines, BM25 retrieval-augmented generation (RAG), progressive hint ladders, misconception detection, and weighted topic mastery tracking.

---

## Architecture Diagram

```text
+-----------------------------------------------------------------------------------+
|                            REACT 18 + VITE FRONTEND                               |
|   (Dashboard, Interactive Tutor Chat, Adaptive Practice, Progress Analytics)      |
+-----------------------------------------------------------------------------------+
         |                                                       ^
         | HTTP / SSE Streams (X-User-Id)                        | Local Fallback
         v                                                       | (IndexedDB + 62 MCQs)
+-----------------------------------------------------------------------------------+
|                               FASTAPI BACKEND (/api)                              |
|   - CORS Middleware: http://localhost:5173                                        |
|   - Structured Pydantic validation & Global Error Handler                         |
|   - Endpoints: /health, /tutor/chat, /practice/generate, /practice/submit, etc.   |
+-----------------------------------------------------------------------------------+
         |                           |                            |
         v                           v                            v
+------------------+       +-------------------+       +--------------------+
|  AGENT PIPELINE  |       |   RAG RETRIEVAL   |       |   SQLITE DATABASE  |
| - RouterAgent    |       | - BM25Okapi       |       | (SQLAlchemy)       |
| - TutorAgent     | <---> | - knowledge_base/ |       | - users, sessions  |
| - PracticeAgent  |       |   topics.json     |       | - messages         |
| - GraderAgent    |       |   *.md, *.txt     |       | - attempts         |
| - Misconception  |       | - Chunk Metadata  |       | - topic mastery    |
| - ProgressAgent  |       | - scripts/ingest  |       | - llm_logs         |
+------------------+       +-------------------+       +--------------------+
         |
         v
+-----------------------------------------------------------------------------------+
|                        UNIFIED LLM GATEWAY (llm/gateway.py)                       |
|   - OpenAI-compatible endpoint (Default: http://localhost:8000/v1 for Gemma 4)   |
|   - Optional Ollama fallback (LLM_PROVIDER=ollama)                               |
|   - Streaming SSE tokens, 1x Retry, Fast Connect Timeouts, Call Latency Logging  |
+-----------------------------------------------------------------------------------+
                                     |
                                     v
                 +---------------------------------------+
                 |    LOCAL LLM SERVER (Host Machine)    |
                 |     Unsloth / llama.cpp / Ollama      |
                 |     Gemma 4 / Qwen / Mistral          |
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
All 23 agent, gateway, RAG, and API tests pass in under 5 seconds.

### 5. Running via Docker Compose
To run both backend and frontend inside containers (while connecting to your local Unsloth LLM running on the host):
```powershell
docker compose up --build
```
`host.docker.internal` is mapped so Docker containers communicate directly with your host machine's LLM server at port 8000.

---

## API Reference

All new API routes use the `/api` prefix and validate payloads with Pydantic:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend status and LLM gateway reachability |
| `GET` | `/api/subjects` | List available subjects and topics |
| `POST` | `/api/tutor/chat` | Stream tutor responses via Server-Sent Events (SSE) with source citations and hint levels |
| `POST` | `/api/practice/generate` | Generate validated MCQs (`{subject, topic, difficulty, count}`) with fallback |
| `POST` | `/api/practice/submit` | Grade MCQ in code, record attempt, match misconceptions, and update topic mastery |
| `GET` | `/api/progress` | Get topic mastery, weakest topics, recent attempts, and next recommended study topic |
| `POST` | `/ask` | Backward-compatible legacy endpoint returning `{success, topic, type, response, citations}` |

### Client Identification (`X-User-Id`)
The frontend automatically generates and persists a unique client identifier (`user_<random>`) in browser `localStorage`. It passes this in the `X-User-Id` HTTP header, allowing multi-user chat sessions, separate attempt histories, and individual mastery tracking in SQLite.

---

## Verification & Test Results

- **Unit & Integration Tests**: 23/23 tests passing (`tests/`).
- **Benchmark Evaluation**: 20/20 questions evaluated, 90% citation correctness, 0% hallucination rate (`eval/run_eval.py`).
- **Frontend Build**: Vite production build bundles with zero errors (`npm run build`).
- **Resilience**: Full backward-compatibility and offline fallback verified across all routes.

## Student learning experience additions

- **Class-wise syllabus:** Classes 1–10 with subject/topic outlines in `src/data/curriculum.js`.
- **Learning Path:** Select a class and subject, then mark learning steps complete. Progress is saved in browser local storage.
- **Library:** Search and filter class-specific topic resources (study-note prompts, chapter guides, practice sets and tutor-led video lesson prompts).
- **Themes:** Switch between light and dark mode from the top bar or Settings. The choice is saved on the current device.

The curriculum is a broad, CBSE-style learning guide and is not a substitute for the student's current school/board syllabus or prescribed textbooks. Edit `src/data/curriculum.js` to match a particular board or school.
