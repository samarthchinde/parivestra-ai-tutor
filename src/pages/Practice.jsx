import { useEffect, useState } from "react";
import { PageHeader } from "../components/UI";
import { questionBank } from "../assessment/questionBank";
import { saveProgress, getProgress } from "../assessment/progressStorage";
import { generatePracticeQuestions, submitPracticeAnswer } from "../api/client";
import "../assessment/assessment.css";

export default function Practice() {
  const [page, setPage] = useState("dashboard"); // dashboard, quiz, feedback, result, progress
  const [subject, setSubject] = useState("Python");
  const [difficulty, setDifficulty] = useState("Beginner");
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState("");
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [isApiMode, setIsApiMode] = useState(true);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [lastFeedback, setLastFeedback] = useState(null);

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
  }, []);

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

  async function startQuiz() {
    setError("");
    setLoading(true);

    let fetchedQuestions = [];
    let usingApi = true;

    try {
      const apiRes = await generatePracticeQuestions({
        subject: subject === "All" ? "Python" : subject,
        difficulty,
        count: 5,
      });

      if (apiRes && apiRes.questions && apiRes.questions.length > 0) {
        fetchedQuestions = apiRes.questions;
      } else {
        throw new Error("No questions returned from API");
      }
    } catch (apiErr) {
      console.warn("Backend practice generation unreachable, using local fallback:", apiErr);
      usingApi = false;
      const filtered = questionBank.filter(
        (q) =>
          (subject === "All" || q.topic.toLowerCase() === subject.toLowerCase()) &&
          q.difficulty.toLowerCase() === difficulty.toLowerCase()
      );
      fetchedQuestions = filtered.length > 0 ? filtered : questionBank.slice(0, 5);
    } finally {
      setLoading(false);
    }

    if (!fetchedQuestions.length) {
      setError("No questions available for this selection.");
      return;
    }

    setIsApiMode(usingApi);
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

    if (isApiMode && currentQ.id) {
      try {
        const subRes = await submitPracticeAnswer({
          question_id: currentQ.id,
          selected,
          time_taken: timeTaken,
          hints_used: 0,
          subject: currentQ.subject || subject,
          topic: currentQ.topic || subject,
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
        console.warn("API submit failed, falling back to local grading:", err);
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
      topic: currentQ.topic || subject,
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
        description="Test your knowledge with AI-generated or syllabus MCQs, track mastery, and identify misconceptions."
      />

      {error && <div className="m7-error">{error}</div>}

      {page === "dashboard" && (
        <>
          <section className="m7-welcome">
            <h2>Welcome to your learning space!</h2>
            <p>
              Assess your knowledge, track your progress, and identify topics that need more practice.
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

              <label>Choose Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>

              <button className="m7-primary" onClick={startQuiz} disabled={loading}>
                {loading ? "Generating Questions..." : "Start Assessment"}
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
            <h2>{subject} Assessment {isApiMode && <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>• AI Active</span>}</h2>
            <span>
              Question {current + 1} of {questions.length}
            </span>
          </div>

          <div className="m7-progress-track">
            <div
              className="m7-progress-fill"
              style={{
                width: `${((current + 1) / questions.length) * 100}%`,
              }}
            />
          </div>

          <p>Difficulty: {difficulty} · Topic: {questions[current].topic || subject}</p>

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
            {saving ? "Submitting..." : "Submit Answer"}
          </button>
        </section>
      )}

      {/* FEEDBACK VIEW (Shown after each answer) */}
      {page === "feedback" && lastFeedback && (
        <section className="m7-panel m7-quiz">
          <div className="m7-quiz-header">
            <h2>Question {current + 1} Feedback</h2>
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
              <strong>Conceptual Insight:</strong>
              <p style={{ margin: "4px 0 0" }}>
                <em>Correction:</em> {lastFeedback.misconception.correction}
              </p>
            </div>
          )}

          <button className="m7-primary" onClick={nextOrFinish}>
            {current + 1 === questions.length ? "Finish Assessment" : "Next Question →"}
          </button>
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

          <button className="m7-primary" onClick={goDashboard}>
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
