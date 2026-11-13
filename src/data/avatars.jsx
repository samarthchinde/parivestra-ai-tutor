import React from "react";

export const AVATARS = [
  {
    id: "owl",
    name: "Pari Owl",
    color: "#FF7A66",
    render: (size = 48) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#FFF0ED" stroke="#FF7A66" strokeWidth="4" />
        <polygon points="30,28 40,12 48,28" fill="#E05B3A" />
        <polygon points="70,28 60,12 52,28" fill="#E05B3A" />
        <ellipse cx="50" cy="54" rx="34" ry="34" fill="#FF7A66" />
        <ellipse cx="50" cy="62" rx="22" ry="20" fill="#FFFFFF" />
        <circle cx="40" cy="48" r="10" fill="#FFFFFF" stroke="#2B2D5B" strokeWidth="2.5" />
        <circle cx="60" cy="48" r="10" fill="#FFFFFF" stroke="#2B2D5B" strokeWidth="2.5" />
        <circle cx="41" cy="48" r="4.5" fill="#2B2D5B" />
        <circle cx="61" cy="48" r="4.5" fill="#2B2D5B" />
        <polygon points="46,55 54,55 50,62" fill="#FFB703" />
      </svg>
    ),
  },
  {
    id: "fox",
    name: "Rusty Fox",
    color: "#FB923C",
    render: (size = 48) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#FFF7ED" stroke="#FB923C" strokeWidth="4" />
        <polygon points="26,35 34,10 50,30" fill="#EA580C" />
        <polygon points="74,35 66,10 50,30" fill="#EA580C" />
        <polygon points="30,30 36,16 46,30" fill="#FFFFFF" />
        <polygon points="70,30 64,16 54,30" fill="#FFFFFF" />
        <polygon points="22,40 78,40 50,86" fill="#F97316" />
        <polygon points="34,42 66,42 50,78" fill="#FFFFFF" />
        <circle cx="38" cy="48" r="4" fill="#2B2D5B" />
        <circle cx="62" cy="48" r="4" fill="#2B2D5B" />
        <polygon points="46,74 54,74 50,80" fill="#2B2D5B" />
      </svg>
    ),
  },
  {
    id: "panda",
    name: "Pip Panda",
    color: "#2B2D5B",
    render: (size = 48) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="4" />
        <circle cx="28" cy="28" r="14" fill="#1E293B" />
        <circle cx="72" cy="28" r="14" fill="#1E293B" />
        <circle cx="50" cy="56" r="36" fill="#FFFFFF" stroke="#1E293B" strokeWidth="3" />
        <ellipse cx="38" cy="50" rx="9" ry="12" fill="#1E293B" transform="rotate(-15 38 50)" />
        <ellipse cx="62" cy="50" rx="9" ry="12" fill="#1E293B" transform="rotate(15 62 50)" />
        <circle cx="39" cy="48" r="3.5" fill="#FFFFFF" />
        <circle cx="61" cy="48" r="3.5" fill="#FFFFFF" />
        <ellipse cx="50" cy="64" rx="5" ry="3.5" fill="#1E293B" />
        <path d="M46 70 Q50 74 54 70" stroke="#1E293B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "lion",
    name: "Leo Lion",
    color: "#EAB308",
    render: (size = 48) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#FEFCE8" stroke="#EAB308" strokeWidth="4" />
        {/* Mane */}
        <circle cx="50" cy="50" r="38" fill="#D97706" />
        {/* Face */}
        <circle cx="50" cy="52" r="28" fill="#FDE047" />
        <circle cx="34" cy="28" r="8" fill="#D97706" />
        <circle cx="66" cy="28" r="8" fill="#D97706" />
        <circle cx="42" cy="48" r="4" fill="#2B2D5B" />
        <circle cx="58" cy="48" r="4" fill="#2B2D5B" />
        <polygon points="46,56 54,56 50,62" fill="#B45309" />
        <path d="M44 66 Q50 71 56 66" stroke="#2B2D5B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "koala",
    name: "Koby Koala",
    color: "#64748B",
    render: (size = 48) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#F1F5F9" stroke="#64748B" strokeWidth="4" />
        <circle cx="24" cy="38" r="16" fill="#94A3B8" />
        <circle cx="24" cy="38" r="10" fill="#E2E8F0" />
        <circle cx="76" cy="38" r="16" fill="#94A3B8" />
        <circle cx="76" cy="38" r="10" fill="#E2E8F0" />
        <circle cx="50" cy="54" r="32" fill="#CBD5E1" />
        <circle cx="40" cy="48" r="4" fill="#2B2D5B" />
        <circle cx="60" cy="48" r="4" fill="#2B2D5B" />
        <ellipse cx="50" cy="58" rx="7" ry="12" fill="#334155" />
      </svg>
    ),
  },
  {
    id: "bunny",
    name: "Bella Bunny",
    color: "#EC4899",
    render: (size = 48) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#FDF2F8" stroke="#EC4899" strokeWidth="4" />
        <ellipse cx="36" cy="24" rx="8" ry="20" fill="#F472B6" />
        <ellipse cx="36" cy="24" rx="4" ry="14" fill="#FDF2F8" />
        <ellipse cx="64" cy="24" rx="8" ry="20" fill="#F472B6" />
        <ellipse cx="64" cy="24" rx="4" ry="14" fill="#FDF2F8" />
        <circle cx="50" cy="56" r="30" fill="#FFFFFF" stroke="#F472B6" strokeWidth="3" />
        <circle cx="40" cy="50" r="4" fill="#2B2D5B" />
        <circle cx="60" cy="50" r="4" fill="#2B2D5B" />
        <polygon points="47,58 53,58 50,62" fill="#EC4899" />
        <path d="M46 66 Q50 69 54 66" stroke="#2B2D5B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "cat",
    name: "Cleo Cat",
    color: "#F97316",
    render: (size = 48) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#FFF7ED" stroke="#F97316" strokeWidth="4" />
        <polygon points="26,38 34,16 48,32" fill="#FB923C" />
        <polygon points="74,38 66,16 52,32" fill="#FB923C" />
        <circle cx="50" cy="56" r="32" fill="#FED7AA" />
        <ellipse cx="38" cy="50" rx="4.5" ry="6" fill="#2B2D5B" />
        <ellipse cx="62" cy="50" rx="4.5" ry="6" fill="#2B2D5B" />
        <polygon points="47,59 53,59 50,63" fill="#EA580C" />
        <path d="M44 68 Q50 72 56 68" stroke="#2B2D5B" strokeWidth="2.5" fill="none" />
      </svg>
    ),
  },
  {
    id: "dog",
    name: "Dash Dog",
    color: "#3B82F6",
    render: (size = 48) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="4" />
        <ellipse cx="26" cy="46" rx="10" ry="18" fill="#93C5FD" transform="rotate(-15 26 46)" />
        <ellipse cx="74" cy="46" rx="10" ry="18" fill="#93C5FD" transform="rotate(15 74 46)" />
        <circle cx="50" cy="54" r="30" fill="#DBEAFE" />
        <circle cx="40" cy="48" r="4" fill="#2B2D5B" />
        <circle cx="60" cy="48" r="4" fill="#2B2D5B" />
        <ellipse cx="50" cy="58" rx="6" ry="4.5" fill="#1E3A8A" />
        <path d="M46 66 Q50 72 54 66" stroke="#2B2D5B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "tiger",
    name: "Toby Tiger",
    color: "#EA580C",
    render: (size = 48) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#FFF7ED" stroke="#EA580C" strokeWidth="4" />
        <circle cx="28" cy="30" r="10" fill="#EA580C" />
        <circle cx="72" cy="30" r="10" fill="#EA580C" />
        <circle cx="50" cy="54" r="32" fill="#F97316" />
        <polygon points="50,26 46,34 54,34" fill="#1E293B" />
        <polygon points="26,50 34,48 34,54" fill="#1E293B" />
        <polygon points="74,50 66,48 66,54" fill="#1E293B" />
        <circle cx="40" cy="48" r="4" fill="#2B2D5B" />
        <circle cx="60" cy="48" r="4" fill="#2B2D5B" />
        <ellipse cx="50" cy="62" rx="18" ry="12" fill="#FFFFFF" />
        <polygon points="46,58 54,58 50,63" fill="#1E293B" />
      </svg>
    ),
  },
  {
    id: "bear",
    name: "Barnaby Bear",
    color: "#78350F",
    render: (size = 48) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#FEF3C7" stroke="#92400E" strokeWidth="4" />
        <circle cx="28" cy="28" r="12" fill="#92400E" />
        <circle cx="28" cy="28" r="6" fill="#FDE68A" />
        <circle cx="72" cy="28" r="12" fill="#92400E" />
        <circle cx="72" cy="28" r="6" fill="#FDE68A" />
        <circle cx="50" cy="56" r="32" fill="#B45309" />
        <circle cx="40" cy="48" r="4" fill="#2B2D5B" />
        <circle cx="60" cy="48" r="4" fill="#2B2D5B" />
        <ellipse cx="50" cy="62" rx="14" ry="10" fill="#FDE68A" />
        <ellipse cx="50" cy="58" rx="5" ry="3.5" fill="#451A03" />
      </svg>
    ),
  },
  {
    id: "penguin",
    name: "Pip Penguin",
    color: "#0284C7",
    render: (size = 48) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#F0F9FF" stroke="#0284C7" strokeWidth="4" />
        <ellipse cx="50" cy="52" rx="30" ry="36" fill="#0C4A6E" />
        <ellipse cx="50" cy="56" rx="20" ry="26" fill="#FFFFFF" />
        <circle cx="42" cy="44" r="3.5" fill="#2B2D5B" />
        <circle cx="58" cy="44" r="3.5" fill="#2B2D5B" />
        <polygon points="46,50 54,50 50,58" fill="#F59E0B" />
      </svg>
    ),
  },
  {
    id: "frog",
    name: "Frankie Frog",
    color: "#16A34A",
    render: (size = 48) => (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="46" fill="#F0FDF4" stroke="#16A34A" strokeWidth="4" />
        <circle cx="34" cy="32" r="12" fill="#4ADE80" stroke="#16A34A" strokeWidth="3" />
        <circle cx="66" cy="32" r="12" fill="#4ADE80" stroke="#16A34A" strokeWidth="3" />
        <circle cx="34" cy="32" r="5" fill="#2B2D5B" />
        <circle cx="66" cy="32" r="5" fill="#2B2D5B" />
        <ellipse cx="50" cy="58" rx="34" ry="28" fill="#86EFAC" stroke="#16A34A" strokeWidth="3" />
        <ellipse cx="50" cy="64" rx="20" ry="16" fill="#DCFCE7" />
        <path d="M38 66 Q50 76 62 66" stroke="#15803D" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function getAvatar(avatarId) {
  return AVATARS.find((a) => a.id === avatarId) || AVATARS[0];
}
