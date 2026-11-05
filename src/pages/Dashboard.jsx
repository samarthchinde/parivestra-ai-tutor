import { useEffect, useState } from "react";
import { BookOpen, Bot, Target, Award, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, PageHeader, ProgressBar } from "../components/UI";
import { getProgressSummary } from "../api/client";
import { getProgress } from "../assessment/progressStorage";

export default function Dashboard() {
  const [progressData, setProgressData] = useState({
    attemptsCount: 0,
    averageScore: 0,
    recommended: "Python Basics",
    masteryPercentage: 0,
  });

  useEffect(() => {
    async function loadDashData() {
      try {
        const apiData = await getProgressSummary();
        if (apiData && apiData.mastery_per_topic) {
          const qualified = apiData.mastery_per_topic.filter((m) => m.sufficient_data);
          const avg = qualified.length
            ? Math.round(qualified.reduce((sum, m) => sum + m.score, 0) / qualified.length)
            : 0;

          setProgressData({
            attemptsCount: apiData.recent_attempts?.length || 0,
            averageScore: avg,
            recommended: apiData.recommended_next_topic || "Python Functions & Lists",
            masteryPercentage: Math.min(100, Math.round((qualified.length / 5) * 100)),
          });
          return;
        }
      } catch (err) {
        // Fallback to IndexedDB
      }

      try {
        const localRecords = await getProgress();
        if (localRecords && localRecords.length) {
          const avg = Math.round(
            localRecords.reduce((s, r) => s + (r.percentage || 0), 0) / localRecords.length
          );
          setProgressData({
            attemptsCount: localRecords.length,
            averageScore: avg,
            recommended: "Continue Python Practice",
            masteryPercentage: Math.min(100, localRecords.length * 15),
          });
        }
      } catch (localErr) {
        console.warn("Could not read local dashboard stats:", localErr);
      }
    }

    loadDashData();
  }, []);

  return (
    <>
      <PageHeader
        title="Welcome to your learning space"
        description="A personalised place to learn, practise and grow."
      />

      <div className="hero">
        <div>
          <span className="eyebrow light">YOUR LEARNING JOURNEY</span>
          <h2>
            Learn something new.
            <br />
            Every single day.
          </h2>
          <p>
            {progressData.recommended
              ? `Next recommendation: ${progressData.recommended}`
              : "Your AI tutor helps make difficult topics easier to understand."}
          </p>
          <Link className="primary-button" to="/tutor">
            Meet your AI tutor →
          </Link>
        </div>
        <div className="hero-symbol">
          <Bot size={76} />
        </div>
      </div>

      <div className="grid three">
        <Card title="Continue learning">
          <BookOpen />
          <p>Next focus: {progressData.recommended}</p>
          <Link to="/practice">Practise this topic →</Link>
        </Card>

        <Card title="Ask your tutor">
          <Bot />
          <p>Get concept breakdowns and hints tailored to you.</p>
          <Link to="/tutor">Start a conversation →</Link>
        </Card>

        <Card title="Track your goals">
          <Target />
          <p>
            {progressData.attemptsCount > 0
              ? `${progressData.attemptsCount} assessment(s) completed (${progressData.averageScore}% avg).`
              : "Keep an eye on your learning growth."}
          </p>
          <Link to="/progress">View progress →</Link>
        </Card>
      </div>

      <Card title="Curriculum Mastery Progress">
        <div className="goal-row">
          <strong>
            {progressData.attemptsCount > 0
              ? `${progressData.attemptsCount} assessments completed`
              : "0 / 5 assessments completed"}
          </strong>
          <span>{progressData.masteryPercentage}%</span>
        </div>
        <ProgressBar value={progressData.masteryPercentage || 10} />
      </Card>
    </>
  );
}
