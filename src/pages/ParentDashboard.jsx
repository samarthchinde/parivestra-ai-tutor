import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getAvatar } from "../data/avatars";
import Mascot from "../components/Mascot";
import {
  getParentChildrenApi,
  getParentChildReportCardApi,
  getParentChildProgressApi,
  linkChildApi,
} from "../api/client";
import { playSuccess, playClick } from "../utils/sound";
import confetti from "canvas-confetti";
import {
  Users,
  Award,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Shield,
  PlusCircle,
  TrendingUp,
  Activity,
  Calendar,
  AlertCircle,
  Flame,
  ArrowRight,
} from "lucide-react";

export default function ParentDashboard() {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [reportCard, setReportCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rcLoading, setRcLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Link child modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUsername, setLinkUsername] = useState("");
  const [linkCode, setLinkCode] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");

  // 1. Load linked children
  const fetchChildren = async () => {
    setLoading(true);
    try {
      const res = await getParentChildrenApi();
      const kids = res.children || [];
      setChildren(kids);
      if (kids.length > 0 && !selectedChildId) {
        setSelectedChildId(kids[0].id);
      }
    } catch (err) {
      setErrorMsg(err.message || "Could not load linked children.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  // 2. Load report card for selected child
  useEffect(() => {
    if (!selectedChildId) return;

    let isCurrent = true;
    const fetchReport = async () => {
      setRcLoading(true);
      try {
        const rc = await getParentChildReportCardApi(selectedChildId);
        if (isCurrent) {
          setReportCard(rc);
        }
      } catch (err) {
        if (isCurrent) {
          setErrorMsg(err.message || "Could not load student report card.");
        }
      } finally {
        if (isCurrent) {
          setRcLoading(false);
        }
      }
    };

    fetchReport();
    return () => {
      isCurrent = false;
    };
  }, [selectedChildId]);

  // Handle linking child
  const handleLinkChild = async (e) => {
    e.preventDefault();
    setLinkError("");

    if (!linkUsername.trim() || !linkCode.trim()) {
      setLinkError("Please provide both your child's student nickname and the teacher link code.");
      return;
    }

    setLinking(true);
    try {
      const res = await linkChildApi({
        child_username: linkUsername.trim(),
        link_code: linkCode.trim().toUpperCase(),
      });
      playSuccess();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      setShowLinkModal(false);
      setLinkUsername("");
      setLinkCode("");
      await fetchChildren();
      if (res.child?.id) {
        setSelectedChildId(res.child.id);
      }
    } catch (err) {
      setLinkError(err.message || "Failed to link child. Check the code with your teacher.");
    } finally {
      setLinking(false);
    }
  };

  const selectedChild = children.find((c) => c.id === selectedChildId);
  const avatarObj = getAvatar(selectedChild?.avatar || "owl");

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)",
          color: "#FFFFFF",
          borderRadius: 24,
          padding: "24px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 10px 25px rgba(30, 27, 75, 0.2)",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                padding: "4px 10px",
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Parent Portal
            </span>
            <span style={{ fontSize: 13, color: "#C7D2FE", display: "flex", alignItems: "center", gap: 4 }}>
              <Shield size={14} /> Read-Only & Student-Private
            </span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 6px 0", color: "#FFFFFF" }}>
            Welcome, {user?.display_name || user?.name || "Parent"}!
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "#E0E7FF", maxWidth: 560, lineHeight: 1.5 }}>
            Track your child's weekly progress, workbook unit completions, practice accuracy, and certificates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => { setShowLinkModal(true); playClick(); }}
          style={{
            background: "#4F46E5",
            color: "#FFFFFF",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            padding: "10px 18px",
            borderRadius: 14,
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          <PlusCircle size={18} />
          Link Another Child
        </button>
      </div>

      {/* Children Tab Switcher */}
      {children.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {children.map((child) => {
            const isSelected = child.id === selectedChildId;
            const childAvatar = getAvatar(child.avatar || "owl");
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => { setSelectedChildId(child.id); playClick(); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 16px",
                  borderRadius: 16,
                  border: isSelected ? "2px solid #4F46E5" : "1.5px solid #E2E8F0",
                  background: isSelected ? "#EEF2FF" : "#FFFFFF",
                  cursor: "pointer",
                  fontWeight: 800,
                  fontSize: 14,
                  color: isSelected ? "#3730A3" : "#475569",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? "0 4px 12px rgba(79, 70, 229, 0.12)" : "none",
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden" }}>
                  {childAvatar.render ? childAvatar.render(28) : null}
                </div>
                <span>{child.display_name || child.username}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    background: isSelected ? "#C7D2FE" : "#F1F5F9",
                    color: isSelected ? "#312E81" : "#64748B",
                    padding: "2px 8px",
                    borderRadius: 9999,
                  }}
                >
                  {child.grade}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Zero Children Linked Empty State */}
      {!loading && children.length === 0 && (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 24,
            padding: "48px 24px",
            textAlign: "center",
            border: "1.5px dashed #CBD5E1",
          }}
        >
          <Mascot mood="curious" size={80} animated />
          <h2 style={{ fontSize: 22, fontWeight: 900, color: "#0F172A", margin: "16px 0 8px 0" }}>
            No Students Linked Yet
          </h2>
          <p style={{ color: "#64748B", fontSize: 14, maxWidth: 460, margin: "0 auto 24px auto", lineHeight: 1.5 }}>
            To view your child's learning journey, ask their teacher for a <strong>7-Day Parent Link Code</strong>, then click below to link them.
          </p>
          <button
            type="button"
            onClick={() => setShowLinkModal(true)}
            style={{
              background: "#4F46E5",
              color: "#FFFFFF",
              border: "none",
              padding: "12px 24px",
              borderRadius: 14,
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <PlusCircle size={18} />
            Link Your Child Now
          </button>
        </div>
      )}

      {/* Main Report Card View */}
      {selectedChild && reportCard && (
        <div>
          {/* Top Metric Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {/* Child Profile summary */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                border: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                gap: 16,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: "#F8FAFC",
                  border: "1.5px solid #E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {avatarObj.render ? avatarObj.render(44) : null}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#0F172A" }}>
                  {reportCard.student?.display_name || reportCard.student?.username}
                </div>
                <div style={{ fontSize: 13, color: "#4F46E5", fontWeight: 700 }}>
                  {reportCard.student?.grade} · @{reportCard.student?.username}
                </div>
              </div>
            </div>

            {/* Streak & XP */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                border: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                gap: 16,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: "#FFF7ED",
                  color: "#EA580C",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Flame size={28} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>
                  Active Streak
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#0F172A" }}>
                  {reportCard.student?.streak || 1} Days
                </div>
                <div style={{ fontSize: 12, color: "#EA580C", fontWeight: 700 }}>
                  ⚡ {reportCard.student?.xp || 0} Total XP
                </div>
              </div>
            </div>

            {/* Weekly Activities */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                padding: 20,
                border: "1px solid #E2E8F0",
                display: "flex",
                alignItems: "center",
                gap: 16,
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 16,
                  background: "#F0FDF4",
                  color: "#16A34A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <TrendingUp size={28} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>
                  Past 7 Days
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#0F172A" }}>
                  {reportCard.weekly_summary?.recent_activities || 0} Activities
                </div>
                <div style={{ fontSize: 12, color: "#16A34A", fontWeight: 700 }}>
                  Active learning pace
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Progress Sections (2 columns) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: 20,
              marginBottom: 24,
            }}
          >
            {/* Section 1: Official Parivestra AI Workbook */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                padding: 24,
                border: "1px solid #E2E8F0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <BookOpen size={20} color="#4F46E5" />
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "#0F172A" }}>
                  AI & Future Skills Workbook
                </h3>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                  <span>Completed Units</span>
                  <span style={{ color: "#4F46E5" }}>
                    {reportCard.workbook?.units_completed} of {reportCard.workbook?.total_units} Units ({reportCard.workbook?.percent}%)
                  </span>
                </div>
                <div style={{ height: 10, borderRadius: 9999, background: "#EEF2FF", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${reportCard.workbook?.percent || 0}%`,
                      background: "linear-gradient(90deg, #4F46E5, #818CF8)",
                      borderRadius: 9999,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>

              {/* Certificates */}
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 800, color: "#64748B", textTransform: "uppercase", margin: "14px 0 8px 0" }}>
                  Official Certificates Earned
                </h4>
                {reportCard.workbook?.certificates?.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {reportCard.workbook.certificates.map((cert) => (
                      <div
                        key={cert.id}
                        style={{
                          background: "#FFFBEB",
                          border: "1px solid #FDE68A",
                          borderRadius: 12,
                          padding: "8px 12px",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#B45309",
                        }}
                      >
                        <Award size={16} />
                        <span>Class {cert.grade} Graduate Certificate</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>
                    Certificate will be unlocked after completing the 8 units and final project!
                  </p>
                )}
              </div>
            </div>

            {/* Section 2: Practice Accuracy & Mastery */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 20,
                padding: 24,
                border: "1px solid #E2E8F0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <CheckCircle2 size={20} color="#16A34A" />
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: "#0F172A" }}>
                  Practice & Accuracy
                </h3>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    border: "4px solid #16A34A",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 20, fontWeight: 900, color: "#166534" }}>
                    {reportCard.practice?.accuracy_percent || 0}%
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#64748B", textTransform: "uppercase" }}>
                    Accuracy
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                    {reportCard.practice?.correct_answers || 0} of {reportCard.practice?.total_questions || 0} Correct
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    Concepts Mastered: <strong>{reportCard.mastery?.concepts_mastered || 0}</strong>
                  </div>
                </div>
              </div>

              {/* Subject breakdown */}
              {reportCard.practice?.subjects?.length > 0 && (
                <div style={{ display: "grid", gap: 6 }}>
                  {reportCard.practice.subjects.map((subj) => (
                    <div
                      key={subj.subject}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 10px",
                        background: "#F8FAFC",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "#334155" }}>{subj.subject}</span>
                      <span style={{ color: "#64748B" }}>
                        {subj.correct}/{subj.total} ({subj.accuracy}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Privacy Note */}
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 16,
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 13,
              color: "#475569",
            }}
          >
            <Shield size={20} color="#64748B" />
            <div>
              <strong>Privacy Protection:</strong> In compliance with child safety standards, AI tutor conversational messages are private to your child and their classroom teacher. As a parent, you have full visibility into overall progress, accuracy, workbook completions, and certifications.
            </div>
          </div>
        </div>
      )}

      {/* Link Child Modal */}
      {showLinkModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 24,
              maxWidth: 440,
              width: "100%",
              padding: 28,
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "#EEF2FF",
                  color: "#4F46E5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <PlusCircle size={22} />
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0, color: "#0F172A" }}>
                Link Your Child's Account
              </h2>
            </div>

            <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 16px 0", lineHeight: 1.5 }}>
              Enter your child's student nickname and the single-use 7-day link code generated by their teacher.
            </p>

            {linkError && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: "#B91C1C",
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                {linkError}
              </div>
            )}

            <form onSubmit={handleLinkChild}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  Student Nickname / Username
                </label>
                <input
                  type="text"
                  value={linkUsername}
                  onChange={(e) => setLinkUsername(e.target.value)}
                  placeholder="e.g. kid3, ananya_3"
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #CBD5E1",
                    fontSize: 14,
                    fontWeight: 600,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                  7-Day Teacher Link Code
                </label>
                <input
                  type="text"
                  value={linkCode}
                  onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                  placeholder="e.g. LINK-ABC123"
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 12,
                    border: "1.5px solid #CBD5E1",
                    fontSize: 14,
                    fontWeight: 700,
                    outline: "none",
                    boxSizing: "border-box",
                    letterSpacing: "1px",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 12,
                    border: "1px solid #CBD5E1",
                    background: "#F8FAFC",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linking}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 12,
                    border: "none",
                    background: "#4F46E5",
                    color: "#FFFFFF",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: linking ? "not-allowed" : "pointer",
                  }}
                >
                  {linking ? "Linking..." : "Link Child"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
