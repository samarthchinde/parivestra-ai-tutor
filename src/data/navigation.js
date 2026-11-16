import {
  Sparkles,
  BookOpen,
  BookMarked,
  Bot,
  ClipboardCheck,
  Gamepad2,
  Video,
  Compass,
  Library,
  Award,
  ShieldCheck,
} from "lucide-react";

export const navigation = [
  { label: "Home", path: "/", icon: Sparkles, mobileTab: true },
  { label: "AI Workbooks", path: "/workbook", icon: BookMarked, mobileTab: true },
  { label: "Courses", path: "/courses", icon: BookOpen, mobileTab: true },
  { label: "AI Tutor", path: "/tutor", icon: Bot, mobileTab: true },
  { label: "Practice", path: "/practice", icon: ClipboardCheck, mobileTab: true },
  { label: "Games", path: "/games", icon: Gamepad2, mobileTab: true },
  { label: "AI Videos", path: "/videos", icon: Video, mobileTab: false },
  { label: "Learning Path", path: "/learning-path", icon: Compass, mobileTab: false },
  { label: "Library", path: "/library", icon: Library, mobileTab: false },
  { label: "Progress", path: "/progress", icon: Award, mobileTab: false },
  { label: "Grown-ups", path: "/grown-ups", icon: ShieldCheck, mobileTab: false },
];
