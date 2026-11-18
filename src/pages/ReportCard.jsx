import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useGrade } from "../context/GradeContext";
import { getReportCard } from "../api/client";
import { getAvatar } from "../data/avatars";
import Mascot from "../components/Mascot";
import {
  Printer,
  Sparkles,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  Star,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

export default function ReportCard() {
  const { user } = useAuth();
  const { activeGrade, band, bandConfig } = useGrade();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const res = await getReportCard(activeGrade);
      if (mounted) {
        setData(res);
        setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [activeGrade]);

  const avatarObj = getAvatar(user?.avatar || "owl");

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 400,
          gap: 16,
        }}
      >
        <Mascot mood="thinking" size={72} animated />
        <h3 style={{ fontSize: 18, color: "#1E293B", fontWeight: 700 }}>
          Generating Official Report Card...
        </h3>
      </div>
    );
  }

  const subjects = data?.subjects || [];
  const workbook = data?.workbook || { total_units: 8, completed_units: 0 };
  const stats = data?.stats || {};

  return (
    <div
      style={{
        maxWidth: 880,
        margin: "0 auto",
        padding: "24px 16px 60px 16px",
      }}
    >
      {/* Top action bar (hidden during print) */}
      <div
        className="no-print"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", margin: 0 }}>
            Student Learning Report Card
          </h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "4px 0 0 0" }}>
            Performance record for {activeGrade} · {bandConfig?.name || "Curriculum"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            background: "#0F172A",
            color: "#FFFFFF",
            borderRadius: 12,
            border: "none",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(15,23,42,0.2)",
          }}
        >
          <Printer size={16} />
          Print / Save PDF
        </button>
      </div>

      {/* Printable Sheet */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 20,
          border: "2px solid #E2E8F0",
          boxShadow: "0 8px 30px rgba(0,0,0,0.04)",
          padding: "36px 32px",
        }}
      >
        {/* Certificate Header Banner */}
        <div
          style={{
            borderBottom: "2px solid #F1F5F9",
            paddingBottom: 24,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                background: "linear-gradient(135deg, #EA580C, #F97316)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFF",
              }}
            >
              <Award size={32} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#EA580C",
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                }}
              >
                Parivestra AI Academy · Official Progress Card
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: "#0F172A", margin: "2px 0 0 0" }}>
                {data?.student_name || user?.display_name || "Young Scholar"}
              </h2>
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>
                Grade: <strong>{activeGrade}</strong> · Role:{" "}
                <span style={{ textTransform: "capitalize" }}>{user?.role || "Student"}</span>
                {data?.class_name ? ` · Class: ${data.class_name}` : ""}
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <Mascot mood="proud" size={64} />
          </div>
        </div>

        {/* Highlight Summary Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              background: "#F8FAFC",
              borderRadius: 16,
              padding: "16px 20px",
              border: "1px solid #E2E8F0",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>Grade XP</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#EA580C", marginTop: 4 }}>
              {stats.grade_xp ?? user?.xp ?? 0}
            </div>
          </div>

          <div
            style={{
              background: "#F8FAFC",
              borderRadius: 16,
              padding: "16px 20px",
              border: "1px solid #E2E8F0",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>Overall Streak</div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: "#D97706",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Flame size={24} />
              {stats.streak ?? user?.streak ?? 1} Days
            </div>
          </div>

          <div
            style={{
              background: "#F8FAFC",
              borderRadius: 16,
              padding: "16px 20px",
              border: "1px solid #E2E8F0",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>AI Workbook Units</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#2563EB", marginTop: 4 }}>
              {workbook.completed_units} / {workbook.total_units}
            </div>
          </div>

          <div
            style={{
              background: "#F8FAFC",
              borderRadius: 16,
              padding: "16px 20px",
              border: "1px solid #E2E8F0",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>Overall Accuracy</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#16A34A", marginTop: 4 }}>
              {stats.overall_accuracy != null ? `${stats.overall_accuracy}%` : "100%"}
            </div>
          </div>
        </div>

        {/* Subject Mastery Breakdown */}
        <div style={{ marginBottom: 32 }}>
          <h3
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#0F172A",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <BookOpen size={20} color="#EA580C" />
            Subject Proficiency & Mastery
          </h3>

          <div
            style={{
              borderRadius: 14,
              border: "1px solid #E2E8F0",
              overflow: "hidden",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Subject</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Questions Attempted</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Accuracy</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Mastery Score</th>
                  <th style={{ padding: "12px 16px", fontWeight: 700, color: "#475569" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {subjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "#64748B" }}>
                      No practice records for {activeGrade} yet. Start a quiz on the Practice page!
                    </td>
                  </tr>
                ) : (
                  subjects.map((s, idx) => (
                    <tr
                      key={s.name || idx}
                      style={{
                        borderBottom: idx < subjects.length - 1 ? "1px solid #F1F5F9" : "none",
                      }}
                    >
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: "#1E293B" }}>
                        {s.name}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#475569" }}>
                        {s.attempts || 0}
                      </td>
                      <td style={{ padding: "14px 16px", color: "#475569" }}>
                        {s.accuracy != null ? `${s.accuracy}%` : "—"}
                      </td>
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: "#0F172A" }}>
                        {s.mastery_score != null ? `${s.mastery_score}%` : "—"}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 700,
                            background:
                              s.status === "Mastered"
                                ? "#DCFCE7"
                                : s.status === "In Progress"
                                ? "#FEF3C7"
                                : "#F1F5F9",
                            color:
                              s.status === "Mastered"
                                ? "#166534"
                                : s.status === "In Progress"
                                ? "#92400E"
                                : "#475569",
                          }}
                        >
                          {s.status || "Ready to Start"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Teacher / Parent Signature Box */}
        <div
          style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: "1px dashed #CBD5E1",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>Date Generated</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>
              {new Date().toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 200,
                borderBottom: "1.5px solid #0F172A",
                marginBottom: 6,
              }}
            />
            <div style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>
              Teacher / Mentor Signature
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
