import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader, Card, PrimaryButton, ProgressRing, Badge, EmptyState } from "../components/UI";
import { getCourses, getUserProfile } from "../api/client";
import { playClick } from "../utils/sound";
import { BookOpen, Calculator, Languages, TreeDeciduous, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";

export default function Courses() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSubject = searchParams.get("subject") || "All";

  const [courses, setCourses] = useState([]);
  const [grade, setGrade] = useState(
    localStorage.getItem("parivestra_grade") || "Class 3"
  );
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await getCourses(grade);
        if (res && res.courses) {
          setCourses(res.courses);
        }
      } catch (e) {
        console.warn("Could not load courses:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [grade]);

  const subjects = ["All", "Maths", "English", "EVS"];

  const filteredCourses = courses.filter((c) => {
    const matchSubject = selectedSubject === "All" || c.subject.toLowerCase() === selectedSubject.toLowerCase();
    return matchSubject;
  });

  const getSubjectIcon = (subj) => {
    switch (subj.toLowerCase()) {
      case "maths":
        return <Calculator size={28} />;
      case "english":
        return <Languages size={28} />;
      case "evs":
        return <TreeDeciduous size={28} />;
      default:
        return <BookOpen size={28} />;
    }
  };

  const getSubjectColor = (subj) => {
    switch (subj.toLowerCase()) {
      case "maths":
        return "var(--color-maths)";
      case "english":
        return "var(--color-english)";
      case "evs":
        return "var(--color-evs)";
      default:
        return "var(--color-primary)";
    }
  };

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto" }}>
      <PageHeader
        eyebrow="MODULAR LEARNING QUESTS"
        title="Interactive Courses 📚"
        description="Structured, child-friendly journeys with story lessons, activities, and quiz rewards."
      />

      {/* Grade & Subject Filter Tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 24 }}>
        {/* Subject Pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {subjects.map((sub) => {
            const isSelected = selectedSubject.toLowerCase() === sub.toLowerCase();
            return (
              <button
                key={sub}
                onClick={() => {
                  playClick();
                  setSelectedSubject(sub);
                  setSearchParams({ subject: sub });
                }}
                style={{
                  background: isSelected ? "var(--color-primary)" : "#FFFFFF",
                  color: isSelected ? "#FFFFFF" : "var(--text-main)",
                  border: isSelected ? "none" : "2px solid #E2E8F0",
                  borderRadius: "var(--radius-full)",
                  padding: "8px 18px",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? "var(--shadow-sm)" : "none",
                }}
              >
                {sub}
              </button>
            );
          })}
        </div>

        {/* Grade Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FFF", padding: "4px 12px", borderRadius: "var(--radius-full)", border: "2px solid #E2E8F0" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>Level:</span>
          {["Class 3", "Class 4"].map((g) => {
            const isG = grade === g;
            return (
              <button
                key={g}
                onClick={() => {
                  playClick();
                  setGrade(g);
                  localStorage.setItem("parivestra_grade", g);
                }}
                style={{
                  background: isG ? "var(--color-mint)" : "transparent",
                  color: isG ? "#134E4A" : "var(--text-muted)",
                  border: "none",
                  borderRadius: "var(--radius-full)",
                  padding: "4px 12px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>Loading adventures...</div>
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          title="No courses found in this category"
          description="Try switching subjects or check back soon for new teacher-approved journeys!"
          mood="thinking"
        />
      ) : (
        <div className="grid two" style={{ gap: 24 }}>
          {filteredCourses.map((c) => {
            const color = getSubjectColor(c.subject);
            return (
              <div
                key={c.id}
                className="clickable-card"
                onClick={() => {
                  playClick();
                  navigate(`/courses/${c.id}`);
                }}
                style={{
                  background: "#FFFFFF",
                  border: `3px solid ${color}35`,
                  borderRadius: "var(--radius-lg)",
                  padding: 26,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  position: "relative",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: "var(--radius-md)",
                      background: `${color}1A`,
                      color: color,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {getSubjectIcon(c.subject)}
                  </div>

                  <ProgressRing radius={28} stroke={5} progress={c.progress_percentage || 0} color={color} />
                </div>

                <div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <Badge variant={c.subject.toLowerCase()}>{c.subject}</Badge>
                    <Badge>{c.grade}</Badge>
                    {c.needs_review && <Badge variant="warning">Sample Draft</Badge>}
                  </div>
                  <h3 style={{ margin: "0 0 6px", fontSize: 22, color: "var(--text-main)" }}>
                    {c.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>
                    {c.description}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: 14,
                    borderTop: "1px solid #F1F5F9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>
                    {c.completed_lessons || 0} of {c.total_lessons || 0} lessons done
                  </span>

                  <span style={{ fontWeight: 800, fontSize: 14, color, display: "flex", alignItems: "center", gap: 4 }}>
                    Continue Quest <ArrowRight size={16} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
