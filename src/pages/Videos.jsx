import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getVideos, uploadVideo } from "../api/client";
import {
  PageHeader,
  Card,
  PrimaryButton,
  Badge,
  Mascot,
  Toast,
  EmptyState,
  Modal,
} from "../components/UI";
import StoryIllustration from "../components/StoryIllustrations";
import {
  Play,
  Film,
  Sparkles,
  BookOpen,
  Upload,
  PlusCircle,
  Video as VideoIcon,
  Clock,
  Layers,
} from "lucide-react";

export default function Videos() {
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stories"); // "stories" | "videos"
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedGrade, setSelectedGrade] = useState("All");

  // Video player modal state
  const [playingVideo, setPlayingVideo] = useState(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSubject, setUploadSubject] = useState("Maths");
  const [uploadGrade, setUploadGrade] = useState("Class 3");
  const [uploadTopic, setUploadTopic] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const loadMedia = async () => {
    setLoading(true);
    try {
      const data = await getVideos(
        selectedGrade === "All" ? null : selectedGrade,
        selectedSubject === "All" ? null : selectedSubject
      );
      setVideos(data.videos || []);
      setStories(data.stories || []);
    } catch (err) {
      console.error("Failed to load videos/stories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [selectedSubject, selectedGrade]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle) {
      alert("Please provide a file and a title.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadTitle);
      formData.append("subject", uploadSubject);
      formData.append("grade", uploadGrade);
      formData.append("topic", uploadTopic || uploadTitle);
      formData.append("description", uploadDesc);

      const savedAdminKey = adminKey || localStorage.getItem("parivestra_admin_key") || "";
      await uploadVideo(formData, savedAdminKey);

      setToastMsg("Video uploaded successfully for teacher review!");
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle("");
      loadMedia();
    } catch (err) {
      alert("Upload failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
    }
  };

  const filteredStories = stories.filter((s) => {
    if (selectedSubject !== "All" && s.subject?.toLowerCase() !== selectedSubject.toLowerCase()) return false;
    if (selectedGrade !== "All" && s.grade?.toLowerCase() !== selectedGrade.toLowerCase()) return false;
    return true;
  });

  const filteredVideos = videos.filter((v) => {
    if (selectedSubject !== "All" && v.subject?.toLowerCase() !== selectedSubject.toLowerCase()) return false;
    if (selectedGrade !== "All" && v.grade?.toLowerCase() !== selectedGrade.toLowerCase()) return false;
    return true;
  });

  const getIllustrationForTopic = (topic = "") => {
    const t = topic.toLowerCase();
    if (t.includes("water") || t.includes("rain")) return "water";
    if (t.includes("fraction") || t.includes("pizza")) return "pizza";
    if (t.includes("noun") || t.includes("word") || t.includes("book")) return "book";
    if (t.includes("number") || t.includes("math")) return "numbers";
    if (t.includes("plant") || t.includes("nature")) return "plant";
    return "sun";
  };

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", paddingBottom: 60 }}>
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg("")} />}

      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <PageHeader
          title="AI Stories & Video Adventures"
          description="Watch animated concept explainers and fun teacher video lessons!"
        />
        <button
          onClick={() => setShowUploadModal(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "var(--surface)",
            color: "var(--text)",
            border: "1.5px solid var(--border)",
            padding: "8px 16px",
            borderRadius: 14,
            fontSize: "0.9rem",
            fontWeight: 700,
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          <Upload size={16} /> Upload Video (Grown-ups)
        </button>
      </div>

      {/* Mascot Greeting */}
      <div
        style={{
          background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
          border: "2px solid #BFDBFE",
          borderRadius: "var(--radius-xl)",
          padding: "20px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          gap: 20,
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "1.3rem",
              color: "#1E40AF",
              margin: "0 0 6px 0",
            }}
          >
            Welcome to the Learning Cinema! 🍿
          </h3>
          <p style={{ color: "#3B82F6", margin: 0, fontSize: "0.98rem" }}>
            Pick an animated story below or listen to a mini science adventure with Pari!
          </p>
        </div>
        <Mascot mood="happy" size={75} />
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {/* Main Tab Toggle */}
        <div style={{ display: "flex", background: "white", padding: 4, borderRadius: 16, border: "1.5px solid var(--border)" }}>
          <button
            onClick={() => setActiveTab("stories")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 18px",
              borderRadius: 12,
              border: "none",
              fontSize: "0.92rem",
              fontWeight: 800,
              cursor: "pointer",
              background: activeTab === "stories" ? "var(--kid-grape)" : "transparent",
              color: activeTab === "stories" ? "white" : "var(--text-muted)",
              transition: "all 0.2s",
            }}
          >
            <Sparkles size={16} /> Animated Stories ({stories.length})
          </button>
          <button
            onClick={() => setActiveTab("videos")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 18px",
              borderRadius: 12,
              border: "none",
              fontSize: "0.92rem",
              fontWeight: 800,
              cursor: "pointer",
              background: activeTab === "videos" ? "var(--kid-grape)" : "transparent",
              color: activeTab === "videos" ? "white" : "var(--text-muted)",
              transition: "all 0.2s",
            }}
          >
            <VideoIcon size={16} /> Video Lessons ({videos.length})
          </button>
        </div>

        {/* Grade & Subject Filters */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* Grade filter */}
          <div style={{ display: "flex", background: "white", padding: 3, borderRadius: 12, border: "1px solid var(--border)" }}>
            {["All", "Class 3", "Class 4"].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 9,
                  border: "none",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: selectedGrade === g ? "var(--surface)" : "transparent",
                  color: selectedGrade === g ? "var(--text)" : "var(--text-muted)",
                }}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Subject filter */}
          <div style={{ display: "flex", background: "white", padding: 3, borderRadius: 12, border: "1px solid var(--border)" }}>
            {["All", "Maths", "English", "EVS"].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSubject(s)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 9,
                  border: "none",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: selectedSubject === s ? "var(--surface)" : "transparent",
                  color: selectedSubject === s ? "var(--text)" : "var(--text-muted)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT LIST */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <Mascot mood="thinking" size={80} message="Finding the best stories for you..." />
        </div>
      ) : activeTab === "stories" ? (
        /* ANIMATED STORIES GRID */
        filteredStories.length === 0 ? (
          <EmptyState
            title="No stories found"
            description="Try switching the grade or subject filters above!"
            mascotMood="sleepy"
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
              gap: 22,
            }}
          >
            {filteredStories.map((story) => (
              <div
                key={story.id}
                onClick={() => navigate(`/videos/story/${story.id}`)}
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
                {/* Visual Thumbnail */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #F0FDF4 0%, #E0F2FE 100%)",
                    height: 170,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <StoryIllustration
                    name={getIllustrationForTopic(story.topic)}
                    size={130}
                    animated={false}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 12,
                      right: 12,
                      background: "rgba(0,0,0,0.65)",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 10,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Layers size={13} /> {story.scene_count} scenes
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    <Badge variant="blue">{story.subject}</Badge>
                    <Badge variant="mint">{story.grade}</Badge>
                  </div>

                  <h3
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "1.2rem",
                      color: "var(--text)",
                      margin: "0 0 6px 0",
                    }}
                  >
                    {story.title}
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: "0 0 16px 0", flex: 1 }}>
                    Explore {story.topic} through an interactive animated story with narration!
                  </p>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        color: "var(--kid-grape)",
                        fontWeight: 800,
                        fontSize: "0.9rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Play size={16} fill="var(--kid-grape)" /> Watch & Listen
                    </span>
                    <button
                      style={{
                        background: "var(--kid-grape)",
                        color: "white",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: 12,
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Play
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* LOCAL VIDEO LESSONS GRID */
        filteredVideos.length === 0 ? (
          <EmptyState
            title="No video lessons uploaded yet"
            description="Teachers can upload safe MP4 classroom lessons using the Upload button above!"
            mascotMood="thinking"
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
              gap: 22,
            }}
          >
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                onClick={() => setPlayingVideo(video)}
                style={{
                  background: "white",
                  borderRadius: "var(--radius-lg)",
                  border: "2px solid var(--border)",
                  boxShadow: "var(--shadow-sm)",
                  overflow: "hidden",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    background: "#0F172A",
                    height: 160,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Play size={24} color="white" fill="white" />
                  </div>
                  {video.duration_sec > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 8,
                        right: 8,
                        background: "rgba(0,0,0,0.7)",
                        color: "white",
                        padding: "2px 6px",
                        borderRadius: 6,
                        fontSize: "0.75rem",
                      }}
                    >
                      {Math.floor(video.duration_sec / 60)}:{(video.duration_sec % 60).toString().padStart(2, "0")}
                    </div>
                  )}
                </div>

                <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <Badge variant="blue">{video.subject}</Badge>
                    <Badge variant="mint">{video.grade}</Badge>
                  </div>
                  <h3 style={{ fontSize: "1.1rem", fontFamily: "var(--font-heading)", margin: "0 0 6px 0" }}>
                    {video.title}
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0, flex: 1 }}>
                    {video.description || "Classroom video lesson."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* VIDEO PLAYER MODAL */}
      {playingVideo && (
        <Modal isOpen={true} onClose={() => setPlayingVideo(null)} title={playingVideo.title}>
          <div style={{ padding: 10 }}>
            <video
              controls
              autoPlay
              style={{ width: "100%", maxHeight: 420, borderRadius: 12, background: "black" }}
              src={`/api/videos/${playingVideo.id}/stream`}
            >
              Your browser does not support HTML5 video streaming.
            </video>
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <Badge variant="blue">{playingVideo.subject}</Badge>
                <Badge variant="mint">{playingVideo.grade}</Badge>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                {playingVideo.description}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* VIDEO UPLOAD MODAL */}
      {showUploadModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowUploadModal(false)}
          title="Upload Safe Video Lesson (Grown-ups)"
        >
          <form onSubmit={handleUploadSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: 0 }}>
              Upload local MP4 or WebM video file (Max 150MB). Videos go to draft until approved in Grown-ups Portal.
            </p>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 4 }}>
                Video File (.mp4, .webm) *
              </label>
              <input
                type="file"
                accept="video/mp4,video/webm"
                required
                onChange={(e) => setUploadFile(e.target.files[0])}
                style={{ width: "100%", padding: 8, border: "1px solid var(--border)", borderRadius: 8 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 4 }}>
                Lesson Title *
              </label>
              <input
                type="text"
                required
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g. Fun with Multiplication Arrays"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 10 }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 4 }}>
                  Subject
                </label>
                <select
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  style={{ width: "100%", padding: 10, border: "1px solid var(--border)", borderRadius: 10 }}
                >
                  <option value="Maths">Maths</option>
                  <option value="English">English</option>
                  <option value="EVS">EVS</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 4 }}>
                  Grade
                </label>
                <select
                  value={uploadGrade}
                  onChange={(e) => setUploadGrade(e.target.value)}
                  style={{ width: "100%", padding: 10, border: "1px solid var(--border)", borderRadius: 10 }}
                >
                  <option value="Class 3">Class 3</option>
                  <option value="Class 4">Class 4</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 4 }}>
                Admin Secret Key (from .env)
              </label>
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Required for uploading video lessons"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 10 }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  padding: "10px 18px",
                  borderRadius: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <PrimaryButton type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload Video 🚀"}
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

