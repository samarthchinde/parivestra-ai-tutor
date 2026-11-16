import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  Save,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import Mascot, { GRADE_MASCOT_COLORS } from "../components/Mascot";
import {
  getWorkbookProject,
  saveWorkbookProject,
  submitWorkbookProject,
} from "../api/client";

export default function FinalProjectView() {
  const { grade: gradeParam } = useParams();
  const grade = parseInt(gradeParam || "3", 10);

  const [projectData, setProjectData] = useState(null);
  const [fields, setFields] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const themeColors = GRADE_MASCOT_COLORS[grade] || GRADE_MASCOT_COLORS[3];

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getWorkbookProject(grade)
      .then((data) => {
        if (!mounted) return;
        setProjectData(data);
        setFields(data.fields || {});
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setErrorMessage(err.message);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [grade]);

  const handleFieldChange = (key, val) => {
    setFields((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await saveWorkbookProject(grade, fields);
      setStatusMessage("Project draft saved safely!");
    } catch (err) {
      setErrorMessage(err.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await submitWorkbookProject(grade, fields);
      setStatusMessage(res.message || "Project submitted to your teacher for review! (+50 XP)");
      setProjectData((prev) => ({ ...prev, status: "submitted" }));
    } catch (err) {
      setErrorMessage(err.message || "Failed to submit project");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "4rem", textAlign: "center" }}>
        <Mascot mood="thinking" grade={grade} size={90} />
        <h2>Loading Final Project...</h2>
      </div>
    );
  }

  const isSubmitted = projectData?.status === "submitted" || projectData?.status === "approved";

  return (
    <div
      style={{
        maxWidth: "920px",
        margin: "0 auto",
        padding: "1.5rem 1rem 4rem",
      }}
    >
      {/* Top Back Link */}
      <div style={{ marginBottom: "1.5rem" }}>
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
          <ArrowLeft size={18} /> Back to Grade {grade} Workbook
        </Link>
      </div>

      {/* Header Banner */}
      <div
        style={{
          background: `linear-gradient(135deg, ${themeColors.primary}18 0%, #FFFFFF 100%)`,
          border: `2px solid ${themeColors.primary}30`,
          borderRadius: "24px",
          padding: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem",
          marginBottom: "2rem",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: themeColors.primary,
              color: "#FFF",
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              fontSize: "0.85rem",
              fontWeight: "800",
              marginBottom: "0.5rem",
            }}
          >
            <Sparkles size={16} /> Grade {grade} Capstone Project
          </div>
          <h1
            style={{
              margin: "0 0 0.5rem",
              fontSize: "2rem",
              fontFamily: "var(--font-heading)",
              color: "var(--text-main)",
            }}
          >
            {projectData?.title || `Grade ${grade} Final Project`}
          </h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "1rem" }}>
            Put everything you learned into practice and share your idea with your teacher.
          </p>
        </div>

        <Mascot mood={isSubmitted ? "cheering" : "happy"} grade={grade} size={85} />
      </div>

      {/* Alerts */}
      {statusMessage && (
        <div
          style={{
            background: "#F0FDF4",
            border: "1.5px solid #22C55E",
            borderRadius: "14px",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#16A34A",
            fontWeight: "800",
          }}
        >
          <CheckCircle2 size={20} /> {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            background: "#FEF2F2",
            border: "1.5px solid #EF4444",
            borderRadius: "14px",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#DC2626",
            fontWeight: "800",
          }}
        >
          <AlertCircle size={20} /> {errorMessage}
        </div>
      )}

      {/* Project Form */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "24px",
          padding: "2rem",
          border: "1px solid #E2E8F0",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        {renderProjectTemplateFields(grade, fields, handleFieldChange, isSubmitted, themeColors)}

        {/* Buttons Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "1.5rem",
            borderTop: "1px solid #F1F5F9",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <button
            onClick={handleSaveDraft}
            disabled={saving || isSubmitted}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "#F8FAFC",
              border: "1.5px solid #CBD5E1",
              padding: "0.65rem 1.25rem",
              borderRadius: "12px",
              fontWeight: "800",
              fontSize: "0.95rem",
              color: "var(--text-main)",
              cursor: isSubmitted ? "default" : "pointer",
              opacity: isSubmitted ? 0.5 : 1,
            }}
          >
            <Save size={16} /> {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitting || isSubmitted}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: themeColors.primary,
              border: "none",
              color: "#FFFFFF",
              padding: "0.75rem 1.75rem",
              borderRadius: "14px",
              fontWeight: "900",
              fontSize: "1rem",
              cursor: isSubmitted ? "default" : "pointer",
              boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
              opacity: isSubmitted ? 0.6 : 1,
            }}
          >
            <Send size={18} /> {isSubmitted ? "Submitted for Review" : "Submit to Teacher (+50 XP)"}
          </button>
        </div>
      </div>
    </div>
  );
}

function renderProjectTemplateFields(grade, fields, onChange, disabled, theme) {
  switch (grade) {
    case 3: // My Helper Robot
      return (
        <>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem", color: "#1E293B" }}>
              1. Robot Name
            </label>
            <input
              type="text"
              disabled={disabled}
              value={fields.robot_name || ""}
              onChange={(e) => onChange("robot_name", e.target.value)}
              placeholder="e.g. GardenBot or TidyPari"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem", color: "#1E293B" }}>
              2. What job will it do at home?
            </label>
            <textarea
              disabled={disabled}
              value={fields.job_description || ""}
              onChange={(e) => onChange("job_description", e.target.value)}
              placeholder="Describe how your robot helps families at home..."
              rows={3}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem", color: "#1E293B" }}>
              3. Which sensors will it use? (see, hear, touch...)
            </label>
            <input
              type="text"
              disabled={disabled}
              value={fields.sensors || ""}
              onChange={(e) => onChange("sensors", e.target.value)}
              placeholder="e.g. Camera to see shoes, touch sensors to avoid walls"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem", color: "#1E293B" }}>
              4. Write 3 steps it will follow:
            </label>
            <input
              type="text"
              disabled={disabled}
              value={fields.step_1 || ""}
              onChange={(e) => onChange("step_1", e.target.value)}
              placeholder="Step 1: Notice if toys are on the floor"
              style={{ ...inputStyle, marginBottom: "0.5rem" }}
            />
            <input
              type="text"
              disabled={disabled}
              value={fields.step_2 || ""}
              onChange={(e) => onChange("step_2", e.target.value)}
              placeholder="Step 2: Pick up toys gently with soft arms"
              style={{ ...inputStyle, marginBottom: "0.5rem" }}
            />
            <input
              type="text"
              disabled={disabled}
              value={fields.step_3 || ""}
              onChange={(e) => onChange("step_3", e.target.value)}
              placeholder="Step 3: Put toys safely in the toy box"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem", color: "#1E293B" }}>
              5. One Safety Rule for your robot
            </label>
            <input
              type="text"
              disabled={disabled}
              value={fields.safety_rule || ""}
              onChange={(e) => onChange("safety_rule", e.target.value)}
              placeholder="e.g. Stop moving immediately if a cat or baby comes near"
              style={inputStyle}
            />
          </div>
        </>
      );

    case 4: // Classroom Chatbot
      return (
        <>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>
              1. Chatbot Name and Job
            </label>
            <input
              type="text"
              disabled={disabled}
              value={fields.bot_name || ""}
              onChange={(e) => onChange("bot_name", e.target.value)}
              placeholder="e.g. HomeworkHelper Bot"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>
              2. Who will use it?
            </label>
            <input
              type="text"
              disabled={disabled}
              value={fields.target_users || ""}
              onChange={(e) => onChange("target_users", e.target.value)}
              placeholder="e.g. Class 4 students studying science"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>
              3. Script: Questions and Bot Replies
            </label>
            <textarea
              disabled={disabled}
              value={fields.dialog_script || ""}
              onChange={(e) => onChange("dialog_script", e.target.value)}
              placeholder="User asks: When is library day?&#10;Bot replies: Library day is every Thursday!&#10;User asks: How do I renew my book?&#10;Bot replies: Bring your book to Mrs. Sharma at the desk."
              rows={5}
              style={inputStyle}
            />
          </div>
        </>
      );

    default: // Generic Grade Template
      return (
        <>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>
              1. Project Title & Problem Statement
            </label>
            <input
              type="text"
              disabled={disabled}
              value={fields.title || ""}
              onChange={(e) => onChange("title", e.target.value)}
              placeholder="State the core question or problem your project addresses..."
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>
              2. Data & Methodology
            </label>
            <textarea
              disabled={disabled}
              value={fields.methodology || ""}
              onChange={(e) => onChange("methodology", e.target.value)}
              placeholder="What inputs/features are used? How does the AI decide or learn?"
              rows={4}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>
              3. Evaluation & Ethical Considerations
            </label>
            <textarea
              disabled={disabled}
              value={fields.ethics || ""}
              onChange={(e) => onChange("ethics", e.target.value)}
              placeholder="How do you evaluate accuracy? Who might it leave out, and how do you ensure fairness and safety?"
              rows={4}
              style={inputStyle}
            />
          </div>
        </>
      );
  }
}

const inputStyle = {
  width: "100%",
  padding: "0.75rem 1rem",
  borderRadius: "12px",
  border: "1.5px solid #CBD5E1",
  fontSize: "0.95rem",
  boxSizing: "border-box",
  fontFamily: "inherit",
};
