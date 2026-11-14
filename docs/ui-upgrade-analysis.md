# UI Upgrade & Kids Learning Platform (Class 3-4) Analysis

## 1. Executive Summary & Goal
Upgrade the existing Parivestra AI Tutor application into a delightful, child-safe, premium learning experience tailored for Class 3 and Class 4 students (ages 8 to 10). The platform shifts primary subject focus to Maths, English, and Environmental Studies (EVS), introduces an original animated SVG mascot ("Pari"), and adds two major new sections: **Courses** (modular interactive lessons with draft approval workflow) and **AI Videos** (interactive SVG story explainers and local video streaming).

---

## 2. Comprehensive Inventory of Current Application

### (a) Existing Routes and Pages
| Route | Page File | Current Role & Implementation |
|---|---|---|
| `/` | `src/pages/Dashboard.jsx` | Welcome banner, recommendation summary, 3 quick cards ("Continue learning", "Ask your tutor", "Track your goals"), curriculum mastery progress bar. Reads from `/api/progress` with fallback to IndexedDB. |
| `/tutor` | `src/pages/Tutor.jsx` | Interactive concept tutor with SSE streaming (`/api/tutor/chat`), hint ladder (nudge, clue, worked step), verified citations, offline fallback, and small-talk greeting handling. |
| `/learning-path`| `src/pages/LearningPath.jsx` | Placeholder page stating "Your roadmap: Learning path module placeholder". |
| `/subjects` | `src/pages/Subjects.jsx` | Placeholder page listing subject library. |
| `/practice` | `src/pages/Practice.jsx` | 63 bundled offline MCQs + dynamic question generation via `/api/practice/generate`, immediate grading via `/api/practice/submit`, IndexedDB and backend progress persistence. |
| `/progress` | `src/pages/Progress.jsx` | Displays assessment history, accuracy, score breakdown, weakest topic detection from `/api/progress` and IndexedDB. |
| `/resources` | `src/pages/Resources.jsx` | Placeholder for resource library. |
| `/settings` | `src/pages/Settings.jsx` | Placeholder for settings and preferences. |
| `*` | `src/App.jsx` | Redirects to `/`. |

### (b) Components and Styling Approach
- **Global Styling**: `src/styles.css` uses plain CSS with reset, fonts (`DM Sans`, `Manrope` imported via Google Fonts CDN - to be self-hosted/replaced with `Baloo 2`, `Nunito`, `Lexend`), `.app-shell`, `.sidebar`, `.topbar`, `.card`, `.primary-button`, `.hero`, `.grid`.
- **Reusable UI Elements**: `src/components/UI.jsx` exposes `PageHeader`, `Card`, `PrimaryButton`, `ProgressBar`.
- **Layout**: `src/components/AppLayout.jsx` contains fixed left sidebar with navigation links, topbar with active user chip (hardcoded "Alex Morgan"), and LLM health indicator badge with 10-second polling.
- **Assessment CSS**: `src/assessment/assessment.css` contains card styles for question prompts, radio choices, feedback alerts, and result tables.

### (c) Existing vs Missing Features
- **Existing**:
  - Full LLM Gateway with OpenAI-compatible protocol (`127.0.0.1:8000/v1` for Gemma 4).
  - Multi-agent architecture (`RouterAgent`, `TutorAgent`, `PracticeAgent`, `GraderAgent`, `MisconceptionAgent`, `ProgressAgent`).
  - RAG Retrieval using BM25 over markdown and json chunks in `knowledge_base/`.
  - Tutor chat with SSE streaming, hint ladder, source citations, and clean offline mode.
  - Practice quiz generation, question validation, and grading pipeline.
  - Health check endpoint with real 5-token completion probe and error classification.
- **Missing / Needs Upgrade**:
  - Target audience suitability: currently adult/college-oriented (Python, AI, ML, Networks, Java) instead of Class 3-4 (Maths, English, EVS).
  - Mascot & Delight: No mascot ("Pari"), no sound toggle, no cheerful micro-animations, no confetti, hardcoded corporate fonts and colors.
  - Onboarding & Identity: Hardcoded "Alex Morgan" instead of friendly child onboarding (nickname, avatar selection, class/grade picker).
  - Navigation & Layout: Needs Courses, AI Videos, Games, Grown-ups area with PIN protection, responsive bottom bar on mobile.
  - Courses section: Course modules, lessons (story, video, practice, activity), XP rewards, course progress, draft teacher-review workflow.
  - AI Videos section: Local animated SVG story lesson player with text-to-speech, local video library with HTTP Range streaming.
  - Child Safety: Reading level verification (< 12 words per sentence), safety filters, sensitive sentiment detector (redirect to trusted grown-up).

### (d) Existing API Endpoints
- `GET /` - Root status
- `GET /api/health` - Backend and LLM health check with live probe
- `GET /api/subjects` - List subjects and topics
- `POST /api/tutor/chat` - SSE streaming endpoint for interactive concept tutoring
- `POST /api/practice/generate` - Generate MCQs with topic, count, difficulty
- `POST /api/practice/submit` - Grade selected MCQ option, update mastery, detect misconception
- `GET /api/progress` - Mastery summary, weak topics, and recommendations
- `POST /ask` - Legacy backward-compatibility endpoint

### (e) Existing Database Tables (`parivestra.db`)
1. `users` (id, name, created_at)
2. `sessions` (id, user_id, title, created_at)
3. `messages` (id, session_id, role, content, metadata_json, created_at)
4. `attempts` (id, user_id, subject, topic, difficulty, question_id, selected, correct, hints_used, time_taken, misconception_id, created_at)
5. `mastery` (id, user_id, subject, topic, score, attempts, updated_at)
6. `llm_logs` (id, model, latency_ms, prompt_tokens, completion_tokens, success, error_message, created_at)

---

## 3. Risks & Safeguards
1. **Breaking Existing Endpoints & Tests**:
   - *Risk*: Modifying database schemas or agent interfaces could break the 31 existing tests.
   - *Mitigation*: Use safe column additions with default values on `users` (`display_name`, `avatar`, `grade`, `pin_hash`); keep all existing route signatures and response shapes intact.
2. **Offline Resilience**:
   - *Risk*: Network drops or LLM offline status shouldn't crash the child's session.
   - *Mitigation*: Ensure Courses, Games, Videos, and Tutor have instantaneous offline fallbacks, pre-seeded sample data, and speech synthesis fallbacks.
3. **Child Privacy & Safety**:
   - *Risk*: Children typing sensitive personal info or LLM outputting complex or inappropriate content.
   - *Mitigation*: Client-side avatars only (no photos/emails); backend content filter rejecting unsafe inputs; simplified sentences (< 12 words); sensitive flags recorded for teacher review without storing the child's raw text.
4. **Performance & Asset Loading**:
   - *Risk*: Slow load times or broken external CDNs.
   - *Mitigation*: Self-host all SVG assets and fonts, avoid Google Fonts CDN at runtime, ensure zero third-party tracking scripts.

---

## 4. File-by-File Upgrade Plan

### Files to MODIFY:
1. `package.json`: Add `canvas-confetti`, `@fontsource/baloo-2`, `@fontsource/nunito`, `@fontsource/lexend` (if required or bundled lightweight CSS).
2. `src/styles.css`: Incorporate design tokens, high-contrast kid-friendly palette, Baloo 2 and Nunito font stacks, card curves, button springs.
3. `src/components/UI.jsx`: Enhance `PageHeader`, `Card`, `PrimaryButton`, `ProgressBar`; add `Badge`, `StarRating`, `ProgressRing`, `XPChip`, `SubjectTile`, `Modal`, `Toast`, `EmptyState`, `Mascot`.
4. `src/components/AppLayout.jsx`: Add Pari mascot status ("Pari is awake / resting"), user avatar & nickname header, XP & streak chips, responsive mobile bottom bar, link to Grown-ups area.
5. `src/data/navigation.js`: Update nav items to: Home, Courses, AI Tutor, Practice, Games, AI Videos, Learning Path, Library, Progress, Grown-ups.
6. `src/App.jsx`: Add routes for Courses (`/courses`, `/courses/:id`, `/courses/:id/lessons/:lessonId`), AI Videos (`/videos`), Games (`/games`), Grown-ups (`/grown-ups`), and rename Resources to Library (`/library`).
7. `src/api/client.js`: Add API methods for Courses, Lessons completion, Videos, Video Stories, Admin management, and User profile persistence.
8. `src/pages/Dashboard.jsx`: Transform to "Today's Adventure" with Pari greeting, daily goal ring, streak flame, subject tiles (Maths, English, EVS), badge shelf.
9. `src/pages/Tutor.jsx`: Add child-friendly interface, "Read it to me" SpeechSynthesis, quick question chips, 3 lightbulb hint buttons, Pari emotional reactions.
10. `src/pages/Practice.jsx`: Single question per screen, big touch buttons, cheering Pari, star rating, 5-question rounds.
11. `src/pages/LearningPath.jsx`: Winding illustrated adventure roadmap with glowing current level and locked milestone gates.
12. `src/pages/Progress.jsx`: Transform into a visual garden / badge shelf with 12 collectible badges, streak calendar, progress rings (no demotivating percentages).
13. `src/pages/Resources.jsx`: Rebrand to Library with big colorful cards, search, subject filters for Class 3-4.
14. `src/pages/Settings.jsx` -> Replaced/Redirected to Grown-ups portal.
15. `backend/models.py`: Add `display_name`, `avatar`, `grade`, `pin_hash` to `User`; add `Course`, `CourseModule`, `CourseLesson`, `LessonProgress`, `Video`, `VideoWatch`, `VideoStory`, `SafetyIncident`.
16. `backend/database.py`: Safe migration function to alter existing SQLite schema without dropping tables.
17. `backend/rag/retriever.py`: Support recursive indexing of `knowledge_base/grade3_4/` and filtering by grade and subject.
18. `backend/agents/tutor_agent.py`: Implement Class 3-4 system prompt, readability check (avg sentence < 12 words), child safety filter, and sensitive situation escalation.
19. `api.py`: Add course endpoints, lesson completion, video stream with HTTP Range, story generator, admin endpoints protected by `X-Admin-Key`.
20. `README.md` & `.env.example`: Document new features, Grown-ups PIN, and operational steps.

### Files to ADD:
1. `src/styles/tokens.css`: Design variables for colors, typography, border-radii, elevation, and animation easing.
2. `src/components/Mascot.jsx`: Original SVG Pari mascot with emotional states (`happy`, `thinking`, `cheering`, `sleepy`, `oops`) and CSS animations.
3. `src/components/OnboardingModal.jsx`: 3-step first-run onboarding (Nickname, Avatar selection from 12 SVG characters, Grade 3/4).
4. `src/pages/Courses.jsx`: Course catalog shelves grouped by Maths, English, EVS.
5. `src/pages/CourseDetail.jsx`: Course syllabus with modules, lessons, and progress ticks.
6. `src/pages/LessonPlayer.jsx`: Multi-modal lesson player for story lessons (with TTS), practice rounds, video players, and offline activity cards.
7. `src/pages/Games.jsx`: Kid-friendly game arena hosting "Number Ninja" (Maths) and "Word Builder" (English) alongside Bug Hunt.
8. `src/pages/Videos.jsx`: Cinema grid displaying animated SVG story lessons and uploaded educational videos.
9. `src/pages/StoryPlayer.jsx`: Interactive SVG scene player with narration, synchronized captions, illustration assets, and mini-quiz.
10. `src/pages/GrownUps.jsx`: Protected portal with PIN/Math challenge, admin key input, model diagnostics, draft approval queue, course/video manager, profile reset.
11. `backend/video/provider.py`: `VideoProvider` abstraction and `StoryPlayerProvider`.
12. `knowledge_base/grade3_4/maths_class3_4.md`: High-quality foundational math concepts.
13. `knowledge_base/grade3_4/english_class3_4.md`: Foundational grammar and vocabulary concepts.
14. `knowledge_base/grade3_4/evs_class3_4.md`: Science and environmental concepts.
15. `tests/test_kids_platform_and_safety.py`: Tests for courses, lessons, video range streaming, reading level, safety filters, and role permissions.

### Files to NOT TOUCH:
- `backend/llm/gateway.py` (working OpenAI-compatible local model gateway)
- `scripts/start-llm.ps1` (working model launcher for llama-server)
- `backend/agents/grader_agent.py`, `misconception_agent.py`, `router_agent.py`, `progress_agent.py` (preserve core agent interfaces)
- `src/assessment/progressStorage.js` (preserve backward-compatible IndexedDB schema)
- `tests/test_api.py`, `test_gateway.py`, `test_grader.py`, `test_llm_connection_and_offline.py`, `test_practice_validation.py`, `test_progress.py`, `test_retriever.py`, `test_router.py` (ensure existing regression tests stay untouched and pass)

