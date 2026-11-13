import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { navigation } from "../data/navigation";
import { checkHealth } from "../api/client";

export default function AppLayout() {
  const [health, setHealth] = useState({ status: "checking" });

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

  const getStatusBadge = () => {
    if (health.status === "checking") {
      return (
        <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6, color: "#888" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ccc" }} />
          Connecting...
        </span>
      );
    }
    if (health.status === "ok") {
      const llmHealthy = health.llm && health.llm.status === "healthy";
      const tooltipText = llmHealthy
        ? `LLM Active\nModel: ${health.llm?.model || "gemma-4"}\nURL: ${health.llm?.base_url}\nLatency: ${health.llm?.latency_ms} ms`
        : `LLM Offline\nURL: ${health.llm?.base_url || "http://127.0.0.1:8000/v1"}\nReason: ${health.llm?.error || health.llm?.error_type || "Connection refused"}\nAction: Run 'powershell scripts/start-llm.ps1' to start the local model`;

      return (
        <span
          style={{
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: llmHealthy ? "#16a34a" : "#d97706",
            background: llmHealthy ? "#dcfce7" : "#fef3c7",
            padding: "4px 8px",
            borderRadius: 12,
            fontWeight: 600,
            cursor: "help",
          }}
          title={tooltipText}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: llmHealthy ? "#16a34a" : "#d97706",
            }}
          />
          {llmHealthy ? "LLM & Backend Active" : "Backend Ready (LLM Offline)"}
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "#dc2626",
          background: "#fee2e2",
          padding: "4px 8px",
          borderRadius: 12,
          fontWeight: 600,
        }}
        title="Backend unreachable; using browser offline fallback"
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626" }} />
        Offline Mode
      </span>
    );
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <img className="brand-logo" src="/parivestra-logo.jpeg" alt="Parivestra logo" />
        <p className="nav-caption">PERSONAL LEARNING SPACE</p>
        <nav>
          {navigation.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <strong>Learn at your pace.</strong>
          <p>Your personal AI tutor is ready whenever you are.</p>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span>
              Parivestra <b>/</b> Learning space
            </span>
            {getStatusBadge()}
          </div>
          <div className="user-chip">
            <span className="avatar">A</span> Alex Morgan
          </div>
        </header>
        <section className="content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
