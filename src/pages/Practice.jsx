import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { PageHeader, Card, PrimaryButton, StarRating, Mascot, XPChip } from "../components/UI";
import { questionBank } from "../assessment/questionBank";
import { saveProgress, getProgress } from "../assessment/progressStorage";
import { generatePracticeQuestions, submitPracticeAnswer } from "../api/client";
import { useGrade } from "../context/GradeContext";
import { playSuccess, playNudge, playClick } from "../utils/sound";
import { getSubjectsForGrade, getBandForGrade } from "../config/bands";
import {
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  BookOpen,
  Award,
} from "lucide-react";

export default function Practice() {
  const { activeGrade } = useGrade();
  const [page, setPage] = useState("dashboard"); // 'dashboard', 'quiz', 'feedback', 'result'
  const [subject, setSubject] = useState("Maths");
  const [difficulty, setDifficulty] = useState("Beginner");
  const grade = activeGrade || "Class 3";

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState("");
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isApiMode, setIsApiMode] = useState(true);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [earnedXpTotal, setEarnedXpTotal] = useState(0);

  const subjects = getSubjectsForGrade(grade);
  const currentBand = getBandForGrade(grade);

  // Kid-friendly fallback question bank for Class 3-4
  const kidFallbackBank = [
    {
      id: "math_q1",
      topic: "Numbers",
      subject: "Maths",
      difficulty: "Beginner",
      question: "In the number 345, which digit is in the tens place?",
      options: ["4", "3", "5", "0"],
      answer: "4",
      explanation: "In 345, 5 is ones, 4 is tens (meaning 40), and 3 is hundreds.",
    },
    {
      id: "math_q2",
      topic: "Addition",
      subject: "Maths",
      difficulty: "Beginner",
      question: "What is 15 + 12?",
      options: ["27", "25", "30", "17"],
      answer: "27",
      explanation: "Add ones: 5 + 2 = 7. Add tens: 1 + 1 = 2. Total is 27!",
    },
    {
      id: "math_q3",
      topic: "Multiplication",
      subject: "Maths",
      difficulty: "Beginner",
      question: "What is 4 × 5?",
      options: ["20", "25", "15", "9"],
      answer: "20",
      explanation: "4 groups of 5 equals 20 (5 + 5 + 5 + 5 = 20).",
    },
    {
      id: "eng_q1",
      topic: "Nouns",
      subject: "English",
      difficulty: "Beginner",
      question: "Which word is a naming word (Noun)?",
      options: ["Elephant", "Quickly", "Sleep", "Brightly"],
      answer: "Elephant",
      explanation: "Elephant is an animal, so it is a naming word (Noun).",
    },
    {
      id: "eng_q2",
      topic: "Verbs",
      subject: "English",
      difficulty: "Beginner",
      question: "Which of these is an action word (Verb)?",
      options: ["Jump", "Happy", "Table", "Green"],
      answer: "Jump",
      explanation: "Jump tells an action you can do, so it is a verb!",
    },
    {
      id: "evs_q1",
      topic: "Plants",
      subject: "EVS",
      difficulty: "Beginner",
      question: "Which part of the plant drinks water from the soil?",
      options: ["Roots", "Leaves", "Flowers", "Bark"],
      answer: "Roots",
      explanation: "Roots grow deep in the soil to drink water and hold the plant firm.",
    },
    {
      id: "evs_q2",
      topic: "Animals",
      subject: "EVS",
      difficulty: "Beginner",
      question: "Which animal is a herbivore that eats green plants?",
      options: ["Cow", "Tiger", "Lion", "Eagle"],
      answer: "Cow",
      explanation: "Cows eat only grass and plants, making them gentle herbivores.",
    },
  ];

  const startRound = async () => {
    setLoading(true);
    let roundQuestions = [];
    let usingApi = true;

    try {
      const apiRes = await generatePracticeQuestions({
        subject,
        difficulty,
        count: 5,
        grade,
      });

      if (apiRes && apiRes.questions && apiRes.questions.length > 0) {
        roundQuestions = apiRes.questions;
      } else {
        throw new Error("No questions returned");
      }
    } catch (e) {
      usingApi = false;
      const matched = kidFallbackBank.filter(
        (q) => q.subject.toLowerCase() === subject.toLowerCase()
      );
      roundQuestions = matched.length >= 3 ? matched.slice(0, 5) : kidFallbackBank.slice(0, 5);
    } finally {
      setLoading(false);
    }

    setIsApiMode(usingApi);
    setQuestions(roundQuestions);
    setCurrent(0);
    setAnswers([]);
    setSelected("");
    setLastFeedback(null);
    setEarnedXpTotal(0);
    setPage("quiz");
  };

  const submitAnswer = async () => {
    if (!selected) return;

    const currentQ = questions[current];
    let isCorrect = false;
    let correctAnswer = currentQ.answer || "";
    let explanation = currentQ.explanation || "";

    if (isApiMode && currentQ.id) {
      try {
        const subRes = await submitPracticeAnswer({
          question_id: currentQ.id,
          selected,
          time_taken: 10,
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
        explanation = subRes.explanation || explanation;
      } catch (e) {
        isCorrect = selected.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      }
    } else {
      isCorrect = selected.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    }

    if (isCorrect) {
      playSuccess();
      setEarnedXpTotal((prev) => prev + 15);
    } else {
      playNudge();
      setEarnedXpTotal((prev) => prev + 5);
    }

    const feedbackObj = {
      isCorrect,
      selected,
      correctAnswer,
      explanation,
      questionText: currentQ.question,
    };

    setLastFeedback(feedbackObj);
    setAnswers((prev) => [...prev, feedbackObj]);
    setPage("feedback");
  };

  const nextQuestion = async () => {
    if (current + 1 < questions.length) {
      setCurrent((prev) => prev + 1);
      setSelected("");
      setLastFeedback(null);
      setPage("quiz");
    } else {
      // Completed round!
      const correctCount = answers.filter((a) => a.isCorrect).length;
      const pct = Math.round((correctCount / questions.length) * 100);

      // Save to IndexedDB
      try {
        await saveProgress({
          subject,
          difficulty,
          totalQuestions: questions.length,
          correctAnswers: correctCount,
          percentage: pct,
        });
      } catch (e) {
        console.warn("IndexedDB save fallback:", e);
      }

      if (pct >= 60) {
        try {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } catch (e) {}
      }

      setPage("result");
    }
  };

  // 1. DASHBOARD VIEW
  if (page === "dashboard") {
    return (
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <PageHeader
          eyebrow="FUN PRACTICE ROUNDS"
          title="Daily Practice & Quizzes 🎯"
          description="Test your skills in friendly 5-question rounds with Pari cheering you on!"
        />

        <Card style={{ padding: 32, textAlign: "center" }}>
          <Mascot mood="happy" size={130} />
          <h2 style={{ fontSize: 28, margin: "14px 0 6px", color: "var(--text-main)" }}>
            Ready for a 5-Question Challenge?
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: 17, maxWidth: 500, margin: "0 auto 28px" }}>
            Choose your favorite subject. Every question gives you XP points and celebratory stars!
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
            {subjects.map((sub) => {
              const isSelected = subject === sub;
              return (
                <button
                  key={sub}
                  onClick={() => { playClick(); setSubject(sub); }}
                  style={{
                    background: isSelected ? "var(--color-primary)" : "#F1F5F9",
                    color: isSelected ? "#FFFFFF" : "var(--text-main)",
                    border: "none",
                    borderRadius: "var(--radius-full)",
                    padding: "12px 24px",
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: "pointer",
                    transform: isSelected ? "scale(1.06)" : "scale(1)",
                    transition: "all 0.2s ease",
                    boxShadow: isSelected ? "var(--shadow-sm)" : "none",
                  }}
                >
                  {sub === "Maths" ? "🔢 " : sub === "English" ? "📖 " : sub === "EVS" ? "🌱 " : "💻 "}
                  {sub}
                </button>
              );
            })}
          </div>

          <PrimaryButton size="lg" disabled={loading} onClick={startRound} style={{ minWidth: 240 }}>
            {loading ? "Preparing Adventure..." : "Start Practice Round 🚀"}
          </PrimaryButton>
        </Card>
      </div>
    );
  }

  // 2. QUIZ QUESTION VIEW
  if (page === "quiz") {
    const currentQ = questions[current];
    return (
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Progress Dots Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-muted)" }}>
            Question {current + 1} of {questions.length}
          </span>

          <div style={{ display: "flex", gap: 8 }}>
            {questions.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background:
                    idx === current
                      ? "var(--color-primary)"
                      : idx < current
                      ? "var(--color-mint)"
                      : "#E2E8F0",
                  transform: idx === current ? "scale(1.3)" : "scale(1)",
                  transition: "all 0.2s ease",
                }}
              />
            ))}
          </div>
        </div>

        {/* Question Card */}
        <Card style={{ padding: 32, marginBottom: 20 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "var(--color-primary)",
              display: "block",
              marginBottom: 10,
            }}
          >
            {currentQ.topic || subject} Quest
          </span>

          <h2 style={{ fontSize: 24, lineHeight: 1.4, margin: "0 0 24px", color: "var(--text-main)" }}>
            {currentQ.question}
          </h2>

          {/* Huge Touch Answer Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {currentQ.options?.map((opt, optIdx) => {
              const isSelected = selected === opt;
              return (
                <button
                  key={optIdx}
                  onClick={() => {
                    playClick();
                    setSelected(opt);
                  }}
                  style={{
                    background: isSelected ? "var(--color-primary-bg)" : "#FFFFFF",
                    border: isSelected ? "3px solid var(--color-primary)" : "2px solid #E2E8F0",
                    borderRadius: "var(--radius-md)",
                    padding: "16px 22px",
                    fontSize: 18,
                    fontWeight: 700,
                    textAlign: "left",
                    color: "var(--text-main)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    transition: "all 0.15s ease",
                    boxShadow: isSelected ? "var(--shadow-sm)" : "none",
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: isSelected ? "var(--color-primary)" : "#F1F5F9",
                      color: isSelected ? "#FFFFFF" : "var(--text-muted)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 14,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Action Button */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <PrimaryButton size="lg" disabled={!selected} onClick={submitAnswer}>
            Check Answer ✓
          </PrimaryButton>
        </div>
      </div>
    );
  }

  // 3. IMMEDIATE FEEDBACK VIEW
  if (page === "feedback") {
    const isCorrect = lastFeedback?.isCorrect;
    return (
      <div style={{ maxWidth: 720, margin: "20px auto", textAlign: "center" }}>
        <Card
          style={{
            padding: 36,
            border: isCorrect ? "3px solid #86EFAC" : "3px solid #FDE68A",
            background: isCorrect ? "#F0FDF4" : "#FFFBEB",
          }}
        >
          <Mascot mood={isCorrect ? "cheering" : "happy"} size={130} />

          <h2
            style={{
              fontSize: 30,
              margin: "16px 0 8px",
              color: isCorrect ? "#15803D" : "#B45309",
            }}
          >
            {isCorrect ? "Super Star! That's Correct! 🌟" : "Good Try! You're Learning Fast! 💡"}
          </h2>

          <p style={{ fontSize: 18, color: "var(--text-main)", margin: "0 auto 20px", maxWidth: 520, lineHeight: 1.6 }}>
            {lastFeedback?.explanation ||
              (isCorrect
                ? "Wonderful job! You got it completely right!"
                : `The correct answer is: ${lastFeedback?.correctAnswer}`)}
          </p>

          <XPChip xp={isCorrect ? 15 : 5} style={{ marginBottom: 24 }} />

          <div>
            <PrimaryButton size="lg" icon={ArrowRight} onClick={nextQuestion}>
              {current + 1 < questions.length ? "Next Question →" : "See My Stars! 🏆"}
            </PrimaryButton>
          </div>
        </Card>
      </div>
    );
  }

  // 4. ROUND SUMMARY VIEW
  if (page === "result") {
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const stars = correctCount >= 4 ? 3 : correctCount >= 2 ? 2 : 1;

    return (
      <div style={{ maxWidth: 680, margin: "20px auto", textAlign: "center" }}>
        <Card style={{ padding: 42 }}>
          <Mascot mood="cheering" size={140} />

          <h2 style={{ fontSize: 32, margin: "14px 0 4px", color: "var(--text-main)" }}>
            Adventure Round Completed!
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: 17, marginBottom: 20 }}>
            You scored {correctCount} out of {questions.length} questions correctly!
          </p>

          <div style={{ marginBottom: 24 }}>
            <StarRating stars={stars} max={3} size={48} />
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 32 }}>
            <XPChip xp={earnedXpTotal} />
          </div>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <PrimaryButton size="lg" icon={RotateCcw} onClick={startRound}>
              Play Another Round 🔄
            </PrimaryButton>

            <PrimaryButton size="lg" variant="secondary" onClick={() => setPage("dashboard")}>
              Back to Home
            </PrimaryButton>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
