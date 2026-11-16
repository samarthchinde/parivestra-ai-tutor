import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  BookMarked,
  Award,
  Sparkles,
  ArrowRight,
  Star,
  CheckCircle2,
  BookOpen,
  FolderGit2,
  HelpCircle,
} from "lucide-react";
import Mascot, { GRADE_MASCOT_COLORS } from "../components/Mascot";
import { getWorkbook, getUserProfile } from "../api/client";

const GRADE_TITLES = {
  3: { title: "AI Explorers", tagline: "Notice · Sort · Think" },
  4: { title: "AI Builders", tagline: "Data · Train · Decide" },
  5: { title: "AI Innovators", tagline: "Learn · Create · Lead" },
  6: { title: "AI Thinkers", tagline: "Scope · Collect · Explore" },
  7: { title: "AI Makers", tagline: "See · Read · Code" },
  8: { title: "AI Engineers", tagline: "Train · Evaluate · Improve" },
  9: { title: "AI Analysts", tagline: "Analyse · Model · Question" },
  10: { title: "AI Leaders", tagline: "Build · Evaluate · Lead" },
};

export default function WorkbookHome() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [grade, setGrade] = useState(() => {
    const qGrade = searchParams.get("grade");
    if (qGrade) return parseInt(qGrade, 10);
    const savedGrade = localStorage.getItem("parivestra_grade") || "3";
    return parseInt(savedGrade.replace(/\D/g, "") || "3", 10);
  });

  const [loading, setLoading] = useState(true);
  const [workbook, setWorkbook] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getWorkbook(grade)
      .then((data) => {
        if (mounted) {
          setWorkbook(data);
          setLoading(false);
        }
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
  }, [grade]);

  const handleGradeChange = (newGrade) => {
    setGrade(newGrade);
    setSearchParams({ grade: newGrade });
  };

  const themeColors = GRADE_MASCOT_COLORS[grade] || GRADE_MASCOT_COLORS[3];

  if (loading) {
    return (
      <div className="workbook-loading-state" style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <Mascot mood="thinking" grade={grade} size={100} />
        <h2 style={{ fontFamily: "var(--font-heading)", marginTop: "1rem", color: "var(--text-main)" }}>
          Loading your AI Workbook...
        </h2>
      </div>
    );
  }

  if (error || !workbook) {
    return (
      <div className="workbook-error-state" style={{ padding: "3rem", textAlign: "center" }}>
        <Mascot mood="oops" grade={grade} size={100} />
        <h2>Could not load Grade {grade} Workbook</h2>
        <p style={{ color: "var(--text-muted)" }}>{error || "Unknown error occurred"}</p>
        <button
          onClick={() => handleGradeChange(3)}
          className="btn-primary"
          style={{ marginTop: "1rem", background: themeColors.primary }}
        >
          Go to Grade 3 AI Explorers
        </button>
      </div>
    );
  }

  const completedCount = workbook.units.filter((u) => u.status === "completed").length;
  const progressPercent = Math.round((completedCount / workbook.units.length) * 100);

  return (
    <div
      className="workbook-home-container"
      data-workbook-grade={grade}
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "1.5rem 1rem 4rem",
      }}
    >
      {/* Grade Selector Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: themeColors.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFF",
              fontWeight: "900",
              fontSize: "1.25rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
          >
            {grade}
          </div>
          <div>
            <h1
              style={{
                fontSize: "1.6rem",
                margin: 0,
                fontFamily: "var(--font-heading)",
                color: "var(--text-main)",
              }}
            >
              Grade {grade} · {workbook.edition_title}
            </h1>
            <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: "600" }}>
              {workbook.tagline}
            </p>
          </div>
        </div>

        {/* Grade switch pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "#FFFFFF",
            padding: "0.4rem",
            borderRadius: "9999px",
            boxShadow: "var(--shadow-sm)",
            border: "1px solid rgba(0,0,0,0.06)",
            overflowX: "auto",
            maxWidth: "100%",
          }}
        >
          {[3, 4, 5, 6, 7, 8, 9, 10].map((g) => {
            const isSelected = g === grade;
            return (
              <button
                key={g}
                onClick={() => handleGradeChange(g)}
                style={{
                  border: "none",
                  padding: "0.4rem 0.85rem",
                  borderRadius: "9999px",
                  fontWeight: "800",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  background: isSelected ? themeColors.primary : "transparent",
                  color: isSelected ? "#FFFFFF" : "var(--text-muted)",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                G{g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Welcome Banner */}
      <div
        style={{
          background: `linear-gradient(135deg, ${themeColors.primary}15 0%, #FFFFFF 100%)`,
          border: `2px solid ${themeColors.primary}30`,
          borderRadius: "24px",
          padding: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1.5rem",
          marginBottom: "2rem",
          boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ flex: "1 1 500px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: themeColors.primary,
              color: "#FFF",
              padding: "0.3rem 0.85rem",
              borderRadius: "9999px",
              fontWeight: "800",
              fontSize: "0.85rem",
              marginBottom: "0.75rem",
            }}
          >
            <Sparkles size={16} /> Official Parivestra AI Workbook
          </div>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "2rem",
              margin: "0 0 0.5rem",
              color: "var(--text-main)",
            }}
          >
            Welcome, {workbook.user?.display_name || "Explorer"}!
          </h2>
          <p
            style={{
              fontSize: "1.05rem",
              color: "var(--text-muted)",
              lineHeight: "1.6",
              margin: "0 0 1.25rem",
            }}
          >
            {workbook.welcome?.pari_tip ||
              "There are no wrong ideas in this workbook. Try your best, ask questions, and have fun learning about AI!"}
          </p>

          {/* Quick Progress Bar */}
          <div style={{ maxWidth: "400px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.9rem",
                fontWeight: "700",
                marginBottom: "0.4rem",
                color: "var(--text-main)",
              }}
            >
              <span>Workbook Completion</span>
              <span>
                {completedCount} of {workbook.units.length} Units ({progressPercent}%)
              </span>
            </div>
            <div
              style={{
                height: "10px",
                borderRadius: "9999px",
                background: "#E2E8F0",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPercent}%`,
                  background: themeColors.primary,
                  borderRadius: "9999px",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          </div>
        </div>

        {/* Mascot Avatar Display */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "1rem",
            background: "#FFFFFF",
            borderRadius: "20px",
            border: `1px solid ${themeColors.primary}25`,
            boxShadow: "var(--shadow-md)",
          }}
        >
          <Mascot mood="waving" grade={grade} size={130} />
          <span
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1rem",
              fontWeight: "800",
              color: themeColors.primary,
              marginTop: "0.5rem",
            }}
          >
            Pari · Your AI Buddy
          </span>
        </div>
      </div>

      {/* Auxiliary Workbook Cards (Word Bank, Capstone Project, Certificate) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2.5rem",
        }}
      >
        {/* Word Bank Card */}
        <Link
          to={`/workbook/word-bank?grade=${grade}`}
          style={{
            textDecoration: "none",
            background: "#FFFFFF",
            borderRadius: "20px",
            padding: "1.4rem",
            border: "1px solid #E2E8F0",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            alignItems: "center",
            gap: "1.25rem",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: `${themeColors.secondary}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: themeColors.secondary,
            }}
          >
            <BookMarked size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", color: "var(--text-main)" }}>AI Word Bank</h3>
              <ArrowRight size={18} color="var(--text-muted)" />
            </div>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>
              {workbook.glossary_mastered_count} of {workbook.glossary_count} vocabulary mastered
            </p>
          </div>
        </Link>

        {/* Final Project Card */}
        <Link
          to={`/workbook/${grade}/project`}
          style={{
            textDecoration: "none",
            background: "#FFFFFF",
            borderRadius: "20px",
            padding: "1.4rem",
            border: "1px solid #E2E8F0",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            alignItems: "center",
            gap: "1.25rem",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: `${themeColors.primary}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: themeColors.primary,
            }}
          >
            <FolderGit2 size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", color: "var(--text-main)" }}>Final Project</h3>
              <ArrowRight size={18} color="var(--text-muted)" />
            </div>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>
              {workbook.final_project?.title || "Guided AI Capstone"}
            </p>
          </div>
        </Link>

        {/* Certificate Card */}
        <Link
          to={`/workbook/certificate?grade=${grade}`}
          style={{
            textDecoration: "none",
            background: "#FFFFFF",
            borderRadius: "20px",
            padding: "1.4rem",
            border: "1px solid #E2E8F0",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            alignItems: "center",
            gap: "1.25rem",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: workbook.certificate_issued ? "#FEF3C7" : "#F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: workbook.certificate_issued ? "#D97706" : "var(--text-muted)",
            }}
          >
            <Award size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", color: "var(--text-main)" }}>Certificate</h3>
              <ArrowRight size={18} color="var(--text-muted)" />
            </div>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>
              {workbook.certificate_issued ? "Certificate Earned! View & Print" : "Complete all 8 units to unlock"}
            </p>
          </div>
        </Link>
      </div>

      {/* 8 Units Grid */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.5rem",
            margin: "0 0 1.25rem",
            color: "var(--text-main)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <BookOpen size={24} color={themeColors.primary} />
          Syllabus Units (8 Interactive Lessons)
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {workbook.units.map((unit) => {
            const isCompleted = unit.status === "completed";
            const isInProgress = unit.status === "in_progress";

            return (
              <div
                key={unit.number}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "20px",
                  border: isCompleted
                    ? "2px solid #22C55E"
                    : isInProgress
                    ? `2px solid ${themeColors.primary}`
                    : "1px solid #E2E8F0",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "var(--shadow-sm)",
                  position: "relative",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <div>
                  {/* Top Bar: Unit # & Big Idea */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <span
                      style={{
                        background: themeColors.primary,
                        color: "#FFFFFF",
                        padding: "0.2rem 0.65rem",
                        borderRadius: "8px",
                        fontWeight: "900",
                        fontSize: "0.8rem",
                      }}
                    >
                      UNIT {unit.number}
                    </span>
                    <span
                      style={{
                        background: `${themeColors.secondary}18`,
                        color: themeColors.secondary,
                        padding: "0.2rem 0.65rem",
                        borderRadius: "9999px",
                        fontWeight: "700",
                        fontSize: "0.75rem",
                      }}
                    >
                      {unit.big_idea}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontSize: "1.15rem",
                      fontFamily: "var(--font-heading)",
                      margin: "0 0 0.5rem",
                      color: "var(--text-main)",
                      lineHeight: "1.3",
                    }}
                  >
                    {unit.title}
                  </h3>

                  {/* Learning Objective */}
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-muted)",
                      margin: "0 0 1rem",
                      lineHeight: "1.4",
                    }}
                  >
                    {unit.self_check}
                  </p>
                </div>

                <div>
                  {/* Rating Stars & Status */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid #F1F5F9",
                      marginBottom: "0.85rem",
                    }}
                  >
                    <div style={{ display: "flex", gap: "2px" }}>
                      {[1, 2, 3].map((starIdx) => (
                        <Star
                          key={starIdx}
                          size={15}
                          fill={starIdx <= (unit.stars || 0) ? "#F59E0B" : "none"}
                          color={starIdx <= (unit.stars || 0) ? "#F59E0B" : "#CBD5E1"}
                        />
                      ))}
                    </div>

                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: "800",
                        color: isCompleted ? "#16A34A" : isInProgress ? themeColors.primary : "var(--text-muted)",
                      }}
                    >
                      {isCompleted ? "Completed" : isInProgress ? "In Progress" : "Not Started"}
                    </span>
                  </div>

                  {/* Start / Continue Button */}
                  <button
                    onClick={() => navigate(`/workbook/${grade}/unit/${unit.number}`)}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "12px",
                      border: "none",
                      background: isCompleted ? "#F0FDF4" : themeColors.primary,
                      color: isCompleted ? "#16A34A" : "#FFFFFF",
                      fontWeight: "800",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                      boxShadow: isCompleted ? "none" : "0 4px 10px rgba(0,0,0,0.1)",
                      transition: "opacity 0.2s",
                    }}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 size={16} /> Review Unit
                      </>
                    ) : (
                      <>
                        <span>{isInProgress ? "Continue Unit" : "Start Unit"}</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
