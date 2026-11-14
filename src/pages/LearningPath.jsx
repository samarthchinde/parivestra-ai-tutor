import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, Badge, PrimaryButton, Mascot, EmptyState } from "../components/UI";
import { Sparkles, Star, Lock, CheckCircle2, ArrowRight, FlaskConical, Calculator, Globe, Languages, TreeDeciduous, BookOpen } from "lucide-react";
import { getCurriculum } from "../api/client";
import { getSubjectsForGrade, getBandForGrade } from "../config/bands";

export default function LearningPath() {
  const navigate = useNavigate();
  const [grade, setGrade] = useState(localStorage.getItem("parivestra_grade") || "Class 3");
  const [subject, setSubject] = useState("Maths");
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const band = getBandForGrade(grade);
  const subjects = getSubjectsForGrade(grade);
  const subjectEmojis = { Maths: "🔢", English: "📖", EVS: "🌱", Science: "🔬", "Social Science": "🌍" };

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getCurriculum("CBSE", grade, subject);
        setChapters(data.learning_path || []);
      } catch (e) {
        console.warn("Could not fetch curriculum:", e);
        setError("Could not load curriculum. Using default path.");
        setChapters([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [grade, subject]);

  const getSubjectColor = (s) => {
    switch (s.toLowerCase()) {
      case "maths": return "var(--color-maths)";
      case "english": return "var(--color-english)";
      case "evs": return "var(--color-evs)";
      case "science": return "#0D9488";
      case "social science": return "#D97706";
      default: return "var(--color-primary)";
    }
  };

  const subjectColor = getSubjectColor(subject);

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", paddingBottom: 60 }}>
      <PageHeader
        eyebrow={`${band.toUpperCase()} BAND • CBSE ${grade}`}
        title={`${subject} Learning Roadmap ${subjectEmojis[subject] || "📚"}`}
        description="Follow the topological chapter path: unlock each milestone by completing prerequisites."
      />

      {/* Grade & Subject Selectors */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 28, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FFF", padding: "6px 14px", borderRadius: "var(--radius-full)", border: "2px solid #E2E8F0" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>Class:</span>
          <select
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value);
              localStorage.setItem("parivestra_grade", e.target.value);
              if (!getSubjectsForGrade(e.target.value).includes(subject)) {
                setSubject("Maths");
              }
            }}
            style={{
              background: "var(--color-mint)", color: "#134E4A",
              border: "none", borderRadius: "var(--radius-full)",
              padding: "4px 10px", fontSize: 13, fontWeight: 800,
              cursor: "pointer", outline: "none",
            }}
          >
            {["Class 3","Class 4","Class 5","Class 6","Class 7","Class 8","Class 9","Class 10"].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {subjects.map((s) => {
            const isActive = s === subject;
            return (
              <button
                key={s}
                onClick={() => setSubject(s)}
                style={{
                  background: isActive ? subjectColor : "#FFFFFF",
                  color: isActive ? "#FFFFFF" : "var(--text-main)",
                  border: isActive ? "none" : "2px solid #E2E8F0",
                  borderRadius: "var(--radius-full)",
                  padding: "7px 16px", fontSize: 14, fontWeight: 800,
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {subjectEmojis[s] || "📖"} {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
          Loading curriculum path...
        </div>
      ) : chapters.length === 0 ? (
        <EmptyState
          title={error || "No curriculum path available"}
          description={`No CBSE curriculum data found for ${grade} ${subject}. Ask your teacher to add it.`}
          mood="thinking"
        />
      ) : (
        <div style={{ position: "relative", padding: "10px 0" }}>
          {/* Trail Line */}
          <div
            style={{
              position: "absolute", top: 40, bottom: 40, left: "50%",
              width: 6, background: `linear-gradient(180deg, ${subjectColor}40 0%, #CBD5E1 100%)`,
              transform: "translateX(-50%)", borderRadius: 3, zIndex: 0,
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 28, position: "relative", zIndex: 1 }}>
            {chapters.map((ch, idx) => {
              const isLeft = idx % 2 === 0;
              // First chapter is "unlocked"; rest are locked (no progress tracking yet)
              const status = idx === 0 ? "current" : "locked";
              const isCurrent = status === "current";
              const isLocked = status === "locked";

              let nodeBorder = "2px solid var(--border)";
              let nodeBg = "white";

              if (isCurrent) {
                nodeBorder = `3px solid ${subjectColor}`;
                nodeBg = "#FAF5FF";
              } else if (isLocked) {
                nodeBg = "#F8FAFC";
                nodeBorder = "2px dashed #CBD5E1";
              }

              return (
                <div
                  key={ch.id}
                  style={{
                    display: "flex",
                    justifyContent: isLeft ? "flex-start" : "flex-end",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      width: "88%", maxWidth: 440,
                      background: nodeBg, border: nodeBorder,
                      borderRadius: "var(--radius-xl)",
                      padding: "20px 22px",
                      boxShadow: isCurrent ? "var(--shadow-md)" : "var(--shadow-sm)",
                      opacity: isLocked ? 0.72 : 1,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "1.3rem" }}>{subjectEmojis[subject] || "📖"}</span>
                        <Badge variant={subject.toLowerCase() === "maths" ? "blue" : subject.toLowerCase() === "english" ? "coral" : "mint"}>
                          Ch {ch.chapter_number || idx + 1}
                        </Badge>
                        {ch.unit_title && (
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>
                            {ch.unit_title}
                          </span>
                        )}
                      </div>
                      {isCurrent ? (
                        <Sparkles size={18} color={subjectColor} />
                      ) : (
                        <Lock size={16} color="#94A3B8" />
                      )}
                    </div>

                    <h3 style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "1.2rem",
                      color: isLocked ? "#64748B" : "var(--text)",
                      margin: "0 0 6px 0",
                    }}>
                      {ch.title}
                    </h3>

                    {ch.learning_objectives && ch.learning_objectives.length > 0 && (
                      <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", margin: "0 0 12px 0", lineHeight: 1.45 }}>
                        {ch.learning_objectives.slice(0, 2).join(" • ")}
                      </p>
                    )}

                    {ch.prerequisites && ch.prerequisites.length > 0 && (
                      <div style={{ fontSize: "0.8rem", color: "#B45309", marginBottom: 10 }}>
                        Requires: {ch.prerequisites.join(", ")}
                      </div>
                    )}

                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      paddingTop: 10, borderTop: "1px solid var(--border)",
                    }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {[1, 2, 3].map((s) => (
                          <Star key={s} size={16} color="#F59E0B" fill={isCurrent && s <= 1 ? "#F59E0B" : "transparent"} />
                        ))}
                      </div>

                      <button
                        disabled={isLocked}
                        onClick={() => navigate("/courses")}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          background: isCurrent ? subjectColor : isLocked ? "#E2E8F0" : "var(--color-primary)",
                          color: isLocked ? "#94A3B8" : "white",
                          border: "none",
                          padding: "7px 14px", borderRadius: 10,
                          fontSize: "0.85rem", fontWeight: 700,
                          cursor: isLocked ? "not-allowed" : "pointer",
                        }}
                      >
                        {isCurrent ? "Begin Chapter" : "Locked"}
                        {!isLocked && <ArrowRight size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
