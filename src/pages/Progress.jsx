import { useEffect, useState } from "react";
import { PageHeader } from "../components/UI";
import { getProgress } from "../assessment/progressStorage";
import { getProgressSummary } from "../api/client";
import { Award, AlertTriangle, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import "../assessment/assessment.css";

export default function Progress() {
  const [history, setHistory] = useState([]);
  const [apiProgress, setApiProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAllProgress() {
      setLoading(true);

      // 1. Try fetching from Backend API
      try {
        const apiData = await getProgressSummary();
        if (apiData && apiData.user_id) {
          setApiProgress(apiData);
          setIsBackendOnline(true);
        }
      } catch (err) {
        console.warn("Backend /api/progress unreachable, relying on IndexedDB fallback:", err);
        setIsBackendOnline(false);
      }

      // 2. Load IndexedDB history
      try {
        const records = await getProgress();
        const sortedRecords = [...records].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        setHistory(sortedRecords);
      } catch (err) {
        console.error("Local progress loading error:", err);
        if (!isBackendOnline) {
          setError("Unable to load your local progress.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadAllProgress();
  }, []);

  const totalAttempts = history.length;
  const totalQuestions = history.reduce((sum, item) => sum + (item.totalQuestions || 0), 0);
  const totalCorrect = history.reduce((sum, item) => sum + (item.correctAnswers || 0), 0);
  const averageScore = totalAttempts
    ? Math.round(history.reduce((sum, item) => sum + (item.percentage || 0), 0) / totalAttempts)
    : 0;
  const accuracy = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // Local fallback weak topics
  const localWeakTopics = {};
  history.forEach((attempt) => {
    (attempt.answers || []).forEach((answer) => {
      const topic = answer.topic || attempt.subject;
      if (!answer.isCorrect && topic) {
        localWeakTopics[topic] = (localWeakTopics[topic] || 0) + 1;
      }
    });
  });
  const localRevisionTopics = Object.entries(localWeakTopics).sort((a, b) => b[1] - a[1]);

  if (loading) {
    return <p style={{ padding: 20 }}>Loading your progress...</p>;
  }

  return (
    <div className="m7-dashboard">
      <PageHeader
        title="My Progress & Mastery"
        description="Comprehensive learning analytics, weighted topic mastery, and AI recommendations."
      />

      {error && <div className="m7-error">{error}</div>}

      <section className="m7-welcome">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>Your Learning Overview</h2>
            <p>Review your mastery scores, accuracy, and targeted revision recommendations.</p>
          </div>
          <span
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              background: isBackendOnline ? "#dcfce7" : "#f1f5f9",
              color: isBackendOnline ? "#15803d" : "#475569",
            }}
          >
            {isBackendOnline ? "• Backend Connected" : "• Offline Local Mode"}
          </span>
        </div>
      </section>

      {/* STATS OVERVIEW */}
      <section className="m7-stats">
        <div className="m7-stat-card">
          <h3>Total Assessments</h3>
          <strong>{totalAttempts}</strong>
        </div>

        <div className="m7-stat-card">
          <h3>Average Score</h3>
          <strong>{averageScore}%</strong>
        </div>

        <div className="m7-stat-card">
          <h3>Overall Accuracy</h3>
          <strong>{accuracy}%</strong>
        </div>

        <div className="m7-stat-card">
          <h3>Questions Solved</h3>
          <strong>{totalQuestions}</strong>
        </div>
      </section>

      {/* TOPIC MASTERY (If API connected) */}
      {isBackendOnline && apiProgress && (
        <section className="m7-panel" style={{ marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <TrendingUp size={20} color="#e95b30" />
            <h2 style={{ margin: 0 }}>Topic Mastery (Weighted Moving Average)</h2>
          </div>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 18 }}>
            Mastery score requires at least 3 practice attempts per topic to calculate a stable rating.
          </p>

          {apiProgress.mastery_per_topic.length === 0 ? (
            <p style={{ color: "#94a3b8" }}>No topic attempts recorded on the server yet. Complete a practice quiz!</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {apiProgress.mastery_per_topic.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <strong>{m.topic}</strong>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{m.subject}</span>
                  </div>

                  {m.sufficient_data ? (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                        <span>Mastery:</span>
                        <strong style={{ color: m.score >= 75 ? "#15803d" : m.score >= 50 ? "#d97706" : "#b91c1c" }}>
                          {m.score}%
                        </strong>
                      </div>
                      <div style={{ height: 6, background: "#e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${m.score}%`,
                            background: m.score >= 75 ? "#22c55e" : m.score >= 50 ? "#f59e0b" : "#ef4444",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                        Based on {m.attempts} attempt(s)
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 12, color: "#92400e", background: "#fef3c7", padding: "6px 10px", borderRadius: 6 }}>
                      Need {3 - m.attempts} more attempt(s) for mastery score ({m.attempts}/3)
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* RECOMMENDATIONS & WEAK TOPICS */}
      <div className="m7-content-grid" style={{ marginTop: 20 }}>
        <section className="m7-panel">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Award size={18} color="#e95b30" />
            <h2 style={{ margin: 0 }}>Recommended Next Step</h2>
          </div>
          <div className="m7-recommendation" style={{ lineHeight: 1.6 }}>
            {apiProgress?.recommended_next_topic || (
              localRevisionTopics.length > 0
                ? `Focus on revising: ${localRevisionTopics.slice(0, 3).map(([topic]) => topic).join(", ")}.`
                : "Great work! Complete more assessments to receive targeted topic recommendations."
            )}
          </div>
        </section>

        <section className="m7-panel">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={18} color="#e95b30" />
            <h2 style={{ margin: 0 }}>Areas for Improvement</h2>
          </div>

          {apiProgress && apiProgress.weakest_topics.length > 0 ? (
            <div className="m7-weak-list">
              {apiProgress.weakest_topics.map((t, idx) => (
                <div key={idx} className="m7-weak-item">
                  <span>{t.topic}</span>
                  <strong>{t.score !== undefined ? `${t.score}% mastery` : `${t.errors} error(s)`}</strong>
                </div>
              ))}
            </div>
          ) : localRevisionTopics.length > 0 ? (
            <div className="m7-weak-list">
              {localRevisionTopics.slice(0, 5).map(([topic, count]) => (
                <div key={topic} className="m7-weak-item">
                  <span>{topic}</span>
                  <strong>{count} mistake{count > 1 ? "s" : ""}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>No major weak areas detected yet. Excellent job!</p>
          )}
        </section>
      </div>

      {/* ASSESSMENT HISTORY */}
      <section className="m7-panel" style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Clock size={18} color="#e95b30" />
          <h2 style={{ margin: 0 }}>Recent Activity Log</h2>
        </div>

        {history.length === 0 ? (
          <p>No assessment records yet. Take your first quiz in the Practice tab!</p>
        ) : (
          history.slice(0, 10).map((item, index) => (
            <div className="m7-history-item" key={item.id || index}>
              <div>
                <strong>{item.subject}</strong>
                <p>
                  {item.difficulty} · {item.totalQuestions} questions ·{" "}
                  {item.date ? new Date(item.date).toLocaleDateString() : "Recent"}
                </p>
                <p>
                  Correct: {item.correctAnswers} / {item.totalQuestions}
                </p>
              </div>
              <strong style={{ color: item.percentage >= 70 ? "#15803d" : "#d97706" }}>
                {item.percentage}%
              </strong>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
