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

