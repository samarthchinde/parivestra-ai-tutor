import React, { useEffect } from "react";
import Mascot from "./Mascot";
import { playClick } from "../utils/sound";
import { Sparkles, Star, Award, X } from "lucide-react";

export { Mascot };

export function PageHeader({
  eyebrow = "PARIVESTRA ADVENTURES",
  title,
  description,
  action,
  children,
}) {
  return (
    <div className="page-header" style={{ marginBottom: 28 }}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ margin: "6px 0 0", color: "var(--text-main)" }}>{title}</h1>
        {action && <div>{action}</div>}
      </div>
      {description && <p style={{ fontSize: "var(--font-size-base)", color: "var(--text-muted)", marginTop: 6 }}>{description}</p>}
      {children}
    </div>
  );
}

export function Card({ title, subtitle, icon: Icon, children, className = "", style = {}, onClick, color }) {
  const cardBorder = color ? `2px solid ${color}` : undefined;
  return (
    <section
      className={`card ${className} ${onClick ? "clickable-card" : ""}`}
      style={{
        border: cardBorder,
        ...style,
      }}
      onClick={onClick ? (e) => { playClick(); onClick(e); } : undefined}
    >
      {(title || Icon) && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          {Icon && (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-sm)",
                background: color ? `${color}1A` : "var(--color-primary-bg)",
                color: color || "var(--color-primary)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon size={22} />
            </div>
          )}
          <div>
            {title && <h2 style={{ margin: 0, fontSize: "var(--font-size-lg)" }}>{title}</h2>}
            {subtitle && <p style={{ margin: 0, fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>{subtitle}</p>}
          </div>
        </div>
      )}
      {children}
    </section>
  );
}

export function PrimaryButton({
  children,
  variant = "primary", // 'primary', 'secondary', 'maths', 'english', 'evs', 'outline'
  size = "md", // 'sm', 'md', 'lg'
  icon: Icon,
  onClick,
  style = {},
  disabled = false,
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case "maths":
        return { background: "var(--color-maths)", color: "#FFFFFF", border: "none" };
      case "english":
        return { background: "var(--color-english)", color: "#FFFFFF", border: "none" };
      case "evs":
        return { background: "var(--color-evs)", color: "#2B2D5B", border: "none" };
      case "secondary":
        return { background: "var(--bg-canvas)", color: "var(--text-main)", border: "2px solid #E5E7EB" };
      case "outline":
        return { background: "transparent", color: "var(--color-primary)", border: "2px solid var(--color-primary)" };
      case "primary":
      default:
        return { background: "var(--color-primary)", color: "#FFFFFF", border: "none" };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return { padding: "8px 16px", fontSize: 14, borderRadius: "var(--radius-sm)" };
      case "lg":
        return { padding: "16px 28px", fontSize: 20, borderRadius: "var(--radius-md)" };
      case "md":
      default:
        return { padding: "12px 22px", fontSize: 17, borderRadius: "var(--radius-md)" };
    }
  };

  return (
    <button
      className={`primary-button btn-${variant} ${disabled ? "disabled" : ""}`}
      style={{
        ...getVariantStyles(),
        ...getSizeStyles(),
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
      disabled={disabled}
      onClick={(e) => {
        if (!disabled) {
          playClick();
          if (onClick) onClick(e);
        }
      }}
      {...props}
    >
      {Icon && <Icon size={size === "lg" ? 24 : 18} />}
      <span>{children}</span>
    </button>
  );
}

export function ProgressBar({ value = 0, color = "var(--color-primary)", height = 12 }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className="progress-track"
      style={{ height, background: "rgba(43, 45, 91, 0.08)", borderRadius: "var(--radius-full)" }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div
        className="progress-value"
        style={{
          width: `${clamped}%`,
          background: color,
          height: "100%",
          borderRadius: "var(--radius-full)",
          transition: "width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      />
    </div>
  );
}

export function Badge({ children, variant = "info", icon: Icon, style = {} }) {
  const getBadgeStyle = () => {
    switch (variant) {
      case "maths":
        return { background: "var(--color-maths-bg)", color: "var(--color-maths)", border: "1px solid var(--color-maths-border)" };
      case "english":
        return { background: "var(--color-english-bg)", color: "var(--color-english)", border: "1px solid var(--color-english-border)" };
      case "evs":
        return { background: "var(--color-evs-bg)", color: "#1F9A7A", border: "1px solid var(--color-evs-border)" };
      case "success":
        return { background: "var(--color-success-bg)", color: "var(--color-success)", border: "1px solid #86EFAC" };
      case "warning":
        return { background: "var(--color-warning-bg)", color: "#B45309", border: "1px solid #FDE68A" };
      case "danger":
        return { background: "var(--color-danger-bg)", color: "var(--color-danger)", border: "1px solid #FCA5A5" };
      case "info":
      default:
        return { background: "var(--color-primary-bg)", color: "var(--color-primary)", border: "1px solid #BFDBFE" };
    }
  };

  return (
    <span
      className="kid-badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: "var(--radius-full)",
        fontSize: "var(--font-size-xs)",
        fontWeight: 700,
        ...getBadgeStyle(),
        ...style,
      }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </span>
  );
}

export function StarRating({ stars = 3, max = 3, size = 28 }) {
  return (
    <div style={{ display: "inline-flex", gap: 6 }} aria-label={`${stars} of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => {
        const isFilled = i < stars;
        return (
          <Star
            key={i}
            size={size}
            fill={isFilled ? "#FFC93C" : "none"}
            color={isFilled ? "#F59E0B" : "#D1D5DB"}
            strokeWidth={2.5}
            style={{
              transform: isFilled ? "scale(1.1)" : "scale(1)",
              transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
        );
      })}
    </div>
  );
}

export function ProgressRing({ radius = 38, stroke = 7, progress = 0, color = "var(--color-primary)", children }) {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <div style={{ position: "relative", width: radius * 2, height: radius * 2, display: "inline-grid", placeItems: "center" }}>
      <svg height={radius * 2} width={radius * 2} style={{ transform: "rotate(-90deg)" }}>
        <circle
          stroke="rgba(43, 45, 91, 0.08)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: "stroke-dashoffset 0.5s ease" }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children || <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-main)" }}>{Math.round(progress)}%</span>}
      </div>
    </div>
  );
}

export function XPChip({ xp = 0, style = {} }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "#FFF8E1",
        border: "2px solid #FFE082",
        color: "#B45309",
        padding: "5px 12px",
        borderRadius: "var(--radius-full)",
        fontWeight: 800,
        fontSize: "var(--font-size-sm)",
        boxShadow: "0 2px 6px rgba(245, 158, 11, 0.15)",
        ...style,
      }}
      title="Adventure XP Points"
    >
      <Sparkles size={16} color="#F59E0B" fill="#FFC93C" />
      <span>{xp} XP</span>
    </div>
  );
}

export function SubjectTile({ subject, title, description, icon: Icon, color, bg, onClick, progress = 0 }) {
  return (
    <div
      className="subject-tile clickable-card"
      style={{
        background: bg || "var(--bg-surface)",
        border: `3px solid ${color}40`,
        borderRadius: "var(--radius-lg)",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
      }}
      onClick={(e) => {
        playClick();
        if (onClick) onClick(e);
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: "var(--radius-md)",
            background: color,
            color: "#FFFFFF",
            display: "grid",
            placeItems: "center",
            boxShadow: `0 6px 14px ${color}40`,
          }}
        >
          {Icon ? <Icon size={28} /> : <Award size={28} />}
        </div>
        <ProgressRing radius={24} stroke={4} progress={progress} color={color} />
      </div>

      <div>
        <h3 style={{ margin: "4px 0", fontSize: "var(--font-size-xl)", color: "var(--text-main)" }}>{title}</h3>
        {description && <p style={{ margin: 0, fontSize: "var(--font-size-sm)", color: "var(--text-muted)", lineHeight: 1.5 }}>{description}</p>}
      </div>

      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6, color, fontWeight: 800, fontSize: "var(--font-size-sm)" }}>
        <span>Explore Lessons →</span>
      </div>
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 540 }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && onClose) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(43, 45, 91, 0.45)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className="modal-box"
        style={{
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          maxWidth,
          width: "100%",
          padding: 30,
          boxShadow: "var(--shadow-lg)",
          border: "3px solid #FFF4E5",
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          {title && <h2 style={{ margin: 0, fontSize: "var(--font-size-xl)", color: "var(--text-main)" }}>{title}</h2>}
          {onClose && (
            <button
              onClick={() => { playClick(); onClose(); }}
              style={{
                background: "var(--bg-canvas)",
                border: "none",
                borderRadius: "50%",
                width: 36,
                height: 36,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
              aria-label="Close dialog"
            >
              <X size={20} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ message, type = "info", onClose }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1000,
        background: type === "error" ? "#EF4444" : type === "success" ? "#10B981" : "var(--text-main)",
        color: "#FFFFFF",
        padding: "12px 20px",
        borderRadius: "var(--radius-md)",
        fontWeight: 700,
        fontSize: "var(--font-size-sm)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet!", description, mood = "thinking", action }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}
    >
      <Mascot mood={mood} size={110} />
      <h3 style={{ margin: 0, fontSize: "var(--font-size-xl)", color: "var(--text-main)" }}>{title}</h3>
      {description && <p style={{ margin: 0, maxWidth: 380, fontSize: "var(--font-size-base)", color: "var(--text-muted)" }}>{description}</p>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}
