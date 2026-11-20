/**
 * Parivestra AI Tutor API Client
 * Manages API communication, SSE streaming, user persistence, courses, videos and grown-ups auth.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";

export function getUserId() {
  let uid = localStorage.getItem("parivestra_user_id");
  if (!uid) {
    uid = `user_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem("parivestra_user_id", uid);
  }
  return uid;
}

export function getAdminKey() {
  return localStorage.getItem("parivestra_admin_key") || "parivestra_admin_secret";
}

function getHeaders(contentType = "application/json", includeAdmin = false) {
  const headers = {
    "X-User-Id": getUserId(),
  };
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  if (includeAdmin) {
    headers["X-Admin-Key"] = getAdminKey();
  }
  return headers;
}

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return { status: "offline", error: err.message };
  }
}

export async function getUserProfile() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      display_name: localStorage.getItem("parivestra_display_name") || "Explorer",
      avatar: localStorage.getItem("parivestra_avatar") || "owl",
      grade: localStorage.getItem("parivestra_grade") || "Class 3",
      xp: 0,
      streak: 1,
    };
  }
}

export async function updateUserProfile(payload) {
  const res = await fetch(`${API_BASE_URL}/api/user/profile`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function resetUserProfile() {
  const res = await fetch(`${API_BASE_URL}/api/user/reset`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function verifyGrownUpsPin({ pin, answer }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/grown-ups/verify`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ pin, answer }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function setGrownUpsPin(pin) {
  const res = await fetch(`${API_BASE_URL}/api/auth/grown-ups/set-pin`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getSubjects() {
  const res = await fetch(`${API_BASE_URL}/api/subjects`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getProgressSummary() {
  const res = await fetch(`${API_BASE_URL}/api/progress`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function generatePracticeQuestions({ subject, topic, difficulty, count = 5, grade }) {
  const res = await fetch(`${API_BASE_URL}/api/practice/generate`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ subject, topic, difficulty, count, grade }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function submitPracticeAnswer(payload) {
  const res = await fetch(`${API_BASE_URL}/api/practice/submit`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getCourses(grade) {
  const url = grade ? `${API_BASE_URL}/api/courses?grade=${encodeURIComponent(grade)}` : `${API_BASE_URL}/api/courses`;
  const res = await fetch(url, {
    method: "GET",
    headers: getHeaders("application/json", true),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getCourseDetail(courseId) {
  const res = await fetch(`${API_BASE_URL}/api/courses/${courseId}`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getLessonContent(courseId, lessonId) {
  const res = await fetch(`${API_BASE_URL}/api/courses/${courseId}/lessons/${lessonId}`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function completeLesson(courseId, lessonId, score = 100) {
  const res = await fetch(`${API_BASE_URL}/api/courses/${courseId}/lessons/${lessonId}/complete`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ score }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getVideos(grade, subject) {
  let url = `${API_BASE_URL}/api/videos?`;
  if (grade) url += `grade=${encodeURIComponent(grade)}&`;
  if (subject) url += `subject=${encodeURIComponent(subject)}&`;
  const res = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getStoryDetail(storyId) {
  const res = await fetch(`${API_BASE_URL}/api/videos/story/${storyId}`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function generateStory({ topic, grade, subject }) {
  const res = await fetch(`${API_BASE_URL}/api/videos/story/generate`, {
    method: "POST",
    headers: getHeaders("application/json", true),
    body: JSON.stringify({ topic, grade, subject }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function generateCourseDraft({ subject, grade, topic }) {
  const res = await fetch(`${API_BASE_URL}/api/courses/generate-draft`, {
    method: "POST",
    headers: getHeaders("application/json", true),
    body: JSON.stringify({ subject, grade, topic }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getAdminQueue() {
  const res = await fetch(`${API_BASE_URL}/api/admin/queue`, {
    method: "GET",
    headers: getHeaders("application/json", true),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function uploadVideo(formData, adminKey = "") {
  const key = adminKey || localStorage.getItem("parivestra_admin_key") || "";
  const headers = {};
  if (key) {
    headers["X-Admin-Key"] = key;
  }
  const res = await fetch(`${API_BASE_URL}/api/videos/upload`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload failed: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function approveContent(item_type, item_id) {
  const res = await fetch(`${API_BASE_URL}/api/admin/approve`, {
    method: "POST",
    headers: getHeaders("application/json", true),
    body: JSON.stringify({ item_type, item_id }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function streamTutorChat({
  sessionId,
  message,
  subject = "Maths",
  topic = null,
  grade = "Class 3",
  hintLevel = 0,
  onToken,
  onDone,
  onError,
}) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tutor/chat`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        session_id: sessionId,
        message,
        subject,
        topic,
        grade,
        hint_level: hintLevel,
      }),
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop();

      for (const block of lines) {
        const line = block.trim();
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.type === "token") {
              if (onToken) onToken(data.token);
            } else if (data.type === "done") {
              if (onDone) onDone(data);
            }
          } catch (e) {
            console.error("Failed to parse SSE line:", line, e);
          }
        }
      }
    }
  } catch (err) {
    console.error("Tutor chat stream error:", err);
    if (onError) onError(err);
  }
}

export async function getCurriculum(board = "CBSE", grade = "Class 3", subject = "Maths") {
  const res = await fetch(
    `${API_BASE_URL}/api/curriculum/${encodeURIComponent(board)}/${encodeURIComponent(grade)}/${encodeURIComponent(subject)}`,
    { headers: getHeaders() }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getCoursesCoverage(grade, subject) {
  let url = `${API_BASE_URL}/api/courses/coverage`;
  const params = new URLSearchParams();
  if (grade) params.append("grade", grade);
  if (subject) params.append("subject", subject);
  if (params.toString()) url += `?${params.toString()}`;

  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function generateCourseModuleDraft(courseId, moduleId) {
  const res = await fetch(`${API_BASE_URL}/api/courses/${courseId}/modules/${moduleId}/generate`, {
    method: "POST",
    headers: getHeaders("application/json", true),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function uploadLibraryResource(formData) {
  const headers = getHeaders("", true);
  delete headers["Content-Type"];
  const res = await fetch(`${API_BASE_URL}/api/library/upload`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed: HTTP ${res.status}`);
  }
  return await res.json();
}

// ---------------------------------------------------------
// PARIVESTRA AI WORKBOOKS API CLIENT METHODS
// ---------------------------------------------------------
export async function getWorkbook(grade = 3) {
  const gNum = parseInt(String(grade).replace(/\D/g, "") || "3", 10);
  const res = await fetch(`${API_BASE_URL}/api/workbook/${gNum}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getWorkbookUnit(grade = 3, unitNumber = 1) {
  const gNum = parseInt(String(grade).replace(/\D/g, "") || "3", 10);
  const res = await fetch(`${API_BASE_URL}/api/workbook/${gNum}/units/${unitNumber}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function checkWorkbookActivity(grade, activityId, answer) {
  const gNum = parseInt(String(grade).replace(/\D/g, "") || "3", 10);
  const res = await fetch(`${API_BASE_URL}/api/workbook/${gNum}/activities/${activityId}/check`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ answer }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function submitWorkbookSelfCheck(grade, unitNumber, stars) {
  const gNum = parseInt(String(grade).replace(/\D/g, "") || "3", 10);
  const res = await fetch(`${API_BASE_URL}/api/workbook/${gNum}/self-check`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ unit_number: unitNumber, stars }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function submitWorkbookReflection(grade, unitNumber, reflectionText) {
  const gNum = parseInt(String(grade).replace(/\D/g, "") || "3", 10);
  const res = await fetch(`${API_BASE_URL}/api/workbook/${gNum}/reflection`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ unit_number: unitNumber, reflection_text: reflectionText }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getWorkbookProject(grade = 3) {
  const gNum = parseInt(String(grade).replace(/\D/g, "") || "3", 10);
  const res = await fetch(`${API_BASE_URL}/api/workbook/${gNum}/project`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function saveWorkbookProject(grade, fields) {
  const gNum = parseInt(String(grade).replace(/\D/g, "") || "3", 10);
  const res = await fetch(`${API_BASE_URL}/api/workbook/${gNum}/project`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function submitWorkbookProject(grade, fields) {
  const gNum = parseInt(String(grade).replace(/\D/g, "") || "3", 10);
  const res = await fetch(`${API_BASE_URL}/api/workbook/${gNum}/project/submit`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getWorkbookGlossary(grade = 3) {
  const gNum = parseInt(String(grade).replace(/\D/g, "") || "3", 10);
  const res = await fetch(`${API_BASE_URL}/api/glossary?grade=${gNum}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function updateWorkbookGlossary(grade, term, mastered) {
  const gNum = parseInt(String(grade).replace(/\D/g, "") || "3", 10);
  const res = await fetch(`${API_BASE_URL}/api/glossary`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ grade: gNum, term, mastered }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getWorkbookCertificates(grade = null) {
  let url = `${API_BASE_URL}/api/certificates`;
  if (grade) {
    const gNum = parseInt(String(grade).replace(/\D/g, "") || "3", 10);
    url += `?grade=${gNum}`;
  }
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function issueWorkbookCertificate(grade, studentName, schoolName = "Parivestra School") {
  const gNum = parseInt(String(grade).replace(/\D/g, "") || "3", 10);
  const res = await fetch(`${API_BASE_URL}/api/certificates`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ grade: gNum, student_name: studentName, school_name: schoolName }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getTeacherWorkbookProjects() {
  const res = await fetch(`${API_BASE_URL}/api/teacher/workbooks/projects`, {
    headers: getHeaders("application/json", true),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function reviewTeacherWorkbookProject(projectId, score, feedback) {
  const res = await fetch(`${API_BASE_URL}/api/teacher/workbooks/projects/${projectId}/review`, {
    method: "POST",
    headers: getHeaders("application/json", true),
    body: JSON.stringify({ score, feedback }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getWorkbookPacing() {
  const res = await fetch(`${API_BASE_URL}/api/teacher/workbooks/pacing`, {
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

// ========================================================
// Authentication & Grade-Scoping APIs
// ========================================================
export async function loginUser({ username, email, secret, grade }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify({ username, email, secret, grade }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Login failed (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function logoutUser() {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: getHeaders(),
      credentials: "include",
    });
  } catch (err) {
    console.warn("Logout error:", err);
  }
}

export async function getAuthMe() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: getHeaders(),
      credentials: "include",
    });
    if (res.status === 401) {
      // Treat 401 on /me as "not signed in", not as an error
      return { status: "unauthenticated", user: null };
    }
    if (!res.ok) {
      return { status: "unauthenticated", user: null };
    }
    return await res.json();
  } catch (err) {
    return { status: "unauthenticated", user: null };
  }
}

export async function loginGuest(grade = "Class 3") {
  const res = await fetch(`${API_BASE_URL}/api/auth/guest`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify({ grade }),
  });
  if (!res.ok) throw new Error(`Guest session failed (HTTP ${res.status})`);
  return await res.json();
}

export async function switchGradeApi(grade) {
  const res = await fetch(`${API_BASE_URL}/api/auth/switch-grade`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify({ grade }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Grade switch failed (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function joinClassByCodeApi({ code, username, secret, display_name, avatar }) {
  const res = await fetch(`${API_BASE_URL}/api/auth/join-class`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify({ code, username, secret, display_name, avatar }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Class join failed (HTTP ${res.status})`);
  }
  return await res.json();
}

// ========================================================
// Report Card API
// ========================================================
export async function getReportCard(grade) {
  const url = grade ? `${API_BASE_URL}/api/report-card?grade=${encodeURIComponent(grade)}` : `${API_BASE_URL}/api/report-card`;
  const res = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Report card failed (HTTP ${res.status})`);
  return await res.json();
}

// ========================================================
// Teacher & Admin Management APIs
// ========================================================
export async function createTeacherClass(payload) {
  const res = await fetch(`${API_BASE_URL}/api/auth/teacher/classes`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Create class failed (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function getTeacherClasses() {
  const res = await fetch(`${API_BASE_URL}/api/auth/teacher/classes`, {
    method: "GET",
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Fetch classes failed (HTTP ${res.status})`);
  return await res.json();
}

export async function getTeacherStudents(classId = null) {
  const url = classId
    ? `${API_BASE_URL}/api/auth/teacher/students?class_id=${encodeURIComponent(classId)}`
    : `${API_BASE_URL}/api/auth/teacher/students`;
  const res = await fetch(url, {
    method: "GET",
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Fetch students failed (HTTP ${res.status})`);
  return await res.json();
}

export async function updateClassSettings(classId, payload) {
  const res = await fetch(`${API_BASE_URL}/api/auth/teacher/classes/${classId}`, {
    method: "PUT",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Update class failed (HTTP ${res.status})`);
  return await res.json();
}

export async function createTeacherStudent(payload) {
  const res = await fetch(`${API_BASE_URL}/api/auth/teacher/students`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Create student failed (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function bulkImportStudentsApi(csvText) {
  const res = await fetch(`${API_BASE_URL}/api/auth/teacher/students/bulk`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify({ csv_text: csvText }),
  });
  if (!res.ok) throw new Error(`Bulk import failed (HTTP ${res.status})`);
  return await res.json();
}

export async function resetStudentSecretApi(studentId, newSecret = null) {
  const res = await fetch(`${API_BASE_URL}/api/auth/teacher/students/${studentId}/reset-secret`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify({ new_secret: newSecret }),
  });
  if (!res.ok) throw new Error(`Reset secret failed (HTTP ${res.status})`);
  return await res.json();
}

export async function getClassLoginCards(classId) {
  const res = await fetch(`${API_BASE_URL}/api/auth/teacher/classes/${classId}/login-cards`, {
    method: "GET",
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Login cards failed (HTTP ${res.status})`);
  return await res.json();
}

// ========================================================
// Multi-Role Self-Registration & Parent Portal APIs
// ========================================================
export async function checkUsernameAvailableApi(username) {
  const res = await fetch(`${API_BASE_URL}/api/auth/username-available?username=${encodeURIComponent(username)}`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { available: false, reason: err.detail || `HTTP ${res.status}` };
  }
  return await res.json();
}

export async function registerStudentApi(payload) {
  const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Registration failed (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function registerTeacherApi(payload) {
  const res = await fetch(`${API_BASE_URL}/api/auth/register-teacher`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Teacher registration failed (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function registerParentApi(payload) {
  const res = await fetch(`${API_BASE_URL}/api/auth/register-parent`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Parent registration failed (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function linkChildApi({ child_username, link_code }) {
  const res = await fetch(`${API_BASE_URL}/api/parent/link-child`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify({ child_username, link_code }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Linking child failed (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function getParentChildrenApi() {
  const res = await fetch(`${API_BASE_URL}/api/parent/children`, {
    method: "GET",
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Could not load children (HTTP ${res.status})`);
  return await res.json();
}

export async function getParentChildReportCardApi(childId) {
  const res = await fetch(`${API_BASE_URL}/api/parent/children/${encodeURIComponent(childId)}/report-card`, {
    method: "GET",
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Could not load report card (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function getParentChildProgressApi(childId) {
  const res = await fetch(`${API_BASE_URL}/api/parent/children/${encodeURIComponent(childId)}/progress`, {
    method: "GET",
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Could not load progress (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function createTeacherLinkCodeApi(studentId) {
  const res = await fetch(`${API_BASE_URL}/api/teacher/link-codes`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify({ student_id: studentId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Link code generation failed (HTTP ${res.status})`);
  }
  return await res.json();
}

export async function getTeacherLinkCodesApi() {
  const res = await fetch(`${API_BASE_URL}/api/teacher/link-codes`, {
    method: "GET",
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Could not load link codes (HTTP ${res.status})`);
  return await res.json();
}

export async function getTeacherUnassignedStudentsApi() {
  const res = await fetch(`${API_BASE_URL}/api/teacher/unassigned-students`, {
    method: "GET",
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Could not load unassigned students (HTTP ${res.status})`);
  return await res.json();
}

export async function getTeacherAuthSettingsApi() {
  const res = await fetch(`${API_BASE_URL}/api/teacher/settings`, {
    method: "GET",
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Could not load auth settings (HTTP ${res.status})`);
  return await res.json();
}

export async function updateTeacherAuthSettingsApi(payload) {
  const res = await fetch(`${API_BASE_URL}/api/teacher/settings`, {
    method: "POST",
    headers: getHeaders(),
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Could not update settings (HTTP ${res.status})`);
  return await res.json();
}



