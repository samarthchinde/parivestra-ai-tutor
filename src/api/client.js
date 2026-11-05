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
 * Standard headers with user identity.
 */
function getHeaders(contentType = "application/json") {
  const headers = {
    "X-User-Id": getUserId(),
  };
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
 * Request question generation from practice agent.
 */
export async function generatePracticeQuestions({ subject, topic, difficulty, count = 5 }) {
  const res = await fetch(`${API_BASE_URL}/api/practice/generate`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ subject, topic, difficulty, count }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
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

