import React, { useState, useEffect, useRef } from "react";
import { PageHeader, Card, PrimaryButton, Badge, Mascot } from "../components/UI";
import { streamTutorChat, getSubjects } from "../api/client";
import { getAvatar } from "../data/avatars";
import { playClick, playSuccess, playNudge } from "../utils/sound";
import {
  Send,
  Volume2,
  VolumeX,
  Lightbulb,
  Sparkles,
  BookOpen,
  RotateCcw,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";

export default function Tutor() {
  const [sessionId, setSessionId] = useState(`session_${Date.now()}`);
  const [subject, setSubject] = useState("Maths");
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState(
    localStorage.getItem("parivestra_grade") || "Class 3"
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speakingId, setSpeakingId] = useState(null);
  const [activeHintLevel, setActiveHintLevel] = useState(0);

  const [subjectsList, setSubjectsList] = useState([
    { id: "maths", name: "Maths", topics: ["Numbers", "Addition", "Multiplication", "Fractions", "Shapes"] },
    { id: "english", name: "English", topics: ["Nouns", "Verbs", "Adjectives", "Sentences", "Punctuation"] },
    { id: "evs", name: "EVS", topics: ["Plants", "Animals", "Water", "Human Body", "Weather"] },
  ]);

  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I am Pari, your learning buddy. Ask me any question about Maths, English, or EVS, and we will explore it together! 🌟",
      citations: [],
      hintLevel: 0,
      source: "assistant",
    },
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    async function loadSubjects() {
      try {
        const data = await getSubjects();
        if (data && data.subjects) {
          setSubjectsList(data.subjects);
        }
      } catch (e) {
        // Fallback
      }
    }
    loadSubjects();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startNewChat = () => {
    window.speechSynthesis?.cancel();
    setSpeakingId(null);
    setSessionId(`session_${Date.now()}`);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Hi there! We are exploring ${subject}. Ask me anything! 🌟`,
        citations: [],
        hintLevel: 0,
        source: "assistant",
      },
    ]);
    setActiveHintLevel(0);
    setInput("");
  };

  const handleSpeech = (text, msgId) => {
    if (!window.speechSynthesis) return;

    if (speakingId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_~]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.88; // Slightly slower, comfortable child pace
    utterance.pitch = 1.1; // Gentle, friendly pitch

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (forcedPrompt = null, forcedHintLevel = null) => {
    const textToSend = forcedPrompt !== null ? forcedPrompt : input.trim();
    if (!textToSend && forcedHintLevel === null) return;

    window.speechSynthesis?.cancel();
    setSpeakingId(null);

    const effectiveHintLevel = forcedHintLevel !== null ? forcedHintLevel : 0;
    setActiveHintLevel(effectiveHintLevel);

    const userMsgId = `user_${Date.now()}`;
    const assistantMsgId = `assistant_${Date.now()}`;

    const newMessages = [...messages];
    if (textToSend) {
      newMessages.push({
        id: userMsgId,
        role: "user",
        content: textToSend,
      });
      setInput("");
    }

    // Streaming placeholder
    newMessages.push({
      id: assistantMsgId,
      role: "assistant",
      content: "",
      citations: [],
      hintLevel: effectiveHintLevel,
      streaming: true,
      source: "model",
    });

    setMessages(newMessages);
    setLoading(true);

    const promptText =
      textToSend ||
      messages.filter((m) => m.role === "user").slice(-1)[0]?.content ||
      "Explain this concept";

    await streamTutorChat({
      sessionId,
      message: promptText,
      subject,
      topic: topic || undefined,
      grade,
      hintLevel: effectiveHintLevel,
      onToken: (token) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: msg.content + token } : msg
          )
        );
      },
      onDone: (meta) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  citations: meta.citations || [],
                  hintLevel: meta.hint_level ?? effectiveHintLevel,
                  source: meta.source || "model",
                  streaming: false,
                }
              : msg
          )
        );
        setLoading(false);
        playSuccess();
      },
      onError: (err) => {
        setLoading(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content:
                    "Pari is resting right now. Ask your teacher or grown-up to start Pari so we can chat! 🎒",
                  source: "offline",
                  streaming: false,
                }
              : msg
          )
        );
      },
    });
  };

  const quickChips = [
    { label: "Explain it simply 🎈", prompt: "Can you explain this simply for my class?" },
    { label: "Give me an example 🌟", prompt: "Can you give me a fun real-life example?" },
    { label: "Quiz me on this! 🎯", prompt: "Can you quiz me with a quick question on this?" },
    { label: "What are nouns? 📖", prompt: "What is a noun in English?", subject: "English" },
    { label: "What is 4 × 5? 🔢", prompt: "What is 4 times 5 in Maths?", subject: "Maths" },
  ];

  const activeSubjectObj = subjectsList.find((s) => s.name.toLowerCase() === subject.toLowerCase()) || subjectsList[0];
  const userAvatar = getAvatar(localStorage.getItem("parivestra_avatar") || "owl");

  return (
    <div style={{ maxWidth: 940, margin: "0 auto" }}>
      <PageHeader
        eyebrow="PARIVESTRA ADVENTURES"
        title="Chat with Pari 🦉"
        description="Ask any question, receive friendly grounded answers, or tap the lightbulbs for step-by-step hints!"
      />

      {/* Control Bar: Subject Selector + New Conversation */}
      <Card style={{ marginBottom: 18, padding: "14px 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <BookOpen size={18} color="var(--color-primary)" />
              <label style={{ fontSize: 14, fontWeight: 800 }}>Subject:</label>
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setTopic("");
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-sm)",
                  border: "2px solid #CBD5E1",
                  fontSize: 14,
                  fontWeight: 700,
                  background: "#FFF",
                }}
              >
                {subjectsList.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label style={{ fontSize: 14, fontWeight: 800 }}>Topic:</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-sm)",
                  border: "2px solid #CBD5E1",
                  fontSize: 14,
                  fontWeight: 700,
                  background: "#FFF",
                }}
              >
                <option value="">All Topics</option>
                {activeSubjectObj?.topics?.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={() => { playClick(); startNewChat(); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#F8FAFC",
              border: "2px solid #E2E8F0",
              borderRadius: "var(--radius-sm)",
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            <RotateCcw size={14} /> New Adventure
          </button>
        </div>
      </Card>

      {/* Chat Messages Container */}
      <div
        className="chat-container"
        style={{
          background: "#FFFFFF",
          border: "2px solid #F0ECE4",
          borderRadius: "var(--radius-lg)",
          padding: 24,
          minHeight: 460,
          maxHeight: 560,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          marginBottom: 16,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              style={{
                display: "flex",
                flexDirection: isUser ? "row-reverse" : "row",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              {/* Avatar on Left / Right */}
              {!isUser ? (
                <div style={{ flexShrink: 0 }}>
                  <Mascot mood={m.streaming ? "thinking" : "happy"} size={48} />
                </div>
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                  {userAvatar.render(44)}
                </div>
              )}

              <div style={{ maxWidth: "78%" }}>
                {/* Source Badge */}
                {!isUser && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: "var(--radius-full)",
                        background: m.source === "offline" ? "#FEF3C7" : "#EAF2FE",
                        color: m.source === "offline" ? "#B45309" : "var(--color-primary)",
                      }}
                    >
                      {m.source === "offline" ? "Offline Fallback" : "Pari Tutor"}
                    </span>

                    {/* Speech "Read it to me" Button */}
                    {m.content && !m.streaming && (
                      <button
                        onClick={() => handleSpeech(m.content, m.id)}
                        style={{
                          background: speakingId === m.id ? "var(--color-primary)" : "#F1F5F9",
                          color: speakingId === m.id ? "#FFF" : "var(--text-main)",
                          border: "none",
                          borderRadius: "var(--radius-full)",
                          padding: "3px 10px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                        title="Listen to Pari read this message aloud"
                      >
                        {speakingId === m.id ? <VolumeX size={13} /> : <Volume2 size={13} />}
                        <span>{speakingId === m.id ? "Stop" : "Read it to me 🔊"}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  style={{
                    background: isUser ? "var(--color-primary)" : "#F8FAFC",
                    color: isUser ? "#FFFFFF" : "var(--text-main)",
                    border: isUser ? "none" : "2px solid #E2E8F0",
                    borderRadius: "var(--radius-md)",
                    padding: "14px 20px",
                    fontSize: 17,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {m.content}
                  {m.streaming && (
                    <span style={{ display: "inline-block", marginLeft: 6, animation: "pulse 1s infinite" }}>
                      ●●●
                    </span>
                  )}
                </div>

                {/* Citations as friendly "From: lesson name" tags */}
                {!isUser && m.citations && m.citations.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--text-muted)" }}>
                      From lessons:
                    </span>
                    {m.citations.map((c) => (
                      <span
                        key={c.id}
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          background: "#FFF4E5",
                          border: "1px solid #FFE0B2",
                          color: "#B45309",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        📖 {c.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 3 Lightbulb Hint Ladder Buttons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "#FFF8E1",
          border: "2px solid #FFE082",
          borderRadius: "var(--radius-md)",
          padding: "10px 16px",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 800, color: "#92400E", display: "flex", alignItems: "center", gap: 6 }}>
          <Lightbulb size={18} color="#F59E0B" />
          Need a hint?
        </span>

        {[
          { level: 1, label: "💡 Nudge" },
          { level: 2, label: "💡 Clue" },
          { level: 3, label: "💡 Worked Step" },
        ].map((h) => (
          <button
            key={h.level}
            onClick={() => {
              playNudge();
              handleSend(null, h.level);
            }}
            disabled={loading}
            style={{
              background: activeHintLevel === h.level ? "#F59E0B" : "#FFFFFF",
              color: activeHintLevel === h.level ? "#FFFFFF" : "#78350F",
              border: "1px solid #FCD34D",
              borderRadius: "var(--radius-full)",
              padding: "5px 12px",
              fontSize: 13,
              fontWeight: 800,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {h.label}
          </button>
        ))}
      </div>

      {/* Quick Question Chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => {
              playClick();
              if (chip.subject) setSubject(chip.subject);
              handleSend(chip.prompt);
            }}
            disabled={loading}
            style={{
              background: "#F1F5F9",
              border: "1px solid #CBD5E1",
              borderRadius: "var(--radius-full)",
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-main)",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Big Touch-Friendly Input Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{ display: "flex", gap: 12, alignItems: "center" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask Pari anything about ${subject}...`}
          disabled={loading}
          style={{
            flex: 1,
            padding: "16px 22px",
            fontSize: 17,
            borderRadius: "var(--radius-lg)",
            border: "3px solid #CBD5E1",
            outline: "none",
            color: "var(--text-main)",
            background: "#FFFFFF",
            boxShadow: "var(--shadow-sm)",
          }}
        />

        <PrimaryButton
          size="lg"
          type="submit"
          disabled={loading || !input.trim()}
          icon={Send}
          style={{ padding: "16px 26px" }}
        >
          {loading ? "Thinking..." : "Send"}
        </PrimaryButton>
      </form>
    </div>
  );
}
