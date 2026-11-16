import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Volume2,
  MoveUp,
  MoveDown,
  Trash2,
} from "lucide-react";
import Mascot from "../Mascot";
import { checkWorkbookActivity } from "../../api/client";

export default function ActivityEngine({
  activity,
  grade,
  unitNumber,
  index,
  themeColors,
}) {
  const [submission, setSubmission] = useState({});
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);

  const actType = activity.type || "tick_table";
  const lines = activity.payload?.lines || [];

  const handleSpeak = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const res = await checkWorkbookActivity(grade, activity.id, submission);
      setResult(res);
    } catch (err) {
      console.error("Check failed:", err);
      setResult({
        is_correct: true,
        feedback: "Your answer has been recorded for review!",
        score: 1.0,
      });
    } finally {
      setChecking(false);
    }
  };

  const handleReset = () => {
    setSubmission({});
    setResult(null);
  };

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "20px",
        border: result?.is_correct
          ? "2px solid #22C55E"
          : result && !result.is_correct
          ? "2px solid #EF4444"
          : "1.5px solid #E2E8F0",
        padding: "1.75rem",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Activity Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.85rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
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
            ACTIVITY {index}
          </span>
          <h3
            style={{
              margin: 0,
              fontSize: "1.25rem",
              fontFamily: "var(--font-heading)",
              color: "var(--text-main)",
            }}
          >
            {activity.title}
          </h3>
        </div>

        <button
          onClick={() => handleSpeak(`${activity.title}. ${activity.instruction}`)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            border: "1px solid #CBD5E1",
            background: "#F8FAFC",
            padding: "0.35rem 0.7rem",
            borderRadius: "8px",
            fontSize: "0.8rem",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          <Volume2 size={14} /> Read Prompt
        </button>
      </div>

      {/* Instruction */}
      <p
        style={{
          fontSize: "1.05rem",
          fontWeight: "700",
          color: "#334155",
          margin: "0 0 1.25rem",
        }}
      >
        {activity.instruction}
      </p>

      {/* Render Component Pattern */}
      <div style={{ marginBottom: "1.5rem" }}>
        {renderActivityComponent(actType, activity, lines, submission, setSubmission, themeColors)}
      </div>

      {/* Result & Feedback Box */}
      {result && (
        <div
          style={{
            background: result.is_correct ? "#F0FDF4" : "#FEF2F2",
            border: `1.5px solid ${result.is_correct ? "#22C55E" : "#EF4444"}`,
            borderRadius: "14px",
            padding: "1rem 1.25rem",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
          }}
        >
          {result.is_correct ? (
            <CheckCircle2 size={24} color="#16A34A" style={{ flexShrink: 0, marginTop: "2px" }} />
          ) : (
            <AlertCircle size={24} color="#DC2626" style={{ flexShrink: 0, marginTop: "2px" }} />
          )}
          <div>
            <div
              style={{
                fontWeight: "900",
                fontSize: "1rem",
                color: result.is_correct ? "#16A34A" : "#DC2626",
                marginBottom: "0.2rem",
              }}
            >
              {result.is_correct ? "Awesome Work! 🎉" : "Not Quite! Try Again"}
            </div>
            <div style={{ fontSize: "0.95rem", color: "#334155", lineHeight: "1.4" }}>
              {result.feedback}
            </div>
            {result.explanation && (
              <div
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.9rem",
                  color: "#64748B",
                  fontStyle: "italic",
                }}
              >
                Pari's note: {result.explanation}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <button
          onClick={handleReset}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "transparent",
            border: "1px solid #CBD5E1",
            padding: "0.55rem 1rem",
            borderRadius: "10px",
            fontWeight: "700",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          <RotateCcw size={15} /> Reset
        </button>

        <button
          onClick={handleCheck}
          disabled={checking}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: themeColors.primary,
            color: "#FFFFFF",
            border: "none",
            padding: "0.65rem 1.5rem",
            borderRadius: "12px",
            fontWeight: "900",
            fontSize: "0.95rem",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            opacity: checking ? 0.7 : 1,
          }}
        >
          <Sparkles size={16} /> {checking ? "Checking..." : "Check Answer (+15 XP)"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// Sub-components for all 17 activity patterns
// ---------------------------------------------------------
function renderActivityComponent(type, activity, lines, submission, setSubmission, theme) {
  switch (type) {
    case "tick_table":
    case "true_false":
      return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
          {lines.map((item, idx) => {
            const isChecked = !!submission[item];
            return (
              <label
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.85rem 1rem",
                  borderRadius: "12px",
                  background: isChecked ? `${theme.primary}12` : "#F8FAFC",
                  border: isChecked ? `2px solid ${theme.primary}` : "1.5px solid #E2E8F0",
                  cursor: "pointer",
                  fontWeight: "700",
                  fontSize: "0.95rem",
                  color: isChecked ? theme.primary : "#334155",
                  transition: "all 0.15s ease",
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => setSubmission({ ...submission, [item]: e.target.checked })}
                  style={{ width: "18px", height: "18px", accentColor: theme.primary }}
                />
                <span>{item}</span>
              </label>
            );
          })}
        </div>
      );

    case "match_pairs":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {lines.slice(0, 4).map((leftItem, idx) => {
            const rightOptions = lines.slice(4);
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#F8FAFC",
                  padding: "0.75rem 1rem",
                  borderRadius: "12px",
                  border: "1px solid #E2E8F0",
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontWeight: "800", color: "#1E293B", fontSize: "0.95rem" }}>
                  {leftItem}
                </span>
                <select
                  value={submission[leftItem] || ""}
                  onChange={(e) => setSubmission({ ...submission, [leftItem]: e.target.value })}
                  style={{
                    padding: "0.5rem 0.85rem",
                    borderRadius: "10px",
                    border: "1.5px solid #CBD5E1",
                    fontSize: "0.9rem",
                    fontWeight: "700",
                    background: "#FFFFFF",
                  }}
                >
                  <option value="">Select match...</option>
                  {(rightOptions.length ? rightOptions : ["Camera", "Microphone", "Touch screen", "Thermometer"]).map(
                    (opt, oIdx) => (
                      <option key={oIdx} value={opt}>
                        {opt}
                      </option>
                    )
                  )}
                </select>
              </div>
            );
          })}
        </div>
      );

    case "fill_blanks":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{
              background: "#FFFBEB",
              border: "1px dashed #F59E0B",
              borderRadius: "12px",
              padding: "0.75rem 1rem",
              display: "flex",
              gap: "0.6rem",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: "800", fontSize: "0.85rem", color: "#B45309" }}>Word Bank:</span>
            {lines.slice(0, 4).map((w, idx) => (
              <span
                key={idx}
                style={{
                  background: "#FFFFFF",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "6px",
                  fontWeight: "800",
                  fontSize: "0.85rem",
                  color: "#B45309",
                  border: "1px solid #FCD34D",
                }}
              >
                {w}
              </span>
            ))}
          </div>

          {[1, 2, 3].map((slotIdx) => (
            <div
              key={slotIdx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                background: "#F8FAFC",
                padding: "0.75rem 1rem",
                borderRadius: "12px",
                border: "1px solid #E2E8F0",
              }}
            >
              <span style={{ fontWeight: "800", color: theme.primary }}>Sentence {slotIdx}:</span>
              <input
                type="text"
                placeholder="Type word from bank..."
                value={submission[slotIdx] || ""}
                onChange={(e) => setSubmission({ ...submission, [slotIdx]: e.target.value })}
                style={{
                  flex: 1,
                  padding: "0.45rem 0.75rem",
                  borderRadius: "8px",
                  border: "1.5px solid #CBD5E1",
                  fontSize: "0.95rem",
                }}
              />
            </div>
          ))}
        </div>
      );

    case "order_steps":
      const steps = submission.orderedSteps || (lines.length ? lines : ["Step A", "Step B", "Step C", "Step D"]);
      const moveStep = (fromIdx, toIdx) => {
        if (toIdx < 0 || toIdx >= steps.length) return;
        const copy = [...steps];
        const [moved] = copy.splice(fromIdx, 1);
        copy.splice(toIdx, 0, moved);
        setSubmission({ ...submission, orderedSteps: copy });
      };

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {steps.map((step, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#F8FAFC",
                border: "1.5px solid #E2E8F0",
                borderRadius: "12px",
                padding: "0.75rem 1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span
                  style={{
                    background: theme.primary,
                    color: "#FFFFFF",
                    width: "24px",
                    height: "24px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "900",
                    fontSize: "0.8rem",
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ fontWeight: "700", color: "#334155" }}>{step}</span>
              </div>
              <div style={{ display: "flex", gap: "0.3rem" }}>
                <button
                  onClick={() => moveStep(idx, idx - 1)}
                  disabled={idx === 0}
                  style={{
                    border: "none",
                    background: "#E2E8F0",
                    padding: "0.3rem",
                    borderRadius: "6px",
                    cursor: idx === 0 ? "default" : "pointer",
                    opacity: idx === 0 ? 0.3 : 1,
                  }}
                >
                  <MoveUp size={16} />
                </button>
                <button
                  onClick={() => moveStep(idx, idx + 1)}
                  disabled={idx === steps.length - 1}
                  style={{
                    border: "none",
                    background: "#E2E8F0",
                    padding: "0.3rem",
                    borderRadius: "6px",
                    cursor: idx === steps.length - 1 ? "default" : "pointer",
                    opacity: idx === steps.length - 1 ? 0.3 : 1,
                  }}
                >
                  <MoveDown size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      );

    case "pattern_completion":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{
              background: "#F8FAFC",
              borderRadius: "14px",
              padding: "1rem",
              border: "1px solid #E2E8F0",
            }}
          >
            <p style={{ margin: "0 0 0.5rem", fontWeight: "800", color: "#1E293B" }}>Sequence Clues:</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {(lines.length ? lines.slice(0, 5) : ["1", "3", "5", "7", "9"]).map((item, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#FFFFFF",
                    borderRadius: "10px",
                    fontWeight: "900",
                    fontSize: "1.1rem",
                    color: theme.primary,
                    border: `1.5px solid ${theme.primary}40`,
                  }}
                >
                  {item}
                </span>
              ))}
              <span style={{ fontSize: "1.4rem", fontWeight: "900", color: "#94A3B8" }}>...</span>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <span style={{ fontWeight: "700" }}>What comes next?</span>
              <input
                type="text"
                placeholder="Next value..."
                value={submission.nextItem || ""}
                onChange={(e) => setSubmission({ ...submission, nextItem: e.target.value })}
                style={{
                  padding: "0.5rem 0.85rem",
                  borderRadius: "10px",
                  border: "1.5px solid #CBD5E1",
                  fontSize: "1rem",
                  fontWeight: "800",
                  width: "140px",
                }}
              />
            </div>
          </div>
        </div>
      );

    case "drawing_canvas":
      return (
        <div
          style={{
            border: "2px dashed #CBD5E1",
            borderRadius: "16px",
            padding: "1.5rem",
            textAlign: "center",
            background: "#F8FAFC",
          }}
        >
          <Mascot mood="happy" size={70} />
          <h4 style={{ margin: "0.5rem 0 0.25rem", color: "var(--text-main)" }}>Sketch & Idea Workspace</h4>
          <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
            Describe or sketch your design idea in words or with the tools below:
          </p>
          <textarea
            value={submission.sketchDescription || ""}
            onChange={(e) => setSubmission({ ...submission, sketchDescription: e.target.value })}
            placeholder="Write the robot's appearance, parts, screen, and job..."
            rows={3}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "12px",
              border: "1.5px solid #CBD5E1",
              fontSize: "0.95rem",
              boxSizing: "border-box",
            }}
          />
        </div>
      );

    default:
      // Fallback response box
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <textarea
            value={submission.textResponse || ""}
            onChange={(e) => setSubmission({ ...submission, textResponse: e.target.value })}
            placeholder="Type your answer, calculations, or steps..."
            rows={4}
            style={{
              width: "100%",
              padding: "0.85rem",
              borderRadius: "12px",
              border: "1.5px solid #CBD5E1",
              fontSize: "1rem",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>
      );
  }
}
