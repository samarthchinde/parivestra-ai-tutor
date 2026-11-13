// Reusable SVG illustrations for story lessons and animated story scenes
export default function StoryIllustration({ name, size = 180, animated = true }) {
  const s = size;
  const animClass = animated ? "story-art-bounce" : "";

  switch (name) {
    case "sun":
      return (
        <svg width={s} height={s} viewBox="0 0 160 160" fill="none" className={animClass}>
          <circle cx="80" cy="80" r="42" fill="#FDB813" />
          <circle cx="80" cy="80" r="35" fill="#FFD000" />
          {/* Eyes & Smile */}
          <circle cx="68" cy="74" r="5" fill="#78350F" />
          <circle cx="92" cy="74" r="5" fill="#78350F" />
          <path d="M72 88 Q80 96 88 88" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
          {/* Rosy cheeks */}
          <circle cx="62" cy="82" r="4" fill="#F87171" opacity="0.6" />
          <circle cx="98" cy="82" r="4" fill="#F87171" opacity="0.6" />
          {/* Sun rays */}
          <path d="M80 18V28M80 132V142M18 80H28M132 80H142M36 36L44 44M116 116L124 124M36 124L44 116M116 44L124 36"
            stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );

    case "cloud":
      return (
        <svg width={s} height={s} viewBox="0 0 160 160" fill="none" className={animClass}>
          <path
            d="M45 110H115C126.046 110 135 101.046 135 90C135 79.5 127 71 117 70.2C115 52 100 38 82 38C66 38 53 49 48 64C36 65 27 75 27 87C27 99.7 35.1 110 45 110Z"
            fill="#E0F2FE"
            stroke="#38BDF8"
            strokeWidth="5"
          />
          {/* Eyes & Smile */}
          <circle cx="72" cy="80" r="4" fill="#0369A1" />
          <circle cx="92" cy="80" r="4" fill="#0369A1" />
          <path d="M78 90 Q82 94 86 90" stroke="#0369A1" strokeWidth="3" strokeLinecap="round" />
          {/* Cute rain drops */}
          <ellipse cx="60" cy="125" rx="3" ry="5" fill="#38BDF8" />
          <ellipse cx="82" cy="132" rx="3" ry="5" fill="#38BDF8" />
          <ellipse cx="104" cy="125" rx="3" ry="5" fill="#38BDF8" />
        </svg>
      );

    case "water":
    case "rain":
      return (
        <svg width={s} height={s} viewBox="0 0 160 160" fill="none" className={animClass}>
          <path
            d="M80 30 C80 30 40 85 40 110 C40 132 58 145 80 145 C102 145 120 132 120 110 C120 85 80 30 80 30 Z"
            fill="#38BDF8"
            stroke="#0284C7"
            strokeWidth="5"
          />
          {/* Shine */}
          <path d="M65 85 C62 95 62 110 70 120" stroke="white" strokeWidth="5" strokeLinecap="round" />
          {/* Face */}
          <circle cx="75" cy="105" r="4" fill="#0C4A6E" />
          <circle cx="93" cy="105" r="4" fill="#0C4A6E" />
          <path d="M80 116 Q84 120 88 116" stroke="#0C4A6E" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case "pizza":
    case "fraction":
      return (
        <svg width={s} height={s} viewBox="0 0 160 160" fill="none" className={animClass}>
          {/* Pizza base crust */}
          <circle cx="80" cy="80" r="62" fill="#F59E0B" stroke="#D97706" strokeWidth="6" />
          <circle cx="80" cy="80" r="52" fill="#FCD34D" />
          {/* Cut lines */}
          <line x1="80" y1="28" x2="80" y2="132" stroke="#B45309" strokeWidth="3" strokeDasharray="4 4" />
          <line x1="28" y1="80" x2="132" y2="80" stroke="#B45309" strokeWidth="3" strokeDasharray="4 4" />
          {/* Pepperoni toppings */}
          <circle cx="60" cy="60" r="9" fill="#EF4444" />
          <circle cx="100" cy="60" r="9" fill="#EF4444" />
          <circle cx="60" cy="100" r="9" fill="#EF4444" />
          <circle cx="100" cy="100" r="9" fill="#EF4444" />
          {/* Herbs */}
          <ellipse cx="75" cy="70" rx="3" ry="5" fill="#10B981" transform="rotate(30 75 70)" />
          <ellipse cx="85" cy="95" rx="3" ry="5" fill="#10B981" transform="rotate(-40 85 95)" />
        </svg>
      );

    case "plant":
    case "nature":
      return (
        <svg width={s} height={s} viewBox="0 0 160 160" fill="none" className={animClass}>
          {/* Soil */}
          <path d="M30 135 Q80 125 130 135" stroke="#78350F" strokeWidth="12" strokeLinecap="round" />
          {/* Roots */}
          <path d="M80 135 Q70 148 60 152 M80 135 Q90 148 100 152" stroke="#A16207" strokeWidth="4" strokeLinecap="round" />
          {/* Stem */}
          <path d="M80 135 C80 100 85 80 80 55" stroke="#16A34A" strokeWidth="7" strokeLinecap="round" />
          {/* Leaves */}
          <path d="M80 100 C60 95 50 75 55 65 C70 65 78 85 80 100 Z" fill="#22C55E" stroke="#15803D" strokeWidth="3" />
          <path d="M80 85 C100 80 110 60 105 50 C90 50 82 70 80 85 Z" fill="#4ADE80" stroke="#15803D" strokeWidth="3" />
          {/* Flower bloom */}
          <circle cx="80" cy="48" r="14" fill="#F43F5E" />
          <circle cx="80" cy="48" r="6" fill="#FDE047" />
        </svg>
      );

    case "numbers":
      return (
        <svg width={s} height={s} viewBox="0 0 160 160" fill="none" className={animClass}>
          <rect x="25" y="30" width="45" height="50" rx="12" fill="#60A5FA" />
          <text x="47" y="65" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="sans-serif">1</text>
          <rect x="85" y="30" width="45" height="50" rx="12" fill="#F472B6" />
          <text x="107" y="65" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="sans-serif">2</text>
          <rect x="55" y="85" width="48" height="50" rx="12" fill="#34D399" />
          <text x="79" y="120" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold" fontFamily="sans-serif">3</text>
        </svg>
      );

    case "shapes":
      return (
        <svg width={s} height={s} viewBox="0 0 160 160" fill="none" className={animClass}>
          <circle cx="45" cy="55" r="24" fill="#EC4899" />
          <rect x="85" y="35" width="42" height="42" rx="8" fill="#3B82F6" />
          <polygon points="80,95 50,140 110,140" fill="#10B981" />
        </svg>
      );

    case "book":
      return (
        <svg width={s} height={s} viewBox="0 0 160 160" fill="none" className={animClass}>
          <path d="M80 120 C60 110 35 112 25 115 V45 C35 42 60 40 80 50 C100 40 125 42 135 45 V115 C125 112 100 110 80 120 Z" fill="#FEF08A" stroke="#CA8A04" strokeWidth="5" />
          <line x1="80" y1="50" x2="80" y2="120" stroke="#A16207" strokeWidth="4" />
          {/* Lines for text */}
          <line x1="38" y1="65" x2="68" y2="65" stroke="#EAB308" strokeWidth="3" strokeLinecap="round" />
          <line x1="38" y1="80" x2="68" y2="80" stroke="#EAB308" strokeWidth="3" strokeLinecap="round" />
          <line x1="92" y1="65" x2="122" y2="65" stroke="#EAB308" strokeWidth="3" strokeLinecap="round" />
          <line x1="92" y1="80" x2="122" y2="80" stroke="#EAB308" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case "pencil":
      return (
        <svg width={s} height={s} viewBox="0 0 160 160" fill="none" className={animClass}>
          <g transform="rotate(45 80 80)">
            <rect x="70" y="30" width="20" height="75" fill="#FBBF24" stroke="#D97706" strokeWidth="3" />
            <polygon points="70,105 90,105 80,135" fill="#FDE68A" stroke="#D97706" strokeWidth="3" />
            <polygon points="76,125 84,125 80,135" fill="#374151" />
            <rect x="70" y="20" width="20" height="12" rx="3" fill="#F472B6" />
          </g>
        </svg>
      );

    case "trophy":
    case "star":
      return (
        <svg width={s} height={s} viewBox="0 0 160 160" fill="none" className={animClass}>
          <polygon
            points="80,25 96,65 140,68 106,96 117,138 80,114 43,138 54,96 20,68 64,65"
            fill="#FBBF24"
            stroke="#D97706"
            strokeWidth="5"
          />
          <circle cx="72" cy="78" r="4" fill="#78350F" />
          <circle cx="88" cy="78" r="4" fill="#78350F" />
          <path d="M76 90 Q80 94 84 90" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    default:
      // Default cute sparkle / owl theme
      return (
        <svg width={s} height={s} viewBox="0 0 160 160" fill="none" className={animClass}>
          <circle cx="80" cy="80" r="50" fill="#DDD6FE" stroke="#8B5CF6" strokeWidth="5" />
          <circle cx="65" cy="75" r="14" fill="white" stroke="#6D28D9" strokeWidth="3" />
          <circle cx="95" cy="75" r="14" fill="white" stroke="#6D28D9" strokeWidth="3" />
          <circle cx="66" cy="75" r="6" fill="#4C1D95" />
          <circle cx="94" cy="75" r="6" fill="#4C1D95" />
          <polygon points="77,85 83,85 80,94" fill="#F59E0B" />
        </svg>
      );
  }
}
