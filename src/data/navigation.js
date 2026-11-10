import {
  LayoutDashboard, Bot, Route, BookOpen, ClipboardCheck,
  Gamepad2, ChartNoAxesCombined, Library, Settings
} from "lucide-react";

export const navigation = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "AI Tutor", path: "/tutor", icon: Bot },
  { label: "Learning Path", path: "/learning-path", icon: Route },
  { label: "Subjects", path: "/subjects", icon: BookOpen },
  { label: "Practice", path: "/practice", icon: ClipboardCheck },
  { label: "Bug Hunt Arena", path: "/games", icon: Gamepad2 },
  { label: "Progress", path: "/progress", icon: ChartNoAxesCombined },
  { label: "Resources", path: "/resources", icon: Library },
  { label: "Settings", path: "/settings", icon: Settings }
];
