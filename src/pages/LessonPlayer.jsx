import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getLessonContent, completeLesson } from "../api/client";
import {
  PageHeader,
  Card,
  PrimaryButton,
  Badge,
  ProgressBar,
  Mascot,
  Toast,
} from "../components/UI";
import StoryIllustration from "../components/StoryIllustrations";
import { playSuccess, playNudge } from "../utils/sound";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Award,
  RefreshCw,
  HelpCircle,
  CheckSquare,
  Square,
} from "lucide-react";

export default function LessonPlayer() {
  const { id: courseId, lessonId } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Story state
  const [slideIndex, setSlideIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Practice state
  const [qIndex, setQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Activity state
  const [activityDone, setActivityDone] = useState(false);

  // Completion state
  const [isCompleted, setIsCompleted] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      setSlideIndex(0);
      setQIndex(0);
      setSelectedOption(null);
      setIsSubmitted(false);
      setScore(0);
      setIsCompleted(false);
      setActivityDone(false);

      try {
        const data = await getLessonContent(courseId, lessonId);
        setLesson(data);
      } catch (err) {
        console.error("Failed to load lesson:", err);
        setError("Could not load lesson content.");
      } finally {
        setLoading(false);
      }
    }
    load();

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [courseId, lessonId]);

  // Read aloud helper
  const handleToggleSpeech = (textToRead) => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.rate = 0.88;
    utterance.pitch = 1.1;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleFinishLesson = async (finalScore = 100) => {
    try {
      const res = await completeLesson(courseId, lessonId, finalScore);
      setXpAwarded(res.xp_awarded || lesson?.xp || 20);
      setIsCompleted(true);
      playSuccess();
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
      setToastMsg(`🌟 Quest completed! +${res.xp_awarded || lesson?.xp || 20} XP!`);
    } catch (err) {
      console.error("Failed to complete lesson:", err);
      // Still show completed state locally
      setIsCompleted(true);
      setXpAwarded(lesson?.xp || 20);
      playSuccess();
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <Mascot mood="thinking" size={90} message="Preparing your interactive quest..." />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <Mascot mood="oops" size={80} message={error || "Lesson not found!"} />
        <div style={{ marginTop: 20 }}>
          <PrimaryButton onClick={() => navigate(`/courses/${courseId}`)}>
            <ArrowLeft size={18} /> Back to Course
          </PrimaryButton>
        </div>
      </div>
    );
  }

  const content = lesson.content || {};

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", paddingBottom: 60 }}>
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg("")} />}

      {/* Top Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          gap: 16,
        }}
      >
        <button
          onClick={() => navigate(`/courses/${courseId}`)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.95rem",
            fontWeight: 700,
            cursor: "pointer",
            padding: "6px 12px",
            borderRadius: 12,
          }}
        >
          <ArrowLeft size={18} /> Back to Syllabus
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              background: "rgba(255, 201, 60, 0.25)",
              color: "#B45309",
              padding: "5px 12px",
              borderRadius: 20,
              fontSize: "0.85rem",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Sparkles size={14} /> +{lesson.xp} XP
          </span>
          <Badge variant="blue">{lesson.type.toUpperCase()}</Badge>
        </div>
      </div>

      {/* Main Quest Container */}
      {!isCompleted ? (
        <>
          {/* 1. STORY LESSON TYPE */}
          {lesson.type === "story" && (
            <div
              style={{
                background: "white",
                borderRadius: "var(--radius-xl)",
                border: "2px solid var(--border)",
                boxShadow: "var(--shadow-md)",
                padding: "32px 36px",
              }}
            >
              {(() => {
                const slides = content.slides || [
                  {
                    title: lesson.title,
                    text: content.raw || "Enjoy exploring this story concept with Pari!",
                    illustration: "owl",
                  },
                ];
                const currentSlide = slides[slideIndex] || slides[0];
                const isLastSlide = slideIndex === slides.length - 1;

                return (
                  <div>
                    {/* Slide progress header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 24,
                      }}
                    >
                      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-muted)" }}>
                        Slide {slideIndex + 1} of {slides.length}
                      </span>
                      {/* Audio Read To Me button */}
                      <button
                        onClick={() => handleToggleSpeech(`${currentSlide.title}. ${currentSlide.text}`)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: isSpeaking ? "#FEE2E2" : "#EFF6FF",
                          color: isSpeaking ? "#B91C1C" : "var(--kid-maths)",
                          border: "none",
                          padding: "6px 14px",
                          borderRadius: 20,
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        {isSpeaking ? "Stop" : "Read to me"}
                      </button>
                    </div>

                    {/* Slide illustration */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        minHeight: 200,
                        background: "var(--surface)",
                        borderRadius: "var(--radius-lg)",
                        marginBottom: 24,
                        padding: 20,
                      }}
                    >
                      <StoryIllustration
                        name={currentSlide.illustration || "owl"}
                        size={170}
                      />
                    </div>

                    {/* Slide text content */}
                    <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 32px auto" }}>
                      <h2
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontSize: "1.7rem",
                          color: "var(--text)",
                          marginBottom: 12,
                        }}
                      >
                        {currentSlide.title}
                      </h2>
                      <p
                        style={{
                          fontSize: "1.2rem",
                          lineHeight: 1.6,
                          color: "var(--text)",
                          fontFamily: "var(--font-body)",
                        }}
                      >
                        {currentSlide.text}
                      </p>
                    </div>

                    {/* Navigation Buttons */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingTop: 16,
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <button
                        disabled={slideIndex === 0}
                        onClick={() => {
                          if (window.speechSynthesis) window.speechSynthesis.cancel();
                          setIsSpeaking(false);
                          setSlideIndex((prev) => Math.max(0, prev - 1));
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: slideIndex === 0 ? "#F1F5F9" : "var(--surface)",
                          color: slideIndex === 0 ? "#94A3B8" : "var(--text)",
                          border: "1px solid var(--border)",
                          padding: "10px 18px",
                          borderRadius: 12,
                          fontWeight: 700,
                          cursor: slideIndex === 0 ? "not-allowed" : "pointer",
                        }}
                      >
                        <ChevronLeft size={18} /> Previous
                      </button>

                      <div style={{ display: "flex", gap: 6 }}>
                        {slides.map((_, idx) => (
                          <div
                            key={idx}
                            style={{
                              width: idx === slideIndex ? 22 : 8,
                              height: 8,
                              borderRadius: 4,
                              background: idx === slideIndex ? "var(--kid-grape)" : "#CBD5E1",
                              transition: "all 0.2s",
                            }}
                          />
                        ))}
                      </div>

                      {isLastSlide ? (
                        <PrimaryButton
                          onClick={() => handleFinishLesson(100)}
                          style={{
                            background: "var(--kid-mint)",
                            borderColor: "#059669",
                            padding: "10px 22px",
                          }}
                        >
                          Finish & Claim XP! 🌟
                        </PrimaryButton>
                      ) : (
                        <PrimaryButton
                          onClick={() => {
                            if (window.speechSynthesis) window.speechSynthesis.cancel();
                            setIsSpeaking(false);
                            setSlideIndex((prev) => prev + 1);
                          }}
                          style={{ padding: "10px 22px" }}
                        >
                          Next <ChevronRight size={18} />
                        </PrimaryButton>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 2. PRACTICE QUIZ LESSON TYPE */}
          {lesson.type === "practice" && (
            <div
              style={{
                background: "white",
                borderRadius: "var(--radius-xl)",
                border: "2px solid var(--border)",
                boxShadow: "var(--shadow-md)",
                padding: "32px 36px",
              }}
            >
              {(() => {
                const questions = content.questions || [];
                if (questions.length === 0) {
                  return (
                    <div style={{ textAlign: "center" }}>
                      <p>No practice questions for this lesson yet.</p>
                      <PrimaryButton onClick={() => handleFinishLesson(100)}>Mark Done</PrimaryButton>
                    </div>
                  );
                }

                const currentQ = questions[qIndex];
                const isLastQ = qIndex === questions.length - 1;

                const handleSelectOption = (opt) => {
                  if (isSubmitted) return;
                  setSelectedOption(opt);
                };

                const handleSubmitAnswer = () => {
                  if (!selectedOption || isSubmitted) return;
                  setIsSubmitted(true);
                  const isCorrect = selectedOption === currentQ.answer;
                  if (isCorrect) {
                    playSuccess();
                    setScore((s) => s + 1);
                  } else {
                    playNudge();
                  }
                };

                const handleNextQuestion = () => {
                  if (isLastQ) {
                    const finalPct = Math.round(((score + (selectedOption === currentQ.answer ? 1 : 0)) / questions.length) * 100);
                    handleFinishLesson(finalPct);
                  } else {
                    setQIndex((i) => i + 1);
                    setSelectedOption(null);
                    setIsSubmitted(false);
                  }
                };

                return (
                  <div>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-muted)" }}>
                        Question {qIndex + 1} of {questions.length}
                      </span>
                      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--kid-grape)" }}>
                        Score: {score}
                      </span>
                    </div>

                    <h2
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "1.5rem",
                        color: "var(--text)",
                        marginBottom: 24,
                        lineHeight: 1.4,
                      }}
                    >
                      {currentQ.question}
                    </h2>

                    {/* Options */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                      {(currentQ.options || []).map((opt, oIdx) => {
                        const isChosen = selectedOption === opt;
                        const isCorrectAnswer = opt === currentQ.answer;

                        let bg = "#F8FAFC";
                        let border = "2px solid #E2E8F0";
                        let textColor = "var(--text)";

                        if (isSubmitted) {
                          if (isCorrectAnswer) {
                            bg = "#DCFCE7";
                            border = "2px solid #16A34A";
                            textColor = "#15803D";
                          } else if (isChosen && !isCorrectAnswer) {
                            bg = "#FEE2E2";
                            border = "2px solid #DC2626";
                            textColor = "#B91C1C";
                          }
                        } else if (isChosen) {
                          bg = "rgba(138, 99, 242, 0.1)";
                          border = "2px solid var(--kid-grape)";
                        }

                        return (
                          <div
                            key={oIdx}
                            onClick={() => handleSelectOption(opt)}
                            style={{
                              padding: "16px 20px",
                              borderRadius: "var(--radius-md)",
                              background: bg,
                              border: border,
                              cursor: isSubmitted ? "default" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              transition: "all 0.18s ease",
                            }}
                          >
                            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: textColor }}>
                              {opt}
                            </span>
                            {isSubmitted && isCorrectAnswer && <CheckCircle2 size={22} color="#16A34A" />}
                          </div>
                        );
                      })}
                    </div>

                    {/* Feedback or Submit button */}
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16 }}>
                      {!isSubmitted ? (
                        <PrimaryButton
                          disabled={!selectedOption}
                          onClick={handleSubmitAnswer}
                          style={{ padding: "12px 28px", fontSize: "1rem" }}
                        >
                          Check Answer ✨
                        </PrimaryButton>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <span
                            style={{
                              fontWeight: 800,
                              color: selectedOption === currentQ.answer ? "#16A34A" : "#B45309",
                              fontSize: "1.05rem",
                            }}
                          >
                            {selectedOption === currentQ.answer ? "🎉 Brilliant! That's correct!" : "💡 Good try! Check the green answer above."}
                          </span>
                          <PrimaryButton
                            onClick={handleNextQuestion}
                            style={{ padding: "12px 24px", fontSize: "1rem" }}
                          >
                            {isLastQ ? "Finish Quiz & Claim XP! 🌟" : "Next Question →"}
                          </PrimaryButton>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 3. ACTIVITY LESSON TYPE */}
          {lesson.type === "activity" && (
            <div
              style={{
                background: "white",
                borderRadius: "var(--radius-xl)",
                border: "2px solid var(--border)",
                boxShadow: "var(--shadow-md)",
                padding: "32px 36px",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <StoryIllustration name="star" size={120} />
                <h2
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "1.8rem",
                    color: "var(--text)",
                    margin: "16px 0 8px 0",
                  }}
                >
                  Hands-On Real World Mission! 🎨
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "1.05rem" }}>
                  Step away from the screen for a minute and do this fun offline activity!
                </p>
              </div>

              <div
                style={{
                  background: "#FFF9F0",
                  border: "2px dashed #F59E0B",
                  borderRadius: "var(--radius-lg)",
                  padding: "24px 28px",
                  marginBottom: 28,
                }}
              >
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.25rem", color: "#B45309", margin: "0 0 10px 0" }}>
                  📋 Your Mission:
                </h3>
                <p style={{ fontSize: "1.15rem", lineHeight: 1.6, color: "var(--text)", margin: "0 0 16px 0" }}>
                  {content.instructions || "Complete the special project activity described in your course kit!"}
                </p>
                {content.goal && (
                  <p style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--kid-grape)", margin: 0 }}>
                    🎯 Goal: {content.goal}
                  </p>
                )}
              </div>

              {/* Checklist */}
              <div
                onClick={() => setActivityDone(!activityDone)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 20px",
                  borderRadius: "var(--radius-md)",
                  background: activityDone ? "#DCFCE7" : "#F8FAFC",
                  border: activityDone ? "2px solid #16A34A" : "2px solid #CBD5E1",
                  cursor: "pointer",
                  marginBottom: 28,
                  userSelect: "none",
                }}
              >
                {activityDone ? <CheckSquare size={24} color="#16A34A" /> : <Square size={24} color="#64748B" />}
                <span style={{ fontSize: "1.1rem", fontWeight: 700, color: activityDone ? "#15803D" : "var(--text)" }}>
                  I completed this hands-on activity!
                </span>
              </div>

              <div style={{ textAlign: "center" }}>
                <PrimaryButton
                  disabled={!activityDone}
                  onClick={() => handleFinishLesson(100)}
                  style={{
                    padding: "14px 32px",
                    fontSize: "1.1rem",
                    background: activityDone ? "var(--kid-mint)" : undefined,
                  }}
                >
                  I Did It! Claim XP! 🎉
                </PrimaryButton>
              </div>
            </div>
          )}
        </>
      ) : (
        /* CELEBRATION CARD */
        <div
          style={{
            background: "white",
            borderRadius: "var(--radius-xl)",
            border: "2px solid #A7F3D0",
            boxShadow: "var(--shadow-md)",
            padding: "48px 36px",
            textAlign: "center",
          }}
        >
          <Mascot mood="cheering" size={130} message="Woohoo! Quest Completed! 🌟" />

          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "2.2rem",
              color: "var(--text)",
              margin: "20px 0 10px 0",
            }}
          >
            Quest Accomplished!
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1.15rem", marginBottom: 24 }}>
            You earned <strong style={{ color: "#B45309" }}>+{xpAwarded} XP</strong> for completing{" "}
            <strong>{lesson.title}</strong>!
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <PrimaryButton
              onClick={() => navigate(`/courses/${courseId}`)}
              style={{ padding: "12px 28px", fontSize: "1rem" }}
            >
              Continue Course Roadmap 🗺️
            </PrimaryButton>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                padding: "12px 24px",
                borderRadius: 14,
                fontSize: "1rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Back to Home 🏠
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

