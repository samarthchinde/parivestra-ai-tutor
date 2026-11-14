import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getCourseDetail } from "../api/client";
import {
  PageHeader,
  Card,
  PrimaryButton,
  Badge,
  ProgressBar,
  Mascot,
  Toast,
} from "../components/UI";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Award,
  Play,
  HelpCircle,
  Clock,
  Compass,
} from "lucide-react";

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getCourseDetail(id);
        setCourse(data);
      } catch (err) {
        console.error("Failed to load course:", err);
        setError("Could not load course details. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <Mascot mood="thinking" size={90} message="Opening your course treasure map..." />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <Mascot mood="oops" size={80} message={error || "Course not found!"} />
        <div style={{ marginTop: 20 }}>
          <PrimaryButton onClick={() => navigate("/courses")}>
            <ArrowLeft size={18} /> Back to Courses
          </PrimaryButton>
        </div>
      </div>
    );
  }

  const allLessons = (course.modules || []).flatMap((m) => m.lessons || []);
  const totalLessons = allLessons.length;
  const completedLessons = allLessons.filter((l) => l.is_completed).length;
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Find next uncompleted lesson
  const nextLesson = allLessons.find((l) => !l.is_completed) || allLessons[0];

  const getSubjectColor = (sub) => {
    const s = (sub || "").toLowerCase();
    if (s.includes("math")) return "var(--kid-maths)";
    if (s.includes("eng")) return "var(--kid-english)";
    if (s.includes("evs") || s.includes("sci")) return "var(--kid-evs)";
    return "var(--primary)";
  };

  const getLessonIcon = (type) => {
    switch (type) {
      case "story":
        return <BookOpen size={18} color="var(--kid-grape)" />;
      case "practice":
        return <HelpCircle size={18} color="var(--kid-maths)" />;
      case "activity":
        return <Sparkles size={18} color="var(--kid-yellow)" />;
      case "video":
        return <Play size={18} color="var(--kid-coral)" />;
      default:
        return <BookOpen size={18} />;
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 60 }}>
      {/* Top back navigation */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => navigate("/courses")}
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
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <ArrowLeft size={18} /> Back to Courses
        </button>
      </div>

      {/* Hero Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #FFF9F0 0%, #FFF2DF 100%)",
          border: "2px solid #FFE4C4",
          borderRadius: "var(--radius-xl)",
          padding: "28px 32px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <Badge variant="blue">{course.subject}</Badge>
              <Badge variant="mint">{course.grade}</Badge>
              {course.needs_review && (
                <Badge variant="yellow">⚠️ Needs Teacher Review</Badge>
              )}
            </div>

            <h1
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "2rem",
                color: "var(--text)",
                margin: "0 0 10px 0",
              }}
            >
              {course.title}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "1.05rem", lineHeight: 1.5, margin: "0 0 20px 0" }}>
              {course.description}
            </p>

            {/* Progress stats */}
            <div style={{ background: "white", padding: "14px 18px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", maxWidth: 440 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", fontWeight: 700, marginBottom: 8 }}>
                <span>Course Progress</span>
                <span style={{ color: "var(--kid-grape)" }}>{completedLessons} / {totalLessons} Lessons ({progressPct}%)</span>
              </div>
              <ProgressBar value={progressPct} />
            </div>

            {nextLesson && (
              <div style={{ marginTop: 20 }}>
                <PrimaryButton
                  onClick={() => navigate(`/courses/${course.id}/lessons/${nextLesson.id}`)}
                  style={{
                    fontSize: "1.05rem",
                    padding: "12px 24px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Compass size={20} />
                  {completedLessons === 0 ? "Start Adventure!" : "Continue Quest"}
                </PrimaryButton>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Mascot
              mood={progressPct === 100 ? "cheering" : progressPct > 0 ? "happy" : "thinking"}
              size={110}
              message={
                progressPct === 100
                  ? "Champion! You conquered this quest! 🏆"
                  : progressPct > 0
                  ? "Great momentum! Keep going! 🚀"
                  : "Ready to explore together? Let's go! ✨"
              }
            />
          </div>
        </div>
      </div>

      {/* Modules & Lessons List */}
      <h2
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "1.4rem",
          color: "var(--text)",
          margin: "0 0 16px 0",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span>🗺️ Quest Curriculum</span>
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {(course.modules || []).map((mod, mIdx) => (
          <div
            key={mod.id || mIdx}
            style={{
              background: "white",
              borderRadius: "var(--radius-lg)",
              border: "1.5px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
              overflow: "hidden",
            }}
          >
            {/* Module header */}
            <div
              style={{
                padding: "16px 20px",
                background: "var(--surface)",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-muted)",
                  }}
                >
                  Module {mIdx + 1}
                </span>
                <h3
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "1.15rem",
                    color: "var(--text)",
                    margin: "2px 0 0 0",
                  }}
                >
                  {mod.title}
                </h3>
              </div>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 700 }}>
                {(mod.lessons || []).filter((l) => l.is_completed).length} / {(mod.lessons || []).length} done
              </span>
            </div>

            {/* Lesson cards */}
            <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              {(mod.lessons || []).map((les, lIdx) => (
                <div
                  key={les.id || lIdx}
                  onClick={() => navigate(`/courses/${course.id}/lessons/${les.id}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    borderRadius: "var(--radius-md)",
                    border: les.is_completed ? "1.5px solid #A7F3D0" : "1.5px solid #F1F5F9",
                    background: les.is_completed ? "#F0FDF4" : "#FAFBFD",
                    cursor: "pointer",
                    transition: "all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.borderColor = "var(--kid-grape)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = les.is_completed ? "#A7F3D0" : "#F1F5F9";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: les.is_completed ? "#DCFCE7" : "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                      }}
                    >
                      {les.is_completed ? (
                        <CheckCircle2 size={22} color="#10B981" />
                      ) : (
                        getLessonIcon(les.type)
                      )}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>
                          {les.title}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            textTransform: "capitalize",
                            padding: "2px 8px",
                            borderRadius: 12,
                            background: "var(--surface)",
                            color: "var(--text-muted)",
                            fontWeight: 700,
                          }}
                        >
                          {les.type}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                        Topic: {les.topic}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        background: "rgba(255, 201, 60, 0.2)",
                        color: "#B45309",
                        padding: "4px 10px",
                        borderRadius: 20,
                        fontSize: "0.85rem",
                        fontWeight: 800,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Sparkles size={13} /> +{les.xp} XP
                    </span>

                    <button
                      style={{
                        background: les.is_completed ? "white" : "var(--kid-grape)",
                        color: les.is_completed ? "var(--text)" : "white",
                        border: les.is_completed ? "1px solid var(--border)" : "none",
                        padding: "8px 14px",
                        borderRadius: 10,
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {les.is_completed ? "Review" : "Start"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

