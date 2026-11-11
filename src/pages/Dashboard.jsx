import { useEffect, useState } from "react";
import { BookOpen, Bot, Target, Trophy, Flame, Sparkles, Brain, Rocket, Calculator, FlaskConical, Globe2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, PageHeader, ProgressBar } from "../components/UI";
import { getProgressSummary } from "../api/client";
import { getProgress } from "../assessment/progressStorage";

const gradeOptions = Array.from({ length: 10 }, (_, i) => `Class ${i + 1}`);
const subjects = [
  { name: "Mathematics", icon: Calculator, color: "violet", topic: "Fractions, patterns & puzzles" },
  { name: "Science", icon: FlaskConical, color: "mint", topic: "Discover how the world works" },
  { name: "English", icon: BookOpen, color: "peach", topic: "Stories, grammar & vocabulary" },
  { name: "Social Studies", icon: Globe2, color: "blue", topic: "People, places & history" },
];

export default function Dashboard() {
  const [grade, setGrade] = useState(() => localStorage.getItem("parivestra_grade") || "Class 6");
  const [progressData, setProgressData] = useState({ attemptsCount: 0, averageScore: 0, recommended: "Fractions & Decimals", masteryPercentage: 0 });

  useEffect(() => {
    async function loadDashData() {
      try {
        const apiData = await getProgressSummary();
        if (apiData?.mastery_per_topic) {
          const qualified = apiData.mastery_per_topic.filter((m) => m.sufficient_data);
          const avg = qualified.length ? Math.round(qualified.reduce((sum, m) => sum + m.score, 0) / qualified.length) : 0;
          setProgressData({ attemptsCount: apiData.recent_attempts?.length || 0, averageScore: avg, recommended: apiData.recommended_next_topic || "Fractions & Decimals", masteryPercentage: Math.min(100, Math.round((qualified.length / 5) * 100)) });
          return;
        }
      } catch {}
      try {
        const records = await getProgress();
        if (records?.length) setProgressData({ attemptsCount: records.length, averageScore: Math.round(records.reduce((s, r) => s + (r.percentage || 0), 0) / records.length), recommended: "Keep exploring your favourite subject", masteryPercentage: Math.min(100, records.length * 15) });
      } catch (err) { console.warn("Could not read local dashboard stats:", err); }
    }
    loadDashData();
  }, []);

  const changeGrade = (value) => { setGrade(value); localStorage.setItem("parivestra_grade", value); };

  return (
    <div className="student-dashboard">
      <div className="welcome-row">
        <PageHeader eyebrow="YOUR LEARNING ADVENTURE" title="Hey, superstar! 👋" description="Big ideas start with curious questions. What shall we discover today?" />
        <label className="grade-picker">I'M IN
          <select value={grade} onChange={(e) => changeGrade(e.target.value)}>{gradeOptions.map((g) => <option key={g}>{g}</option>)}</select>
        </label>
      </div>

      <section className="student-hero">
        <div className="hero-copy">
          <span className="hero-kicker"><Sparkles size={14}/> YOUR AI SIDEKICK IS READY</span>
          <h2>Learning is an<br/><em>adventure.</em> Let's go!</h2>
          <p>Ask anything, explore cool examples, and learn at your own pace. No question is too small.</p>
          <Link className="hero-cta" to="/tutor">Meet my AI tutor <span>↗</span></Link>
          <div className="hero-proof"><span>✦</span> Made for curious minds in Classes 1–10</div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one"></div><div className="orbit orbit-two"></div>
          <div className="planet"><Bot size={66}/></div>
          <span className="float-star star-a">✦</span><span className="float-star star-b">✧</span>
          <span className="float-pill">ASK • EXPLORE • GROW</span>
        </div>
      </section>

      <div className="section-heading"><div><span className="section-kicker">PICK YOUR NEXT QUEST</span><h2>What are we learning today?</h2></div><Link to="/subjects">All subjects ↗</Link></div>
      <div className="subject-grid">
        {subjects.map(({ name, icon: Icon, color, topic: desc }) => <Link className={`subject-card ${color}`} to="/subjects" key={name}>
          <span className="subject-icon"><Icon size={23}/></span><span className="subject-name">{name}</span><span className="subject-desc">{desc}</span><span className="subject-arrow">↗</span>
        </Link>)}
      </div>

      <div className="dashboard-bottom">
        <section className="daily-card">
          <div className="daily-top"><span className="daily-icon"><Brain size={19}/></span><span className="daily-tag">TODAY'S BRAIN BOOST</span></div>
          <h3>Did you know?</h3>
          <p>Octopuses have three hearts! Two pump blood to the gills, and one pumps it to the rest of the body. Science is full of surprises.</p>
          <Link to="/tutor">Ask why that happens <span>→</span></Link>
        </section>
        <section className="progress-card">
          <div className="progress-title"><span className="progress-emoji">🏆</span><div><span className="section-kicker">YOUR GROWTH</span><h3>Look how far you've come!</h3></div></div>
          <div className="stats-row"><div><strong>{progressData.attemptsCount}</strong><span>Quests tried</span></div><div><strong>{progressData.averageScore}%</strong><span>Average score</span></div><div><strong>{progressData.masteryPercentage}%</strong><span>Topic mastery</span></div></div>
          <ProgressBar value={progressData.masteryPercentage}/>
          <p className="next-up"><Flame size={15}/> Next up: <b>{progressData.recommended}</b></p>
          <Link to="/progress">See my progress →</Link>
        </section>
      </div>
      <div className="tutor-nudge"><span className="nudge-spark">✦</span><div><strong>Stuck on something?</strong><p>Your tutor can explain it with stories, games, drawings-in-words and real-life examples.</p></div><Link to="/tutor">Let's figure it out <span>→</span></Link></div>
    </div>
  );
}
