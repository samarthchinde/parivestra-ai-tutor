import { useEffect, useState } from "react";
import { PageHeader, Card, Badge, ProgressBar, Mascot } from "../components/UI";
import { getProgress } from "../assessment/progressStorage";
import { getProgressSummary, getUserProfile } from "../api/client";
import {
  Award,
  Sparkles,
  Flame,
  Star,
  CheckCircle2,
  TrendingUp,
  Clock,
  Compass,
  Lock,
} from "lucide-react";
import "../assessment/assessment.css";

export default function Progress() {
  const [history, setHistory] = useState([]);
  const [apiProgress, setApiProgress] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBackendOnline, setIsBackendOnline] = useState(false);

  useEffect(() => {
    async function loadAllProgress() {
      setLoading(true);

      // 1. Fetch user profile
      try {
        const u = await getUserProfile();
        setUserProfile(u);
      } catch (err) {
        console.warn("Could not load user profile:", err);
      }

      // 2. Fetch from Backend API
      try {
        const apiData = await getProgressSummary();
        if (apiData && apiData.user_id) {
          setApiProgress(apiData);
          setIsBackendOnline(true);
        }
      } catch (err) {
        console.warn("Backend /api/progress unreachable, relying on IndexedDB fallback:", err);
        setIsBackendOnline(false);
      }

      // 3. Load IndexedDB history
      try {
        const records = await getProgress();
        const sortedRecords = [...records].sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );
        setHistory(sortedRecords);
      } catch (err) {
        console.error("Local progress loading error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadAllProgress();
  }, []);

  const totalAttempts = history.length;
  const totalQuestions = history.reduce((sum, item) => sum + (item.totalQuestions || 0), 0);
  const totalCorrect = history.reduce((sum, item) => sum + (item.correctAnswers || 0), 0);
  const xp = userProfile?.xp || 80;
  const streak = userProfile?.streak || 2;

  // Ranks based on XP
  const getRank = (pts) => {
    if (pts >= 300) return { name: "Grand Scholar 👑", level: 4, next: 500 };
    if (pts >= 150) return { name: "Star Cadet 🌟", level: 3, next: 300 };
    if (pts >= 50) return { name: "Curious Explorer 🧭", level: 2, next: 150 };
    return { name: "Apprentice Adventurer 🎒", level: 1, next: 50 };
  };

  const rank = getRank(xp);
  const rankProgress = Math.min(100, Math.round((xp / rank.next) * 100));

  // 12 Collectible Badges
  const badges = [
    {
      id: "b1",
      title: "First Step",
      icon: "🌱",
      desc: "Completed your first learning activity!",
      unlocked: totalAttempts > 0 || xp > 10,
    },
    {
      id: "b2",
      title: "Maths Magician",
      icon: "🔢",
      desc: "Practiced numbers, fractions, or times tables!",
      unlocked: xp >= 30,
    },
    {
      id: "b3",
      title: "Grammar Detective",
      icon: "🔍",
      desc: "Spotted nouns, verbs, and rhyming words!",
      unlocked: xp >= 40,
    },
    {
      id: "b4",
      title: "Nature Explorer",
      icon: "🌿",
      desc: "Explored plants, habitats, or the water cycle!",
      unlocked: xp >= 45,
    },
    {
      id: "b5",
      title: "Story Weaver",
      icon: "🎬",
      desc: "Watched an animated story adventure!",
      unlocked: true,
    },
    {
      id: "b6",
      title: "Number Ninja",
      icon: "🥷",
      desc: "Scored in lightning speed math games!",
      unlocked: xp >= 60,
    },
    {
      id: "b7",
      title: "Bug Catcher",
      icon: "🐞",
      desc: "Fixed a silly bug or logic sequence!",
      unlocked: xp >= 50,
    },
    {
      id: "b8",
      title: "Pari's Pal",
      icon: "🦉",
      desc: "Chatted with your AI mascot friend!",
      unlocked: true,
    },
    {
      id: "b9",
      title: "Streak Star",
      icon: "🔥",
      desc: "Practiced 2 days in a row!",
      unlocked: streak >= 2,
    },
    {
      id: "b10",
      title: "Sharp Shooter",
      icon: "🎯",
      desc: "Answered practice questions with high accuracy!",
      unlocked: totalCorrect >= 3,
    },
    {
      id: "b11",
      title: "Bookworm",
      icon: "📚",
      desc: "Explored 3 reading library flashcards!",
      unlocked: xp >= 70,
    },
    {
      id: "b12",
      title: "Master Scholar",
      icon: "🏆",
      desc: "Earned 200+ XP across your adventures!",
      unlocked: xp >= 200,
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <Mascot mood="thinking" size={80} message="Calculating your sparkling achievements..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 60 }}>
      <PageHeader
        title="My Learning Trophies & Growth 🌟"
        description="Celebrate every step of your learning adventure! Collect badges and watch your knowledge bloom!"
      />

      {/* Hero Achievement Card */}
      <div
        style={{
          background: "linear-gradient(135deg, #FFF9F0 0%, #FEF3C7 100%)",
          border: "2px solid #FCD34D",
          borderRadius: "var(--radius-xl)",
          padding: "28px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 24,
          marginBottom: 32,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ flex: "1 1 280px" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <Badge variant="yellow">{rank.name}</Badge>
            <span
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                color: "#DC2626",
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: "0.85rem",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Flame size={15} fill="#EF4444" /> {streak} Day Streak!
            </span>
          </div>

          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.8rem",
              color: "#78350F",
              margin: "0 0 10px 0",
            }}
          >
            {xp} Total Adventure XP!
          </h2>

          <p style={{ color: "#92400E", margin: "0 0 16px 0", fontSize: "0.98rem" }}>
            {rank.next - xp > 0
              ? `${rank.next - xp} XP to reach the next rank level!`
              : "Max level reached! You are a superstar!"}
          </p>

          <div style={{ maxWidth: 380 }}>
            <ProgressBar value={rankProgress} />
          </div>
        </div>

        <Mascot mood="cheering" size={110} message="Look at all the brilliance you've unlocked! ✨" />
      </div>

      {/* Positive Growth Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            background: "white",
            padding: "20px 22px",
            borderRadius: "var(--radius-lg)",
            border: "1.5px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "1.8rem" }}>🎯</span>
          <h4 style={{ margin: "6px 0 2px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
            Questions Solved
          </h4>
          <strong style={{ fontSize: "1.6rem", color: "var(--text)" }}>{totalQuestions || 12}</strong>
        </div>

        <div
          style={{
            background: "white",
            padding: "20px 22px",
            borderRadius: "var(--radius-lg)",
            border: "1.5px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "1.8rem" }}>⭐</span>
          <h4 style={{ margin: "6px 0 2px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
            Correct Discoveries
          </h4>
          <strong style={{ fontSize: "1.6rem", color: "var(--kid-grape)" }}>{totalCorrect || 10}</strong>
        </div>

        <div
          style={{
            background: "white",
            padding: "20px 22px",
            borderRadius: "var(--radius-lg)",
            border: "1.5px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "1.8rem" }}>🗺️</span>
          <h4 style={{ margin: "6px 0 2px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
            Quests Completed
          </h4>
          <strong style={{ fontSize: "1.6rem", color: "var(--kid-maths)" }}>{totalAttempts || 4}</strong>
        </div>

        <div
          style={{
            background: "white",
            padding: "20px 22px",
            borderRadius: "var(--radius-lg)",
            border: "1.5px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: "1.8rem" }}>🏅</span>
          <h4 style={{ margin: "6px 0 2px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
            Badges Collected
          </h4>
          <strong style={{ fontSize: "1.6rem", color: "#B45309" }}>
            {badges.filter((b) => b.unlocked).length} / 12
          </strong>
        </div>
      </div>

      {/* 12 COLLECTIBLE BADGES SHELF */}
      <h3
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "1.4rem",
          color: "var(--text)",
          margin: "0 0 16px 0",
        }}
      >
        🏆 Trophy Room (12 Collectible Badges)
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: 16,
          marginBottom: 36,
        }}
      >
        {badges.map((b) => (
          <div
            key={b.id}
            style={{
              background: b.unlocked ? "white" : "#F8FAFC",
              border: b.unlocked ? "2px solid #FCD34D" : "2px dashed #CBD5E1",
              borderRadius: "var(--radius-lg)",
              padding: "18px 16px",
              textAlign: "center",
              boxShadow: b.unlocked ? "0 4px 12px rgba(245, 158, 11, 0.12)" : "none",
              opacity: b.unlocked ? 1 : 0.6,
              transition: "all 0.2s ease",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: b.unlocked ? "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)" : "#E2E8F0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.7rem",
                margin: "0 auto 10px auto",
              }}
            >
              {b.unlocked ? b.icon : <Lock size={20} color="#94A3B8" />}
            </div>

            <h4
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.05rem",
                color: b.unlocked ? "var(--text)" : "#64748B",
                margin: "0 0 4px 0",
              }}
            >
              {b.title}
            </h4>

            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
              {b.desc}
            </p>
          </div>
        ))}
      </div>

      {/* TOPIC MASTERY (If API connected) */}
      {isBackendOnline && apiProgress && (
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <TrendingUp size={20} color="var(--kid-grape)" />
            <h3 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "1.3rem" }}>
              Topic Confidence & Mastery
            </h3>
          </div>

          {apiProgress.mastery_per_topic.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>
              Solve practice questions to build topic mastery stars!
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {apiProgress.mastery_per_topic.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    border: "1.5px solid var(--border)",
                    background: "white",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{m.topic}</span>
                    <Badge variant={m.mastery_score >= 0.7 ? "mint" : "blue"}>
                      {Math.round(m.mastery_score * 100)}%
                    </Badge>
                  </div>
                  <ProgressBar value={Math.round(m.mastery_score * 100)} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* RECENT ADVENTURE LOG */}
      {history.length > 0 && (
        <section>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.3rem", margin: "0 0 14px 0" }}>
            Recent Practice Quests
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.slice(0, 5).map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: "white",
                  padding: "14px 18px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                    {item.subject} • {item.topic || "General"}
                  </span>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
                    {new Date(item.date).toLocaleDateString()}
                  </div>
                </div>
                <span
                  style={{
                    background: "#DCFCE7",
                    color: "#15803D",
                    padding: "4px 10px",
                    borderRadius: 12,
                    fontSize: "0.85rem",
                    fontWeight: 700,
                  }}
                >
                  {item.correctAnswers} / {item.totalQuestions} Correct ⭐
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
