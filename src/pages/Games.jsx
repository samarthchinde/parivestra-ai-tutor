import { useState, useEffect } from "react";
import {
  PageHeader,
  Card,
  PrimaryButton,
  Badge,
  Mascot,
  Toast,
} from "../components/UI";
import { playSuccess, playNudge } from "../utils/sound";
import confetti from "canvas-confetti";
import { getBandForGrade } from "../config/bands";
import {
  Sparkles,
  Heart,
  Flame,
  Award,
  RotateCcw,
  Volume2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Star,
  Zap,
} from "lucide-react";

export default function Games() {
  const [activeGame, setActiveGame] = useState("menu"); // "menu" | "ninja" | "word" | "bughunt" | "sprint"
  const [toastMsg, setToastMsg] = useState("");
  const [grade] = useState(localStorage.getItem("parivestra_grade") || "Class 3");
  const band = getBandForGrade(grade);

  // Game state
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [gameFeedback, setGameFeedback] = useState(null); // { text, type: "good" | "bad" }

  // Game 1: Number Ninja questions — scaled by band
  const ninjaQuestionsJunior = [
    { q: "7 × 8 = ?", options: ["54", "56", "64", "48"], a: "56", hint: "Think: 7 × 7 = 49, add 7 more!" },
    { q: "What is 150 + 250?", options: ["350", "400", "450", "500"], a: "400", hint: "15 tens + 25 tens = 40 tens!" },
    { q: "Half of 60 is:", options: ["20", "25", "30", "35"], a: "30", hint: "Divide 60 into two equal halves." },
    { q: "9 × 6 = ?", options: ["54", "63", "45", "56"], a: "54", hint: "Nine times six is fifty-four!" },
    { q: "What is 1000 - 350?", options: ["650", "750", "550", "600"], a: "650", hint: "Start with 1000, take away 300, then 50." },
    { q: "How many sides does a Pentagon have?", options: ["4", "5", "6", "8"], a: "5", hint: "Penta means five!" },
    { q: "Which fraction is bigger: 1/2 or 1/4?", options: ["1/2", "1/4", "They are equal", "Neither"], a: "1/2", hint: "Half a pizza is bigger than a quarter!" },
    { q: "40 ÷ 5 = ?", options: ["6", "7", "8", "9"], a: "8", hint: "5 × 8 = 40!" },
  ];

  const ninjaQuestionsMiddle = [
    { q: "What is 15% of 200?", options: ["20", "30", "35", "40"], a: "30", hint: "15% means 15/100 × 200." },
    { q: "Solve: 3x = 24", options: ["6", "7", "8", "9"], a: "8", hint: "Divide both sides by 3." },
    { q: "Area of a triangle with base 12 and height 8?", options: ["48", "96", "36", "60"], a: "48", hint: "A = ½ × base × height." },
    { q: "What is (-5) × (-3)?", options: ["15", "-15", "8", "-8"], a: "15", hint: "Negative times negative is positive." },
    { q: "Simplify: 18/24", options: ["2/3", "3/4", "4/6", "6/8"], a: "3/4", hint: "Divide both by 6." },
    { q: "Find the HCF of 12 and 18:", options: ["6", "3", "4", "9"], a: "6", hint: "List factors of each." },
  ];

  const ninjaQuestionsSenior = [
    { q: "Solve: x² − 5x + 6 = 0, find x", options: ["2 and 3", "1 and 6", "-2 and -3", "3 and 6"], a: "2 and 3", hint: "Factorise: (x-2)(x-3)=0." },
    { q: "What is sin 30°?", options: ["1/2", "√3/2", "1", "0"], a: "1/2", hint: "Standard trigonometric value." },
    { q: "If a triangle has sides 3, 4, 5, it is:", options: ["Right-angled", "Equilateral", "Isosceles", "Obtuse"], a: "Right-angled", hint: "Check: 3²+4² = 5²." },
    { q: "pH of pure water at 25°C?", options: ["7", "0", "14", "1"], a: "7", hint: "Neutral solution." },
    { q: "Chemical formula of baking soda?", options: ["NaHCO₃", "Na₂CO₃", "NaCl", "NaOH"], a: "NaHCO₃", hint: "Sodium hydrogen carbonate." },
    { q: "The SI unit of electric current is:", options: ["Ampere", "Volt", "Watt", "Ohm"], a: "Ampere", hint: "Named after André-Marie Ampère." },
  ];

  const ninjaQuestions = band === "senior" ? ninjaQuestionsSenior : band === "middle" ? ninjaQuestionsMiddle : ninjaQuestionsJunior;

  // Game 2: Word Builder / Grammar Spark questions
  const wordQuestions = [
    { q: "Which word is a NOUN (naming word)?", options: ["Elephant", "Quickly", "Yellow", "Jump"], a: "Elephant", hint: "An elephant is a magnificent animal!" },
    { q: "Pick the word that rhymes with 'BRIGHT':", options: ["Night", "Bring", "Bite", "Bread"], a: "Night", hint: "Listen to the end sound: -ight!" },
    { q: "Which word is an ACTION VERB?", options: ["Dance", "Purple", "Castle", "Happy"], a: "Dance", hint: "Something you can actively DO!" },
    { q: "Fill in the blank: The playful kitten drank ___ milk.", options: ["its", "it's", "they", "we"], a: "its", hint: "Its shows belonging to the kitten!" },
    { q: "Which word is an ADJECTIVE (describing word)?", options: ["Sparkling", "Window", "Walk", "Slowly"], a: "Sparkling", hint: "It describes how something shines!" },
    { q: "Plural of 'Leaf' is:", options: ["Leafs", "Leaves", "Leafies", "Leafen"], a: "Leaves", hint: "F changes to V-E-S!" },
  ];

  // Game 3: Child-friendly Bug Hunt (Sequence & Block Logic)
  const bugQuestions = [
    {
      q: "Help Pari reach the star! Which sequence works?",
      code: "Start -> Move Right -> Move Down -> ?",
      options: ["Grab Star ⭐", "Turn Left ↩️", "Sleep 😴", "Jump 🦘"],
      a: "Grab Star ⭐",
      hint: "Pari is right beside the star!",
    },
    {
      q: "Find the bug in this routine:",
      code: "1. Wake up\n2. Put on shoes\n3. Put on socks\n4. Go to school",
      options: ["Socks must go before shoes!", "Wake up is wrong", "Going to school is wrong", "No bug here"],
      a: "Socks must go before shoes!",
      hint: "You can't wear socks over your shoes!",
    },
    {
      q: "What will this repeat block do?\nRepeat 3 times: [ Clap Hands 👏 ]",
      code: "Claps total: ?",
      options: ["3 claps", "1 clap", "6 claps", "0 claps"],
      a: "3 claps",
      hint: "The block repeats 3 times exactly!",
    },
    {
      q: "If it is raining, Pari takes an umbrella. It is sunny today! What does Pari take?",
      code: "if (raining) { umbrella } else { sunglasses }",
      options: ["Sunglasses 😎", "Umbrella ☔", "Snowboots ❄️", "Raincoat 🧥"],
      a: "Sunglasses 😎",
      hint: "It is sunny, so the 'else' part happens!",
    },
  ];

  // Quiz Sprint for Senior Band: timed rapid board-style questions
  const sprintQuestions = [
    { q: "Find the discriminant of 2x² + 3x − 5 = 0", options: ["49", "9", "25", "16"], a: "49", hint: "D = b² − 4ac = 9 + 40 = 49." },
    { q: "Which element has atomic number 11?", options: ["Sodium", "Neon", "Magnesium", "Lithium"], a: "Sodium", hint: "Na, a reactive alkali metal." },
    { q: "The Revolt of 1857 started from:", options: ["Meerut", "Delhi", "Lucknow", "Kanpur"], a: "Meerut", hint: "Mangal Pandey's sepoy mutiny." },
    { q: "What is the value of log₁₀(1000)?", options: ["3", "2", "4", "10"], a: "3", hint: "10³ = 1000." },
    { q: "The longest river in India is:", options: ["Ganga", "Godavari", "Krishna", "Narmada"], a: "Ganga", hint: "It flows over 2500 km." },
    { q: "What is the powerhouse of the cell?", options: ["Mitochondria", "Nucleus", "Ribosome", "Golgi body"], a: "Mitochondria", hint: "Produces ATP energy." },
  ];

  const startGame = (gameKey) => {
    setActiveGame(gameKey);
    setScore(0);
    setStreak(0);
    setHearts(3);
    setGameOver(false);
    setCurrentRound(0);
    setGameFeedback(null);
  };

  const getQuestionPool = () => {
    if (activeGame === "ninja") return ninjaQuestions;
    if (activeGame === "word") return wordQuestions;
    if (activeGame === "bughunt") return bugQuestions;
    if (activeGame === "sprint") return sprintQuestions;
    return [];
  };

  const questions = getQuestionPool();
  const currentQ = questions[currentRound % questions.length];

  const handleAnswer = (selectedOpt) => {
    if (gameFeedback) return;

    const isCorrect = selectedOpt === currentQ.a;

    if (isCorrect) {
      playSuccess();
      const newStreak = streak + 1;
      const pts = 10 + newStreak * 5;
      setScore((s) => s + pts);
      setStreak(newStreak);
      setGameFeedback({ text: `🎉 Awesome! +${pts} pts!`, type: "good" });

      if (newStreak % 3 === 0) {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      }

      setTimeout(() => {
        setGameFeedback(null);
        if (currentRound + 1 >= questions.length) {
          // Finished game pool!
          setGameOver(true);
          confetti({ particleCount: 80, spread: 70 });
        } else {
          setCurrentRound((r) => r + 1);
        }
      }, 1000);
    } else {
      playNudge();
      const newHearts = hearts - 1;
      setHearts(newHearts);
      setStreak(0);
      setGameFeedback({
        text: `💡 Nice try! Correct was: "${currentQ.a}"`,
        type: "bad",
      });

      setTimeout(() => {
        setGameFeedback(null);
        if (newHearts <= 0) {
          setGameOver(true);
        } else {
          setCurrentRound((r) => r + 1);
        }
      }, 1600);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 60 }}>
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg("")} />}

      {/* Main Menu View */}
      {activeGame === "menu" ? (
        <div>
          <PageHeader
            title="Pari's Playful Game Arena 🎮"
            description="Train your brain with lightning math, word games, and block logic puzzles!"
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
              marginTop: 20,
            }}
          >
            {/* Game 1: Number Ninja */}
            <div
              onClick={() => startGame("ninja")}
              style={{
                background: "white",
                borderRadius: "var(--radius-xl)",
                border: "2px solid #BFDBFE",
                padding: "28px 24px",
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.22s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: "#DBEAFE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.8rem",
                  marginBottom: 16,
                }}
              >
                🥷
              </div>
              <Badge variant="blue">Maths • Class 3 & 4</Badge>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", margin: "10px 0 6px 0", color: "var(--text)" }}>
                Number Ninja
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 20px 0", flex: 1 }}>
                Slice through times tables, mental addition, fractions, and shape puzzles at ninja speed!
              </p>
              <PrimaryButton style={{ width: "100%", padding: "12px" }}>
                Play Ninja! ⚡
              </PrimaryButton>
            </div>

            {/* Game 2: Word Builder */}
            <div
              onClick={() => startGame("word")}
              style={{
                background: "white",
                borderRadius: "var(--radius-xl)",
                border: "2px solid #FED7AA",
                padding: "28px 24px",
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.22s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: "#FFEDD5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.8rem",
                  marginBottom: 16,
                }}
              >
                ✨
              </div>
              <Badge variant="coral">English • Class 3 & 4</Badge>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", margin: "10px 0 6px 0", color: "var(--text)" }}>
                Spelling & Grammar Spark
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 20px 0", flex: 1 }}>
                Hunt nouns, spot rhyming sounds, and fix mixed-up sentences with detective precision!
              </p>
              <PrimaryButton style={{ width: "100%", padding: "12px", background: "var(--kid-coral)", borderColor: "#EA580C" }}>
                Play Spark! 📖
              </PrimaryButton>
            </div>

            {/* Game 3: Bug Hunt */}
            <div
              onClick={() => startGame("bughunt")}
              style={{
                background: "white",
                borderRadius: "var(--radius-xl)",
                border: "2px solid #E9D5FF",
                padding: "28px 24px",
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.22s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "var(--shadow-md)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 18,
                  background: "#F3E8FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.8rem",
                  marginBottom: 16,
                }}
              >
                🐞
              </div>
              <Badge variant="purple">Logic • Class 3 & 4</Badge>
              <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", margin: "10px 0 6px 0", color: "var(--text)" }}>
                Pari's Bug Hunt
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 20px 0", flex: 1 }}>
                Catch friendly software bugs, sequence daily routines, and decode playful repeat loops!
              </p>
              <PrimaryButton style={{ width: "100%", padding: "12px", background: "var(--kid-grape)", borderColor: "#7C3AED" }}>
                Catch Bugs! 🔍
              </PrimaryButton>
            </div>
          </div>

          {/* Game 4: Quiz Sprint — Senior Band */}
          {band === "senior" && (
            <div
              className="clickable-card"
              onClick={() => startGame("sprint")}
              style={{
                background: "white",
                border: "2px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: 0,
                cursor: "pointer",
                overflow: "hidden",
                boxShadow: "var(--shadow-sm)",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ padding: "26px 26px 24px", display: "flex", flexDirection: "column", height: "100%" }}>
                <div
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: "50%",
                    background: "#EF4444",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 34,
                    marginBottom: 14,
                  }}
                >
                  ⚡
                </div>
                <Badge variant="warning">Rapid Fire • Board Prep</Badge>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.4rem", margin: "10px 0 6px 0", color: "var(--text)" }}>
                  Quiz Sprint
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.5, margin: "0 0 20px 0", flex: 1 }}>
                  Timed CBSE-style rapid-fire questions across Science, Maths, and Social Science. Exam prep made fun!
                </p>
                <PrimaryButton style={{ width: "100%", padding: "12px", background: "#EF4444", borderColor: "#EF4444" }}>
                  Start Sprint! ⚡
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE GAMEPLAY STAGE */
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {/* Header Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
            }}
          >
            <button
              onClick={() => setActiveGame("menu")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "0.95rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ← Back to Arena
            </button>

            {/* Hearts and Streak */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Hearts */}
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3].map((h) => (
                  <Heart
                    key={h}
                    size={22}
                    color="#EF4444"
                    fill={h <= hearts ? "#EF4444" : "transparent"}
                  />
                ))}
              </div>

              {/* Streak */}
              {streak > 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    background: "#FEF3C7",
                    color: "#D97706",
                    padding: "4px 10px",
                    borderRadius: 14,
                    fontWeight: 800,
                    fontSize: "0.85rem",
                  }}
                >
                  <Flame size={16} fill="#F59E0B" /> {streak} Streak!
                </div>
              )}

              {/* Score */}
              <div
                style={{
                  background: "var(--surface)",
                  padding: "5px 12px",
                  borderRadius: 14,
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  color: "var(--kid-grape)",
                }}
              >
                {score} pts
              </div>
            </div>
          </div>

          {!gameOver ? (
            <div
              style={{
                background: "white",
                borderRadius: "var(--radius-xl)",
                border: "2px solid var(--border)",
                padding: "32px 36px",
                boxShadow: "var(--shadow-md)",
              }}
            >
              {/* Round number */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)" }}>
                  Question {currentRound + 1} of {questions.length}
                </span>
                <Mascot mood={streak > 2 ? "cheering" : "happy"} size={55} />
              </div>

              {/* Question text */}
              <h2
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.65rem",
                  color: "var(--text)",
                  margin: "0 0 16px 0",
                  lineHeight: 1.3,
                }}
              >
                {currentQ.q}
              </h2>

              {/* Code snippet if any */}
              {currentQ.code && (
                <div
                  style={{
                    background: "#0F172A",
                    color: "#38BDF8",
                    padding: "14px 18px",
                    borderRadius: 12,
                    fontFamily: "monospace",
                    fontSize: "1rem",
                    whiteSpace: "pre-wrap",
                    marginBottom: 20,
                  }}
                >
                  {currentQ.code}
                </div>
              )}

              {/* Options Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginTop: 20,
                }}
              >
                {currentQ.options.map((opt, idx) => (
                  <button
                    key={idx}
                    disabled={!!gameFeedback}
                    onClick={() => handleAnswer(opt)}
                    style={{
                      padding: "16px 18px",
                      borderRadius: "var(--radius-md)",
                      border: "2px solid #E2E8F0",
                      background: "#F8FAFC",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "var(--text)",
                      cursor: gameFeedback ? "default" : "pointer",
                      transition: "all 0.15s ease",
                      textAlign: "center",
                    }}
                    onMouseEnter={(e) => {
                      if (!gameFeedback) {
                        e.currentTarget.style.background = "rgba(138, 99, 242, 0.08)";
                        e.currentTarget.style.borderColor = "var(--kid-grape)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!gameFeedback) {
                        e.currentTarget.style.background = "#F8FAFC";
                        e.currentTarget.style.borderColor = "#E2E8F0";
                      }
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {/* Immediate Feedback Box */}
              {gameFeedback && (
                <div
                  style={{
                    marginTop: 20,
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: gameFeedback.type === "good" ? "#DCFCE7" : "#FEE2E2",
                    color: gameFeedback.type === "good" ? "#15803D" : "#B91C1C",
                    fontWeight: 800,
                    fontSize: "1.05rem",
                    textAlign: "center",
                  }}
                >
                  {gameFeedback.text}
                </div>
              )}
            </div>
          ) : (
            /* GAME OVER / VICTORY CARD */
            <div
              style={{
                background: "white",
                borderRadius: "var(--radius-xl)",
                border: "2px solid var(--border)",
                padding: "44px 36px",
                textAlign: "center",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <Mascot mood={hearts > 0 ? "cheering" : "oops"} size={110} />

              <h2
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "2rem",
                  color: "var(--text)",
                  margin: "18px 0 8px 0",
                }}
              >
                {hearts > 0 ? "Outstanding Arena Victory! 🏆" : "Good Game, Champion! 🌟"}
              </h2>

              <p style={{ color: "var(--text-muted)", fontSize: "1.1rem", margin: "0 0 24px 0" }}>
                You scored <strong style={{ color: "var(--kid-grape)" }}>{score} points</strong>! Keep
                training your superpowers!
              </p>

              <div style={{ display: "flex", justifyContent: "center", gap: 14 }}>
                <PrimaryButton onClick={() => startGame(activeGame)}>
                  <RotateCcw size={18} /> Play Again
                </PrimaryButton>
                <button
                  onClick={() => setActiveGame("menu")}
                  style={{
                    background: "var(--surface)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    padding: "12px 22px",
                    borderRadius: 14,
                    fontSize: "1rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Choose Another Game 🎮
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

