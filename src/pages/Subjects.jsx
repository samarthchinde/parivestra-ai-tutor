import { useNavigate } from "react-router-dom";
import { PageHeader, Badge, PrimaryButton, Mascot } from "../components/UI";
import { BookOpen, HelpCircle, Film, Sparkles, ArrowRight } from "lucide-react";

export default function Subjects() {
  const navigate = useNavigate();

  const subjects = [
    {
      id: "maths",
      name: "Mathematics",
      grade: "Class 3 & 4",
      icon: "🔢",
      color: "var(--kid-maths)",
      badgeVariant: "blue",
      desc: "Numbers & place value, times tables, fractions, and magical shapes!",
      topics: ["Numbers & Place Value", "Addition & Subtraction", "Multiplication & Division", "Fractions & Pizza", "2D & 3D Shapes"],
      courseId: "c3_maths_numbers",
    },
    {
      id: "english",
      name: "English Language & Grammar",
      grade: "Class 3 & 4",
      icon: "📖",
      color: "var(--kid-english)",
      badgeVariant: "coral",
      desc: "Naming nouns, action verbs, describing adjectives, and sparkling stories!",
      topics: ["Nouns (People, Places, Things)", "Action Verbs", "Describing Adjectives", "Sentences & Capital Letters", "Rhyming Words"],
      courseId: "c3_eng_grammar",
    },
    {
      id: "evs",
      name: "Environmental Studies (EVS)",
      grade: "Class 3 & 4",
      icon: "🌿",
      color: "var(--kid-evs)",
      badgeVariant: "mint",
      desc: "Plant life, the magical water cycle, animal homes, and our wonderful senses!",
      topics: ["Roots, Leaves & Plants", "The Water Cycle Journey", "Animal Habitats & Homes", "The Human Body & Senses"],
      courseId: "c4_evs_plants",
    },
  ];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 60 }}>
      <PageHeader
        title="Explore Subjects 🎒"
        description="Pick a subject to explore courses, practice games, and animated video stories!"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 20 }}>
        {subjects.map((sub) => (
          <div
            key={sub.id}
            style={{
              background: "white",
              borderRadius: "var(--radius-xl)",
              border: "2px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
              padding: "28px 32px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 24,
              transition: "all 0.2s ease",
            }}
          >
            <div style={{ flex: "1 1 340px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: "1.8rem" }}>{sub.icon}</span>
                <Badge variant={sub.badgeVariant}>{sub.grade}</Badge>
              </div>

              <h2
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.6rem",
                  color: "var(--text)",
                  margin: "0 0 8px 0",
                }}
              >
                {sub.name}
              </h2>

              <p style={{ color: "var(--text-muted)", fontSize: "0.98rem", lineHeight: 1.5, margin: "0 0 16px 0" }}>
                {sub.desc}
              </p>

              {/* Topic chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {sub.topics.map((top, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "var(--surface)",
                      color: "var(--text)",
                      padding: "4px 10px",
                      borderRadius: 12,
                      fontSize: "0.82rem",
                      fontWeight: 700,
                    }}
                  >
                    {top}
                  </span>
                ))}
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <PrimaryButton
                  onClick={() => navigate(`/courses/${sub.courseId}`)}
                  style={{ padding: "10px 18px", fontSize: "0.92rem", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <BookOpen size={16} /> Course Syllabus <ArrowRight size={14} />
                </PrimaryButton>

                <button
                  onClick={() => navigate("/practice")}
                  style={{
                    background: "var(--surface)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    padding: "10px 16px",
                    borderRadius: 12,
                    fontSize: "0.92rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <HelpCircle size={16} /> Practice Quiz
                </button>

                <button
                  onClick={() => navigate("/videos")}
                  style={{
                    background: "var(--surface)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    padding: "10px 16px",
                    borderRadius: 12,
                    fontSize: "0.92rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Film size={16} /> Watch Stories
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <Mascot mood="happy" size={90} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
