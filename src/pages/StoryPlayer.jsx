import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStoryDetail } from "../api/client";
import {
  PageHeader,
  Card,
  PrimaryButton,
  Badge,
  Mascot,
  Toast,
} from "../components/UI";
import StoryIllustration from "../components/StoryIllustrations";
import { playSuccess, playNudge } from "../utils/sound";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Play,
  Pause,
} from "lucide-react";

export default function StoryPlayer() {
  const { storyId } = useParams();
  const navigate = useNavigate();

  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [sceneIndex, setSceneIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.88);
  const [selectedPromptOption, setSelectedPromptOption] = useState(null);
  const [promptAnswered, setPromptAnswered] = useState(false);
  const [storyFinished, setStoryFinished] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      setSceneIndex(0);
      setSelectedPromptOption(null);
      setPromptAnswered(false);
      setStoryFinished(false);

      try {
        const data = await getStoryDetail(storyId);
        setStory(data);
      } catch (err) {
        console.error("Failed to load story:", err);
        setError("Could not load the animated story.");
      } finally {
        setLoading(false);
      }
    }
    load();

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [storyId]);

  // Read current scene aloud
  const readScene = (text) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = 1.1;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleAnswerPrompt = (opt, correctOpt) => {
    if (promptAnswered) return;
    setSelectedPromptOption(opt);
    setPromptAnswered(true);

    if (opt === correctOpt) {
      playSuccess();
    } else {
      playNudge();
    }
  };

  const handleNextScene = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);

    const scenes = story?.scenes || [];
    if (sceneIndex >= scenes.length - 1) {
      setStoryFinished(true);
      playSuccess();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } else {
      setSceneIndex((i) => i + 1);
      setSelectedPromptOption(null);
      setPromptAnswered(false);
    }
  };

  const handlePrevScene = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSceneIndex((i) => Math.max(0, i - 1));
    setSelectedPromptOption(null);
    setPromptAnswered(false);
  };

  const handleRestart = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSceneIndex(0);
    setSelectedPromptOption(null);
    setPromptAnswered(false);
    setStoryFinished(false);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <Mascot mood="thinking" size={90} message="Loading magical story scenes..." />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <Mascot mood="oops" size={80} message={error || "Story not found!"} />
        <div style={{ marginTop: 20 }}>
          <PrimaryButton onClick={() => navigate("/videos")}>
            <ArrowLeft size={18} /> Back to Videos
          </PrimaryButton>
        </div>
      </div>
    );
  }

  const scenes = story.scenes || [];
  const currentScene = scenes[sceneIndex] || scenes[0];
  const isLastScene = sceneIndex === scenes.length - 1;
  const correctOption = currentScene.options ? currentScene.options[0] : null;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 60 }}>
      {/* Top Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <button
          onClick={() => navigate("/videos")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.95rem",
            fontWeight: 700,
            cursor: "pointer",
            padding: "6px 12px",
            borderRadius: 12,
          }}
        >
          <ArrowLeft size={18} /> Back to Videos & Stories
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Badge variant="mint">{story.grade}</Badge>
          <Badge variant="blue">{story.subject}</Badge>
        </div>
      </div>

      {!storyFinished ? (
        <div
          style={{
            background: "white",
            borderRadius: "var(--radius-xl)",
            border: "2px solid var(--border)",
            boxShadow: "var(--shadow-md)",
            overflow: "hidden",
          }}
        >
          {/* Cinema Header */}
          <div
            style={{
              padding: "16px 24px",
              background: "#1E1B4B",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span style={{ fontSize: "0.8rem", color: "#A5B4FC", textTransform: "uppercase", fontWeight: 800 }}>
                Interactive Animated Story
              </span>
              <h2
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.25rem",
                  margin: 0,
                  color: "#F8FAFC",
                }}
              >
                {story.topic}: Scene {sceneIndex + 1}
              </h2>
            </div>

            {/* Audio controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setSpeechRate((r) => (r === 0.88 ? 1.0 : 0.88))}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  color: "white",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: 14,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Speed: {speechRate}x
              </button>

              <button
                onClick={() => readScene(currentScene.speech_text || currentScene.text)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: isSpeaking ? "#EF4444" : "var(--kid-grape)",
                  color: "white",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                {isSpeaking ? "Pause Narration" : "Listen 🎧"}
              </button>
            </div>
          </div>

          {/* Animated Illustration Stage */}
          <div
            style={{
              background: "linear-gradient(180deg, #F0F9FF 0%, #E0F2FE 100%)",
              minHeight: 280,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "28px 20px",
              position: "relative",
            }}
          >
            <StoryIllustration
              name={currentScene.illustration || "sun"}
              size={210}
            />
          </div>

          {/* Subtitles & Story Script */}
          <div style={{ padding: "28px 36px" }}>
            <h3
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "1.6rem",
                color: "var(--text)",
                margin: "0 0 10px 0",
                textAlign: "center",
              }}
            >
              {currentScene.title}
            </h3>

            <p
              style={{
                fontSize: "1.25rem",
                lineHeight: 1.6,
                color: "var(--text)",
                textAlign: "center",
                maxWidth: 680,
                margin: "0 auto 24px auto",
                fontFamily: "var(--font-body)",
              }}
            >
              {currentScene.text}
            </p>

            {/* Interactive Prompt Question */}
            {currentScene.interactive_prompt && (
              <div
                style={{
                  background: "#FFF9F0",
                  border: "2px solid #FDE68A",
                  borderRadius: "var(--radius-lg)",
                  padding: "18px 22px",
                  maxWidth: 640,
                  margin: "0 auto 24px auto",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <Sparkles size={18} color="#D97706" />
                  <span style={{ fontWeight: 800, color: "#92400E", fontSize: "1rem" }}>
                    {currentScene.interactive_prompt}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {(currentScene.options || []).map((opt, oIdx) => {
                    const isChosen = selectedPromptOption === opt;
                    const isCorrect = opt === correctOption;

                    let btnBg = "white";
                    let btnBorder = "1.5px solid #CBD5E1";
                    let btnColor = "var(--text)";

                    if (promptAnswered) {
                      if (isCorrect) {
                        btnBg = "#DCFCE7";
                        btnBorder = "1.5px solid #16A34A";
                        btnColor = "#15803D";
                      } else if (isChosen) {
                        btnBg = "#FEE2E2";
                        btnBorder = "1.5px solid #DC2626";
                        btnColor = "#B91C1C";
                      }
                    }

                    return (
                      <button
                        key={oIdx}
                        disabled={promptAnswered}
                        onClick={() => handleAnswerPrompt(opt, correctOption)}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 12,
                          background: btnBg,
                          border: btnBorder,
                          color: btnColor,
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          cursor: promptAnswered ? "default" : "pointer",
                          transition: "all 0.18s ease",
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Controls */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 16,
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                disabled={sceneIndex === 0}
                onClick={handlePrevScene}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: sceneIndex === 0 ? "#F1F5F9" : "var(--surface)",
                  color: sceneIndex === 0 ? "#94A3B8" : "var(--text)",
                  border: "1px solid var(--border)",
                  padding: "10px 18px",
                  borderRadius: 12,
                  fontWeight: 700,
                  cursor: sceneIndex === 0 ? "not-allowed" : "pointer",
                }}
              >
                <ChevronLeft size={18} /> Previous
              </button>

              {/* Progress scene dots */}
              <div style={{ display: "flex", gap: 8 }}>
                {scenes.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: idx === sceneIndex ? 24 : 10,
                      height: 10,
                      borderRadius: 5,
                      background: idx === sceneIndex ? "var(--kid-grape)" : "#CBD5E1",
                      transition: "all 0.2s",
                    }}
                  />
                ))}
              </div>

              <PrimaryButton
                onClick={handleNextScene}
                style={{ padding: "10px 24px" }}
              >
                {isLastScene ? "Finish Story! 🎉" : "Next Scene →"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : (
        /* FINISHED CELEBRATION */
        <div
          style={{
            background: "white",
            borderRadius: "var(--radius-xl)",
            border: "2px solid #A7F3D0",
            padding: "48px 36px",
            textAlign: "center",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <Mascot mood="cheering" size={130} message="You completed this magical story! 🌟" />

          <h2
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "2.2rem",
              color: "var(--text)",
              margin: "20px 0 10px 0",
            }}
          >
            Story Explorer Badge Unlocked! 🏅
          </h2>

          <p style={{ color: "var(--text-muted)", fontSize: "1.15rem", marginBottom: 28 }}>
            You discovered how <strong style={{ color: "var(--kid-grape)" }}>{story.topic}</strong> works in
            real life! Keep up the brilliant curiosity!
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
            <PrimaryButton onClick={() => navigate("/videos")}>
              Watch More Stories 🎬
            </PrimaryButton>
            <button
              onClick={handleRestart}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
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
              <RotateCcw size={18} /> Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
