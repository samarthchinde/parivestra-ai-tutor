# Authentication and Grade-Scoping Architecture Analysis (docs/auth-grades-analysis.md)

## 1. How Identity Works Today

### Current Implementation
- **Client Identity (`X-User-Id`)**:
  - The frontend client generates an anonymous random UUID `user_<hex>` and caches it in `localStorage.getItem("parivestra_user_id")` (`src/api/client.js`).
  - Every API request sends `X-User-Id: <uid>` in its HTTP headers.
- **Backend Resolution (`get_current_user` in `api.py`)**:
  - `api.py` checks the `X-User-Id` header.
  - If the user ID does not exist in SQLite `users`, it automatically auto-provisions a default user record: `name="Kid Explorer"`, `display_name="Kid Explorer"`, `avatar="owl"`, `grade="Class 3"`, `xp=0`, `streak=1`.
- **Onboarding Modal (`OnboardingModal.jsx`)**:
  - On first run (`localStorage.getItem("parivestra_onboarded") === null`), pops up a 3-step modal prompting for a display name (nickname), avatar, grade, and learning goal.
  - Saves locally to `localStorage` and calls `POST /api/user/profile`.
- **Admin Access (`ADMIN_KEY` / `X-Admin-Key`)**:
  - `ADMIN_KEY` is loaded from `.env` (default `parivestra_admin_secret`).
  - Sent via header `X-Admin-Key: <key>` on administrative endpoints (`/api/library/upload`, `/api/admin/approve`, `/api/courses/generate-draft`, `/api/teacher/workbooks/projects`).
- **Grown-ups Portal Gate (`GrownUps.jsx`)**:
  - A client-side gate checking a math challenge (`7 x 8 = 56`) or `POST /api/auth/grown-ups/verify` against a SHA256 `pin_hash` stored on the User row.

### Limitations of Current Model
1. **Zero Authentication**: Anyone with any string in `X-User-Id` can impersonate any student or read their progress.
2. **No Role Differentiation**: No concept of `student`, `teacher`, or `admin` in database records.
3. **No Central Session State**: No secure HTTP-only cookies, no token expiry, no brute-force defense, and no server-side grade permissions.

---

## 2. Grade-Specific Content & Per-User Data Audit

### A. Current Database Tables
| Table | Current Grade Support | Migration Requirement |
| :--- | :--- | :--- |
| `users` | Has `grade` (varchar) | Add `role`, `username`, `email`, `password_hash`, `default_grade`, `class_id`, `active`, `failed_attempts`, `locked_until`, `last_login_at`, `created_at` |
| `classes` | *New table needed* | Create: `id`, `name`, `grade`, `section`, `join_code`, `teacher_id`, `allow_grade_switch`, `allow_join_by_code`, `consent_confirmed`, `created_at` |
| `auth_sessions` | *New table needed* | Create: `id`, `user_id`, `token_hash`, `active_grade`, `expires_at`, `last_seen_at`, `device_label`, `created_at` |
| `audit_log` | *New table needed* | Create: `id`, `user_id`, `event`, `detail`, `ip`, `created_at` |
| `attempts` | **No grade column** | Add `grade` column (Class 3 to 10), backfill from question/user |
| `mastery` | **No grade column** | Add `grade` column, backfill from user/topic |
| `lesson_progress`| **No grade column** | Add `grade` column, backfill from course |
| `video_watches` | **No grade column** | Add `grade` column, backfill from video |
| `courses` | Has `grade` (varchar) | Retain & ensure index |
| `videos` | Has `grade` (varchar) | Retain & ensure index |
| `video_stories` | Has `grade` (varchar) | Retain & ensure index |
| `unit_progress` | Has `grade` (int 3-10) | Retain & ensure index |
| `activity_attempts`| Has `grade` (int 3-10) | Retain & ensure index |
| `workbook_reflections`| Has `grade` (int 3-10)| Retain & ensure index |
| `project_entries`| Has `grade` (int 3-10) | Retain & ensure index |
| `glossary_masteries`| Has `grade` (int 3-10)| Retain & ensure index |
| `workbook_certificates`| Has `grade` (int 3-10)| Retain & ensure index |

### B. Endpoints to be Scoped by Active Grade
- `GET /api/subjects`: Return only subjects available for the active grade.
- `GET /api/courses`: Scoped by `active_grade`.
- `GET /api/courses/{course_id}` & `GET /api/courses/{course_id}/lessons/{lesson_id}`: Enforce grade boundary; return 403 or friendly error if from another grade.
- `GET /api/courses/progress`: Scoped by `active_grade`.
- `POST /api/tutor/chat`: Scope BM25 retrieval and reading level by `active_grade`.
- `POST /api/practice/generate`: Generate questions matching active grade curriculum.
- `POST /api/practice/submit`: Stamp attempt with `active_grade`.
- `GET /api/videos`: Filter videos by `active_grade`.
- `GET /api/progress`: Filter scorecards, attempts, masteries, and XP by `active_grade`.
- `GET /api/report-card?grade=`: **New endpoint** returning subject averages, mastery, completed lessons, workbook units, stars, and recent activity for the requested grade.
- `GET /api/workbook/{grade}`: Ensure `grade` matches `active_grade` unless allowed to switch.

---

## 3. Frontend Pages & Grade Context Plan

Every page must consume the active grade from a unified `GradeContext` and reflect changes immediately without page reload:
1. **`Dashboard` (Home)**: Displays active grade banner, mascot, current subject cards, workbook unit progress, and recent achievements for that grade.
2. **`GradeSelector` (Login & Modal)**: 8 big interactive tiles (Class 3 to 10) with edition titles, theme colors, and mascot preview.
3. **`Courses` & `CourseDetail` & `LessonPlayer`**: Lists only courses of active grade.
4. **`Subjects`**: Shows syllabus subjects for the grade:
   - *Junior (3–5)*: Maths, English, EVS, AI & Future Skills
   - *Middle (6–8)*: Maths, English, Science, Social Science, AI & Future Skills
   - *Senior (9–10)*: Maths, English, Science, Social Science, AI & Future Skills
5. **`AI Tutor`**: Scoped to the active grade; switches conversation on grade change.
6. **`Practice`**: Generates and serves quizzes for active grade.
7. **`Games`**: Bug Hunt, Math Sprint, and Word Match tailored to grade vocabulary and math facts.
8. **`Videos`**: Filtered to active grade.
9. **`Library`**: Resources tagged for active grade or "All Grades".
10. **`LearningPath`**: Milestones for active grade.
11. **`Progress`**: Stats, mastery bars, and streaks for active grade.
12. **`WorkbookHome`, `WorkbookUnit`, `WordBank`, `CertificateView`, `FinalProjectView`**: Dedicated to active grade.
13. **`ReportCard` (New Page)**: Printable summary of student performance across all subjects in the active grade.

---

## 4. Risks & Mitigations

| Risk | Mitigation |
| :--- | :--- |
| **Breaking Existing 46 Tests** | Implement `AUTH_REQUIRED=false` support for backward compatibility in dev/test, and provide seamless session support in test fixtures. |
| **Cross-Grade Data Leakage** | Enforce grade isolation at the server query level (`db.query().filter(Model.grade == active_grade)`) rather than client-side filtering. |
| **PIN Brute-Force Attacks** | Enforce 5-minute lockout after 5 consecutive failed attempts; rate-limit by IP and username; generic error response. |
| **Plain-Text Secret Leakage** | Use `bcrypt` / `argon2` for one-way salted hashing. Never log secrets or request payloads. |
| **Child Privacy Violation (COPPA/GDPR-K)** | Students use nicknames and PINs/passwords only. Zero emails, phones, or biometric data collected. |

---

## 5. File-by-File Plan

### Add
- `backend/auth/security.py`: Password/PIN hashing (`bcrypt`), CSRF protection, session token generation.
- `backend/auth/service.py`: User authentication, session management, lockout tracking, audit logging.
- `backend/routes/auth_router.py`: Auth endpoints (`/login`, `/logout`, `/me`, `/guest`, `/switch-grade`, `/join-class`, admin/teacher student management).
- `scripts/create_admin.py`: Bootstrap initial administrator account.
- `scripts/seed_demo_accounts.py`: Seed demo teacher and student accounts for Grades 3 to 10 with printed one-time credentials.
- `src/context/AuthContext.jsx`: Provides authenticated user, role, login/logout methods, session timeouts.
- `src/context/GradeContext.jsx`: Provides active grade, available grades, switching rules, and grade metadata.
- `src/components/GradeGrid.jsx`: 8-tile interactive grade selector for login and topbar modal.
- `src/components/ProtectedRoute.jsx`: Enforces authentication and role permissions on routes.
- `src/pages/Login.jsx`: Child-friendly login page with PIN pad for 3-5, password for 6-10, teacher login tab, guest mode, and class code join.
- `src/pages/ReportCard.jsx`: Comprehensive grade report card with subject metrics, print-ready layout.
- `tests/test_auth_and_grades.py`: Comprehensive test suite for auth flows, session timeouts, lockout, role enforcement, and grade isolation.

### Modify
- `backend/models.py`: Add `role`, `username`, `password_hash`, etc. to `User`. Add `Class`, `AuthSession`, `AuditLog`. Add `grade` column to `Attempt`, `Mastery`, `LessonProgress`, `VideoWatch`.
- `backend/database.py`: Include SQLite migration helper to safely add columns to existing tables without data loss.
- `backend/config.py`: Add `AUTH_REQUIRED`, `SECRET_KEY`, `SESSION_HOURS`, `SESSION_IDLE_MINUTES`.
- `api.py`: Mount `auth_router`, replace `get_current_user` with session-based resolver, implement `get_active_grade`, add `/api/report-card`, scope all query endpoints by `active_grade`.
- `backend/routes/workbook_router.py`: Use `get_active_grade` and authenticated user.
- `src/api/client.js`: Support credentialed requests (`credentials: "include"`), CSRF token header, auth endpoints, report card endpoint.
- `src/App.jsx`: Integrate `AuthProvider`, `GradeProvider`, register `/login` and `/report-card` routes, wrap protected routes.
- `src/components/AppLayout.jsx`: Add Grade chip, Grade modal, Logout button, idle timeout prompt, role-filtered navigation.
- `src/pages/GrownUps.jsx`: Embed teacher & admin management (classes, students, bulk CSV, secret reset, login cards).
- `src/pages/Subjects.jsx`: Scoped dynamically by active grade.
- `src/pages/Dashboard.jsx`, `Tutor.jsx`, `Practice.jsx`, `Courses.jsx`, `Progress.jsx`, `Videos.jsx`, `Games.jsx`: Connect to `GradeContext`.

### Do Not Touch
- `backend/llm/gateway.py` (Local LLM connectivity & prompt handling)
- `backend/rag/retriever.py` (BM25 search engine core logic)
- `src/components/Mascot.jsx` (Vector SVG Pari robot mascot)
- `knowledge_base/*` (Existing curriculum data & workbooks)
