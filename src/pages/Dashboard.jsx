import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PageHeader, Card, PrimaryButton, ProgressRing, XPChip, SubjectTile, Mascot } from "../components/UI";
import { getProgressSummary, getUserProfile, getCourses } from "../api/client";
import { getAvatar } from "../data/avatars";
import { playClick } from "../utils/sound";
import {
  Sparkles,
  BookOpen,
  Bot,
  Award,
  Flame,
  ArrowRight,
  Calculator,
  Languages,
  TreeDeciduous,
  Gamepad2,
  PlayCircle,
  FlaskConical,
  Globe,
} from "lucide-react";
import { getSubjectsForGrade, getBandForGrade } from "../config/bands";

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    display_name: localStorage.getItem("parivestra_display_name") || "Explorer",
    avatar: localStorage.getItem("parivestra_avatar") || "owl",
    grade: localStorage.getItem("parivestra_grade") || "Class 3",
    xp: 0,
    streak: 1,
  });

  const [stats, setStats] = useState({
    recommended: "Place Value & Numbers",
    masteryScore: 40,
    assessmentsDone: 0,
    dailyGoal: 3,
    dailyCompleted: 1,
  });

  const [courses, setCourses] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const p = await getUserProfile();
        if (p) setProfile(p);
      } catch (e) {
        console.warn(e);
      }

      try {
        const c = await getCourses();
        if (c && c.courses) setCourses(c.courses.slice(0, 3));
      } catch (e) {
        console.warn(e);
      }

      try {
        const prog = await getProgressSummary();
        if (prog) {
          setStats((prev) => ({
            ...prev,
            recommended: prog.recommended_next_topic || "Fun with Numbers",
            masteryScore: Math.min(100, Math.max(20, (prog.recent_attempts?.length || 1) * 15)),
            assessmentsDone: prog.recent_attempts?.length || 0,
            dailyCompleted: Math.min(3, prog.recent_attempts?.length || 1),
          }));
        }
      } catch (e) {
        // Fallback
      }
    }
    loadData();
  }, []);

  const avatar = getAvatar(profile.avatar);
  const goalPercentage = Math.round((stats.dailyCompleted / stats.dailyGoal) * 100);

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto" }}>
      {/* Playful Welcome Header */}
      <div
        className="hero"
        style={{
          background: "linear-gradient(135deg, #2B2D5B 0%, #3D4175 100%)",
          borderRadius: "var(--radius-lg)",
          padding: "36px 38px",
          color: "#FFFFFF",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
          boxShadow: "var(--shadow-md)",
          position: "relative",
        }}
      >
        <div style={{ zIndex: 2, maxWidth: 540 }}>
          <span className="eyebrow light">TODAY'S LEARNING ADVENTURE 🌟</span>
          <h2 style={{ fontSize: 34, margin: "10px 0 12px", color: "#FFFFFF" }}>
            Welcome back, {profile.display_name}!
          </h2>
          <p style={{ color: "#E2E8F0", fontSize: 17, margin: "0 0 22px", lineHeight: 1.6 }}>
            Pari is ready with today's special quest:{" "}
            <strong style={{ color: "var(--color-yellow)" }}>{stats.recommended}</strong>.
            Let's explore together and earn stars!
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <PrimaryButton
              size="lg"
              icon={Bot}
              onClick={() => navigate("/tutor")}
              style={{ background: "var(--color-english)", color: "#FFFFFF" }}
            >
              Ask Pari a Question
            </PrimaryButton>

            <PrimaryButton
              size="lg"
              variant="outline"
              icon={BookOpen}
              onClick={() => navigate("/courses")}
              style={{ color: "#FFFFFF", borderColor: "rgba(255,255,255,0.4)" }}
            >
              Start Course →
            </PrimaryButton>
          </div>
        </div>

        <div style={{ zIndex: 2, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Mascot mood="cheering" size={150} />
        </div>
      </div>

      {/* Daily Progress & Goal Ring Grid */}
      <div className="grid two" style={{ marginBottom: 28 }}>
        {/* Daily Goal Card */}
        <Card title="Today's Learning Goal" subtitle="Complete 3 quick lessons or quizzes today">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 8px" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-main)" }}>
                {stats.dailyCompleted} of {stats.dailyGoal} Completed
              </div>
              <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: 14 }}>
                {stats.dailyCompleted >= stats.dailyGoal
                  ? "🎉 Amazing! You reached today's goal!"
                  : "Keep going! Just a little more to win today's trophy!"}
              </p>
            </div>
            <ProgressRing radius={42} stroke={8} progress={goalPercentage} color="var(--color-mint)" />
          </div>
        </Card>

        {/* Streak & XP Booster Card */}
        <Card title="Explorer Achievements" subtitle="Win stars and level up your buddy">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "10px 0" }}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  background: "#FFF0ED",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 8px",
                }}
              >
                <Flame size={28} color="#EA580C" fill="#F97316" />
              </div>
              <strong style={{ fontSize: 20, color: "var(--text-main)" }}>{profile.streak || 1} Days</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>Learning Streak</div>
            </div>

            <div style={{ height: 50, width: 2, background: "#F1F5F9" }} />

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  background: "#FFF8E1",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 8px",
                }}
              >
                <Sparkles size={28} color="#F59E0B" fill="#FFC93C" />
              </div>
              <strong style={{ fontSize: 20, color: "var(--text-main)" }}>{profile.xp || 0} XP</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>Adventure Points</div>
            </div>

            <div style={{ height: 50, width: 2, background: "#F1F5F9" }} />

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  background: "#EAF2FE",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 8px",
                }}
              >
                <Award size={28} color="#2563EB" />
              </div>
              <strong style={{ fontSize: 20, color: "var(--text-main)" }}>{stats.assessmentsDone}</strong>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>Badges Earned</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Learning Subject Shelves */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, color: "var(--text-main)" }}>Explore Subjects</h2>
            <p style={{ margin: "2px 0 0", color: "var(--text-muted)", fontSize: 14 }}>
              Tailored for {profile.grade} learners
            </p>
          </div>
          <Link
            to="/courses"
            style={{ fontWeight: 800, fontSize: 14, color: "var(--color-primary)", textDecoration: "none" }}
          >
            View All Courses →
          </Link>
        </div>

        <div className="grid three" style={{ gap: 18 }}>
          {getSubjectsForGrade(profile.grade).map((subj) => {
            let icon = BookOpen;
            let color = "var(--color-primary)";
            let bg = "#F1F5F9";
            let title = `${subj} Quests`;
            let desc = `Master ${subj} concepts and problem solving.`;

            if (subj.toLowerCase() === "maths") {
              icon = Calculator;
              color = "var(--color-maths)";
              bg = "var(--color-maths-bg)";
              title = "Maths Mastery";
              desc = "Numbers, Algebra, Geometry & Word Problems.";
            } else if (subj.toLowerCase() === "english") {
              icon = Languages;
              color = "var(--color-english)";
              bg = "var(--color-english-bg)";
              title = "English & Literature";
              desc = "Grammar rules, vocabulary & creative reading.";
            } else if (subj.toLowerCase() === "evs") {
              icon = TreeDeciduous;
              color = "var(--color-evs)";
              bg = "var(--color-evs-bg)";
              title = "EVS & Nature";
              desc = "Living world, habitats, and earth sciences.";
            } else if (subj.toLowerCase() === "science") {
              icon = FlaskConical;
              color = "#0D9488";
              bg = "#CCFBF1";
              title = "Science Lab";
              desc = "Physics, Chemistry, and Biology inquiry.";
            } else if (subj.toLowerCase() === "social science") {
              icon = Globe;
              color = "#D97706";
              bg = "#FEF3C7";
              title = "Social Science";
              desc = "History, Geography, Civics & Society.";
            }

            return (
              <SubjectTile
                key={subj}
                subject={subj}
                title={title}
                description={desc}
                icon={icon}
                color={color}
                bg={bg}
                progress={55}
                onClick={() => navigate(`/courses?subject=${encodeURIComponent(subj)}`)}
              />
            );
          })}
        </div>
      </div>

      {/* Quick Action Tiles (Games & AI Videos) */}
      <div className="grid two" style={{ marginBottom: 36 }}>
        <div
          className="clickable-card"
          onClick={() => { playClick(); navigate("/games"); }}
          style={{
            background: "linear-gradient(135deg, #F4EFFF 0%, #E9DEFF 100%)",
            border: "2px solid #D5C5FB",
            borderRadius: "var(--radius-lg)",
            padding: 24,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "var(--radius-md)",
              background: "var(--color-games)",
              color: "#FFF",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Gamepad2 size={32} />
          </div>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 20, color: "var(--text-main)" }}>
              Number Ninja & Word Games 🎮
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
              Fun, relaxed rounds with 3 hearts and streak stars.
            </p>
          </div>
        </div>

        <div
          className="clickable-card"
          onClick={() => { playClick(); navigate("/videos"); }}
          style={{
            background: "linear-gradient(135deg, #FFF9E6 0%, #FFF0C2 100%)",
            border: "2px solid #FFE8A3",
            borderRadius: "var(--radius-lg)",
            padding: 24,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "var(--radius-md)",
              background: "#F59E0B",
              color: "#FFF",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <PlayCircle size={32} />
          </div>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 20, color: "var(--text-main)" }}>
              AI Animated Video Stories 🎬
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
              Watch animated SVG explanations with narration and voice!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
