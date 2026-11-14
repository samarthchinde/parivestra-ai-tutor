import { useState } from "react";
import { PageHeader, Card, PrimaryButton, Badge, Mascot, Modal } from "../components/UI";
import StoryIllustration from "../components/StoryIllustrations";
import { BookOpen, Search, Sparkles, Volume2, VolumeX, Download, Eye, FileText, Upload } from "lucide-react";
import { getSubjectsForGrade, getBandForGrade, ALL_GRADES } from "../config/bands";

export default function Library() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedGrade, setSelectedGrade] = useState("All");
  const [activeItem, setActiveItem] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const grade = localStorage.getItem("parivestra_grade") || "Class 3";
  const subjects = ["All", ...getSubjectsForGrade(grade)];

  const libraryItems = [
    {
      id: "lib_zero",
      title: "The Hero Named Zero",
      subject: "Maths",
      badgeVariant: "blue",
      type: "Storybook",
      description: "How a tiny round digit gives all other numbers 10 times more power!",
      readText:
        "Once upon a time, Zero felt tiny and left out because people thought he stood for nothing! But then Zero stood next to the number 1, and 1 became 10! He stood next to 9, and 9 became 90! All the numbers cheered: Zero is the hero of place value!",
      illustration: "numbers",
    },
    {
      id: "lib_water",
      title: "Piku's Secret Journey in the Sky",
      subject: "EVS",
      badgeVariant: "mint",
      type: "Storybook",
      description: "Discover why raindrops fall and where rivers go in this illustrated adventure.",
      readText:
        "The sun warms up the ocean waves. Tiny water drops turn into light vapour and drift high up where the cold air tickles them into clouds. When clouds get heavy, raindrops dance down on green leaves and rush back to the sea!",
      illustration: "water",
    },
    {
      id: "lib_grammar",
      title: "The Parts of Speech Circus",
      subject: "English",
      badgeVariant: "coral",
      type: "Cheat Sheet",
      description: "Nouns are the performers, verbs are their tricks, and adjectives are their sparkly costumes!",
      readText:
        "Welcome to the Grammar Circus! Nouns name the acrobats: lion, clown, ringmaster. Verbs are their stunts: leap, juggle, balance. Adjectives describe their costumes: sparkly, golden, colourful. Put them together to make a magnificent sentence!",
      illustration: "book",
    },
    {
      id: "lib_pizza",
      title: "Fraction Fun: The Equal Slice Rule",
      subject: "Maths",
      badgeVariant: "blue",
      type: "Visual Guide",
      description: "Learn how to share fairly with halves, thirds, and quarters.",
      readText:
        "Rule number one of fractions: all parts MUST be equal! When Chef Pari cuts a pizza in half, both slices must be identical in size. 1 out of 2 slices is written as 1/2. Two halves make one whole!",
      illustration: "pizza",
    },
    {
      id: "lib_leaf",
      title: "The Secret Kitchen Inside a Leaf",
      subject: "EVS",
      badgeVariant: "mint",
      type: "Science Card",
      description: "Photosynthesis explained with warmth, water, and sunlight.",
      readText:
        "Did you know every green leaf is a tiny solar kitchen? The green colour comes from chlorophyll. Leaves catch bright sunshine, drink water through roots, breathe in fresh air, and cook sweet energy for the plant while giving us fresh oxygen to breathe!",
      illustration: "plant",
    },
    {
      id: "lib_verbs",
      title: "Action Words on the Playground",
      subject: "English",
      badgeVariant: "coral",
      type: "Flashcard",
      description: "Jump, skip, giggle, slide — verbs make the world move!",
      readText:
        "Whenever you run, skip, laugh, or think, you are using action verbs! Verbs tell us what someone or something is doing right now, did in the past, or will do in the future.",
      illustration: "owl",
    },
  ];

  const handleToggleSpeech = (text) => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.88;
    utterance.pitch = 1.1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const closeModal = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setActiveItem(null);
  };

  const filtered = libraryItems.filter((item) => {
    if (selectedSubject !== "All" && item.subject.toLowerCase() !== selectedSubject.toLowerCase()) {
      return false;
    }
    if (
      searchTerm &&
      !item.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !item.description.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", paddingBottom: 60 }}>
      <PageHeader
        title="Pari's Reading & Discovery Library 📚"
        description={`Bite-sized storybooks, visual guides, and discovery cards across all grades!`}
      />

      {/* Filter & Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
          marginBottom: 28,
        }}
      >
        {/* Search Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "white",
            border: "1.5px solid var(--border)",
            borderRadius: 14,
            padding: "8px 16px",
            flex: "1 1 260px",
          }}
        >
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search storybooks, science cards, flashcards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              width: "100%",
              fontSize: "0.95rem",
              background: "transparent",
            }}
          />
        </div>

        {/* Subject Filter Pills */}
        <div style={{ display: "flex", background: "white", padding: 4, borderRadius: 14, border: "1.5px solid var(--border)", gap: 4, flexWrap: "wrap" }}>
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              style={{
                padding: "6px 14px",
                borderRadius: 10,
                border: "none",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
                background: selectedSubject === sub ? "var(--kid-grape)" : "transparent",
                color: selectedSubject === sub ? "white" : "var(--text-muted)",
                transition: "all 0.18s",
              }}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
          gap: 22,
        }}
      >
        {filtered.map((item) => (
          <div
            key={item.id}
            onClick={() => setActiveItem(item)}
            style={{
              background: "white",
              borderRadius: "var(--radius-lg)",
              border: "2px solid var(--border)",
              boxShadow: "var(--shadow-sm)",
              overflow: "hidden",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              transition: "all 0.22s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "var(--shadow-md)";
              e.currentTarget.style.borderColor = "var(--kid-grape)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            {/* Illustration Banner */}
            <div
              style={{
                background: "linear-gradient(135deg, #FFF9F0 0%, #FEF3C7 100%)",
                height: 150,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <StoryIllustration name={item.illustration} size={110} animated={false} />
            </div>

            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <Badge variant={item.badgeVariant}>{item.subject}</Badge>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: 12,
                    background: "var(--surface)",
                    color: "var(--text-muted)",
                  }}
                >
                  {item.type}
                </span>
              </div>

              <h3
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "1.2rem",
                  color: "var(--text)",
                  margin: "0 0 6px 0",
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.88rem",
                  margin: "0 0 16px 0",
                  lineHeight: 1.45,
                  flex: 1,
                }}
              >
                {item.description}
              </p>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--kid-grape)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Eye size={15} /> Read Now
                </span>
                <button
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    padding: "6px 12px",
                    borderRadius: 10,
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Open 📖
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* READ ALOUD MODAL */}
      {activeItem && (
        <Modal isOpen={true} onClose={closeModal} title={activeItem.title}>
          <div style={{ padding: "10px 6px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <StoryIllustration name={activeItem.illustration} size={140} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Badge variant={activeItem.badgeVariant}>{activeItem.subject}</Badge>
              <button
                onClick={() => handleToggleSpeech(activeItem.readText)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: isSpeaking ? "#FEE2E2" : "#EFF6FF",
                  color: isSpeaking ? "#DC2626" : "var(--kid-maths)",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                {isSpeaking ? "Pause" : "Read to me 🎧"}
              </button>
            </div>

            <div
              style={{
                background: "var(--surface)",
                padding: "20px 24px",
                borderRadius: 14,
                border: "1px solid var(--border)",
                lineHeight: 1.7,
                fontSize: "1.15rem",
                color: "var(--text)",
                fontFamily: "var(--font-body)",
                marginBottom: 20,
              }}
            >
              {activeItem.readText}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <PrimaryButton onClick={closeModal}>Done Reading ✨</PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

