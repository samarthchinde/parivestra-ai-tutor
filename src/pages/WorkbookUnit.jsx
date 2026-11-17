import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  MessageCircle,
  Sparkles,
  Star,
  Volume2,
} from "lucide-react";
import Mascot, { GRADE_MASCOT_COLORS } from "../components/Mascot";
import ActivityEngine from "../components/workbook/ActivityEngine";
import {
  getWorkbookUnit,
  submitWorkbookReflection,
  submitWorkbookSelfCheck,
} from "../api/client";

export default function WorkbookUnit() {
  const { grade: gradeParam, unitNumber: unitParam } = useParams();
  const grade = parseInt(gradeParam || "3", 10);
  const unitNumber = parseInt(unitParam || "1", 10);

  const [activeTab, setActiveTab] = useState("learn"); // 'learn', 'activities', 'reflect'
  const [unitData, setUnitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reflection state
  const [reflectionText, setReflectionText] = useState("");
  const [reflectionFeedback, setReflectionFeedback] = useState(null);
  const [savingReflection, setSavingReflection] = useState(false);

  // Self-check stars state
  const [stars, setStars] = useState(3);
  const [savedSelfCheck, setSavedSelfCheck] = useState(false);

  const navigate = useNavigate();
  const themeColors = GRADE_MASCOT_COLORS[grade] || GRADE_MASCOT_COLORS[3];

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getWorkbookUnit(grade, unitNumber)
      .then((data) => {
        if (!mounted) return;
        setUnitData(data.unit);
        if (data.unit.user_progress?.reflection_text) {
          setReflectionText(data.unit.user_progress.reflection_text);
        }
        if (data.unit.user_progress?.reflection_feedback) {
          setReflectionFeedback(data.unit.user_progress.reflection_feedback);
        }
        if (data.unit.user_progress?.stars) {
          setStars(data.unit.user_progress.stars);
          setSavedSelfCheck(data.unit.user_progress.status === "completed");
        }
        setLoading(false);
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [grade, unitNumber]);

  const handleSpeak = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSaveReflection = async () => {
    if (!reflectionText.trim()) return;
    setSavingReflection(true);
    try {
      const res = await submitWorkbookReflection(grade, unitNumber, reflectionText);
      setReflectionFeedback(res.feedback);
    } catch (err) {
      console.error("Reflection error:", err);
    } finally {
      setSavingReflection(false);
    }
  };

  const handleSaveSelfCheck = async (selectedStars) => {
    setStars(selectedStars);
    try {
      await submitWorkbookSelfCheck(grade, unitNumber, selectedStars);
      setSavedSelfCheck(true);
    } catch (err) {
      console.error("Self check error:", err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "4rem", textAlign: "center" }}>
        <Mascot mood="thinking" grade={grade} size={100} />
        <h2 style={{ fontFamily: "var(--font-heading)", marginTop: "1rem" }}>
          Opening Unit {unitNumber}...
        </h2>
      </div>
    );
  }

  if (error || !unitData) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <Mascot mood="oops" grade={grade} size={90} />
        <h2>Could not find Unit {unitNumber}</h2>
        <Link to={`/workbook?grade=${grade}`} style={{ color: themeColors.primary, fontWeight: "700" }}>
          Return to Workbook
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "980px",
        margin: "0 auto",
        padding: "1.5rem 1rem 4rem",
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <Link
          to={`/workbook?grade=${grade}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "var(--text-muted)",
            textDecoration: "none",
            fontWeight: "700",
            fontSize: "0.95rem",
          }}
        >
          <ArrowLeft size={18} /> Grade {grade} Workbook
        </Link>

        {/* Tab Switcher */}
        <div
          style={{
            display: "flex",
            background: "#FFFFFF",
            padding: "0.35rem",
            borderRadius: "14px",
            border: "1px solid #E2E8F0",
            boxShadow: "var(--shadow-sm)",
            gap: "0.3rem",
          }}
        >
          <button
            onClick={() => setActiveTab("learn")}
            style={{
              border: "none",
              padding: "0.45rem 1rem",
              borderRadius: "10px",
              fontWeight: "800",
              fontSize: "0.9rem",
              cursor: "pointer",
              background: activeTab === "learn" ? themeColors.primary : "transparent",
              color: activeTab === "learn" ? "#FFFFFF" : "var(--text-muted)",
              transition: "all 0.15s ease",
            }}
          >
            1. Let's Learn
          </button>
          <button
            onClick={() => setActiveTab("activities")}
            style={{
              border: "none",
              padding: "0.45rem 1rem",
              borderRadius: "10px",
              fontWeight: "800",
              fontSize: "0.9rem",
              cursor: "pointer",
              background: activeTab === "activities" ? themeColors.primary : "transparent",
              color: activeTab === "activities" ? "#FFFFFF" : "var(--text-muted)",
              transition: "all 0.15s ease",
            }}
          >
            2. Activities ({unitData.activities?.length || 2})
          </button>
          <button
            onClick={() => setActiveTab("reflect")}
            style={{
              border: "none",
              padding: "0.45rem 1rem",
              borderRadius: "10px",
              fontWeight: "800",
              fontSize: "0.9rem",
              cursor: "pointer",
              background: activeTab === "reflect" ? themeColors.primary : "transparent",
              color: activeTab === "reflect" ? "#FFFFFF" : "var(--text-muted)",
              transition: "all 0.15s ease",
            }}
          >
            3. Reflect & I Can
          </button>
        </div>
      </div>

      {/* Unit Title Header */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "20px",
          padding: "1.5rem 1.75rem",
          border: `1.5px solid ${themeColors.primary}30`,
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.75rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
            <span
              style={{
                background: themeColors.primary,
                color: "#FFFFFF",
                padding: "0.2rem 0.65rem",
                borderRadius: "8px",
                fontWeight: "900",
                fontSize: "0.85rem",
              }}
            >
              UNIT {unitData.number}
            </span>
            <span
              style={{
                background: `${themeColors.secondary}20`,
                color: themeColors.secondary,
                padding: "0.2rem 0.75rem",
                borderRadius: "9999px",
                fontWeight: "800",
                fontSize: "0.8rem",
              }}
            >
              Big idea · {unitData.big_idea}
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600" }}>
              p.{unitData.page}
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.85rem",
              fontFamily: "var(--font-heading)",
              color: "var(--text-main)",
            }}
          >
            {unitData.title}
          </h1>
        </div>

        <Mascot mood="happy" grade={grade} size={64} />
      </div>

      {/* =========================================================
          TAB 1: LET'S LEARN
          ========================================================= */}
      {activeTab === "learn" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Main Story & Explanations Card */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "20px",
              padding: "1.75rem",
              border: "1px solid #E2E8F0",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.35rem",
                  fontFamily: "var(--font-heading)",
                  color: "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <BookOpen size={22} color={themeColors.primary} /> Let's Learn
              </h2>
              <button
                onClick={() => handleSpeak(unitData.learn_paragraphs?.join(". "))}
                aria-label="Read text aloud"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.4rem 0.8rem",
                  borderRadius: "10px",
                  border: "1px solid #CBD5E1",
                  background: "#F8FAFC",
                  color: "var(--text-main)",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                <Volume2 size={16} /> Read to Me
              </button>
            </div>

            <div style={{ fontSize: "1.1rem", lineHeight: "1.7", color: "#334155" }}>
              {unitData.learn_paragraphs?.map((p, idx) => (
                <p key={idx} style={{ margin: "0 0 1rem" }}>
                  {p}
                </p>
              ))}
            </div>
          </div>

          {/* New Words Section */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "20px",
              padding: "1.5rem",
              border: "1px solid #E2E8F0",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <h3
              style={{
                margin: "0 0 1rem",
                fontSize: "1.2rem",
                fontFamily: "var(--font-heading)",
                color: "var(--text-main)",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <Sparkles size={20} color={themeColors.secondary} /> New Words in this Unit
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1rem",
              }}
            >
              {unitData.new_words?.map((wordObj, idx) => (
                <div
                  key={idx}
                  style={{
                    background: `${themeColors.secondary}0D`,
                    border: `1.5px solid ${themeColors.secondary}35`,
                    borderRadius: "14px",
                    padding: "1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontWeight: "900",
                        fontSize: "1.05rem",
                        color: themeColors.secondary,
                      }}
                    >
                      {wordObj.term}
                    </span>
                    <button
                      onClick={() => handleSpeak(`${wordObj.term}: ${wordObj.definition}`)}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: themeColors.secondary,
                        padding: "2px",
                      }}
                    >
                      <Volume2 size={15} />
                    </button>
                  </div>
                  <p style={{ margin: "0.35rem 0 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                    {wordObj.definition}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Did You Know? Speech Bubble */}
          {unitData.did_you_know && (
            <div
              style={{
                background: "#FEF3C7",
                border: "2px solid #F59E0B",
                borderRadius: "20px",
                padding: "1.25rem 1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "1.25rem",
              }}
            >
              <Mascot mood="happy" grade={grade} size={60} />
              <div>
                <div
                  style={{
                    fontWeight: "900",
                    fontSize: "0.85rem",
                    color: "#B45309",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "0.2rem",
                  }}
                >
                  Did You Know?
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: "700", color: "#78350F" }}>
                  "{unitData.did_you_know}"
                </div>
              </div>
            </div>
          )}

          {/* Think & Talk Card */}
          {unitData.think_and_talk && (
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: "20px",
                padding: "1.5rem",
                border: "1.5px solid #CBD5E1",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 0.5rem",
                  fontSize: "1.2rem",
                  fontFamily: "var(--font-heading)",
                  color: "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <MessageCircle size={20} color={themeColors.primary} /> Think & Talk
              </h3>
              <p style={{ fontSize: "1.1rem", fontWeight: "700", color: "#1E293B", margin: "0 0 1rem" }}>
                "{unitData.think_and_talk}"
              </p>

              <textarea
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder="Share your thought with Pari... (e.g. I think... because...)"
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  borderRadius: "14px",
                  border: "1.5px solid #CBD5E1",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "0.75rem",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Personal info guard active: never share phone or address.
                </span>
                <button
                  onClick={handleSaveReflection}
                  disabled={savingReflection || !reflectionText.trim()}
                  style={{
                    background: themeColors.primary,
                    color: "#FFFFFF",
                    border: "none",
                    padding: "0.55rem 1.25rem",
                    borderRadius: "10px",
                    fontWeight: "800",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                    opacity: savingReflection || !reflectionText.trim() ? 0.6 : 1,
                  }}
                >
                  {savingReflection ? "Thinking..." : "Share with Pari (+10 XP)"}
                </button>
              </div>

              {reflectionFeedback && (
                <div
                  style={{
                    marginTop: "1rem",
                    background: `${themeColors.primary}12`,
                    borderLeft: `4px solid ${themeColors.primary}`,
                    borderRadius: "0 12px 12px 0",
                    padding: "0.85rem 1.15rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <Mascot mood="happy" grade={grade} size={45} />
                  <p style={{ margin: 0, fontSize: "0.95rem", color: "#1E293B", fontWeight: "600" }}>
                    {reflectionFeedback}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action footer navigating to Tab 2 */}
          <div style={{ textAlign: "right" }}>
            <button
              onClick={() => setActiveTab("activities")}
              style={{
                background: themeColors.primary,
                color: "#FFFFFF",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "14px",
                fontWeight: "900",
                fontSize: "1rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
              }}
            >
              Continue to Activities <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: ACTIVITIES (ACTIVITY 1 & ACTIVITY 2)
          ========================================================= */}
      {activeTab === "activities" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {unitData.activities?.map((act, index) => (
            <ActivityEngine
              key={act.id}
              activity={act}
              grade={grade}
              unitNumber={unitNumber}
              index={index + 1}
              themeColors={themeColors}
            />
          ))}

          {/* Footer to Step 3 */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
            <button
              onClick={() => setActiveTab("learn")}
              style={{
                background: "transparent",
                border: "1.5px solid #CBD5E1",
                padding: "0.6rem 1.25rem",
                borderRadius: "12px",
                fontWeight: "800",
                cursor: "pointer",
              }}
            >
              &larr; Back to Let's Learn
            </button>
            <button
              onClick={() => setActiveTab("reflect")}
              style={{
                background: themeColors.primary,
                color: "#FFFFFF",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "14px",
                fontWeight: "900",
                fontSize: "1rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
              }}
            >
              Finish Unit with Self-Check &rarr;
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 3: REFLECT & I CAN SELF CHECK
          ========================================================= */}
      {activeTab === "reflect" && (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "24px",
            padding: "2.5rem 2rem",
            border: "1px solid #E2E8F0",
            boxShadow: "var(--shadow-md)",
            textAlign: "center",
          }}
        >
          <Mascot mood="cheering" grade={grade} size={110} />

          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.85rem",
              margin: "1rem 0 0.5rem",
              color: "var(--text-main)",
            }}
          >
            Unit Self-Check
          </h2>
          <p
            style={{
              fontSize: "1.2rem",
              fontWeight: "700",
              color: themeColors.primary,
              margin: "0 0 1.5rem",
            }}
          >
            "{unitData.self_check}"
          </p>

          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", margin: "0 0 1rem" }}>
            How confident do you feel? Select your stars:
          </p>

          {/* 3 Stars Selector */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            {[1, 2, 3].map((starIdx) => (
              <button
                key={starIdx}
                onClick={() => handleSaveSelfCheck(starIdx)}
                style={{
                  border: "none",
                  background: starIdx <= stars ? "#FEF3C7" : "#F1F5F9",
                  padding: "0.85rem 1.25rem",
                  borderRadius: "16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  transition: "transform 0.15s ease",
                  transform: starIdx === stars ? "scale(1.08)" : "scale(1)",
                }}
              >
                <Star
                  size={28}
                  fill={starIdx <= stars ? "#F59E0B" : "none"}
                  color={starIdx <= stars ? "#F59E0B" : "#94A3B8"}
                />
                <span
                  style={{
                    fontWeight: "900",
                    fontSize: "1.05rem",
                    color: starIdx <= stars ? "#B45309" : "#64748B",
                  }}
                >
                  {starIdx === 1 ? "Learning" : starIdx === 2 ? "Getting Good" : "Mastered!"}
                </span>
              </button>
            ))}
          </div>

          {savedSelfCheck && (
            <div
              style={{
                background: "#F0FDF4",
                border: "1.5px solid #22C55E",
                borderRadius: "16px",
                padding: "1rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#16A34A",
                fontWeight: "800",
                fontSize: "1rem",
                marginBottom: "2rem",
              }}
            >
              <CheckCircle2 size={20} /> Unit {unitNumber} Completed! (+15 XP awarded)
            </div>
          )}

          {/* Next Steps Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <Link
              to={`/workbook?grade=${grade}`}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "12px",
                border: "1.5px solid #CBD5E1",
                textDecoration: "none",
                color: "var(--text-main)",
                fontWeight: "800",
                fontSize: "0.95rem",
              }}
            >
              Back to Workbook Syllabus
            </Link>

            {unitNumber < 8 ? (
              <button
                onClick={() => {
                  navigate(`/workbook/${grade}/unit/${unitNumber + 1}`);
                  setActiveTab("learn");
                }}
                style={{
                  background: themeColors.primary,
                  color: "#FFFFFF",
                  border: "none",
                  padding: "0.75rem 1.75rem",
                  borderRadius: "12px",
                  fontWeight: "900",
                  fontSize: "1rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                }}
              >
                Go to Unit {unitNumber + 1} <ArrowRight size={18} />
              </button>
            ) : (
              <Link
                to={`/workbook/${grade}/project`}
                style={{
                  background: themeColors.primary,
                  color: "#FFFFFF",
                  padding: "0.75rem 1.75rem",
                  borderRadius: "12px",
                  fontWeight: "900",
                  fontSize: "1rem",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                }}
              >
                Start Final Project Capstone <Sparkles size={18} />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

