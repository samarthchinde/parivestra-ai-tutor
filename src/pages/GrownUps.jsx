import React, { useEffect, useState } from "react";
import { PageHeader, Card, PrimaryButton, Badge, Toast } from "../components/UI";
import { checkHealth, verifyGrownUpsPin, setGrownUpsPin, getAdminQueue, approveContent, generateCourseDraft, resetUserProfile, getTeacherWorkbookProjects, reviewTeacherWorkbookProject, getWorkbookPacing } from "../api/client";
import { ShieldCheck, Lock, Key, Server, CheckCircle2, AlertTriangle, RefreshCw, Upload, Sparkles, BookOpen, BookMarked, Award, FolderGit2 } from "lucide-react";
import { playSuccess, playClick } from "../utils/sound";

export default function GrownUps() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [authError, setAuthError] = useState("");
  const [toast, setToast] = useState("");

  // Portal State
  const [adminKey, setAdminKey] = useState(
    localStorage.getItem("parivestra_admin_key") || "parivestra_admin_secret"
  );
  const [health, setHealth] = useState(null);
  const [queue, setQueue] = useState({ courses: [], stories: [], safety_incidents: [] });
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [newPin, setNewPin] = useState("");

  // AI Workbooks Teacher State
  const [wbProjects, setWbProjects] = useState([]);
  const [pacingInfo, setPacingInfo] = useState(null);
  const [reviewScores, setReviewScores] = useState({});
  const [reviewFeedbacks, setReviewFeedbacks] = useState({});

  // Accessibility Toggles
  const [dyslexicFont, setDyslexicFont] = useState(
    localStorage.getItem("parivestra_dyslexic_font") === "true"
  );
  const [calmMode, setCalmMode] = useState(
    localStorage.getItem("parivestra_calm_mode") === "true"
  );

  // New Course Draft form
  const [draftSubject, setDraftSubject] = useState("Maths");
  const [draftGrade, setDraftGrade] = useState("Class 3");
  const [draftTopic, setDraftTopic] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadHealthAndQueue();
    }
  }, [isAuthenticated]);

  const loadHealthAndQueue = async () => {
    const h = await checkHealth();
    setHealth(h);

    setLoadingQueue(true);
    try {
      const q = await getAdminQueue();
      if (q) setQueue(q);
      const projs = await getTeacherWorkbookProjects();
      if (projs) setWbProjects(projs);
      const pacing = await getWorkbookPacing();
      if (pacing) setPacingInfo(pacing);
    } catch (e) {
      console.warn("Could not load admin queue:", e);
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setAuthError("");
    try {
      await verifyGrownUpsPin({
        pin: pinInput.trim() || undefined,
        answer: challengeAnswer.trim() || undefined,
      });
      playSuccess();
      setIsAuthenticated(true);
    } catch (err) {
      setAuthError(err.message || "Incorrect verification answer.");
    }
  };

  const handleSaveAdminKey = () => {
    localStorage.setItem("parivestra_admin_key", adminKey.trim());
    playSuccess();
    setToast("Admin Access Key saved successfully!");
  };

  const handleSetNewPin = async (e) => {
    e.preventDefault();
    if (newPin.length < 4) {
      setToast("PIN must be 4 to 6 digits.");
      return;
    }
    try {
      await setGrownUpsPin(newPin);
      playSuccess();
      setToast("Grown-ups PIN updated successfully!");
      setNewPin("");
    } catch (e) {
      setToast(`Error: ${e.message}`);
    }
  };

  const handleApprove = async (type, id) => {
    try {
      await approveContent(type, id);
      playSuccess();
      setToast(`Approved ${type} successfully!`);
      loadHealthAndQueue();
    } catch (e) {
      setToast(`Approval error: ${e.message}`);
    }
  };

  const handleReviewProject = async (projectId) => {
    const score = reviewScores[projectId] !== undefined ? reviewScores[projectId] : 100;
    const feedback = reviewFeedbacks[projectId] || "Great job on your AI workbook capstone project!";
    try {
      await reviewTeacherWorkbookProject(projectId, score, feedback);
      playSuccess();
      setToast(`Reviewed & approved project #${projectId}!`);
      setWbProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (e) {
      setToast(`Error: ${e.message}`);
    }
  };

  const handleGenerateCourse = async (e) => {
    e.preventDefault();
    if (!draftTopic.trim()) return;
    setIsDrafting(true);
    try {
      await generateCourseDraft({
        subject: draftSubject,
        grade: draftGrade,
        topic: draftTopic.trim(),
      });
      playSuccess();
      setToast("New course draft generated in Review Queue!");
      setDraftTopic("");
      loadHealthAndQueue();
    } catch (e) {
      setToast(`Draft error: ${e.message}`);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleToggleDyslexic = () => {
    const next = !dyslexicFont;
    setDyslexicFont(next);
    localStorage.setItem("parivestra_dyslexic_font", next ? "true" : "false");
    document.body.classList.toggle("dyslexic-font", next);
  };

  const handleToggleCalm = () => {
    const next = !calmMode;
    setCalmMode(next);
    localStorage.setItem("parivestra_calm_mode", next ? "true" : "false");
    document.body.classList.toggle("calm-mode", next);
  };

  const handleResetProfile = async () => {
    if (window.confirm("Are you sure you want to reset this child's XP and assessment history?")) {
      await resetUserProfile();
      playSuccess();
      setToast("Child progress reset.");
    }
  };

  // 1. GATE VIEW
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: 520, margin: "40px auto", textAlign: "center" }}>
        <PageHeader
          eyebrow="PARENTS & TEACHERS"
          title="Grown-ups Area"
          description="Please solve the maths puzzle or enter your PIN to manage settings and review content."
        />

        <Card>
          <div style={{ display: "grid", placeItems: "center", marginBottom: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#EAF2FE",
                color: "var(--color-primary)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <ShieldCheck size={36} />
            </div>
          </div>

          <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
                Maths Challenge: What is 7 + 8?
              </label>
              <input
                type="text"
                value={challengeAnswer}
                onChange={(e) => setChallengeAnswer(e.target.value)}
                placeholder="Enter answer (e.g. 15)"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 16,
                  borderRadius: "var(--radius-md)",
                  border: "2px solid #CBD5E1",
                  textAlign: "center",
                }}
              />
            </div>

            <div style={{ position: "relative", margin: "4px 0" }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)", background: "#fff", padding: "0 8px" }}>
                — OR ENTER 4-DIGIT PIN —
              </span>
            </div>

            <div>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="4-digit PIN..."
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 16,
                  borderRadius: "var(--radius-md)",
                  border: "2px solid #CBD5E1",
                  textAlign: "center",
                }}
              />
            </div>

            {authError && (
              <div style={{ color: "#DC2626", fontSize: 14, fontWeight: 700 }}>
                {authError}
              </div>
            )}

            <PrimaryButton type="submit" size="lg" style={{ width: "100%", marginTop: 8 }}>
              Unlock Grown-ups Area 🔓
            </PrimaryButton>
          </form>
        </Card>
      </div>
    );
  }

  // 2. UNLOCKED PORTAL VIEW
  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <PageHeader
        eyebrow="GROWN-UPS CONTROL PANEL"
        title="Parents & Teachers Hub"
        description="Review learning content, monitor local AI model health, configure accessibility, and manage child safety."
        action={
          <PrimaryButton variant="secondary" onClick={() => setIsAuthenticated(false)}>
            Lock Area 🔒
          </PrimaryButton>
        }
      />

      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      {/* Local AI Model & Backend Status */}
      <Card title="Local AI Model & System Diagnostics" icon={Server}>
        {health ? (
          <div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <Badge variant={health.llm?.status === "healthy" ? "success" : "warning"}>
                {health.llm?.status === "healthy" ? "AI Model Online" : "AI Model Offline"}
              </Badge>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
                Base URL: <code>{health.llm?.base_url || "http://127.0.0.1:8000/v1"}</code>
              </span>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
                Model: <strong>{health.llm?.model || "gemma-4"}</strong>
              </span>
              {health.llm?.latency_ms && (
                <span style={{ fontSize: 14, color: "var(--text-muted)" }}>
                  Latency: <strong>{health.llm?.latency_ms} ms</strong>
                </span>
              )}
            </div>

            {health.llm?.status !== "healthy" && (
              <div
                style={{
                  background: "#FEF3C7",
                  border: "2px solid #FDE68A",
                  borderRadius: "var(--radius-md)",
                  padding: 14,
                  fontSize: 14,
                  color: "#92400E",
                  lineHeight: 1.6,
                }}
              >
                <strong>Start Model Command (PowerShell):</strong>
                <pre style={{ background: "#FFF", padding: 8, borderRadius: 6, margin: "6px 0" }}>
                  powershell -ExecutionPolicy Bypass -File scripts/start-llm.ps1
                </pre>
                <span>Error details: {health.llm?.error || "Connection refused on port 8000"}</span>
              </div>
            )}
          </div>
        ) : (
          <p>Probing health...</p>
        )}
      </Card>

      {/* Teacher Content Review Queue */}
      <Card title="Content Approval Queue (Drafts)" icon={CheckCircle2}>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 0 }}>
          Child Safety Rule: All AI-generated courses and story lessons remain DRAFT until approved. Students only see approved lessons.
        </p>

        {loadingQueue ? (
          <p>Checking review queue...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {queue.courses.filter((c) => c.status === "draft").length === 0 &&
            queue.stories.filter((s) => s.status === "draft").length === 0 &&
            queue.courses.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)" }}>
                ✨ All courses and stories have been reviewed!
              </div>
            ) : null}

            {/* Courses to review */}
            {queue.courses.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 18px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong>{c.title}</strong>
                    <Badge variant="warning">Needs Review</Badge>
                    <Badge>{c.grade}</Badge>
                    <Badge>{c.subject}</Badge>
                  </div>
                </div>
                <PrimaryButton size="sm" onClick={() => handleApprove("course", c.id)}>
                  Approve Course ✓
                </PrimaryButton>
              </div>
            ))}

            {/* Stories to review */}
            {queue.stories.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 18px",
                }}
              >
                <div>
                  <strong>Story: {s.topic}</strong> ({s.grade} - {s.subject})
                </div>
                <PrimaryButton size="sm" onClick={() => handleApprove("story", s.id)}>
                  Approve Story ✓
                </PrimaryButton>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Child Safety Incident Log */}
      <Card title="Child Safety & Wellbeing Alerts" icon={AlertTriangle}>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 0 }}>
          Zero child free-text is retained. Only timestamps and safety classification tags are recorded so grown-ups can check in.
        </p>

        {queue.safety_incidents && queue.safety_incidents.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {queue.safety_incidents.map((inc) => (
              <div
                key={inc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 14px",
                  fontSize: 13,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge variant="danger">{inc.flag_type}</Badge>
                  <span style={{ color: "#991B1B" }}>
                    {inc.flag_type === "sensitive_emotion"
                      ? "Child expressed feelings of distress or sadness. Pari redirected to trusted grown-up."
                      : "Filtered inappropriate content or personal data attempt."}
                  </span>
                </div>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  {new Date(inc.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "12px 0", color: "var(--text-muted)", fontSize: 14 }}>
            ✓ No safety concerns or distress incidents detected.
          </div>
        )}
      </Card>

      {/* Official AI Workbooks: Teacher Guides, Pacing & Project Review */}
      <Card title="Official AI Workbooks: Teacher Guides & Project Review Queue" icon={BookMarked}>
        {/* Pacing Guidelines */}
        <div
          style={{
            background: "#FFF7ED",
            border: "1.5px solid #FDBA74",
            borderRadius: "var(--radius-md)",
            padding: "16px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Sparkles size={18} color="#EA580C" />
            <strong style={{ fontSize: "15px", color: "#9A3412" }}>
              Curriculum Unit Pacing (Grades 3 to 10)
            </strong>
          </div>
          <p style={{ margin: "0 0 8px", fontSize: "13.5px", color: "#7C2D12", lineHeight: "1.5" }}>
            • <strong>Pacing:</strong> 2 lessons of 40 minutes per unit (16 lessons per grade).
          </p>
          <p style={{ margin: "0 0 8px", fontSize: "13.5px", color: "#7C2D12", lineHeight: "1.5" }}>
            • <strong>Lesson 1 (40 min):</strong> Guided reading of "Let's learn", 3 New Words, Did you know? fact, and partner Think & talk dialogue.
          </p>
          <p style={{ margin: "0 0 8px", fontSize: "13.5px", color: "#7C2D12", lineHeight: "1.5" }}>
            • <strong>Lesson 2 (40 min):</strong> Hands-on Activity 1 & Activity 2, student reflection, and "I can" 3-star self-check.
          </p>
          <p style={{ margin: 0, fontSize: "13px", color: "#9A3412", fontStyle: "italic" }}>
            Materials: Unplugged activities require only pencil and paper/colors. Zero additional hardware required.
          </p>
        </div>

        {/* Project Submissions Queue */}
        <h4 style={{ margin: "0 0 10px", fontSize: "15px", color: "var(--text-main)" }}>
          Student Capstone Submissions Needing Teacher Review ({wbProjects.length})
        </h4>

        {wbProjects.length === 0 ? (
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            ✓ No student projects pending review.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {wbProjects.map((proj) => (
              <div
                key={proj.id}
                style={{
                  background: "#F8FAFC",
                  border: "1.5px solid #CBD5E1",
                  borderRadius: "var(--radius-md)",
                  padding: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <strong>{proj.student_name}</strong>
                    <Badge variant="warning">Grade {proj.grade}</Badge>
                    <Badge>{proj.project_title}</Badge>
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Submitted: {new Date(proj.submitted_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Form fields summary */}
                <div
                  style={{
                    background: "#FFFFFF",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1px solid #E2E8F0",
                    fontSize: "13px",
                    marginBottom: "12px",
                  }}
                >
                  {Object.entries(proj.fields).map(([k, v]) => (
                    <div key={k} style={{ marginBottom: "4px" }}>
                      <strong>{k.replace(/_/g, " ")}:</strong> {String(v)}
                    </div>
                  ))}
                </div>

                {/* Grading inputs */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Score (0-100)"
                    value={reviewScores[proj.id] !== undefined ? reviewScores[proj.id] : 100}
                    onChange={(e) =>
                      setReviewScores({ ...reviewScores, [proj.id]: parseInt(e.target.value, 10) })
                    }
                    style={{ width: "110px", padding: "6px 10px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
                  />
                  <input
                    type="text"
                    placeholder="Teacher feedback (encouraging note)..."
                    value={reviewFeedbacks[proj.id] || ""}
                    onChange={(e) =>
                      setReviewFeedbacks({ ...reviewFeedbacks, [proj.id]: e.target.value })
                    }
                    style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "1px solid #CBD5E1" }}
                  />
                  <PrimaryButton size="sm" onClick={() => handleReviewProject(proj.id)}>
                    Approve & Award XP ✓
                  </PrimaryButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* AI Course Draft Generator */}
      <Card title="Generate New Course Draft (AI)" icon={Sparkles}>
        <form onSubmit={handleGenerateCourse} style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Subject:</label>
            <select
              value={draftSubject}
              onChange={(e) => setDraftSubject(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1" }}
            >
              <option value="Maths">Maths</option>
              <option value="English">English</option>
              <option value="EVS">EVS</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Grade:</label>
            <select
              value={draftGrade}
              onChange={(e) => setDraftGrade(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1" }}
            >
              <option value="Class 3">Class 3</option>
              <option value="Class 4">Class 4</option>
            </select>
          </div>

          <div style={{ flex: 2, minWidth: 220 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Topic Name:</label>
            <input
              type="text"
              value={draftTopic}
              onChange={(e) => setDraftTopic(e.target.value)}
              placeholder="e.g. Solar System, Fractions, Adjectives"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #CBD5E1" }}
            />
          </div>

          <PrimaryButton type="submit" disabled={isDrafting}>
            {isDrafting ? "Drafting with AI..." : "Draft Outline ✨"}
          </PrimaryButton>
        </form>
      </Card>

      {/* Accessibility & Preferences */}
      <Card title="Accessibility & Display Preferences" icon={BookOpen}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, border: "1px solid #E2E8F0", borderRadius: "var(--radius-md)" }}>
            <div>
              <strong>Dyslexia-Friendly Font (Lexend)</strong>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>Improves reading flow and character distinction</p>
            </div>
            <button
              onClick={handleToggleDyslexic}
              style={{
                background: dyslexicFont ? "var(--color-primary)" : "#E2E8F0",
                color: dyslexicFont ? "#FFF" : "#475569",
                border: "none",
                borderRadius: 20,
                padding: "6px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {dyslexicFont ? "ON" : "OFF"}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, border: "1px solid #E2E8F0", borderRadius: "var(--radius-md)" }}>
            <div>
              <strong>Calm Mode</strong>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>Removes animations and visual motion effects</p>
            </div>
            <button
              onClick={handleToggleCalm}
              style={{
                background: calmMode ? "var(--color-primary)" : "#E2E8F0",
                color: calmMode ? "#FFF" : "#475569",
                border: "none",
                borderRadius: 20,
                padding: "6px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {calmMode ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </Card>

      {/* Admin Key & Security */}
      <Card title="Admin Authorization Key & PIN" icon={Key}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
              X-Admin-Key (Header Authentication):
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1" }}
              />
              <PrimaryButton size="sm" onClick={handleSaveAdminKey}>
                Save Key
              </PrimaryButton>
            </div>
          </div>

          <form onSubmit={handleSetNewPin}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
              Set New 4-Digit Grown-ups PIN:
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="password"
                maxLength={6}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="New PIN..."
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1" }}
              />
              <PrimaryButton size="sm" type="submit">
                Set PIN
              </PrimaryButton>
            </div>
          </form>
        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong>Reset Child Progress</strong>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>Clears XP, mastery, and assessment history for a fresh start</p>
          </div>
          <button
            onClick={handleResetProfile}
            style={{
              background: "#FEE2E2",
              color: "#DC2626",
              border: "1px solid #FCA5A5",
              borderRadius: "var(--radius-md)",
              padding: "8px 16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reset Progress ⚠️
          </button>
        </div>
      </Card>
    </div>
  );
}

