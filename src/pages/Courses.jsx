import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader, Card, PrimaryButton, ProgressRing, Badge, EmptyState } from "../components/UI";
import { getCourses, getUserProfile } from "../api/client";
import { playClick } from "../utils/sound";
import {
  BookOpen,
  Calculator,
  Languages,
  TreeDeciduous,
  Sparkles,
  ArrowRight,
  FlaskConical,
  Globe,
  RotateCcw,
} from "lucide-react";
import {
  ALL_GRADES,
  getSubjectsForGrade,
  getPreviousGrade,
  getBandForGrade,
} from "../config/bands";

export default function Courses() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSubject = searchParams.get("subject") || "All";

  const [courses, setCourses] = useState([]);
  const [revisionCourses, setRevisionCourses] = useState([]);
  const [grade, setGrade] = useState(
    localStorage.getItem("parivestra_grade") || "Class 3"
  );
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [loading, setLoading] = useState(true);

  const prevGrade = getPreviousGrade(grade);
  const availableSubjects = ["All", ...getSubjectsForGrade(grade)];
  const currentBand = getBandForGrade(grade);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await getCourses(grade);
        if (res && res.courses) {
          setCourses(res.courses);
        }

        if (prevGrade) {
          const revRes = await getCourses(prevGrade);
          if (revRes && revRes.courses) {
            setRevisionCourses(revRes.courses);
          }
        } else {
          setRevisionCourses([]);
        }
      } catch (e) {
        console.warn("Could not load courses:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [grade]);

  // Reset selected subject if not available in new grade
  useEffect(() => {
    if (selectedSubject !== "All" && !availableSubjects.includes(selectedSubject)) {
      setSelectedSubject("All");
    }
  }, [grade, availableSubjects, selectedSubject]);

  const filteredCourses = courses.filter((c) => {
    return selectedSubject === "All" || c.subject.toLowerCase() === selectedSubject.toLowerCase();
  });

  const filteredRevisionCourses = revisionCourses.filter((c) => {
    return selectedSubject === "All" || c.subject.toLowerCase() === selectedSubject.toLowerCase();
  });

  const getSubjectIcon = (subj) => {
    switch (subj.toLowerCase()) {
      case "maths":
        return <Calculator size={26} />;
      case "english":
        return <Languages size={26} />;
      case "evs":
        return <TreeDeciduous size={26} />;
      case "science":
        return <FlaskConical size={26} />;
      case "social science":
        return <Globe size={26} />;
      default:
        return <BookOpen size={26} />;
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
      case "science":
        return "#0D9488";
      case "social science":
        return "#D97706";
      default:
        return "var(--color-primary)";
    }
  };

  const renderCourseCard = (c, isRevision = false) => {
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
          border: `2px solid ${color}35`,
          borderRadius: "var(--radius-lg)",
          padding: 24,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          position: "relative",
          boxShadow: "var(--shadow-sm)",
          opacity: isRevision ? 0.94 : 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "var(--radius-md)",
              background: `${color}1A`,
              color: color,
              display: "grid",
              placeItems: "center",
            }}
          >
            {getSubjectIcon(c.subject)}
          </div>

          <ProgressRing radius={26} stroke={5} progress={c.progress_percentage || 0} color={color} />
        </div>

        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <Badge variant={c.subject.toLowerCase()}>{c.subject}</Badge>
            <Badge>{c.grade}</Badge>
            {isRevision && <Badge variant="warning">Revision</Badge>}
            {c.needs_review && <Badge variant="warning">Sample Draft</Badge>}
          </div>
          <h3 style={{ margin: "0 0 6px", fontSize: 20, color: "var(--text-main)" }}>
            {c.title}
          </h3>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>
            {c.description}
          </p>
        </div>

        <div
          style={{
            marginTop: "auto",
            paddingTop: 12,
            borderTop: "1px solid #F1F5F9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>
            {c.completed_lessons || 0} of {c.total_lessons || 0} lessons done
          </span>

          <span style={{ fontWeight: 800, fontSize: 13, color, display: "flex", alignItems: "center", gap: 4 }}>
            {isRevision ? "Revise Quest" : "Continue Quest"} <ArrowRight size={15} />
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", paddingBottom: 60 }}>
      <PageHeader
        eyebrow={`${currentBand.toUpperCase()} BAND LEARNING`}
        title={`CBSE ${grade} Interactive Courses 📚`}
        description="Structured, curriculum-aligned chapters with story lessons, practice questions, and grounded source citations."
      />

      {/* Grade Selector & Subject Filter Tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 24 }}>
        {/* Subject Pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {availableSubjects.map((sub) => {
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
                  padding: "7px 16px",
                  fontSize: 14,
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

        {/* Grade Selector Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FFF", padding: "6px 14px", borderRadius: "var(--radius-full)", border: "2px solid #E2E8F0" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)" }}>Active Class:</span>
          <select
            value={grade}
            onChange={(e) => {
              playClick();
              setGrade(e.target.value);
              localStorage.setItem("parivestra_grade", e.target.value);
            }}
            style={{
              background: "var(--color-mint)",
              color: "#134E4A",
              border: "none",
              borderRadius: "var(--radius-full)",
              padding: "4px 12px",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <optgroup label="Junior Band (Classes 3-5)">
              <option value="Class 3">Class 3</option>
              <option value="Class 4">Class 4</option>
              <option value="Class 5">Class 5</option>
            </optgroup>
            <optgroup label="Middle Band (Classes 6-8)">
              <option value="Class 6">Class 6</option>
              <option value="Class 7">Class 7</option>
              <option value="Class 8">Class 8</option>
            </optgroup>
            <optgroup label="Senior Band (Classes 9-10)">
              <option value="Class 9">Class 9</option>
              <option value="Class 10">Class 10</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>Loading chapters and lessons...</div>
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          title="No courses found in this category"
          description="Try switching subjects or check back soon for new teacher-approved journeys!"
          mood="thinking"
        />
      ) : (
        <div className="grid two" style={{ gap: 24, marginBottom: 40 }}>
          {filteredCourses.map((c) => renderCourseCard(c, false))}
        </div>
      )}

      {/* Revise Earlier Class Shelf */}
      {prevGrade && filteredRevisionCourses.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#FEF3C7",
                color: "#B45309",
                display: "grid",
                placeItems: "center",
              }}
            >
              <RotateCcw size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, color: "var(--text-main)" }}>
                Revise Earlier Class ({prevGrade})
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                Strengthen foundational prerequisites from the previous grade.
              </p>
            </div>
          </div>

          <div className="grid two" style={{ gap: 20 }}>
            {filteredRevisionCourses.map((c) => renderCourseCard(c, true))}
          </div>
        </div>
      )}
    </div>
  );
}
