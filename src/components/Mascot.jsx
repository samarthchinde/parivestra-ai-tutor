import React from "react";

/**
 * Pari: Original, kid-friendly friendly owl mascot.
 * Moods: 'happy', 'thinking', 'cheering', 'sleepy', 'oops'
 */
export default function Mascot({ mood = "happy", size = 120, className = "", style = {} }) {
  const getMoodElements = () => {
    switch (mood) {
      case "thinking":
        return (
          <>
            {/* Thoughtful curved eyebrow & tilted glasses */}
            <circle cx="48" cy="48" r="14" fill="#FFFFFF" stroke="#2B2D5B" strokeWidth="3" />
            <circle cx="72" cy="48" r="14" fill="#FFFFFF" stroke="#2B2D5B" strokeWidth="3" />
            <path d="M60 48 H62" stroke="#2B2D5B" strokeWidth="3" />
            {/* Looking up-right */}
            <circle cx="52" cy="44" r="5" fill="#2B2D5B" />
            <circle cx="76" cy="44" r="5" fill="#2B2D5B" />
            <circle cx="54" cy="42" r="2" fill="#FFFFFF" />
            <circle cx="78" cy="42" r="2" fill="#FFFFFF" />
            {/* Hand to chin / wing touching face */}
            <path
              d="M32 68 C36 58 44 62 48 66"
              fill="none"
              stroke="#E05B3A"
              strokeWidth="5"
              strokeLinecap="round"
            />
            {/* Cute smile */}
            <path d="M56 64 Q60 67 64 64" fill="none" stroke="#2B2D5B" strokeWidth="3" strokeLinecap="round" />
            {/* Thought sparkles */}
            <circle cx="86" cy="24" r="3" fill="#FFC93C" />
            <circle cx="94" cy="18" r="4.5" fill="#FFC93C" />
          </>
        );

      case "cheering":
        return (
          <>
            {/* Big joyful curved eyes */}
            <path d="M40 50 Q48 42 56 50" fill="none" stroke="#2B2D5B" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M64 50 Q72 42 80 50" fill="none" stroke="#2B2D5B" strokeWidth="3.5" strokeLinecap="round" />
            {/* Open happy beak */}
            <path d="M54 58 L66 58 L60 68 Z" fill="#FFB703" stroke="#2B2D5B" strokeWidth="2" />
            {/* Wings held up high */}
            <path
              d="M30 65 C18 45 22 35 34 40"
              fill="none"
              stroke="#E05B3A"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M90 65 C102 45 98 35 86 40"
              fill="none"
              stroke="#E05B3A"
              strokeWidth="6"
              strokeLinecap="round"
            />
            {/* Celebration stars */}
            <polygon points="20,24 22,29 27,29 23,32 25,37 20,34 16,37 18,32 14,29 19,29" fill="#FFC93C" />
            <polygon points="100,24 102,29 107,29 103,32 105,37 100,34 96,37 98,32 94,29 99,29" fill="#FFC93C" />
          </>
        );

      case "sleepy":
        return (
          <>
            {/* Sleepy closed curved eyes */}
            <path d="M42 50 Q48 55 54 50" fill="none" stroke="#2B2D5B" strokeWidth="3" strokeLinecap="round" />
            <path d="M66 50 Q72 55 78 50" fill="none" stroke="#2B2D5B" strokeWidth="3" strokeLinecap="round" />
            {/* Small resting beak */}
            <polygon points="56,56 64,56 60,62" fill="#FFB703" />
            {/* Wings folded warmly */}
            <path d="M32 62 C30 75 40 82 45 80" fill="none" stroke="#E05B3A" strokeWidth="5" strokeLinecap="round" />
            <path d="M88 62 C90 75 80 82 75 80" fill="none" stroke="#E05B3A" strokeWidth="5" strokeLinecap="round" />
            {/* Zzz text */}
            <text x="84" y="28" fill="#8A63F2" fontSize="13" fontWeight="900" fontFamily="sans-serif">
              z
            </text>
            <text x="94" y="20" fill="#8A63F2" fontSize="17" fontWeight="900" fontFamily="sans-serif">
              Z
            </text>
          </>
        );

      case "oops":
        return (
          <>
            {/* Wide surprised eyes */}
            <circle cx="48" cy="48" r="12" fill="#FFFFFF" stroke="#2B2D5B" strokeWidth="3" />
            <circle cx="72" cy="48" r="12" fill="#FFFFFF" stroke="#2B2D5B" strokeWidth="3" />
            <circle cx="48" cy="48" r="4.5" fill="#2B2D5B" />
            <circle cx="72" cy="48" r="4.5" fill="#2B2D5B" />
            {/* Rosy blush */}
            <ellipse cx="36" cy="56" rx="5" ry="3" fill="#FFB4A2" opacity="0.8" />
            <ellipse cx="84" cy="56" rx="5" ry="3" fill="#FFB4A2" opacity="0.8" />
            {/* Small 'o' mouth */}
            <ellipse cx="60" cy="62" rx="4" ry="5" fill="#2B2D5B" />
            {/* One wing on head */}
            <path d="M34 68 C30 52 42 36 52 38" fill="none" stroke="#E05B3A" strokeWidth="5" strokeLinecap="round" />
            <path d="M88 68 C90 75 82 82 76 80" fill="none" stroke="#E05B3A" strokeWidth="5" strokeLinecap="round" />
          </>
        );

      case "happy":
      default:
        return (
          <>
            {/* Friendly wide eyes with shine */}
            <circle cx="48" cy="48" r="13" fill="#FFFFFF" stroke="#2B2D5B" strokeWidth="3" />
            <circle cx="72" cy="48" r="13" fill="#FFFFFF" stroke="#2B2D5B" strokeWidth="3" />
            <circle cx="49" cy="48" r="6" fill="#2B2D5B" />
            <circle cx="73" cy="48" r="6" fill="#2B2D5B" />
            <circle cx="46" cy="45" r="2.5" fill="#FFFFFF" />
            <circle cx="70" cy="45" r="2.5" fill="#FFFFFF" />
            {/* Cute beak */}
            <polygon points="55,56 65,56 60,65" fill="#FFB703" stroke="#2B2D5B" strokeWidth="1.5" />
            {/* Cheerful wings */}
            <path
              d="M30 60 C26 72 36 82 44 80"
              fill="none"
              stroke="#E05B3A"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            <path
              d="M90 60 C94 72 84 82 76 80"
              fill="none"
              stroke="#E05B3A"
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            {/* Cheerful rosy cheeks */}
            <ellipse cx="36" cy="56" rx="5" ry="3" fill="#FFB4A2" opacity="0.7" />
            <ellipse cx="84" cy="56" rx="5" ry="3" fill="#FFB4A2" opacity="0.7" />
          </>
        );
    }
  };

  return (
    <div
      className={`pari-mascot-wrapper ${className}`}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
      role="img"
      aria-label={`Pari the tutor owl (${mood})`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: "drop-shadow(0 6px 12px rgba(43,45,91,0.12))",
          transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Owl Ear Tufts */}
        <polygon points="34,30 46,12 52,32" fill="#E05B3A" stroke="#2B2D5B" strokeWidth="3" />
        <polygon points="86,30 74,12 68,32" fill="#E05B3A" stroke="#2B2D5B" strokeWidth="3" />
        {/* Inner ear tufts */}
        <polygon points="38,28 46,18 49,29" fill="#FF9E80" />
        <polygon points="82,28 74,18 71,29" fill="#FF9E80" />

        {/* Round Owl Body */}
        <ellipse cx="60" cy="62" rx="38" ry="40" fill="#FF7A66" stroke="#2B2D5B" strokeWidth="3.5" />

        {/* Soft Tummy Patch */}
        <ellipse cx="60" cy="70" rx="26" ry="24" fill="#FFF9F0" />
        {/* Feather marks on tummy */}
        <path d="M52 68 Q56 71 60 68" fill="none" stroke="#FFC93C" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M60 68 Q64 71 68 68" fill="none" stroke="#FFC93C" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M56 75 Q60 78 64 75" fill="none" stroke="#FFC93C" strokeWidth="2.5" strokeLinecap="round" />

        {/* Mood-Specific Face and Wings */}
        {getMoodElements()}

        {/* Cute Feet */}
        <ellipse cx="48" cy="100" rx="6" ry="3.5" fill="#FFB703" stroke="#2B2D5B" strokeWidth="2" />
        <ellipse cx="72" cy="100" rx="6" ry="3.5" fill="#FFB703" stroke="#2B2D5B" strokeWidth="2" />
      </svg>
    </div>
  );
}

