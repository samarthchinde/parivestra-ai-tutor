import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Lock,
  Unlock,
  CheckCircle2,
  Flame,
  Award,
  Zap,
  BookOpen,
  HelpCircle,
  Gamepad2,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { PageHeader, Card, ProgressBar } from "../components/UI";
import { getLearningPath } from "../api/client";
import { getProgress } from "../assessment/progressStorage";

export default function LearningPath() {
  const navigate = useNavigate();
  const [pathData, setPathData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    async function fetchRoadmap() {
      setLoading(true);
      setError("");

      try {
        const data = await getLearningPath();
        if (data && data.levels) {
          setPathData(data);
          setIsOffline(false);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Backend learning path API unavailable, loading offline roadmap:", err);
      }

      // Offline fallback: load static JSON and combine with local IndexedDB records
      try {
        const localAttempts = await getProgress();
        const staticJson = await import("../../knowledge_base/learning_path.json");
        const rawLevels = staticJson.default?.levels || staticJson.levels || [];

        // Simple local mastery mapping
        const localTopicCounts = {};
        const localTopicCorrect = {};
        localAttempts.forEach((a) => {
          (a.answers || []).forEach((ans) => {
            const top = (ans.topic || a.subject || "").toLowerCase();
            localTopicCounts[top] = (localTopicCounts[top] || 0) + 1;
            if (ans.isCorrect) {
              localTopicCorrect[top] = (localTopicCorrect[top] || 0) + 1;
            }
          });
        });

        const offlineLevels = rawLevels.map((lvl, idx) => {
          const ms = (lvl.milestones || []).map((m) => {
            const topKey = m.topic.toLowerCase();
            const attempts = localTopicCounts[topKey] || 0;
            const correct = localTopicCorrect[topKey] || 0;
            const score = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
            return {
              id: m.id,
              title: m.title,
              topic: m.topic,
              description: m.description,
              score,
              attempts,
              sufficient_data: attempts >= 3,
            };
          });

          const isFirst = idx === 0;
          return {
            id: lvl.id,
            name: lvl.name,
            description: lvl.description,
            status: isFirst ? "in_progress" : "locked",
            lock_reason: isFirst ? null : "Requires completion of prior levels (offline mode).",
            average_score: 0,
            progress_pct: 0,
            milestones: ms,
          };
        });

        setPathData({
          user_id: "local_student",
          xp: localAttempts.length * 50,
          streak_days: localAttempts.length > 0 ? 1 : 0,
          badge: localAttempts.length > 5 ? "Python Apprentice" : "Novice Coder",
          next_best_step: "Practice Level 1: Python Foundations",
          levels: offlineLevels,
        });
        setIsOffline(true);
      } catch (localErr) {
        console.error("Local learning path error:", localErr);
        setError("Unable to load learning path roadmap.");
      } finally {
        setLoading(false);
      }
    }

    fetchRoadmap();
  }, []);

  if (loading) {
    return <p style={{ padding: 24 }}>Loading your learning path...</p>;
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <PageHeader
        eyebrow="STRUCTURED CURRICULUM"
        title="Learning Path & Milestones"
        description="Master topics in sequence, unlock achievements, and level up your software skills."
      />

      {isOffline && (
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #fde68a",
            color: "#92400e",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 12,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={15} />
          <span>Offline mode active: Using bundled curriculum and local progress storage.</span>
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #f87171",
            color: "#b91c1c",
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* Gamification Stats Header */}
      {pathData && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "#fff2ec",
                  color: "#d94d25",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Zap size={22} />
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#8b95a3", fontWeight: 700 }}>TOTAL XP</span>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{pathData.xp} XP</h3>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "#ecfdf5",
                  color: "#059669",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Award size={22} />
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#8b95a3", fontWeight: 700 }}>LEVEL BADGE</span>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#065f46" }}>
                  {pathData.badge}
                </h3>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "#fff7ed",
                  color: "#ea580c",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Flame size={22} />
              </div>
              <div>
                <span style={{ fontSize: 11, color: "#8b95a3", fontWeight: 700 }}>PRACTICE STREAK</span>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#c2410c" }}>
                  {pathData.streak_days} Day{pathData.streak_days === 1 ? "" : "s"} 🔥
                </h3>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Next Best Step Action Card */}
      {pathData && pathData.next_best_step && (
        <div
          style={{
            background: "#14263b",
            color: "#fff",
            borderRadius: 14,
            padding: "20px 24px",
            marginBottom: 28,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <span
              style={{
                fontSize: 10,
                letterSpacing: 1.5,
                fontWeight: 700,
                color: "#f3a17f",
                display: "block",
                marginBottom: 6,
              }}
            >
              RECOMMENDED NEXT STEP
            </span>
            <h3 style={{ margin: "0 0 6px", fontSize: 17, color: "#fff" }}>
              {pathData.next_best_step}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1" }}>
              Follow your personalized recommendation to advance your mastery score.
            </p>
          </div>

          <button
            onClick={() => navigate("/practice?subject=Python")}
            style={{
              background: "#e95b30",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              padding: "10px 18px",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Start Practice →
          </button>
        </div>
      )}

      {/* Level-wise Roadmap */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {pathData?.levels?.map((lvl, index) => {
          const isLocked = lvl.status === "locked";
          const isCompleted = lvl.status === "completed";

          return (
            <div
              key={lvl.id}
              style={{
                background: "#fff",
                border: isCompleted
                  ? "2px solid #22c55e"
                  : isLocked
                  ? "1px solid #e2e8f0"
                  : "2px solid #e95b30",
                borderRadius: 14,
                padding: 24,
                opacity: isLocked ? 0.75 : 1,
                boxShadow: isLocked ? "none" : "0 4px 12px rgba(0,0,0,0.03)",
                transition: "all 0.2s ease",
              }}
            >
              {/* Level Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: isCompleted ? "#dcfce7" : isLocked ? "#f1f5f9" : "#fff2ec",
                        color: isCompleted ? "#15803d" : isLocked ? "#64748b" : "#d94d25",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 800,
                        fontSize: 14,
                      }}
                    >
                      {isCompleted ? <CheckCircle2 size={18} /> : isLocked ? <Lock size={16} /> : lvl.id}
                    </div>

                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{lvl.name}</h2>
                  </div>

                  <p style={{ margin: "6px 0 0 42px", fontSize: 13, color: "#64748b" }}>
                    {lvl.description}
                  </p>
                </div>

                {/* Level Status Badge */}
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 700,
                      background: isCompleted ? "#dcfce7" : isLocked ? "#f1f5f9" : "#ffedd5",
                      color: isCompleted ? "#15803d" : isLocked ? "#64748b" : "#c2410c",
                    }}
                  >
                    {isCompleted ? "Completed" : isLocked ? "Locked" : "In Progress"}
                  </span>
                  {!isLocked && (
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                      Avg Mastery: <strong>{lvl.average_score}%</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Lock Explanation Banner */}
              {isLocked && lvl.lock_reason && (
                <div
                  style={{
                    background: "#f8fafc",
                    borderLeft: "3px solid #94a3b8",
                    padding: "10px 14px",
                    borderRadius: 6,
                    fontSize: 12,
                    color: "#475569",
                    marginBottom: 16,
                  }}
                >
                  <strong style={{ color: "#334155" }}>Unlock Prerequisite: </strong>
                  {lvl.lock_reason}
                </div>
              )}

              {/* Milestones / Topics List */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 14,
                  marginTop: 12,
                }}
              >
                {lvl.milestones.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{m.title}</h4>
                        {m.sufficient_data ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: m.score >= 75 ? "#15803d" : "#d97706",
                            }}
                          >
                            {m.score}%
                          </span>
                        ) : (
                          <span style={{ fontSize: 10, color: "#94a3b8" }}>
                            {m.attempts}/3 tries
                          </span>
                        )}
                      </div>

                      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
                        {m.description}
                      </p>
                    </div>

                    {/* Milestone Actions: Learn, Practice, Play */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>
                      <button
                        disabled={isLocked}
                        onClick={() => navigate(`/tutor?subject=Python&topic=${encodeURIComponent(m.topic)}`)}
                        style={{
                          flex: 1,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "6px 8px",
                          borderRadius: 6,
                          background: "#fff",
                          border: "1px solid #cbd5e1",
                          color: isLocked ? "#94a3b8" : "#1e293b",
                          cursor: isLocked ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                        title="Open interactive tutor for this concept"
                      >
                        <BookOpen size={12} color="#e95b30" /> Tutor
                      </button>

                      <button
                        disabled={isLocked}
                        onClick={() => navigate(`/practice?subject=Python&topic=${encodeURIComponent(m.topic)}`)}
                        style={{
                          flex: 1,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "6px 8px",
                          borderRadius: 6,
                          background: "#fff",
                          border: "1px solid #cbd5e1",
                          color: isLocked ? "#94a3b8" : "#1e293b",
                          cursor: isLocked ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                        title="Practice MCQs for this topic"
                      >
                        <HelpCircle size={12} color="#2563eb" /> Practice
                      </button>

                      <button
                        disabled={isLocked}
                        onClick={() => navigate(`/games?topic=${encodeURIComponent(m.topic)}`)}
                        style={{
                          flex: 1,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "6px 8px",
                          borderRadius: 6,
                          background: "#fff",
                          border: "1px solid #cbd5e1",
                          color: isLocked ? "#94a3b8" : "#1e293b",
                          cursor: isLocked ? "not-allowed" : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                        title="Play Bug Hunt Arena game for this topic"
                      >
                        <Gamepad2 size={12} color="#7c3aed" /> Play
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
