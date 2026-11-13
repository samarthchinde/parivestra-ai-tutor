import { useNavigate } from "react-router-dom";
import { PageHeader, Badge, PrimaryButton, Mascot } from "../components/UI";
import { Sparkles, Star, Lock, CheckCircle2, Compass, ArrowRight } from "lucide-react";

export default function LearningPath() {
  const navigate = useNavigate();

  const questNodes = [
    {
      id: "c3_maths_numbers",
      level: 1,
      title: "Number Safari Island",
      subject: "Maths",
      badgeVariant: "blue",
      description: "Hundreds, tens, and place value exploration with Pari!",
      status: "completed", // "completed" | "current" | "locked"
      stars: 3,
      targetRoute: "/courses/c3_maths_numbers",
      icon: "🔢",
    },
    {
      id: "c3_eng_grammar",
      level: 2,
      title: "Word Forest Kingdom",
      subject: "English",
      badgeVariant: "coral",
      description: "Spot naming nouns, action verbs, and sparkling sentences!",
      status: "current",
      stars: 1,
      targetRoute: "/courses/c3_eng_grammar",
      icon: "🌳",
    },
    {
      id: "story_water_cycle",
      level: 3,
      title: "Water Cycle Valley",
      subject: "EVS",
      badgeVariant: "mint",
      description: "Journey with Piku the water drop from river to cloud!",
      status: "unlocked",
      stars: 0,
      targetRoute: "/videos/story/story_water_cycle",
      icon: "💧",
    },
    {
      id: "story_fractions_pizza",
      level: 4,
      title: "Fraction Bakery",
      subject: "Maths",
      badgeVariant: "blue",
      description: "Slice pizzas into halves and quarters with Chef Pari!",
      status: "unlocked",
      stars: 0,
      targetRoute: "/videos/story/story_fractions_pizza",
      icon: "🍕",
    },
    {
      id: "c4_evs_plants",
      level: 5,
      title: "Living World Peak",
      subject: "EVS",
      badgeVariant: "mint",
      description: "How roots drink water and green leaves cook food in sunlight!",
      status: "locked",
      stars: 0,
      targetRoute: "/courses/c4_evs_plants",
      icon: "🌱",
    },
    {
      id: "castle",
      level: 6,
      title: "Grand Scholar Castle",
      subject: "Capstone",
      badgeVariant: "purple",
      description: "The ultimate adventure combining all your superpowers!",
      status: "locked",
      stars: 0,
      targetRoute: "/courses",
      icon: "🏰",
    },
  ];

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", paddingBottom: 60 }}>
      <PageHeader
        title="Your Adventure Roadmap 🗺️"
        description="Follow the quest trail, unlock mystical learning islands, and collect golden stars!"
      />

      {/* Top Milestone Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
          border: "2px solid #FCD34D",
          borderRadius: "var(--radius-xl)",
          padding: "24px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 36,
          boxShadow: "var(--shadow-sm)",
          gap: 20,
        }}
      >
        <div>
          <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#92400E", textTransform: "uppercase" }}>
            Current Chapter: Island 2
          </span>
          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.6rem",
              color: "#78350F",
              margin: "4px 0 8px 0",
            }}
          >
            Word Forest Kingdom 🌳
          </h2>
          <p style={{ color: "#92400E", margin: 0, fontSize: "1rem" }}>
            Complete the grammar quest to earn your 2nd Star Cadet badge!
          </p>
        </div>
        <Mascot mood="cheering" size={85} />
      </div>

      {/* Stepping Stones Adventure Path */}
      <div style={{ position: "relative", padding: "10px 0" }}>
        {/* Trail Line */}
        <div
          style={{
            position: "absolute",
            top: 40,
            bottom: 40,
            left: "50%",
            width: 8,
            background: "linear-gradient(180deg, #A7F3D0 0%, #CBD5E1 100%)",
            transform: "translateX(-50%)",
            borderRadius: 4,
            zIndex: 0,
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 32, position: "relative", zIndex: 1 }}>
          {questNodes.map((node, idx) => {
            const isLeft = idx % 2 === 0;
            const isCurrent = node.status === "current";
            const isCompleted = node.status === "completed";
            const isLocked = node.status === "locked";

            let nodeBorder = "2px solid var(--border)";
            let nodeBg = "white";

            if (isCurrent) {
              nodeBorder = "3px solid var(--kid-grape)";
              nodeBg = "#FAF5FF";
            } else if (isCompleted) {
              nodeBorder = "2px solid #86EFAC";
              nodeBg = "#F0FDF4";
            } else if (isLocked) {
              nodeBg = "#F8FAFC";
              nodeBorder = "2px dashed #CBD5E1";
            }

            return (
              <div
                key={node.id}
                style={{
                  display: "flex",
                  justifyContent: isLeft ? "flex-start" : "flex-end",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: "88%",
                    maxWidth: 420,
                    background: nodeBg,
                    border: nodeBorder,
                    borderRadius: "var(--radius-xl)",
                    padding: "22px 24px",
                    boxShadow: isCurrent ? "var(--shadow-md)" : "var(--shadow-sm)",
                    opacity: isLocked ? 0.72 : 1,
                    position: "relative",
                    transition: "all 0.2s ease",
                  }}
                >
                  {/* Step Level Badge */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "1.4rem" }}>{node.icon}</span>
                      <Badge variant={node.badgeVariant}>{node.subject}</Badge>
                      <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--text-muted)" }}>
                        LEVEL {node.level}
                      </span>
                    </div>

                    {isCompleted ? (
                      <CheckCircle2 size={22} color="#16A34A" />
                    ) : isLocked ? (
                      <Lock size={18} color="#94A3B8" />
                    ) : (
                      <Sparkles size={20} color="var(--kid-grape)" />
                    )}
                  </div>

                  <h3
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "1.3rem",
                      color: isLocked ? "#64748B" : "var(--text)",
                      margin: "0 0 6px 0",
                    }}
                  >
                    {node.title}
                  </h3>

                  <p
                    style={{
                      fontSize: "0.92rem",
                      color: "var(--text-muted)",
                      margin: "0 0 16px 0",
                      lineHeight: 1.45,
                    }}
                  >
                    {node.description}
                  </p>

                  {/* Star rating and Action */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: 10,
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 4 }}>
                      {[1, 2, 3].map((starIdx) => (
                        <Star
                          key={starIdx}
                          size={18}
                          color="#F59E0B"
                          fill={starIdx <= node.stars ? "#F59E0B" : "transparent"}
                        />
                      ))}
                    </div>

                    <button
                      disabled={isLocked}
                      onClick={() => navigate(node.targetRoute)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: isCurrent
                          ? "var(--kid-grape)"
                          : isCompleted
                          ? "white"
                          : isLocked
                          ? "#E2E8F0"
                          : "var(--kid-maths)",
                        color: isCompleted ? "var(--text)" : isLocked ? "#94A3B8" : "white",
                        border: isCompleted ? "1.5px solid var(--border)" : "none",
                        padding: "8px 16px",
                        borderRadius: 12,
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        cursor: isLocked ? "not-allowed" : "pointer",
                      }}
                    >
                      {isCompleted ? "Revisit" : isCurrent ? "Continue Quest" : isLocked ? "Locked" : "Start"}
                      {!isLocked && <ArrowRight size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
