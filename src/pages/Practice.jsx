import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { RotateCcw, Sparkles, AlertCircle, HelpCircle, ArrowRight } from "lucide-react";
import { PageHeader } from "../components/UI";
import { questionBank } from "../assessment/questionBank";
import { saveProgress, getProgress } from "../assessment/progressStorage";
import { generatePracticeQuestions, submitPracticeAnswer } from "../api/client";
import "../assessment/assessment.css";

export default function Practice() {
  const [searchParams] = useSearchParams();
  const initialTopic = searchParams.get("topic") || "";
  const initialSubject = searchParams.get("subject") || "Python";

  const [page, setPage] = useState("dashboard"); // dashboard, quiz, feedback, result, progress
  const [subject, setSubject] = useState(initialSubject);
  const [topic, setTopic] = useState(initialTopic);
  const [difficulty, setDifficulty] = useState("Beginner");
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState("");
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState("Generating Fresh Questions...");
  const [loadError, setLoadError] = useState(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [lastFeedback, setLastFeedback] = useState(null);
  const [previousSetIds, setPreviousSetIds] = useState([]);

  const subjects = [
    "Python",
    "Artificial Intelligence",
    "Machine Learning",
    "Computer Networks",
    "Java",
    "All",
  ];

  async function loadHistory() {
    try {
      const records = await getProgress();
      setHistory(records.reverse());
    } catch (err) {
      console.error("Could not load progress:", err);
    }
  }

  useEffect(() => {
    loadHistory();
    if (initialTopic) {
      setTopic(initialTopic);
    }
  }, [initialTopic]);

  const totalAttempts = history.length;
  const averageScore = totalAttempts
    ? Math.round(
        history.reduce((sum, item) => sum + item.percentage, 0) /
        totalAttempts
      )
    : 0;

  const totalCorrect = history.reduce(
    (sum, item) => sum + (item.correctAnswers || 0),
    0
  );

  function startOfflineQuiz(overrideDifficulty = null) {
    setLoading(false);
    setLoadError(null);
    setError("");
    const diffToUse = overrideDifficulty || difficulty;
    const filtered = questionBank.filter(
      (q) =>
        (subject === "All" || q.topic.toLowerCase() === subject.toLowerCase()) &&
        q.difficulty.toLowerCase() === diffToUse.toLowerCase() &&
        !previousSetIds.includes(q.id)
    );
    const chosen = filtered.length >= 3 ? filtered : questionBank.slice(0, 5);
    const fetchedQuestions = chosen.map((q, idx) => ({
      ...q,
      id: q.id || `bundled_${idx}_${Date.now()}`,
      source: "fallback",
    }));
    setPreviousSetIds(fetchedQuestions.map((q) => q.id));
    setQuestions(fetchedQuestions);
    setCurrent(0);
    setAnswers([]);
    setSelected("");
    setResult(null);
    setLastFeedback(null);
    setQuestionStartTime(Date.now());
    setPage("quiz");
  }

  async function startQuiz(overrideDifficulty = null) {
    setError("");
    setLoadError(null);
    setLoading(true);
    setProgressText("Checking pre-warmed AI question pool...");

    const diffToUse = overrideDifficulty || difficulty;
    let fetchedQuestions = [];

    // Live progress timer
    let step = 0;
    const progressTimer = setInterval(() => {
      step += 1;
      if (step === 1) setProgressText("Generating question 1 of 4 from local Gemma 4...");
      else if (step === 2) setProgressText("Validating question & options...");
      else if (step === 3) setProgressText("Generating question 2 of 4...");
      else if (step === 4) setProgressText("Generating question 3 of 4...");
      else if (step >= 5) setProgressText("Finalizing practice questions...");
    }, 4500);

    try {
      const apiRes = await generatePracticeQuestions({
        subject: subject === "All" ? "Python" : subject,
        topic: topic || undefined,
        difficulty: diffToUse,
        count: 4,
        timeoutMs: 45000,
      });

      clearInterval(progressTimer);

      if (apiRes && apiRes.questions && apiRes.questions.length > 0) {
        fetchedQuestions = apiRes.questions;
        setPreviousSetIds(fetchedQuestions.map((q) => q.id));
      } else {
        throw new Error("No questions returned from API");
      }
    } catch (apiErr) {
      clearInterval(progressTimer);
      console.warn("Backend practice generation failed or timed out:", apiErr);

      let reason = "no valid questions";
      const errStr = apiErr.message || "";
      if (errStr.includes("timed out") || errStr.includes("timeout")) {
        reason = "took too long (>45s)";
      } else if (errStr.includes("Failed to fetch") || errStr.includes("NetworkError")) {
        reason = "model offline";
      }

      setLoadError({
        message: errStr || "Local LLM question generation timed out or failed.",
        reason,
      });

      // Also prepare fallback questions as safety net
      const filtered = questionBank.filter(
        (q) =>
          (subject === "All" || q.topic.toLowerCase() === subject.toLowerCase()) &&
          q.difficulty.toLowerCase() === diffToUse.toLowerCase() &&
          !previousSetIds.includes(q.id)
      );
      const chosen = filtered.length >= 3 ? filtered : questionBank.slice(0, 4);
      fetchedQuestions = chosen.map((q, idx) => ({
        ...q,
        id: q.id || `bundled_${idx}_${Date.now()}`,
        source: "fallback",
      }));
      setPreviousSetIds(fetchedQuestions.map((q) => q.id));
    } finally {
      clearInterval(progressTimer);
      setLoading(false);
    }

    if (!fetchedQuestions.length) {
      setError("No questions available for this selection.");
      return;
    }

    setQuestions(fetchedQuestions);
    setCurrent(0);
    setAnswers([]);
    setSelected("");
    setResult(null);
    setLastFeedback(null);
    setQuestionStartTime(Date.now());
    setPage("quiz");
  }

  async function submitCurrentAnswer() {
    if (!selected) {
      setError("Please select an answer first.");
      return;
    }

    const currentQ = questions[current];
    const timeTaken = (Date.now() - questionStartTime) / 1000;
    setSaving(true);
    setError("");

    let isCorrect = false;
    let correctAnswer = currentQ.answer || "";
    let explanation = "";
    let misconception = null;

    if (currentQ.id) {
      try {
        const subRes = await submitPracticeAnswer({
          question_id: currentQ.id,
          selected,
          time_taken: timeTaken,
          hints_used: 0,
          subject: currentQ.subject || subject,
          topic: currentQ.topic || topic || subject,
          difficulty: currentQ.difficulty || difficulty,
          question: currentQ.question,
          options: currentQ.options,
          correct_answer: currentQ.answer,
        });

        isCorrect = subRes.correct;
        correctAnswer = subRes.correct_answer || currentQ.answer;
        explanation = subRes.explanation;
        misconception = subRes.misconception;
      } catch (err) {
        console.warn("API submit failed, using offline fallback grading:", err);
        isCorrect = selected.trim().toLowerCase() === (currentQ.answer || "").trim().toLowerCase();
        explanation = isCorrect
          ? "Correct! Well done."
          : `Incorrect. The correct answer was: ${currentQ.answer}`;
      }
    } else {
      isCorrect = selected.trim().toLowerCase() === (currentQ.answer || "").trim().toLowerCase();
      explanation = isCorrect
        ? "Correct! Well done."
        : `Incorrect. The correct answer was: ${currentQ.answer}`;
    }

    setSaving(false);

    const answerRecord = {
      question: currentQ.question,
      selected,
      correctAnswer,
      isCorrect,
      topic: currentQ.topic || topic || subject,
      explanation,
      misconception,
    };

    const updatedAnswers = [...answers, answerRecord];
    setAnswers(updatedAnswers);
    setLastFeedback(answerRecord);
    setPage("feedback");
  }

  async function nextOrFinish() {
    setSelected("");
    setError("");
    setLastFeedback(null);
    setQuestionStartTime(Date.now());

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
      setPage("quiz");
    } else {
      await finishQuiz(answers);
    }
  }

  async function finishQuiz(finalAnswers) {
    const correct = finalAnswers.filter((a) => a.isCorrect).length;
    const incorrect = finalAnswers.length - correct;
    const percentage = Math.round((correct / finalAnswers.length) * 100);

    const newResult = {
      subject,
      topic: topic || "Core",
      difficulty,
      totalQuestions: finalAnswers.length,
      correctAnswers: correct,
      incorrectAnswers: incorrect,
      percentage,
      answers: finalAnswers,
    };

    setResult(newResult);
    setPage("result");
    setSaving(true);

    try {
      await saveProgress(newResult);
      await loadHistory();
    } catch (err) {
      console.error("Could not save progress to IndexedDB:", err);
    } finally {
      setSaving(false);
    }
  }

  function getRecommendation() {
    if (!history.length) {
      return "Complete your first assessment to receive revision recommendations.";
    }

    const latest = history[0];
    const mistakes = (latest.answers || [])
      .filter((a) => !a.isCorrect)
      .map((a) => a.topic);

    if (!mistakes.length) {
      return "Great work! Revise once more and try the next difficulty level.";
    }

    return `Focus on revising: ${[...new Set(mistakes)].join(", ")}.`;
  }

  function goDashboard() {
    setPage("dashboard");
    setError("");
    setLastFeedback(null);
  }

  return (
    <div className="m7-dashboard">
      <PageHeader
        title="Assessment & Practice"
        description="Fresh AI-generated questions with anti-repeat tracking, adaptive difficulty, and misconception diagnosis."
      />

      {error && <div className="m7-error">{error}</div>}

      {page === "dashboard" && (
        <>
          <section className="m7-welcome">
            <h2>Welcome to your learning space!</h2>
            <p>
              Assess your knowledge, track your progress, and master concepts without seeing repeat questions.
            </p>
          </section>

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
              <h3>Correct Answers</h3>
              <strong>{totalCorrect}</strong>
            </div>
          </section>

          <div className="m7-content-grid">
            <section className="m7-panel">
              <h2>Start an Assessment</h2>
              <p>Choose your subject and difficulty level.</p>

              <label>Choose Subject</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                {subjects.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              {topic && (
                <div style={{ marginTop: 10, fontSize: 13, color: "#e95b30", fontWeight: 700 }}>
                  Active Focus Topic: {topic}{" "}
                  <button
                    onClick={() => setTopic("")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#6b7280",
                      cursor: "pointer",
                      fontSize: 12,
                      textDecoration: "underline",
                      marginLeft: 6,
                    }}
                  >
                    (Clear)
                  </button>
                </div>
              )}

              <label style={{ marginTop: 14 }}>Choose Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>

              {loadError && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 12, marginTop: 14, color: "#991b1b", fontSize: 13 }}>
                  <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <AlertCircle size={16} /> Generation Status: {loadError.reason}
                  </div>
                  <p style={{ margin: "2px 0 10px 0", fontSize: 12, color: "#7f1d1d" }}>{loadError.message}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => startQuiz()}
                      style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => startOfflineQuiz()}
                      style={{ background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      Use Offline Set
                    </button>
                  </div>
                </div>
              )}

              <button className="m7-primary" onClick={() => startQuiz()} disabled={loading} style={{ marginTop: 14 }}>
                {loading ? progressText : "Start Assessment"}
              </button>
            </section>

            <section className="m7-panel">
              <h2>Revision Recommendation</h2>
              <div className="m7-recommendation">{getRecommendation()}</div>

              <h3 style={{ marginTop: 25 }}>Recent Activity</h3>
              {history.length > 0 ? (
                <p>Latest score: {history[history.length - 1].percentage}%</p>
              ) : (
                <p>Your assessment activity will appear here.</p>
              )}
            </section>
          </div>
        </>
      )}

      {/* QUIZ VIEW */}
      {page === "quiz" && questions.length > 0 && (
        <section className="m7-panel m7-quiz">
          <div className="m7-quiz-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2>{subject} Assessment</h2>
              {questions[current].source === "ai" ? (
                <span
                  style={{
                    background: "#f3e8ff",
                    color: "#7e22ce",
                    border: "1px solid #d8b4fe",
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  ✨ AI Generated
                </span>
              ) : (
                <span
                  style={{
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    padding: "2px 8px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Offline Question Set
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span>
                Question {current + 1} of {questions.length}
              </span>
              <button
                onClick={() => startQuiz()}
                title="Generate a completely new set of questions"
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  color: "#475569",
                }}
              >
                <RotateCcw size={12} /> New Set
              </button>
            </div>
          </div>

          <div className="m7-progress-track">
            <div
              className="m7-progress-fill"
              style={{
                width: `${((current + 1) / questions.length) * 100}%`,
              }}
            />
          </div>

          <p style={{ fontSize: 13, color: "#64748b", margin: "10px 0" }}>
            Difficulty: <strong>{questions[current].difficulty || difficulty}</strong> · Topic:{" "}
            <strong>{questions[current].topic || subject}</strong>
          </p>

          <h2 className="m7-question">{questions[current].question}</h2>

          {questions[current].options.map((option, index) => (
            <button
              key={index}
              className={`m7-option ${selected === option ? "selected" : ""}`}
              onClick={() => setSelected(option)}
            >
              {option}
            </button>
          ))}

          <button
            className="m7-primary"
            onClick={submitCurrentAnswer}
            disabled={!selected || saving}
          >
            {saving ? "Evaluating Answer..." : "Submit Answer"}
          </button>
        </section>
      )}

      {/* FEEDBACK VIEW (Shown after each answer) */}
      {page === "feedback" && lastFeedback && (
        <section className="m7-panel m7-quiz">
          <div className="m7-quiz-header">
            <h2>Question {current + 1} Result</h2>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                fontWeight: 700,
                background: lastFeedback.isCorrect ? "#dcfce7" : "#fee2e2",
                color: lastFeedback.isCorrect ? "#15803d" : "#b91c1c",
              }}
            >
              {lastFeedback.isCorrect ? "Correct!" : "Incorrect"}
            </span>
          </div>

          <h3 style={{ margin: "14px 0 8px" }}>{lastFeedback.question}</h3>

          <div style={{ margin: "14px 0", fontSize: 14 }}>
            <p>
              <strong>Your Choice:</strong>{" "}
              <span style={{ color: lastFeedback.isCorrect ? "#15803d" : "#b91c1c" }}>
                {lastFeedback.selected}
              </span>
            </p>
            {!lastFeedback.isCorrect && (
              <p>
                <strong>Correct Answer:</strong>{" "}
                <span style={{ color: "#15803d", fontWeight: 600 }}>
                  {lastFeedback.correctAnswer}
                </span>
              </p>
            )}
          </div>

          {/* Explanation Box */}
          <div
            style={{
              padding: "14px 18px",
              background: "#f8fafc",
              borderLeft: `4px solid ${lastFeedback.isCorrect ? "#22c55e" : "#ef4444"}`,
              borderRadius: 8,
              fontSize: 14,
              lineHeight: 1.6,
              marginBottom: 16,
            }}
          >
            <strong>Explanation:</strong>
            <p style={{ margin: "6px 0 0" }}>{lastFeedback.explanation}</p>
          </div>

          {/* Misconception Alert if detected */}
          {lastFeedback.misconception && (
            <div
              style={{
                padding: "12px 16px",
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: 8,
                fontSize: 13,
                color: "#92400e",
                marginBottom: 18,
              }}
            >
              <strong>Detected Misconception:</strong>
              <p style={{ margin: "4px 0 0" }}>
                <em>Correction:</em> {lastFeedback.misconception.correction}
              </p>
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button className="m7-primary" onClick={nextOrFinish}>
              {current + 1 === questions.length ? "Finish Assessment" : "Next Question →"}
            </button>
            <button
              onClick={() => startQuiz()}
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "0 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: "#475569",
              }}
            >
              New Question Set
            </button>
          </div>
        </section>
      )}

      {/* RESULT VIEW */}
      {page === "result" && result && (
        <section className="m7-panel m7-result">
          <h2>Assessment Completed!</h2>
          <p>Your assessment summary</p>

          <div className="m7-stats">
            <div className="m7-stat-card">
              <h3>Score</h3>
              <strong>{result.percentage}%</strong>
            </div>

            <div className="m7-stat-card">
              <h3>Correct</h3>
              <strong>{result.correctAnswers}</strong>
            </div>

            <div className="m7-stat-card">
              <h3>Incorrect</h3>
              <strong>{result.incorrectAnswers}</strong>
            </div>
          </div>

          <h3>Revision Suggestions</h3>
          <div className="m7-recommendation">
            {result.answers.some((a) => !a.isCorrect)
              ? `Revise these topics: ${[
                  ...new Set(
                    result.answers.filter((a) => !a.isCorrect).map((a) => a.topic)
                  ),
                ].join(", ")}.`
              : "Excellent performance! Keep practising."}
          </div>

          {saving && <p>Saving your progress...</p>}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
            <button className="m7-primary" onClick={() => startQuiz()}>
              Try Another Set
            </button>

            <button className="m7-secondary" onClick={goDashboard}>
              Back to Dashboard
            </button>

            <button
              className="m7-secondary"
              onClick={() => {
                loadHistory();
                setPage("progress");
              }}
            >
              View My Progress
            </button>
          </div>
        </section>
      )}

      {/* LOCAL PROGRESS VIEW */}
      {page === "progress" && (
        <section className="m7-panel">
          <h2>Assessment History</h2>

          {history.length === 0 ? (
            <p>No assessment records yet.</p>
          ) : (
            history.map((item, index) => (
              <div className="m7-history-item" key={item.id || index}>
                <div>
                  <strong>{item.subject}</strong>
                  <p>
                    {item.difficulty} · {item.totalQuestions} questions
                  </p>
                  <p>
                    Correct: {item.correctAnswers} / {item.totalQuestions}
                  </p>
                </div>
                <strong>{item.percentage}%</strong>
              </div>
            ))
          )}

          <button className="m7-primary" onClick={goDashboard}>
            Back to Dashboard
          </button>
        </section>
      )}
    </div>
  );
}
