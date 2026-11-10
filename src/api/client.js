/**
 * Parivestra AI Tutor API Client
 * Manages API communication, SSE streaming, user persistence, and fallback detection.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";

/**
 * Retrieve or generate persistent user ID for session tracking.
 */
export function getUserId() {
  let uid = localStorage.getItem("parivestra_user_id");
  if (!uid) {
    uid = `user_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem("parivestra_user_id", uid);
  }
  return uid;
}

/**
 * Retrieve or store admin access key.
 */
export function getAdminKey() {
  return localStorage.getItem("parivestra_admin_key") || "";
}

export function setAdminKey(key) {
  if (key && key.trim()) {
    localStorage.setItem("parivestra_admin_key", key.trim());
  } else {
    localStorage.removeItem("parivestra_admin_key");
  }
}

/**
 * Standard headers with user identity and admin authorization if present.
 */
function getHeaders(contentType = "application/json") {
  const headers = {
    "X-User-Id": getUserId(),
  };
  const adminKey = getAdminKey();
  if (adminKey) {
    headers["X-Admin-Key"] = adminKey;
  }
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  return headers;
}

/**
 * Health check endpoint.
 */
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

/**
 * Fetch available subjects and topics.
 */
export async function getSubjects() {
  const res = await fetch(`${API_BASE_URL}/api/subjects`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Fetch student progress summary.
 */
export async function getProgressSummary() {
  const res = await fetch(`${API_BASE_URL}/api/progress`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Fetch student learning path roadmap, levels, milestones, and XP.
 */
export async function getLearningPath() {
  const res = await fetch(`${API_BASE_URL}/api/learning-path`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Request question generation from practice agent with 45s client timeout.
 */
export async function generatePracticeQuestions({ subject, topic, difficulty, count = 5, timeoutMs = 45000 }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE_URL}/api/practice/generate`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ subject, topic, difficulty, count }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error("Generation timed out after 45 seconds. The local LLM took too long to respond.");
    }
    throw err;
  }
}

/**
 * Submit answer to practice agent for grading and mastery update.
 */
export async function submitPracticeAnswer(payload) {
  const res = await fetch(`${API_BASE_URL}/api/practice/submit`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Stream tutor conversation using Server-Sent Events.
 */
export async function streamTutorChat({
  sessionId,
  message,
  subject = "Python",
  topic = null,
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
      buffer = lines.pop(); // keep last incomplete chunk

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

/**
 * Bug Hunt Arena Game API
 */
export async function startBugHuntGame(topic = null) {
  const res = await fetch(`${API_BASE_URL}/api/games/bughunt/start`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ topic }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function submitBugHuntAnswer({ sessionId, selectedLine, selectedBugType, timeTakenSeconds = 10.0 }) {
  const res = await fetch(`${API_BASE_URL}/api/games/bughunt/answer`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      session_id: sessionId,
      selected_line: selectedLine,
      selected_bug_type: selectedBugType,
      time_taken_seconds: timeTakenSeconds,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getBugHuntHint(sessionId) {
  const res = await fetch(`${API_BASE_URL}/api/games/bughunt/hint`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function getGameLeaderboard(limit = 10) {
  const res = await fetch(`${API_BASE_URL}/api/games/leaderboard?limit=${limit}`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

/**
 * Institute Resource Library API
 */
export async function getResources({ subject = null, topic = null, approved = null } = {}) {
  const params = new URLSearchParams();
  if (subject) params.append("subject", subject);
  if (topic) params.append("topic", topic);
  if (approved !== null && approved !== undefined) params.append("approved", approved);

  const res = await fetch(`${API_BASE_URL}/api/resources?${params.toString()}`, {
    method: "GET",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export function getResourceDownloadUrl(resourceId) {
  const adminKey = getAdminKey();
  const url = new URL(`${API_BASE_URL}/api/resources/${resourceId}/download`);
  return url.toString();
}

export async function uploadResource(formData) {
  const res = await fetch(`${API_BASE_URL}/api/resources`, {
    method: "POST",
    headers: getHeaders(null), // Let browser set multipart boundary
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(errorData.detail || errorData.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function updateResource(resourceId, payload) {
  const res = await fetch(`${API_BASE_URL}/api/resources/${resourceId}`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(errorData.detail || errorData.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function deleteResource(resourceId) {
  const res = await fetch(`${API_BASE_URL}/api/resources/${resourceId}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(errorData.detail || errorData.error || `HTTP ${res.status}`);
  }
  return await res.json();
}

export async function reindexResource(resourceId) {
  const res = await fetch(`${API_BASE_URL}/api/resources/${resourceId}/reindex`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(errorData.detail || errorData.error || `HTTP ${res.status}`);
  }
  return await res.json();
}



