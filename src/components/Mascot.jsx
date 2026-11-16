import React from "react";

/**
 * Robot Mascot Pari: Official AI buddy for Parivestra AI & Future Skills.
 * Parameterized by mood ('happy'|'idle', 'thinking', 'cheering', 'waving', 'sleepy', 'oops')
 * and grade (3 to 10) / primary color.
 */
export const GRADE_MASCOT_COLORS = {
  3: { primary: "#F97316", secondary: "#0D9488", visor: "#0F172A", glow: "#FDE047" },
  4: { primary: "#0284C7", secondary: "#F59E0B", visor: "#0F172A", glow: "#38BDF8" },
  5: { primary: "#8B5CF6", secondary: "#EC4899", visor: "#0F172A", glow: "#F472B6" },
  6: { primary: "#0E7490", secondary: "#EA580C", visor: "#0F172A", glow: "#FB923C" },
  7: { primary: "#BE185D", secondary: "#3B82F6", visor: "#0F172A", glow: "#60A5FA" },
  8: { primary: "#4338CA", secondary: "#D97706", visor: "#0F172A", glow: "#FBBF24" },
  9: { primary: "#DC2626", secondary: "#0284C7", visor: "#0F172A", glow: "#38BDF8" },
  10: { primary: "#1E293B", secondary: "#D97706", visor: "#0B0F17", glow: "#FBBF24" },
};

export default function Mascot({
  mood = "happy",
  grade = 3,
  size = 120,
  color = null,
  className = "",
  style = {},
}) {
  const gradeKey = typeof grade === "number" ? grade : parseInt(String(grade).replace(/\D/g, "") || "3", 10);
  const theme = GRADE_MASCOT_COLORS[gradeKey] || GRADE_MASCOT_COLORS[3];
  const primaryColor = color || theme.primary;
  const secondaryColor = theme.secondary;
  const glowColor = theme.glow;
  const visorColor = theme.visor;

  // Mood-specific facial expression and arm gestures
  const renderMoodDetails = () => {
    switch (mood) {
      case "thinking":
        return (
          <>
            {/* Thoughtful digital eyes looking up-right */}
            <circle cx="50" cy="46" r="6" fill={glowColor} />
            <circle cx="70" cy="44" r="6" fill={glowColor} />
            <circle cx="52" cy="44" r="2.5" fill="#FFFFFF" />
            <circle cx="72" cy="42" r="2.5" fill="#FFFFFF" />
            {/* Thoughtful curved mouth line */}
            <path d="M56 55 Q60 58 64 55" stroke={glowColor} strokeWidth="3" strokeLinecap="round" fill="none" />
            {/* Left arm bent scratching head/chin */}
            <path
              d="M32 78 C28 65 38 52 46 54"
              fill="none"
              stroke={primaryColor}
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Right arm resting */}
            <path d="M88 78 C94 86 92 94 88 98" fill="none" stroke={primaryColor} strokeWidth="6" strokeLinecap="round" />
            {/* Thought bubbles */}
            <circle cx="86" cy="24" r="3.5" fill={secondaryColor} opacity="0.9" />
            <circle cx="94" cy="16" r="5" fill={secondaryColor} />
          </>
        );

      case "cheering":
        return (
          <>
            {/* Joyful upside-down U eyes */}
            <path d="M44 48 Q50 40 56 48" fill="none" stroke={glowColor} strokeWidth="4" strokeLinecap="round" />
            <path d="M64 48 Q70 40 76 48" fill="none" stroke={glowColor} strokeWidth="4" strokeLinecap="round" />
            {/* Open happy smile */}
            <path d="M52 54 Q60 62 68 54" fill={glowColor} stroke={glowColor} strokeWidth="2" strokeLinecap="round" />
            {/* Both arms raised cheering high! */}
            <path d="M30 76 C16 60 22 42 32 46" fill="none" stroke={primaryColor} strokeWidth="6" strokeLinecap="round" />
            <path d="M90 76 C104 60 98 42 88 46" fill="none" stroke={primaryColor} strokeWidth="6" strokeLinecap="round" />
            {/* Star celebration sparkles */}
            <polygon points="18,28 20,33 25,33 21,36 23,41 18,38 14,41 16,36 12,33 17,33" fill="#FBBF24" />
            <polygon points="102,28 104,33 109,33 105,36 107,41 102,38 98,41 100,36 96,33 101,33" fill="#FBBF24" />
          </>
        );

      case "waving":
        return (
          <>
            {/* Bright friendly round eyes with twinkle */}
            <circle cx="48" cy="46" r="6" fill={glowColor} />
            <circle cx="72" cy="46" r="6" fill={glowColor} />
            <circle cx="50" cy="44" r="2" fill="#FFFFFF" />
            <circle cx="74" cy="44" r="2" fill="#FFFFFF" />
            {/* Warm smile */}
            <path d="M52 54 Q60 62 68 54" fill="none" stroke={glowColor} strokeWidth="3" strokeLinecap="round" />
            {/* Right arm waving up high */}
            <path d="M90 76 C104 60 102 44 94 40" fill="none" stroke={primaryColor} strokeWidth="6" strokeLinecap="round" />
            <circle cx="94" cy="38" r="4" fill={secondaryColor} />
            {/* Left arm resting */}
            <path d="M30 76 C24 85 26 94 30 98" fill="none" stroke={primaryColor} strokeWidth="6" strokeLinecap="round" />
          </>
        );

      case "sleepy":
        return (
          <>
            {/* Sleepy downward curved eyes */}
            <path d="M44 46 Q50 52 56 46" fill="none" stroke={glowColor} strokeWidth="3.5" strokeLinecap="round" />
            <path d="M64 46 Q70 52 76 46" fill="none" stroke={glowColor} strokeWidth="3.5" strokeLinecap="round" />
            {/* Small mouth */}
            <line x1="56" y1="56" x2="64" y2="56" stroke={glowColor} strokeWidth="2.5" strokeLinecap="round" />
            {/* Arms resting */}
            <path d="M30 78 C28 88 36 94 42 92" fill="none" stroke={primaryColor} strokeWidth="6" strokeLinecap="round" />
            <path d="M90 78 C92 88 84 94 78 92" fill="none" stroke={primaryColor} strokeWidth="6" strokeLinecap="round" />
            {/* Zzz text */}
            <text x="86" y="28" fill={secondaryColor} fontSize="12" fontWeight="900" fontFamily="sans-serif">
              z
            </text>
            <text x="96" y="20" fill={secondaryColor} fontSize="16" fontWeight="900" fontFamily="sans-serif">
              Z
            </text>
          </>
        );

      case "oops":
        return (
          <>
            {/* Wide surprised circle eyes */}
            <circle cx="48" cy="46" r="7.5" fill={glowColor} />
            <circle cx="72" cy="46" r="7.5" fill={glowColor} />
            <circle cx="48" cy="46" r="3" fill={visorColor} />
            <circle cx="72" cy="46" r="3" fill={visorColor} />
            {/* Small 'o' mouth */}
            <ellipse cx="60" cy="56" rx="4" ry="5" fill="none" stroke={glowColor} strokeWidth="3" />
            {/* Arms up to cheeks */}
            <path d="M30 78 C26 68 34 60 40 62" fill="none" stroke={primaryColor} strokeWidth="6" strokeLinecap="round" />
            <path d="M90 78 C94 68 86 60 80 62" fill="none" stroke={primaryColor} strokeWidth="6" strokeLinecap="round" />
          </>
        );

      case "happy":
      default:
        return (
          <>
            {/* Cheerful curved smiling eyes */}
            <path d="M44 47 Q50 39 56 47" fill="none" stroke={glowColor} strokeWidth="4" strokeLinecap="round" />
            <path d="M64 47 Q70 39 76 47" fill="none" stroke={glowColor} strokeWidth="4" strokeLinecap="round" />
            {/* Cheerful open smile */}
            <path d="M52 54 Q60 62 68 54" fill="none" stroke={glowColor} strokeWidth="3" strokeLinecap="round" />
            {/* Arms relaxed at sides with friendly hands */}
            <path d="M30 76 C24 85 26 95 32 98" fill="none" stroke={primaryColor} strokeWidth="6" strokeLinecap="round" />
            <path d="M90 76 C96 85 94 95 88 98" fill="none" stroke={primaryColor} strokeWidth="6" strokeLinecap="round" />
          </>
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={`mascot-pari-robot ${className}`}
      style={{ overflow: "visible", display: "inline-block", ...style }}
      aria-label={`Pari the Robot Mascot (${mood})`}
    >
      <defs>
        {/* Shadow filter */}
        <filter id="pariShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.15" />
        </filter>
        {/* Subtle metallic gradient */}
        <linearGradient id="pariHeadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* --- ANTENNA --- */}
      {/* Stem */}
      <line x1="60" y1="26" x2="60" y2="15" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" />
      {/* Signal tip sphere */}
      <circle cx="60" cy="13" r="5.5" fill={secondaryColor} />
      <circle cx="60" cy="13" r="8" fill={secondaryColor} opacity="0.3" />

      {/* --- EARS / AUDIO SENSORS --- */}
      <rect x="23" y="40" width="7" height="14" rx="3.5" fill={secondaryColor} />
      <rect x="90" y="40" width="7" height="14" rx="3.5" fill={secondaryColor} />

      {/* --- ROBOT HEAD --- */}
      <rect
        x="28"
        y="25"
        width="64"
        height="44"
        rx="16"
        fill={primaryColor}
        filter="url(#pariShadow)"
      />
      {/* Head highlight overlay */}
      <rect x="28" y="25" width="64" height="44" rx="16" fill="url(#pariHeadGrad)" />

      {/* --- FACE SCREEN / VISOR --- */}
      <rect
        x="36"
        y="32"
        width="48"
        height="30"
        rx="9"
        fill={visorColor}
        stroke="#1E293B"
        strokeWidth="1.5"
      />

      {/* --- ROBOT BODY --- */}
      <path
        d="M38 72 C38 68, 82 68, 82 72 L86 98 C86 104, 34 104, 34 98 Z"
        fill={primaryColor}
        filter="url(#pariShadow)"
      />
      <path
        d="M38 72 C38 68, 82 68, 82 72 L86 98 C86 104, 34 104, 34 98 Z"
        fill="url(#pariHeadGrad)"
      />

      {/* --- CHEST TICK / HEART BADGE --- */}
      <circle cx="60" cy="85" r="9" fill="#FFFFFF" />
      <circle cx="60" cy="85" r="7.5" fill={secondaryColor} />
      {/* Checkmark in badge */}
      <path
        d="M56 85 L59 88 L65 82"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* --- TREADS / FEET --- */}
      <rect x="40" y="100" width="16" height="8" rx="4" fill="#334155" />
      <rect x="64" y="100" width="16" height="8" rx="4" fill="#334155" />

      {/* --- MOOD DETAILS (Eyes, Mouth, Arms) --- */}
      {renderMoodDetails()}
    </svg>
  );
}
