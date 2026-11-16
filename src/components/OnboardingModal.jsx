import React, { useState } from "react";
import confetti from "canvas-confetti";
import Mascot from "./Mascot";
import { AVATARS } from "../data/avatars";
import { PrimaryButton } from "./UI";
import { playSuccess, playClick } from "../utils/sound";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { updateUserProfile } from "../api/client";

export default function OnboardingModal({ isOpen, onComplete }) {
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState(
    localStorage.getItem("parivestra_display_name") || "Explorer"
  );
  const [selectedAvatar, setSelectedAvatar] = useState(
    localStorage.getItem("parivestra_avatar") || "owl"
  );
  const [selectedGrade, setSelectedGrade] = useState(
    localStorage.getItem("parivestra_grade") || "Class 3"
  );
  const [aiGoal, setAiGoal] = useState(
    localStorage.getItem("parivestra_ai_goal") || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFinish = async () => {
    setIsSubmitting(true);
    const finalNickname = nickname.trim() || "Young Explorer";

    // Store in localStorage
    localStorage.setItem("parivestra_display_name", finalNickname);
    localStorage.setItem("parivestra_avatar", selectedAvatar);
    localStorage.setItem("parivestra_grade", selectedGrade);
    localStorage.setItem("parivestra_ai_goal", aiGoal.trim());
    localStorage.setItem("parivestra_onboarded", "true");

    // Persist to backend
    try {
      await updateUserProfile({
        display_name: finalNickname,
        avatar: selectedAvatar,
        grade: selectedGrade,
      });
    } catch (e) {
      console.warn("Could not save profile to backend:", e);
    }

    playSuccess();
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // Ignore confetti error
    }

    setIsSubmitting(false);
    onComplete({
      display_name: finalNickname,
      avatar: selectedAvatar,
      grade: selectedGrade,
    });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(43, 45, 91, 0.6)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        className="onboarding-card"
        style={{
          background: "#FFFFFF",
          borderRadius: "var(--radius-lg)",
          maxWidth: 580,
          width: "100%",
          padding: "36px 32px",
          boxShadow: "var(--shadow-lg)",
          border: "4px solid #FFF4E5",
          textAlign: "center",
        }}
      >
        {/* Step Indicator */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20 }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                width: 32,
                height: 8,
                borderRadius: 4,
                background: s === step ? "var(--color-primary)" : s < step ? "var(--color-mint)" : "#E2E8F0",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* STEP 1: NICKNAME */}
        {step === 1 && (
          <div>
            <Mascot mood="happy" size={110} />
            <h2 style={{ fontSize: 28, margin: "14px 0 6px", color: "var(--text-main)" }}>
              Hi there, Explorer!
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 17, marginBottom: 24 }}>
              I am Pari, your learning buddy. What should I call you?
            </p>
            <div style={{ maxWidth: 360, margin: "0 auto 28px" }}>
              <input
                type="text"
                maxLength={20}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter a fun nickname..."
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  fontSize: 18,
                  fontWeight: 700,
                  borderRadius: "var(--radius-md)",
                  border: "3px solid #E2E8F0",
                  textAlign: "center",
                  outline: "none",
                  color: "var(--text-main)",
                }}
                autoFocus
              />
              <span style={{ fontSize: 13, color: "var(--text-muted)", display: "block", marginTop: 6 }}>
                Tip: Choose a fun nickname, like Star Explorer or Tiger!
              </span>
            </div>
            <PrimaryButton
              size="lg"
              onClick={() => {
                playClick();
                setStep(2);
              }}
              style={{ width: "100%", maxWidth: 360 }}
            >
              Next: Pick your Buddy →
            </PrimaryButton>
          </div>
        )}

        {/* STEP 2: AVATAR SELECTION */}
        {step === 2 && (
          <div>
            <Mascot mood="cheering" size={90} />
            <h2 style={{ fontSize: 26, margin: "10px 0 4px", color: "var(--text-main)" }}>
              Pick Your Avatar!
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 16, marginBottom: 18 }}>
              Choose an explorer friend to accompany your journey.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
                maxHeight: 280,
                overflowY: "auto",
                padding: "8px 4px 16px",
                marginBottom: 20,
              }}
            >
              {AVATARS.map((av) => {
                const isSelected = selectedAvatar === av.id;
                return (
                  <button
                    key={av.id}
                    onClick={() => {
                      playClick();
                      setSelectedAvatar(av.id);
                    }}
                    style={{
                      background: isSelected ? "#EAF2FE" : "#F8FAFC",
                      border: isSelected ? "3px solid var(--color-primary)" : "2px solid #E2E8F0",
                      borderRadius: "var(--radius-md)",
                      padding: "10px 6px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      position: "relative",
                      transform: isSelected ? "scale(1.05)" : "scale(1)",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    {av.render(50)}
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main)" }}>
                      {av.name.split(" ")[0]}
                    </span>
                    {isSelected && (
                      <div
                        style={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          background: "var(--color-primary)",
                          color: "#fff",
                          borderRadius: "50%",
                          width: 18,
                          height: 18,
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <PrimaryButton variant="secondary" onClick={() => setStep(1)}>
                ← Back
              </PrimaryButton>
              <PrimaryButton size="lg" onClick={() => setStep(3)}>
                Next: Select Grade →
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* STEP 3: CLASS SELECTION */}
        {step === 3 && (
          <div>
            <Mascot mood="thinking" size={80} />
            <h2 style={{ fontSize: 24, margin: "10px 0 4px", color: "var(--text-main)" }}>
              Which class are you in?
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: 15, marginBottom: 18 }}>
              We personalize study notes, practice questions, and topics for your curriculum!
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24, maxHeight: 300, overflowY: "auto", padding: "4px" }}>
              {/* Junior Band */}
              <div style={{ textAlign: "left" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--color-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Junior Explorers (Classes 3 – 5 • Ages 8–11)
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 6 }}>
                  {["Class 3", "Class 4", "Class 5"].map((gr) => {
                    const isSelected = selectedGrade === gr;
                    return (
                      <button
                        key={gr}
                        onClick={() => {
                          playClick();
                          setSelectedGrade(gr);
                        }}
                        style={{
                          background: isSelected ? "var(--color-primary-bg)" : "#F8FAFC",
                          border: isSelected ? "2.5px solid var(--color-primary)" : "1.5px solid #E2E8F0",
                          borderRadius: "var(--radius-md)",
                          padding: "10px 6px",
                          cursor: "pointer",
                          textAlign: "center",
                          transition: "all 0.18s ease",
                        }}
                      >
                        <strong style={{ display: "block", fontSize: 15, color: "var(--text-main)" }}>{gr}</strong>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Maths, Eng, EVS</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Middle Band */}
              <div style={{ textAlign: "left" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "var(--color-grape)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Middle School (Classes 6 – 8 • Ages 11–14)
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 6 }}>
                  {["Class 6", "Class 7", "Class 8"].map((gr) => {
                    const isSelected = selectedGrade === gr;
                    return (
                      <button
                        key={gr}
                        onClick={() => {
                          playClick();
                          setSelectedGrade(gr);
                        }}
                        style={{
                          background: isSelected ? "var(--color-games-bg)" : "#F8FAFC",
                          border: isSelected ? "2.5px solid var(--color-grape)" : "1.5px solid #E2E8F0",
                          borderRadius: "var(--radius-md)",
                          padding: "10px 6px",
                          cursor: "pointer",
                          textAlign: "center",
                          transition: "all 0.18s ease",
                        }}
                      >
                        <strong style={{ display: "block", fontSize: 15, color: "var(--text-main)" }}>{gr}</strong>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Sci, Social, Maths</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Senior Band */}
              <div style={{ textAlign: "left" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#1D4ED8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Senior Academy (Classes 9 – 10 • Ages 14–16)
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginTop: 6 }}>
                  {["Class 9", "Class 10"].map((gr) => {
                    const isSelected = selectedGrade === gr;
                    return (
                      <button
                        key={gr}
                        onClick={() => {
                          playClick();
                          setSelectedGrade(gr);
                        }}
                        style={{
                          background: isSelected ? "#DBEAFE" : "#F8FAFC",
                          border: isSelected ? "2.5px solid #2563EB" : "1.5px solid #E2E8F0",
                          borderRadius: "var(--radius-md)",
                          padding: "12px 10px",
                          cursor: "pointer",
                          textAlign: "center",
                          transition: "all 0.18s ease",
                        }}
                      >
                        <strong style={{ display: "block", fontSize: 16, color: "var(--text-main)" }}>{gr}</strong>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>CBSE Board Prep</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Workbook Welcome Goal */}
              <div style={{ textAlign: "left", marginTop: 8, background: "#FFF9F0", padding: "10px 14px", borderRadius: "12px", border: "1.5px solid #FDE68A" }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#92400E", marginBottom: 4 }}>
                  ⭐ One thing I want to learn about AI:
                </label>
                <input
                  type="text"
                  value={aiGoal}
                  onChange={(e) => setAiGoal(e.target.value)}
                  placeholder="e.g. How robots recognize faces or how chatbots talk!"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1.5px solid #CBD5E1",
                    fontSize: 14,
                    boxSizing: "border-box",
                    background: "#FFFFFF",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <PrimaryButton variant="secondary" onClick={() => setStep(2)}>
                ← Back
              </PrimaryButton>
              <PrimaryButton
                size="lg"
                icon={Sparkles}
                disabled={isSubmitting}
                onClick={handleFinish}
                style={{ background: "var(--color-mint)", color: "#134E4A" }}
              >
                Let's Start Learning! 🌟
              </PrimaryButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

