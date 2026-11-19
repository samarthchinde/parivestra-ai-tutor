import React from "react";
import Mascot, { GRADE_MASCOT_COLORS } from "./Mascot";
import { Check, X, Lock } from "lucide-react";
import { playClick } from "../utils/sound";

export const GRADE_DETAILS = [
  { grade: 3, label: "Class 3", title: "AI Explorers", tagline: "Notice · Sort · Think", color: "#F97316", band: "Junior" },
  { grade: 4, label: "Class 4", title: "AI Builders", tagline: "Data · Train · Decide", color: "#0284C7", band: "Junior" },
  { grade: 5, label: "Class 5", title: "AI Innovators", tagline: "Learn · Create · Lead", color: "#8B5CF6", band: "Junior" },
  { grade: 6, label: "Class 6", title: "AI Thinkers", tagline: "Scope · Collect · Explore", color: "#0E7490", band: "Middle" },
  { grade: 7, label: "Class 7", title: "AI Makers", tagline: "See · Read · Code", color: "#BE185D", band: "Middle" },
  { grade: 8, label: "Class 8", title: "AI Engineers", tagline: "Train · Evaluate · Improve", color: "#4338CA", band: "Middle" },
  { grade: 9, label: "Class 9", title: "AI Analysts", tagline: "Analyse · Model · Question", color: "#DC2626", band: "Senior" },
  { grade: 10, label: "Class 10", title: "AI Leaders", tagline: "Build · Evaluate · Lead", color: "#1E293B", band: "Senior" },
];

export default function GradeGrid({
  selectedGrade = "Class 3",
  onSelectGrade,
  disabled = false,
  isModal = false,
  onClose = null,
  allowSwitch = true,
}) {
  const normSelected = String(selectedGrade).replace(/\D/g, "") || "3";
  const selectedNum = parseInt(normSelected, 10);

  const content = (
    <div style={{ width: "100%", maxWidth: 840, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: isModal ? 16 : 24 }}>
        <h2 style={{ fontSize: isModal ? 22 : 26, fontWeight: 900, color: "var(--text-main)", marginBottom: 6 }}>
          Choose Your Class
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
          {allowSwitch
            ? "Select your grade to view matching courses, activities, and challenges."
            : "Your class learning is currently locked by your teacher."}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        {GRADE_DETAILS.map((item) => {
          const isSelected = item.grade === selectedNum;
          const isLocked = !allowSwitch && !isSelected;

          return (
            <button
              key={item.grade}
              type="button"
              disabled={disabled || isLocked}
              onClick={() => {
                playClick();
                if (onSelectGrade) onSelectGrade(item.label);
              }}
              style={{
                position: "relative",
                background: isSelected ? "var(--bg-canvas)" : "#FFFFFF",
                border: isSelected
                  ? `3px solid ${item.color}`
                  : "2px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                cursor: isLocked ? "not-allowed" : "pointer",
                opacity: isLocked ? 0.45 : 1,
                transition: "all 0.18s ease-in-out",
                boxShadow: isSelected
                  ? `0 8px 24px ${item.color}33, 0 2px 6px ${item.color}22`
                  : "var(--shadow-sm)",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                if (!isLocked) {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = `0 10px 24px ${item.color}26`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isLocked) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = isSelected
                    ? `0 8px 24px ${item.color}33`
                    : "var(--shadow-sm)";
                }
              }}
            >
              {/* Active Badge Check */}
              {isSelected && (
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: item.color,
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  }}
                >
                  <Check size={14} strokeWidth={3} />
                </div>
              )}

              {/* Locked Indicator */}
              {isLocked && (
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#94A3B8",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Lock size={12} />
                </div>
              )}

              {/* Robot Mascot preview */}
              <div style={{ marginBottom: 8 }}>
                <Mascot mood={isSelected ? "cheering" : "happy"} grade={item.grade} size={54} />
              </div>

              {/* Grade Header */}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: item.color,
                  marginBottom: 2,
                }}
              >
                {item.label} · {item.band}
              </span>

              {/* Edition Title */}
              <strong
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  color: "var(--text-main)",
                  marginBottom: 4,
                }}
              >
                {item.title}
              </strong>

              {/* Tagline */}
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  lineHeight: 1.3,
                }}
              >
                {item.tagline}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  if (!isModal) return content;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        style={{
          position: "relative",
          background: "#FFFFFF",
          borderRadius: "var(--radius-xl)",
          padding: 24,
          maxWidth: 880,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "#F1F5F9",
              border: "none",
              borderRadius: "50%",
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#64748B",
            }}
          >
            <X size={18} />
          </button>
        )}
        {content}
      </div>
    </div>
  );
}

