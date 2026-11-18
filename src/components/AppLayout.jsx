import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { navigation } from "../data/navigation";
import { checkHealth } from "../api/client";
import { getAvatar } from "../data/avatars";
import { useAuth } from "../context/AuthContext";
import { useGrade } from "../context/GradeContext";
import Mascot from "./Mascot";
import GradeGrid from "./GradeGrid";
import { XPChip } from "./UI";
import { isSoundEnabled, toggleSound, playClick } from "../utils/sound";
import {
  Volume2,
  VolumeX,
  Flame,
  ChevronDown,
  Lock,
  LogOut,
  FileText,
  Clock,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function AppLayout() {
  const { user, logout, idleWarning, idleCountdown, stayActive } = useAuth();
  const { activeGrade, setGrade, allowGradeSwitch, band, bandConfig } = useGrade();
  const [health, setHealth] = useState({ status: "checking" });
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
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

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
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

  const avatarObj = getAvatar(user?.avatar || "owl");

  // Filter navigation: hide Grown-ups from students, add Report Card
  const visibleNav = navigation.filter((item) => {
    if (item.path === "/grown-ups" && user?.role === "student") {
      return false;
    }
    return true;
  });

  // Inject Report Card link before Grown-ups or at the end
  const navWithReport = [...visibleNav];
  if (!navWithReport.some((n) => n.path === "/report-card")) {
    const grownUpsIdx = navWithReport.findIndex((n) => n.path === "/grown-ups");
    const reportItem = {
      label: "Report Card",
      path: "/report-card",
      icon: FileText,
      mobileTab: false,
    };
    if (grownUpsIdx >= 0) {
      navWithReport.splice(grownUpsIdx, 0, reportItem);
    } else {
      navWithReport.push(reportItem);
    }
  }

  return (
    <div className="app-shell" data-band={band}>
      {/* Grade Selector Modal */}
      {gradeModalOpen && (
        <GradeGrid
          isModal
          selectedGrade={activeGrade}
          onSelectGrade={(g) => {
            setGrade(g);
            setGradeModalOpen(false);
          }}
          onClose={() => setGradeModalOpen(false)}
        />
      )}

      {/* Idle Warning Modal */}
      {idleWarning && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 20,
              padding: "28px 24px",
              maxWidth: 420,
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            <Mascot mood="thinking" size={72} animated />
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", marginTop: 12 }}>
              Are you still exploring?
            </h3>
            <p style={{ fontSize: 14, color: "#64748B", margin: "6px 0 20px 0" }}>
              To protect student accounts, your session will automatically lock in{" "}
              <strong style={{ color: "#EA580C" }}>{idleCountdown} seconds</strong>.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: "1px solid #CBD5E1",
                  background: "#F8FAFC",
                  color: "#475569",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Log Out
              </button>
              <button
                type="button"
                onClick={stayActive}
                style={{
                  padding: "10px 22px",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, #EA580C, #F97316)",
                  color: "#FFFFFF",
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(234, 88, 12, 0.35)",
                }}
              >
                Keep Me Signed In 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop & Tablet Sidebar */}
      <aside className="sidebar">
        <div className="brand-header">
          <img className="brand-logo-img" src="/parivestra-logo.jpeg" alt="Parivestra logo" />
          <div>
            <h1 className="brand-title">Parivestra</h1>
            <p className="brand-subtitle">
              {band === "senior"
                ? "Senior Academy 🎓"
                : band === "middle"
                ? "Middle School 📚"
                : "Junior Learning 🌟"}
            </p>
          </div>
        </div>

        {/* Grade Scoping Quick Badge in Sidebar */}
        <div style={{ padding: "0 12px 14px 12px" }}>
          <button
            type="button"
            onClick={() => setGradeModalOpen(true)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 12,
              background: "var(--bg-card-tint)",
              border: "1.5px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: allowGradeSwitch ? "pointer" : "default",
              color: "var(--text-main)",
              textAlign: "left",
            }}
            title={allowGradeSwitch ? "Click to switch active grade" : "Locked to your class"}
          >
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--color-primary)", textTransform: "uppercase" }}>
                Active Grade
              </div>
              <div style={{ fontSize: 13, fontWeight: 900 }}>{activeGrade}</div>
            </div>
            {allowGradeSwitch ? (
              <ChevronDown size={16} color="var(--text-muted)" />
            ) : (
              <Lock size={14} color="#94A3B8" />
            )}
          </button>
        </div>

        <p className="nav-caption">
          {band === "senior"
            ? "STUDY CURRICULUM"
            : band === "middle"
            ? "LEARNING PORTAL"
            : "ADVENTURE MAP"}
        </p>
        <nav>
          {navWithReport.map(({ label, path, icon: Icon }) => (
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
              {bandConfig?.tagline || "Your playful AI tutor companion"}
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {getPariStatusBadge()}

            {/* Active Grade Chip with 1-Click Switcher */}
            <button
              type="button"
              onClick={() => setGradeModalOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#FFF7ED",
                border: "1.5px solid #FFEDD5",
                borderRadius: "var(--radius-full)",
                padding: "5px 12px",
                fontSize: 13,
                fontWeight: 800,
                color: "#EA580C",
                cursor: allowGradeSwitch ? "pointer" : "default",
              }}
              title={allowGradeSwitch ? "Switch Grade (Classes 3 to 10)" : "Locked to your class"}
            >
              <Sparkles size={14} />
              <span>{activeGrade}</span>
              {allowGradeSwitch ? <ChevronDown size={14} /> : <Lock size={12} />}
            </button>

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
              title={soundOn ? "Sound Effects ON" : "Sound Effects OFF"}
            >
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
              <span style={{ display: "inline-block" }}>{soundOn ? "Sound On" : "Muted"}</span>
            </button>
          </div>

          {/* User Identity & Logout */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <XPChip xp={user?.xp || 0} />

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
              <span>{user?.streak || 1}d</span>
            </div>

            {/* Profile Pill */}
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
              <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden" }}>
                {avatarObj.render(32)}
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
                  {user?.display_name || "Explorer"}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--color-primary)",
                    textTransform: "capitalize",
                  }}
                >
                  {user?.role || "student"}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: "#F1F5F9",
                border: "1px solid #E2E8F0",
                borderRadius: "var(--radius-full)",
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#64748B",
                cursor: "pointer",
              }}
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="content">
          <Outlet />
        </main>

        {/* Phone Bottom Tab Bar */}
        <nav className="mobile-bottom-nav">
          {navWithReport
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
