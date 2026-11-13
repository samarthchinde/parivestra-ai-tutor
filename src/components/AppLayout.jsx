import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { navigation } from "../data/navigation";
import { checkHealth, getUserProfile } from "../api/client";
import { getAvatar } from "../data/avatars";
import { getBandForGrade, getBandConfig } from "../config/bands";
import Mascot from "./Mascot";
import OnboardingModal from "./OnboardingModal";
import { XPChip } from "./UI";
import { isSoundEnabled, toggleSound, playClick } from "../utils/sound";
import { Volume2, VolumeX, Flame } from "lucide-react";

export default function AppLayout() {
  const [health, setHealth] = useState({ status: "checking" });
  const [userProfile, setUserProfile] = useState({
    display_name: localStorage.getItem("parivestra_display_name") || "Young Explorer",
    avatar: localStorage.getItem("parivestra_avatar") || "owl",
    grade: localStorage.getItem("parivestra_grade") || "Class 3",
    xp: 0,
    streak: 1,
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const location = useLocation();

  useEffect(() => {
    // Check first-run onboarding
    const onboarded = localStorage.getItem("parivestra_onboarded");
    if (!onboarded) {
      setShowOnboarding(true);
    }

    // Load user profile from backend
    async function fetchProfile() {
      const p = await getUserProfile();
      if (p) setUserProfile(p);
    }
    fetchProfile();

    let mounted = true;
    async function probe() {
      const h = await checkHealth();
      if (mounted) setHealth(h);
    }
    probe();
    const interval = setInterval(probe, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSoundToggle = () => {
    const next = toggleSound();
    setSoundOn(next);
  };

  const getPariStatusBadge = () => {
    if (health.status === "checking") {
      return (
        <span
          style={{
            fontSize: 13,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "#64748B",
            background: "#F1F5F9",
            padding: "4px 10px",
            borderRadius: "var(--radius-full)",
            fontWeight: 700,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#94A3B8" }} />
          Waking up...
        </span>
      );
    }
    const llmHealthy = health.status === "ok" && health.llm && health.llm.status === "healthy";

    return (
      <span
        style={{
          fontSize: 13,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: llmHealthy ? "#15803D" : "#B45309",
          background: llmHealthy ? "#DCFCE7" : "#FEF3C7",
          padding: "5px 12px",
          borderRadius: "var(--radius-full)",
          fontWeight: 800,
          cursor: "help",
        }}
        title={
          llmHealthy
            ? `Pari is awake and ready to chat!\nModel: ${health.llm?.model}\nLatency: ${health.llm?.latency_ms} ms`
            : `Pari is taking a quick nap.\nOffline fallback lessons and practice quizzes are fully available!\n(Grown-ups can start Pari with scripts/start-llm.ps1)`
        }
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: llmHealthy ? "#22C55E" : "#F59E0B",
          }}
        />
        {llmHealthy ? "Pari is awake! 🌟" : "Pari is resting 😴"}
      </span>
    );
  };

  const avatarObj = getAvatar(userProfile.avatar);

  const band = getBandForGrade(userProfile.grade);
  const bandConfig = getBandConfig(userProfile.grade);

  return (
    <div className="app-shell" data-band={band}>
      {/* Onboarding Dialog */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={(newProf) => {
          setUserProfile((prev) => ({ ...prev, ...newProf }));
          setShowOnboarding(false);
        }}
      />

      {/* Desktop & Tablet Sidebar */}
      <aside className="sidebar">
        <div className="brand-header">
          <img className="brand-logo-img" src="/parivestra-logo.jpeg" alt="Parivestra logo" />
          <div>
            <h1 className="brand-title">Parivestra</h1>
            <p className="brand-subtitle">
              {band === "senior" ? "Senior Academy 🎓" : band === "middle" ? "Middle School 📚" : "Junior Learning 🌟"}
            </p>
          </div>
        </div>

        <p className="nav-caption">
          {band === "senior" ? "STUDY CURRICULUM" : band === "middle" ? "LEARNING PORTAL" : "ADVENTURE MAP"}
        </p>
        <nav>
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => playClick()}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {band !== "senior" ? (
          <div className="sidebar-mascot-card">
            <Mascot mood="happy" size={band === "middle" ? 56 : 76} />
            <strong style={{ fontSize: 14, color: "var(--text-main)" }}>Learning with Pari</strong>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {bandConfig.tagline}
            </span>
          </div>
        ) : (
          <div
            style={{
              padding: "14px 16px",
              background: "var(--bg-card-tint)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              marginTop: "auto",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>🦉</span>
              <strong style={{ fontSize: 13, color: "var(--text-main)" }}>CBSE Board Prep</strong>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
              Formula sheets, textbook citations, and exam-style practice.
            </p>
          </div>
        )}
      </aside>

      {/* Main Content Shell */}
      <div className="main">
        {/* Top Header Bar */}
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {getPariStatusBadge()}
            <button
              onClick={handleSoundToggle}
              style={{
                background: soundOn ? "#EAF2FE" : "#F1F5F9",
                border: "none",
                borderRadius: "var(--radius-full)",
                padding: "6px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
                color: soundOn ? "var(--color-primary)" : "#64748B",
                cursor: "pointer",
              }}
              title={soundOn ? "Sound Effects ON (tap to mute)" : "Sound Effects OFF (tap to enable)"}
            >
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span style={{ display: "inline-block" }}>{soundOn ? "Sound On" : "Muted"}</span>
            </button>
          </div>

          {/* Child Identity Chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <XPChip xp={userProfile.xp || 0} />

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "#FFF0ED",
                border: "2px solid #FFCDC5",
                color: "#C2410C",
                padding: "5px 10px",
                borderRadius: "var(--radius-full)",
                fontWeight: 800,
                fontSize: "var(--font-size-sm)",
              }}
              title="Daily Learning Streak"
            >
              <Flame size={16} color="#EA580C" fill="#F97316" />
              <span>{userProfile.streak || 1}d</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--bg-canvas)",
                padding: "4px 10px 4px 6px",
                borderRadius: "var(--radius-full)",
                border: "2px solid #F0ECE4",
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden" }}>
                {avatarObj.render(34)}
              </div>
              <div style={{ textAlign: "left", lineHeight: 1.2 }}>
                <span
                  style={{
                    display: "block",
                    fontWeight: 800,
                    fontSize: 13,
                    color: "var(--text-main)",
                  }}
                >
                  {userProfile.display_name}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--color-primary)",
                  }}
                >
                  {userProfile.grade}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="content">
          <Outlet />
        </main>

        {/* Phone Bottom Tab Bar (5 key items) */}
        <nav className="mobile-bottom-nav">
          {navigation
            .filter((item) => item.mobileTab)
            .map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === "/"}
                className={({ isActive }) => `mobile-nav-item ${isActive ? "active" : ""}`}
                onClick={() => playClick()}
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
        </nav>
      </div>
    </div>
  );
}
