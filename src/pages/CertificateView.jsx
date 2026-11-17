import React, { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  Sparkles,
  Award,
  CheckCircle2,
} from "lucide-react";
import Mascot, { GRADE_MASCOT_COLORS } from "../components/Mascot";
import { getWorkbookCertificates, issueWorkbookCertificate, getUserProfile } from "../api/client";

export default function CertificateView() {
  const [searchParams] = useSearchParams();
  const grade = parseInt(searchParams.get("grade") || "3", 10);
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("");
  const [schoolName, setSchoolName] = useState("Parivestra Learning Center");
  const certRef = useRef();

  const themeColors = GRADE_MASCOT_COLORS[grade] || GRADE_MASCOT_COLORS[3];

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([getUserProfile(), getWorkbookCertificates(grade)])
      .then(([user, certs]) => {
        if (!mounted) return;
        const name = user.display_name || user.name || "Young Explorer";
        setStudentName(name);

        if (certs && certs.length > 0) {
          setCertificate(certs[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading certificate:", err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [grade]);

  const handleClaimCertificate = async () => {
    try {
      const issued = await issueWorkbookCertificate(
        grade,
        studentName.trim() || "Young Explorer",
        schoolName.trim() || "Parivestra School"
      );
      setCertificate(issued);
    } catch (err) {
      console.error("Failed to issue certificate:", err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "1.5rem 1rem 4rem",
      }}
    >
      {/* Top Bar (hidden on print) */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <Link
          to={`/workbook?grade=${grade}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--text-muted)",
            textDecoration: "none",
            fontWeight: "700",
            fontSize: "0.95rem",
          }}
        >
          <ArrowLeft size={18} /> Back to Grade {grade} Workbook
        </Link>

        {certificate && (
          <button
            onClick={handlePrint}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: themeColors.primary,
              color: "#FFFFFF",
              border: "none",
              padding: "0.6rem 1.25rem",
              borderRadius: "12px",
              fontWeight: "800",
              fontSize: "0.95rem",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <Printer size={18} /> Print or Save as PDF
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <Mascot mood="thinking" grade={grade} size={90} />
          <p style={{ marginTop: "1rem", fontWeight: "700" }}>Loading certificate...</p>
        </div>
      ) : !certificate ? (
        /* Certificate Claim Form */
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "24px",
            padding: "2.5rem 2rem",
            maxWidth: "600px",
            margin: "0 auto",
            border: "1px solid #E2E8F0",
            boxShadow: "var(--shadow-md)",
            textAlign: "center",
          }}
        >
          <Mascot mood="cheering" grade={grade} size={110} />
          <h2 style={{ fontFamily: "var(--font-heading)", margin: "1rem 0 0.5rem" }}>
            Ready to Claim Your Certificate!
          </h2>
          <p style={{ color: "var(--text-muted)", margin: "0 0 1.5rem", lineHeight: "1.5" }}>
            Congratulations on exploring Grade {grade} AI & Future Skills! Enter your name for your official
            certificate.
          </p>

          <div style={{ textAlign: "left", marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "800", marginBottom: "0.3rem" }}>
              Student Full Name
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Aarav Sharma"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "12px",
                border: "1.5px solid #CBD5E1",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ textAlign: "left", marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "800", marginBottom: "0.3rem" }}>
              School Name
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g. Delhi Public School"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "12px",
                border: "1.5px solid #CBD5E1",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            onClick={handleClaimCertificate}
            style={{
              width: "100%",
              padding: "0.85rem",
              borderRadius: "12px",
              border: "none",
              background: themeColors.primary,
              color: "#FFFFFF",
              fontSize: "1rem",
              fontWeight: "900",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
            }}
          >
            Claim Certificate (+100 XP)
          </button>
        </div>
      ) : (
        /* Rendered Printable Certificate */
        <div
          ref={certRef}
          className="certificate-print-card"
          style={{
            background: "#FFFFFF",
            border: `12px solid ${themeColors.primary}`,
            outline: `4px solid ${themeColors.secondary}`,
            outlineOffset: "-8px",
            borderRadius: "28px",
            padding: "3.5rem 3rem",
            textAlign: "center",
            position: "relative",
            boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
            maxWidth: "850px",
            margin: "0 auto",
          }}
        >
          {/* Header Seal */}
          <div style={{ marginBottom: "1rem" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "1rem",
                fontWeight: "900",
                letterSpacing: "0.2em",
                color: themeColors.primary,
                textTransform: "uppercase",
              }}
            >
              <Sparkles size={18} /> Parivestra AI & Future Skills <Sparkles size={18} />
            </div>
            <h1
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "2.75rem",
                margin: "0.5rem 0",
                color: "#1E293B",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Certificate of Completion
            </h1>
            <p
              style={{
                fontSize: "1.1rem",
                fontWeight: "800",
                color: themeColors.secondary,
                margin: 0,
              }}
            >
              Grade {grade} · Course Edition
            </p>
          </div>

          {/* Presentation Prose */}
          <p
            style={{
              fontSize: "1.15rem",
              color: "var(--text-muted)",
              margin: "1.5rem 0 0.5rem",
              fontStyle: "italic",
            }}
          >
            This certificate is proudly presented to
          </p>

          {/* Student Name */}
          <div
            style={{
              fontSize: "2.4rem",
              fontFamily: "var(--font-heading)",
              fontWeight: "900",
              color: themeColors.primary,
              borderBottom: `3px solid ${themeColors.primary}`,
              display: "inline-block",
              padding: "0 2rem 0.5rem",
              margin: "0.5rem 0 1.5rem",
              minWidth: "300px",
            }}
          >
            {certificate.student_name}
          </div>

          {/* Description */}
          <p
            style={{
              maxWidth: "600px",
              margin: "0 auto 2.5rem",
              fontSize: "1.05rem",
              lineHeight: "1.6",
              color: "#334155",
            }}
          >
            for completing the <strong>Parivestra AI & Future Skills Grade {grade} Workbook</strong> with
            curiosity, creativity, and responsible care.
          </p>

          {/* Signatures & Seal Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: "2.5rem",
              paddingTop: "1.5rem",
              borderTop: "1px dashed #CBD5E1",
            }}
          >
            {/* Teacher Signature */}
            <div style={{ textAlign: "center", minWidth: "160px" }}>
              <div
                style={{
                  fontFamily: "cursive",
                  fontSize: "1.4rem",
                  color: "#1E293B",
                  marginBottom: "0.3rem",
                }}
              >
                {certificate.teacher_name || "Teacher"}
              </div>
              <div style={{ borderTop: "2px solid #64748B", paddingTop: "0.3rem", fontSize: "0.85rem", fontWeight: "700", color: "#64748B" }}>
                Teacher / Mentor
              </div>
            </div>

            {/* Mascot Seal */}
            <div style={{ textAlign: "center" }}>
              <Mascot mood="cheering" grade={grade} size={85} />
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "800",
                  color: themeColors.primary,
                  marginTop: "0.2rem",
                }}
              >
                Pari Verified · {certificate.id}
              </div>
            </div>

            {/* Date & School */}
            <div style={{ textAlign: "center", minWidth: "160px" }}>
              <div style={{ fontSize: "1rem", fontWeight: "800", color: "#1E293B", marginBottom: "0.3rem" }}>
                {new Date(certificate.issued_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div style={{ borderTop: "2px solid #64748B", paddingTop: "0.3rem", fontSize: "0.85rem", fontWeight: "700", color: "#64748B" }}>
                {certificate.school_name || "Parivestra School"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

