import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles, HelpCircle, RotateCcw, BookOpen, AlertCircle } from "lucide-react";
import { PageHeader, Card, PrimaryButton } from "../components/UI";
import { streamTutorChat, getSubjects } from "../api/client";

export default function Tutor() {
  const [sessionId, setSessionId] = useState(() => `session_${Date.now()}`);
  const [grade, setGrade] = useState(() => localStorage.getItem("parivestra_grade") || "Class 6");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        `Hey there, explorer! ✨ I’m your Parivestra AI buddy for ${grade}. Ask me anything. I can explain with simple stories, everyday examples, fun facts and tiny challenges!`,
      citations: [],
      hintLevel: 0,
    },
  ]);
  const [input, setInput] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [topic, setTopic] = useState("");
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeHintLevel, setActiveHintLevel] = useState(0);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    async function loadSubs() {
      try {
        const data = await getSubjects();
        if (data && data.subjects) {
          setAvailableSubjects(data.subjects);
        }
      } catch (e) {
        console.warn("Could not load subjects from API:", e);
      }
    }
    loadSubs();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const activeSubjectObj = availableSubjects.find(s => s.name === subject) || {
    topics: ["Introduction", "Variables", "Data Types", "Lists", "Functions", "Control Flow"],
  };

  const startNewChat = () => {
    setSessionId(`session_${Date.now()}`);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Starting a fresh chat session on ${subject}. How can I assist you today?`,
        citations: [],
        hintLevel: 0,
      },
    ]);
    setActiveHintLevel(0);
    setError("");
  };

  const handleSend = async (forcedHintLevel = null) => {
    const textToSend = input.trim();
    if (!textToSend && forcedHintLevel === null) return;

    setError("");
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

    // Placeholder for streaming assistant reply
    newMessages.push({
      id: assistantMsgId,
      role: "assistant",
      content: "",
      citations: [],
      hintLevel: effectiveHintLevel,
      streaming: true,
    });

    setMessages(newMessages);
    setLoading(true);

    const lastUserPrompt = textToSend || messages.filter(m => m.role === "user").slice(-1)[0]?.content || "Explain this concept";

    await streamTutorChat({
      sessionId,
      message: `[Student level: ${grade}. Explain in age-appropriate language, use a relatable real-life example, a fun fact where useful, and finish with one quick check-for-understanding question.]\n${lastUserPrompt}`,
      subject,
      topic: topic || undefined,
      hintLevel: effectiveHintLevel,
      onToken: (token) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: msg.content + token }
              : msg
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
                  streaming: false,
                }
              : msg
          )
        );
        setLoading(false);
      },
      onError: (err) => {
        setError(`Tutor communication error: ${err.message}`);
        setLoading(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content:
                    msg.content ||
                    "Could not connect to the local AI backend. Please verify that the local LLM server or Ollama is running.",
                  streaming: false,
                }
              : msg
          )
        );
      },
    });
  };

  const requestNextHint = (currentLevel) => {
    const nextLevel = Math.min(3, currentLevel + 1);
    handleSend(nextLevel);
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <PageHeader
        eyebrow="PARIVESTRA AI TUTOR"
        title="Your AI learning buddy"
        description="No boring lectures here. Explore ideas through stories, examples, fun facts and step-by-step hints."
      />

      {/* Control Bar: Subject/Topic Selection + New Chat */}
      <Card>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700 }}>My class:</label>
              <select value={grade} onChange={(e) => { setGrade(e.target.value); localStorage.setItem("parivestra_grade", e.target.value); }} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", fontSize: 13 }}>
                {Array.from({ length: 10 }, (_, i) => <option key={i}>Class {i + 1}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <BookOpen size={16} color="#d94d25" />
              <label style={{ fontSize: 13, fontWeight: 700 }}>Subject:</label>
              <select
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setTopic("");
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <option value="Mathematics">Mathematics</option>\n                <option value="Science">Science</option>\n                <option value="English">English</option>\n                <option value="Social Studies">Social Studies</option>\n                <option value="Python">Python</option>
                <option value="Artificial Intelligence">Artificial Intelligence</option>
                <option value="Machine Learning">Machine Learning</option>
                <option value="Computer Networks">Computer Networks</option>
                <option value="Java">Java</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 700 }}>Topic:</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  fontSize: 13,
                }}
              >
                <option value="">All Topics</option>
                {activeSubjectObj.topics?.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={startNewChat}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "7px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RotateCcw size={14} /> New Conversation
          </button>
        </div>
      </Card>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #f87171",
            color: "#b91c1c",
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Chat Messages Container */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #edf0f3",
          borderRadius: 14,
          padding: 24,
          minHeight: 420,
          maxHeight: 560,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 18,
          marginBottom: 18,
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
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#14263b",
                    color: "#f16a3c",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Bot size={20} />
                </div>
              )}

              <div style={{ maxWidth: "80%" }}>
                <div
                  style={{
                    background: isUser ? "#e95b30" : "#f8fafc",
                    color: isUser ? "#fff" : "#1e293b",
                    border: isUser ? "none" : "1px solid #e2e8f0",
                    borderRadius: 14,
                    padding: "12px 18px",
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {m.content}
                  {m.streaming && (
                    <span style={{ display: "inline-block", marginLeft: 4, animation: "pulse 1s infinite" }}>
                      ●
                    </span>
                  )}
                </div>

                {/* Hint Ladder Badge & Next Hint Button */}
                {!isUser && m.hintLevel > 0 && (
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11,
                        background: "#fef3c7",
                        color: "#92400e",
                        padding: "2px 8px",
                        borderRadius: 6,
                        fontWeight: 700,
                      }}
                    >
                      Hint Level {m.hintLevel} of 3
                    </span>
                    {m.hintLevel < 3 && !loading && (
                      <button
                        onClick={() => requestNextHint(m.hintLevel)}
                        style={{
                          fontSize: 11,
                          color: "#d94d25",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 700,
                          textDecoration: "underline",
                        }}
                      >
                        Show next hint →
                      </button>
                    )}
                  </div>
                )}

                {/* Source Citations */}
                {!isUser && m.citations && m.citations.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px 12px",
                      background: "#f1f5f9",
                      borderRadius: 8,
                      fontSize: 12,
                      borderLeft: "3px solid #e95b30",
                    }}
                  >
                    <strong style={{ display: "block", color: "#475569", marginBottom: 4 }}>
                      Verified Knowledge Sources:
                    </strong>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {m.citations.map((c) => (
                        <span
                          key={c.id}
                          style={{
                            background: "#fff",
                            border: "1px solid #cbd5e1",
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            color: "#334155",
                          }}
                        >
                          [{c.id}] {c.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div
        style={{
          background: "#fff",
          border: "1px solid #edf0f3",
          borderRadius: 14,
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(0);
              }
            }}
            placeholder={`Ask a question about ${subject} (e.g. "Explain lists in Python", "How does range work?")...`}
            rows={2}
            style={{
              flex: 1,
              resize: "none",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              padding: "10px 14px",
              fontFamily: "inherit",
              fontSize: 14,
              outline: "none",
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <PrimaryButton
              onClick={() => handleSend(0)}
              disabled={loading || !input.trim()}
              style={{
                height: "100%",
                padding: "0 18px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Send size={15} />
              Ask
            </PrimaryButton>
          </div>
        </div>

        {/* Quick Actions: Ask for a Hint */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleSend(1)}
              disabled={loading}
              style={{
                fontSize: 12,
                color: "#e95b30",
                background: "#fff5ef",
                border: "1px solid #fed7aa",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontWeight: 600,
              }}
            >
              <HelpCircle size={13} />
              Give me a hint (Level 1)
            </button>
            <button
              onClick={() => handleSend(2)}
              disabled={loading}
              style={{
                fontSize: 12,
                color: "#6b7280",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Sparkles size={13} />
              Bigger clue (Level 2)
            </button>
          </div>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            Press Enter to send, Shift + Enter for new line
          </span>
        </div>
      </div>
    </div>
  );
}
