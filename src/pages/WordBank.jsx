import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Volume2,
  CheckCircle2,
  Search,
  Sparkles,
  Bookmark,
  Check,
} from "lucide-react";
import Mascot, { GRADE_MASCOT_COLORS } from "../components/Mascot";
import { getWorkbookGlossary, updateWorkbookGlossary } from "../api/client";

export default function WordBank() {
  const [searchParams] = useSearchParams();
  const grade = parseInt(searchParams.get("grade") || "3", 10);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [speakingTerm, setSpeakingTerm] = useState(null);

  const themeColors = GRADE_MASCOT_COLORS[grade] || GRADE_MASCOT_COLORS[3];

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getWorkbookGlossary(grade)
      .then((data) => {
        if (mounted) {
          setTerms(data.terms || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load glossary:", err);
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [grade]);

  const handleToggleMastery = async (termStr, currentMastered) => {
    const nextMastered = !currentMastered;
    // Optimistic update
    setTerms((prev) =>
      prev.map((t) => (t.term === termStr ? { ...t, mastered: nextMastered } : t))
    );
    try {
      await updateWorkbookGlossary(grade, termStr, nextMastered);
    } catch (err) {
      console.error("Failed to update mastery:", err);
      // Revert on error
      setTerms((prev) =>
        prev.map((t) => (t.term === termStr ? { ...t, mastered: currentMastered } : t))
      );
    }
  };

  const handleSpeak = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.05;
      setSpeakingTerm(text);
      utterance.onend = () => setSpeakingTerm(null);
      utterance.onerror = () => setSpeakingTerm(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const filteredTerms = terms.filter(
    (t) =>
      t.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.definition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const masteredCount = terms.filter((t) => t.mastered).length;

  return (
    <div
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "1.5rem 1rem 4rem",
      }}
    >
      {/* Top Navigation */}
      <div style={{ marginBottom: "1.5rem" }}>
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
      </div>

      {/* Header Banner */}
      <div
        style={{
          background: `linear-gradient(135deg, ${themeColors.primary}18 0%, #FFFFFF 100%)`,
          border: `2px solid ${themeColors.primary}30`,
          borderRadius: "24px",
          padding: "1.75rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "2rem",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div>
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
            <Sparkles size={15} /> Grade {grade} AI Word Bank
          </div>
          <h1
            style={{
              margin: "0 0 0.5rem",
              fontSize: "1.85rem",
              fontFamily: "var(--font-heading)",
              color: "var(--text-main)",
            }}
          >
            My AI Vocabulary
          </h1>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.95rem" }}>
            Tick each word you can explain to a friend or classmate.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            background: "#FFFFFF",
            padding: "0.75rem 1.25rem",
            borderRadius: "16px",
            border: "1px solid #E2E8F0",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <Mascot mood="happy" grade={grade} size={60} />
          <div>
            <div style={{ fontSize: "1.4rem", fontWeight: "900", color: themeColors.primary }}>
              {masteredCount} / {terms.length}
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "700" }}>
              Words Mastered
            </div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div
        style={{
          position: "relative",
          marginBottom: "1.5rem",
        }}
      >
        <Search
          size={20}
          color="var(--text-muted)"
          style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)" }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search vocabulary terms and definitions..."
          style={{
            width: "100%",
            padding: "0.85rem 1rem 0.85rem 2.85rem",
            borderRadius: "16px",
            border: "1.5px solid #CBD5E1",
            fontSize: "1rem",
            outline: "none",
            boxSizing: "border-box",
            background: "#FFFFFF",
          }}
        />
      </div>

      {/* Vocabulary Cards List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <Mascot mood="thinking" grade={grade} size={80} />
          <p style={{ marginTop: "1rem", fontWeight: "700" }}>Loading vocabulary terms...</p>
        </div>
      ) : filteredTerms.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", background: "#FFF", borderRadius: "20px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>
            No vocabulary matches for "{searchQuery}".
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {filteredTerms.map((t) => {
            const isMastered = t.mastered;
            return (
              <div
                key={t.term}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "18px",
                  border: isMastered ? `2px solid ${themeColors.secondary}` : "1px solid #E2E8F0",
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "var(--shadow-sm)",
                  transition: "transform 0.15s ease",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.2rem",
                        fontFamily: "var(--font-heading)",
                        color: "var(--text-main)",
                      }}
                    >
                      {t.term}
                    </h3>
                    <button
                      onClick={() => handleSpeak(`${t.term}. ${t.definition}`)}
                      aria-label="Read pronunciation aloud"
                      style={{
                        border: "none",
                        background: speakingTerm === `${t.term}. ${t.definition}` ? themeColors.primary : "#F1F5F9",
                        color: speakingTerm === `${t.term}. ${t.definition}` ? "#FFFFFF" : "var(--text-main)",
                        padding: "0.4rem",
                        borderRadius: "8px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                  <p
                    style={{
                      margin: "0 0 1rem",
                      fontSize: "0.95rem",
                      color: "var(--text-muted)",
                      lineHeight: "1.5",
                    }}
                  >
                    {t.definition}
                  </p>
                </div>

                {/* Mastered Checkbox Button */}
                <button
                  onClick={() => handleToggleMastery(t.term, isMastered)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "12px",
                    border: isMastered ? "none" : "1.5px solid #CBD5E1",
                    background: isMastered ? themeColors.secondary : "transparent",
                    color: isMastered ? "#FFFFFF" : "var(--text-muted)",
                    fontWeight: "800",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isMastered ? (
                    <>
                      <Check size={16} /> I can explain this (+5 XP)
                    </>
                  ) : (
                    <>
                      <Bookmark size={15} /> Mark as mastered
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

