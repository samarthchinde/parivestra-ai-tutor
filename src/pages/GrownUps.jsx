import React, { useEffect, useState } from "react";
import { PageHeader, Card, PrimaryButton, Badge, Toast, Modal } from "../components/UI";
import {
  checkHealth,
  verifyGrownUpsPin,
  setGrownUpsPin,
  getAdminQueue,
  approveContent,
  generateCourseDraft,
  resetUserProfile,
  getTeacherWorkbookProjects,
  reviewTeacherWorkbookProject,
  getWorkbookPacing,
  getTeacherClasses,
  createTeacherClass,
  updateClassSettings,
  createTeacherStudent,
  bulkImportStudentsApi,
  resetStudentSecretApi,
  getClassLoginCards,
  getTeacherStudents,
} from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  ShieldCheck,
  Lock,
  Key,
  Server,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Upload,
  Sparkles,
  BookOpen,
  BookMarked,
  Award,
  FolderGit2,
  Users,
  PlusCircle,
  FileSpreadsheet,
  Printer,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import { playSuccess, playClick } from "../utils/sound";

export default function GrownUps() {
  const { user } = useAuth();
  const isTeacherOrAdmin = user?.role === "teacher" || user?.role === "admin";

  const [isAuthenticated, setIsAuthenticated] = useState(isTeacherOrAdmin);
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

  // Teacher Class & Student State
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Modals
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassGrade, setNewClassGrade] = useState("Class 3");
  const [newClassSection, setNewClassSection] = useState("A");
  const [newClassAllowSwitch, setNewClassAllowSwitch] = useState(true);
  const [newClassAllowJoinCode, setNewClassAllowJoinCode] = useState(true);

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentUsername, setNewStudentUsername] = useState("");
  const [newStudentDisplayName, setNewStudentDisplayName] = useState("");
  const [newStudentGrade, setNewStudentGrade] = useState("Class 3");
  const [createdStudentSecret, setCreatedStudentSecret] = useState(null);

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkResults, setBulkResults] = useState(null);

  const [showLoginCardsModal, setShowLoginCardsModal] = useState(false);
  const [loginCardsData, setLoginCardsData] = useState(null);

  const [secretResetResult, setSecretResetResult] = useState(null);

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
    if (isTeacherOrAdmin) {
      setIsAuthenticated(true);
    }
  }, [isTeacherOrAdmin]);

  useEffect(() => {
    if (isAuthenticated) {
      loadHealthAndQueue();
      loadClasses();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && selectedClassId) {
      loadStudents(selectedClassId);
    }
  }, [selectedClassId, isAuthenticated]);

  const loadClasses = async () => {
    setLoadingClasses(true);
    try {
      const res = await getTeacherClasses();
      if (res && res.classes) {
        setClasses(res.classes);
        if (res.classes.length > 0 && !selectedClassId) {
          setSelectedClassId(res.classes[0].id);
        }
      }
    } catch (e) {
      console.warn("Could not load classes:", e);
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadStudents = async (cId) => {
    setLoadingStudents(true);
    try {
      const res = await getTeacherStudents(cId);
      if (res && res.students) {
        setStudents(res.students);
      }
    } catch (e) {
      console.warn("Could not load students:", e);
    } finally {
      setLoadingStudents(false);
    }
  };

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

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    try {
      const res = await createTeacherClass({
        name: newClassName.trim(),
        grade: newClassGrade,
        section: newClassSection.trim() || "A",
        allow_grade_switch: newClassAllowSwitch,
        allow_join_by_code: newClassAllowJoinCode,
      });
      playSuccess();
      setToast(`Created class ${newClassName}!`);
      setShowCreateClassModal(false);
      setNewClassName("");
      loadClasses();
    } catch (err) {
      setToast(`Error creating class: ${err.message}`);
    }
  };

  const handleToggleGradeSwitch = async (cls) => {
    try {
      await updateClassSettings(cls.id, {
        allow_grade_switch: !cls.allow_grade_switch,
      });
      playSuccess();
      loadClasses();
    } catch (err) {
      setToast(`Error updating class: ${err.message}`);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudentUsername.trim()) return;
    try {
      const res = await createTeacherStudent({
        username: newStudentUsername.trim(),
        display_name: newStudentDisplayName.trim() || undefined,
        grade: newStudentGrade,
        class_id: selectedClassId || undefined,
      });
      playSuccess();
      setCreatedStudentSecret(res.student);
      setNewStudentUsername("");
      setNewStudentDisplayName("");
      if (selectedClassId) loadStudents(selectedClassId);
    } catch (err) {
      setToast(`Error creating student: ${err.message}`);
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!bulkCsvText.trim()) return;
    try {
      const res = await bulkImportStudentsApi(bulkCsvText.trim());
      playSuccess();
      setBulkResults(res);
      setToast(`Imported ${res.imported_count} student accounts!`);
      if (selectedClassId) loadStudents(selectedClassId);
    } catch (err) {
      setToast(`Bulk import error: ${err.message}`);
    }
  };

  const handleResetSecret = async (studentId) => {
    try {
      const res = await resetStudentSecretApi(studentId);
      playSuccess();
      setSecretResetResult(res);
      if (selectedClassId) loadStudents(selectedClassId);
    } catch (err) {
      setToast(`Reset secret error: ${err.message}`);
    }
  };

  const handleOpenLoginCards = async (classId) => {
    try {
      const res = await getClassLoginCards(classId);
      setLoginCardsData(res);
      setShowLoginCardsModal(true);
    } catch (err) {
      setToast(`Could not load cards: ${err.message}`);
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

  // 1. GATE VIEW (For unauthenticated guardian/guests)
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
              Unlock Grown-ups Dashboard
            </PrimaryButton>
          </form>
        </Card>
      </div>
    );
  }

  // 2. AUTHENTICATED PORTAL VIEW
  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 }}>
      <PageHeader
        eyebrow="EDUCATOR & GUARDIAN DASHBOARD"
        title="Grown-ups Management Portal"
        description="Manage school classes, provision child accounts with zero PII, and review AI content."
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <PrimaryButton
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => {
                loadHealthAndQueue();
                loadClasses();
              }}
            >
              Refresh Data
            </PrimaryButton>
          </div>
        }
      />

      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      {/* CLASS & STUDENT MANAGEMENT SUITE */}
      <Card title="Classroom & Student Management (Classes 3 to 10)" icon={Users}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
            Zero-PII student authentication: Students log in via big PIN pads (Junior) or memorable passwords (Middle/Senior).
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <PrimaryButton
              size="sm"
              icon={PlusCircle}
              onClick={() => setShowCreateClassModal(true)}
            >
              Create Class
            </PrimaryButton>
            <PrimaryButton
              size="sm"
              variant="secondary"
              icon={FileSpreadsheet}
              onClick={() => setShowBulkModal(true)}
            >
              Bulk Import (CSV)
            </PrimaryButton>
          </div>
        </div>

        {/* Class Selection & Settings */}
        {loadingClasses ? (
          <p>Loading classes...</p>
        ) : classes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#64748B" }}>
            No classes created yet. Click "Create Class" above to set up your first class!
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 10, marginBottom: 16 }}>
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClassId(cls.id)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 14,
                    border: selectedClassId === cls.id ? "2px solid #EA580C" : "1px solid #E2E8F0",
                    background: selectedClassId === cls.id ? "#FFF7ED" : "#F8FAFC",
                    cursor: "pointer",
                    minWidth: 180,
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <strong style={{ fontSize: 15, color: "#0F172A" }}>{cls.name}</strong>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#EA580C", background: "#FFEDD5", padding: "2px 6px", borderRadius: 8 }}>
                      {cls.grade}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                    Sec {cls.section} · {cls.student_count || 0} Students
                  </div>
                  <div style={{ fontSize: 12, color: "#166534", marginTop: 4, fontWeight: 700 }}>
                    Code: <code>{cls.join_code}</code>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Class Action Toolbar */}
            {(() => {
              const currentClass = classes.find((c) => c.id === selectedClassId);
              if (!currentClass) return null;
              return (
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: 14,
                    padding: "14px 18px",
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div>
                      <span style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>Join Code for Students:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <code style={{ fontSize: 16, fontWeight: 800, color: "#16A34A", background: "#DCFCE7", padding: "2px 8px", borderRadius: 6 }}>
                          {currentClass.join_code}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(currentClass.join_code);
                            setToast(`Copied ${currentClass.join_code} to clipboard!`);
                          }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B" }}
                          title="Copy Code"
                        >
                          <Copy size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{ height: 32, width: 1, background: "#CBD5E1" }} />

                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={currentClass.allow_grade_switch}
                        onChange={() => handleToggleGradeSwitch(currentClass)}
                      />
                      <span>Allow Students to Switch Grades</span>
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <PrimaryButton
                      size="sm"
                      variant="secondary"
                      icon={Printer}
                      onClick={() => handleOpenLoginCards(currentClass.id)}
                    >
                      Print Login Cards
                    </PrimaryButton>
                    <PrimaryButton
                      size="sm"
                      icon={PlusCircle}
                      onClick={() => {
                        setNewStudentGrade(currentClass.grade);
                        setShowAddStudentModal(true);
                      }}
                    >
                      Add Student to {currentClass.name}
                    </PrimaryButton>
                  </div>
                </div>
              );
            })()}

            {/* Students Table */}
            <div>
              <h4 style={{ fontSize: 15, fontWeight: 800, color: "#1E293B", marginBottom: 10 }}>
                Enrolled Students
              </h4>
              {loadingStudents ? (
                <p>Loading students...</p>
              ) : students.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#64748B", background: "#F8FAFC", borderRadius: 12 }}>
                  No students in this class yet. Click "Add Student" or use "Bulk Import".
                </div>
              ) : (
                <div style={{ borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "#F1F5F9", borderBottom: "1px solid #CBD5E1" }}>
                        <th style={{ padding: "10px 14px", fontWeight: 700 }}>Username</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700 }}>Display Name</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700 }}>Grade</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700 }}>XP</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700 }}>Status</th>
                        <th style={{ padding: "10px 14px", fontWeight: 700 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((st, idx) => (
                        <tr
                          key={st.id || idx}
                          style={{
                            borderBottom: idx < students.length - 1 ? "1px solid #F1F5F9" : "none",
                            background: st.is_locked ? "#FEF2F2" : "#FFFFFF",
                          }}
                        >
                          <td style={{ padding: "10px 14px", fontWeight: 700 }}>
                            <code>{st.username}</code>
                          </td>
                          <td style={{ padding: "10px 14px" }}>{st.display_name}</td>
                          <td style={{ padding: "10px 14px" }}>{st.grade}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#EA580C" }}>
                            {st.xp} XP
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            {st.is_locked ? (
                              <span style={{ color: "#DC2626", fontWeight: 700 }}>Locked (5 fails)</span>
                            ) : (
                              <span style={{ color: "#16A34A", fontWeight: 700 }}>Active</span>
                            )}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <button
                              type="button"
                              onClick={() => handleResetSecret(st.id)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: 6,
                                border: "1px solid #CBD5E1",
                                background: "#F8FAFC",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                color: "#0F172A",
                              }}
                            >
                              Reset PIN/PW
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

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
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Badge variant={c.status === "draft" ? "warning" : "success"}>
                      {c.status.toUpperCase()}
                    </Badge>
                    <strong>{c.title}</strong>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      ({c.subject} · {c.grade})
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                    {c.description}
                  </p>
                </div>

                {c.status === "draft" && (
                  <PrimaryButton size="sm" onClick={() => handleApprove("course", c.id)}>
                    Approve Course ✓
                  </PrimaryButton>
                )}
              </div>
            ))}
          </div>
        )}
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

      {/* MODAL: CREATE CLASS */}
      {showCreateClassModal && (
        <Modal title="Create New Class Section" onClose={() => setShowCreateClassModal(false)}>
          <form onSubmit={handleCreateClass} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Class Name</label>
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="e.g. 4-A Pioneers or Green Valley Class 5"
                required
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Grade</label>
                <select
                  value={newClassGrade}
                  onChange={(e) => setNewClassGrade(e.target.value)}
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1" }}
                >
                  {[3, 4, 5, 6, 7, 8, 9, 10].map((g) => (
                    <option key={g} value={`Class ${g}`}>{`Class ${g}`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Section</label>
                <input
                  type="text"
                  value={newClassSection}
                  onChange={(e) => setNewClassSection(e.target.value)}
                  placeholder="A"
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", boxSizing: "border-box" }}
                />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={newClassAllowSwitch}
                onChange={(e) => setNewClassAllowSwitch(e.target.checked)}
              />
              Allow students to switch grades freely
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={newClassAllowJoinCode}
                onChange={(e) => setNewClassAllowJoinCode(e.target.checked)}
              />
              Allow students to self-join using class join code
            </label>
            <PrimaryButton type="submit" style={{ marginTop: 10 }}>
              Create Class & Generate Code
            </PrimaryButton>
          </form>
        </Modal>
      )}

      {/* MODAL: ADD STUDENT */}
      {showAddStudentModal && (
        <Modal title="Add Single Student" onClose={() => { setShowAddStudentModal(false); setCreatedStudentSecret(null); }}>
          {createdStudentSecret ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <CheckCircle2 size={48} color="#16A34A" style={{ margin: "0 auto 12px auto" }} />
              <h3 style={{ fontSize: 18, color: "#0F172A", margin: 0 }}>Student Created!</h3>
              <p style={{ color: "#64748B", fontSize: 13, margin: "6px 0 16px 0" }}>
                Make sure to write down or share this secret now. It is never stored in plain text:
              </p>
              <div style={{ background: "#F1F5F9", borderRadius: 12, padding: 16, display: "inline-block", textAlign: "left" }}>
                <div><strong>Username:</strong> <code>{createdStudentSecret.username}</code></div>
                <div><strong>Grade:</strong> {createdStudentSecret.grade}</div>
                <div style={{ marginTop: 6, fontSize: 16, color: "#EA580C", fontWeight: 800 }}>
                  <strong>One-Time Secret:</strong> <code>{createdStudentSecret.secret}</code>
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <PrimaryButton onClick={() => { setShowAddStudentModal(false); setCreatedStudentSecret(null); }}>
                  Done
                </PrimaryButton>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAddStudent} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Student Nickname / Username</label>
                <input
                  type="text"
                  value={newStudentUsername}
                  onChange={(e) => setNewStudentUsername(e.target.value)}
                  placeholder="e.g. kid4, aarav, priya"
                  required
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Display Name (Optional)</label>
                <input
                  type="text"
                  value={newStudentDisplayName}
                  onChange={(e) => setNewStudentDisplayName(e.target.value)}
                  placeholder="e.g. Aarav M."
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", boxSizing: "border-box" }}
                />
              </div>
              <PrimaryButton type="submit" style={{ marginTop: 10 }}>
                Generate Account & Secret
              </PrimaryButton>
            </form>
          )}
        </Modal>
      )}

      {/* MODAL: BULK CSV IMPORT */}
      {showBulkModal && (
        <Modal title="Bulk Import Students (CSV)" onClose={() => { setShowBulkModal(false); setBulkResults(null); }}>
          {bulkResults ? (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#166534" }}>
                Successfully Imported {bulkResults.imported_count} Accounts!
              </h3>
              <p style={{ fontSize: 12, color: "#64748B" }}>
                Copy or print these initial credentials for your students:
              </p>
              <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid #E2E8F0", borderRadius: 8, marginTop: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#F1F5F9" }}>
                      <th style={{ padding: 6 }}>Username</th>
                      <th style={{ padding: 6 }}>Grade</th>
                      <th style={{ padding: 6 }}>Secret (PIN/Password)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResults.students.map((s, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: 6 }}><code>{s.username}</code></td>
                        <td style={{ padding: 6 }}>{s.grade}</td>
                        <td style={{ padding: 6, fontWeight: 700, color: "#EA580C" }}><code>{s.secret}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PrimaryButton style={{ marginTop: 16 }} onClick={() => { setShowBulkModal(false); setBulkResults(null); }}>
                Close
              </PrimaryButton>
            </div>
          ) : (
            <form onSubmit={handleBulkImport} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
                Enter one student per line in format: <code>username,grade,section</code> (or just usernames).
              </p>
              <textarea
                rows={6}
                value={bulkCsvText}
                onChange={(e) => setBulkCsvText(e.target.value)}
                placeholder={"aarav_4,Class 4,A\nmaya_4,Class 4,A\nrohan_4,Class 4,A"}
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", fontFamily: "monospace", fontSize: 13 }}
              />
              <PrimaryButton type="submit">
                Import & Generate Credentials
              </PrimaryButton>
            </form>
          )}
        </Modal>
      )}

      {/* MODAL: SECRET RESET POPUP */}
      {secretResetResult && (
        <Modal title="Student Secret Reset" onClose={() => setSecretResetResult(null)}>
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <Key size={40} color="#EA580C" style={{ margin: "0 auto 8px auto" }} />
            <h3 style={{ fontSize: 17, color: "#0F172A" }}>
              New Secret for <code>{secretResetResult.username}</code>
            </h3>
            <div style={{ background: "#FFF7ED", border: "1.5px solid #FFEDD5", borderRadius: 12, padding: "14px 20px", display: "inline-block", margin: "14px 0" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#EA580C", letterSpacing: 2 }}>
                <code>{secretResetResult.new_secret}</code>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#64748B" }}>
              Account lock has been cleared and failed attempts reset to 0. Share this secret with the student.
            </p>
            <PrimaryButton onClick={() => setSecretResetResult(null)}>
              Close
            </PrimaryButton>
          </div>
        </Modal>
      )}

      {/* MODAL: PRINTABLE LOGIN CARDS */}
      {showLoginCardsModal && loginCardsData && (
        <Modal title={`Print Student Login Cards · ${loginCardsData.class?.name}`} onClose={() => setShowLoginCardsModal(false)}>
          <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
            <PrimaryButton size="sm" icon={Printer} onClick={() => window.print()}>
              Print Login Cards
            </PrimaryButton>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 12,
              maxHeight: 380,
              overflowY: "auto",
              padding: 4,
            }}
          >
            {loginCardsData.cards.map((c) => (
              <div
                key={c.id}
                style={{
                  border: "2px dashed #CBD5E1",
                  borderRadius: 12,
                  padding: 12,
                  background: "#FFFFFF",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 800, color: "#EA580C", textTransform: "uppercase" }}>
                  Parivestra Student Card
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#0F172A", marginTop: 4 }}>
                  {c.display_name}
                </div>
                <div style={{ fontSize: 12, color: "#64748B" }}>{c.grade} · {c.class_name}</div>
                <div style={{ marginTop: 8, background: "#F1F5F9", borderRadius: 6, padding: "4px 8px" }}>
                  <span style={{ fontSize: 11, color: "#64748B" }}>Username: </span>
                  <code style={{ fontSize: 12, fontWeight: 800 }}>{c.username}</code>
                </div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
                  Secret Type: <strong>{c.secret_type}</strong>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
