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
              3. Script: Questions and Bot Replies (4 dialog pairs)
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
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>
              4. A Decision Tree for one tricky question
            </label>
            <input
              type="text"
              disabled={disabled}
              value={fields.decision_tree || ""}
              onChange={(e) => onChange("decision_tree", e.target.value)}
              placeholder="e.g. Is book overdue? Yes -> Ask teacher. No -> Renew for 7 days."
              style={inputStyle}
            />
          </div>
        </>
      );

    case 5: // AI for Good
      return (
        <>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>1. The Problem</label>
            <input
              type="text"
              disabled={disabled}
              value={fields.problem || ""}
              onChange={(e) => onChange("problem", e.target.value)}
              placeholder="e.g. Food waste in school canteen"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>2. Who it helps</label>
            <input
              type="text"
              disabled={disabled}
              value={fields.who_helps || ""}
              onChange={(e) => onChange("who_helps", e.target.value)}
              placeholder="Students, canteen staff, and community"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>3. What data the AI needs</label>
            <input
              type="text"
              disabled={disabled}
              value={fields.data_needed || ""}
              onChange={(e) => onChange("data_needed", e.target.value)}
              placeholder="Attendance, menu, leftover food logs"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>4. How the AI helps</label>
            <textarea
              disabled={disabled}
              value={fields.how_helps || ""}
              onChange={(e) => onChange("how_helps", e.target.value)}
              placeholder="Predicts how much meal to prepare each day"
              rows={3}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>5. Fairness check: Who might it leave out?</label>
            <input
              type="text"
              disabled={disabled}
              value={fields.fairness_check || ""}
              onChange={(e) => onChange("fairness_check", e.target.value)}
              placeholder="Special dietary needs or absent students"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>6. Test: What did a friend say?</label>
            <input
              type="text"
              disabled={disabled}
              value={fields.friend_test || ""}
              onChange={(e) => onChange("friend_test", e.target.value)}
              placeholder="My friend suggested adding snack estimates too!"
              style={inputStyle}
            />
          </div>
        </>
      );

    case 6: // Smart School Problem Canvas
      return (
        <>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>Problem Title</label>
            <input
              type="text"
              disabled={disabled}
              value={fields.problem_title || ""}
              onChange={(e) => onChange("problem_title", e.target.value)}
              placeholder="e.g. Long canteen queues at break time"
              style={inputStyle}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>Who has the problem?</label>
              <input
                type="text"
                disabled={disabled}
                value={fields.who || ""}
                onChange={(e) => onChange("who", e.target.value)}
                placeholder="Students and staff"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>Where does it happen?</label>
              <input
                type="text"
                disabled={disabled}
                value={fields.where || ""}
                onChange={(e) => onChange("where", e.target.value)}
                placeholder="School canteen during 20-min lunch"
                style={inputStyle}
              />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>What is the problem?</label>
            <textarea
              disabled={disabled}
              value={fields.what || ""}
              onChange={(e) => onChange("what", e.target.value)}
              placeholder="Queue takes 15 minutes, leaving only 5 minutes to eat"
              rows={3}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>Why does solving it matter?</label>
            <textarea
              disabled={disabled}
              value={fields.why || ""}
              onChange={(e) => onChange("why", e.target.value)}
              placeholder="Healthier eating, less stress, punctual return to classes"
              rows={3}
              style={inputStyle}
            />
          </div>
        </>
      );

    case 7: // Paper Sentiment Detector
      return (
        <>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>List 5 Positive Words</label>
            <input
              type="text"
              disabled={disabled}
              value={fields.pos_words || ""}
              onChange={(e) => onChange("pos_words", e.target.value)}
              placeholder="great, awesome, easy, fast, helpful"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>List 5 Negative Words</label>
            <input
              type="text"
              disabled={disabled}
              value={fields.neg_words || ""}
              onChange={(e) => onChange("neg_words", e.target.value)}
              placeholder="slow, confusing, broken, laggy, hard"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>
              Your Rule: How will you decide positive, negative or neutral?
            </label>
            <textarea
              disabled={disabled}
              value={fields.rule || ""}
              onChange={(e) => onChange("rule", e.target.value)}
              placeholder="Count pos and neg words. If pos > neg: Positive. If neg > pos: Negative. If equal: Neutral."
              rows={3}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>
              Test it on 4 real reviews (Review &rarr; Prediction &rarr; Correct?)
            </label>
            <textarea
              disabled={disabled}
              value={fields.test_reviews || ""}
              onChange={(e) => onChange("test_reviews", e.target.value)}
              placeholder="1. 'The app is very fast and helpful' -> Pos (Correct)&#10;2. 'Laggy and crashes' -> Neg (Correct)"
              rows={4}
              style={inputStyle}
            />
          </div>
        </>
      );

    case 8: // Predict and Evaluate
      return (
        <>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>
              Task: What will your model predict?
            </label>
            <input
              type="text"
              disabled={disabled}
              value={fields.task || ""}
              onChange={(e) => onChange("task", e.target.value)}
              placeholder="e.g. Will the canteen run out of samosas?"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>Features (inputs)</label>
            <input
              type="text"
              disabled={disabled}
              value={fields.features || ""}
              onChange={(e) => onChange("features", e.target.value)}
              placeholder="Temperature, day of week, rain, special event"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>Label (output) & classes</label>
            <input
              type="text"
              disabled={disabled}
              value={fields.labels || ""}
              onChange={(e) => onChange("labels", e.target.value)}
              placeholder="RunOut: Yes or No"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>
              Confusion Matrix & Accuracy (TP, FN, FP, TN)
            </label>
            <input
              type="text"
              disabled={disabled}
              value={fields.confusion_matrix || ""}
              onChange={(e) => onChange("confusion_matrix", e.target.value)}
              placeholder="TP=8, FN=2, FP=1, TN=9 -> Accuracy = (8+9)/(20) = 85%"
              style={inputStyle}
            />
          </div>
        </>
      );

    case 9: // Data-to-Insight Report
      return (
        <>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>Question you want to answer</label>
            <input
              type="text"
              disabled={disabled}
              value={fields.research_question || ""}
              onChange={(e) => onChange("research_question", e.target.value)}
              placeholder="e.g. Does student study time correlate with quiz score?"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>Data collected & Cleaning steps</label>
            <textarea
              disabled={disabled}
              value={fields.data_cleaning || ""}
              onChange={(e) => onChange("data_cleaning", e.target.value)}
              placeholder="Collected 50 anonymous surveys. Handled missing values by dropping nulls."
              rows={3}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>Key Statistics (Mean, Median, Spread)</label>
            <input
              type="text"
              disabled={disabled}
              value={fields.statistics || ""}
              onChange={(e) => onChange("statistics", e.target.value)}
              placeholder="Mean study time = 45 min, Median = 40 min, Std = 15 min"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>Insight & One Limitation</label>
            <textarea
              disabled={disabled}
              value={fields.insights || ""}
              onChange={(e) => onChange("insights", e.target.value)}
              placeholder="Positive correlation observed. Limitation: sample size was restricted to one class section."
              rows={3}
              style={inputStyle}
            />
          </div>
        </>
      );

    case 10: // Capstone: AI Solution Pitch
      return (
        <>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>Problem & Users</label>
            <input
              type="text"
              disabled={disabled}
              value={fields.problem_users || ""}
              onChange={(e) => onChange("problem_users", e.target.value)}
              placeholder="Early detection of crop pest damage for regional organic farmers"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>Data: Source, size & consent</label>
            <input
              type="text"
              disabled={disabled}
              value={fields.data_consent || ""}
              onChange={(e) => onChange("data_consent", e.target.value)}
              placeholder="3,000 labeled leaf images with consent from agricultural cooperative"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>Model Approach & Metric Target</label>
            <input
              type="text"
              disabled={disabled}
              value={fields.model_metrics || ""}
              onChange={(e) => onChange("model_metrics", e.target.value)}
              placeholder="Convolutional Neural Network (MobileNet) with target Recall >= 0.92"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>Responsible AI & Governance</label>
            <textarea
              disabled={disabled}
              value={fields.governance || ""}
              onChange={(e) => onChange("governance", e.target.value)}
              placeholder="Offline mobile deployment to protect farm location privacy; human-in-the-loop expert review for uncertain cases."
              rows={3}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "800", marginBottom: "0.4rem" }}>30-Second Pitch Line</label>
            <input
              type="text"
              disabled={disabled}
              value={fields.pitch_line || ""}
              onChange={(e) => onChange("pitch_line", e.target.value)}
              placeholder="An offline smartphone AI that spots crop diseases in seconds, saving 30% of harvest."
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
