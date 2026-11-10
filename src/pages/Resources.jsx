import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText, Download, Upload, Trash2, CheckCircle2,
  XCircle, Sparkles, Search, Filter, ShieldAlert,
  ShieldCheck, FileCode, AlertCircle, RefreshCw, Plus
} from "lucide-react";
import {
  getResources,
  uploadResource,
  updateResource,
  deleteResource,
  reindexResource,
  getAdminKey,
  getResourceDownloadUrl
} from "../api/client";
import { PageHeader, Card, PrimaryButton } from "../components/UI";

const FALLBACK_RESOURCES = [
  {
    id: "offline_py_basics",
    title: "Python 3 Core Syntax Cheat Sheet",
    description: "Comprehensive quick-reference covering variables, data types, slicing, and operators.",
    subject: "Python",
    topic: "Basics",
    tags: ["syntax", "cheatsheet", "beginner"],
    file_type: "pdf",
    original_filename: "Python_Core_CheatSheet.pdf",
    file_size: 245760,
    uploader: "Institute Faculty",
    approved: true,
    indexed_chunks_count: 8,
    created_at: new Date().toISOString(),
  },
  {
    id: "offline_py_data_structures",
    title: "Data Structures & Big-O Reference",
    description: "Detailed complexity breakdowns and usage patterns for lists, sets, and dictionaries.",
    subject: "Python",
    topic: "Data Structures",
    tags: ["algorithms", "lists", "dictionaries"],
    file_type: "md",
    original_filename: "Data_Structures_Guide.md",
    file_size: 51200,
    uploader: "Institute Faculty",
    approved: true,
    indexed_chunks_count: 5,
    created_at: new Date().toISOString(),
  },
];

export default function Resources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadSubject, setUploadSubject] = useState("Python");
  const [uploadTopic, setUploadTopic] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const adminKey = getAdminKey();
  const isAdmin = !!adminKey.trim();

  useEffect(() => {
    loadResources();
  }, [isAdmin, approvalFilter]);

  async function loadResources() {
    setLoading(true);
    try {
      const filterApproved = approvalFilter === "all" ? null : approvalFilter === "approved";
      const data = await getResources({ approved: filterApproved });
      setResources(data);
      setIsOfflineMode(false);
    } catch (err) {
      console.warn("Backend offline, using fallback resources:", err);
      setIsOfflineMode(true);
      setResources(FALLBACK_RESOURCES);
    } finally {
      setLoading(false);
    }
  }

  function notify(msg) {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(null), 4000);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!uploadFile || !uploadTitle.trim()) {
      setUploadError("Please provide a file and a title.");
      return;
    }

    if (uploadFile.size > 10 * 1024 * 1024) {
      setUploadError("File exceeds 10 MB limit.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("title", uploadTitle.trim());
    formData.append("subject", uploadSubject.trim());
    formData.append("topic", uploadTopic.trim() || "General");
    formData.append("description", uploadDescription.trim());
    formData.append("tags", uploadTags.trim());

    try {
      await uploadResource(formData);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle("");
      setUploadTopic("");
      setUploadDescription("");
      setUploadTags("");
      notify("Document uploaded successfully!");
      loadResources();
    } catch (err) {
      setUploadError(err.message || "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  }

  async function handleToggleApprove(resource) {
    try {
      const nextApproved = !resource.approved;
      await updateResource(resource.id, { approved: nextApproved });
      notify(
        nextApproved
          ? `Resource approved and indexed into AI Tutor!`
          : `Resource unapproved and removed from index.`
      );
      loadResources();
    } catch (err) {
      notify(`Error updating approval: ${err.message}`);
    }
  }

  async function handleDelete(resource) {
    if (!window.confirm(`Are you sure you want to delete "${resource.title}"? This will remove it from disk and unindex it from the AI Tutor.`)) {
      return;
    }
    try {
      await deleteResource(resource.id);
      notify(`Deleted "${resource.title}".`);
      loadResources();
    } catch (err) {
      notify(`Error deleting resource: ${err.message}`);
    }
  }

  async function handleReindex(resource) {
    try {
      const res = await reindexResource(resource.id);
      notify(`Re-indexed ${res.indexed_chunks_count} chunks for "${resource.title}".`);
      loadResources();
    } catch (err) {
      notify(`Error reindexing: ${err.message}`);
    }
  }

  // Filter list
  const filteredResources = resources.filter(res => {
    const matchesSearch =
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.description && res.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSubject =
      selectedSubject === "all" ||
      res.subject.toLowerCase() === selectedSubject.toLowerCase();

    return matchesSearch && matchesSubject;
  });

  const subjects = Array.from(new Set(resources.map(r => r.subject)));

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <PageHeader
          eyebrow="CURATED INSTITUTE LIBRARY"
          title="Learning Resources"
          description="Access approved textbooks, lab guides, and reference manuals indexed for the AI Tutor."
        />

        <div className="flex items-center gap-3">
          {isAdmin ? (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" /> Faculty Admin
              </div>
              <PrimaryButton onClick={() => setShowUploadModal(true)}>
                <Plus className="w-4 h-4 inline mr-1" /> Upload Resource
              </PrimaryButton>
            </>
          ) : (
            <Link
              to="/settings"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition"
            >
              <ShieldAlert className="w-4 h-4" /> Admin Login
            </Link>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-indigo-900/60 border border-indigo-500/40 rounded-xl text-indigo-200 text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {isOfflineMode && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs px-4 py-2 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Local backend offline. Displaying cached institute resource materials.</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, topic, or concept..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">All Subjects</option>
          {subjects.map(subj => (
            <option key={subj} value={subj}>{subj}</option>
          ))}
        </select>

        {isAdmin && (
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved & Indexed</option>
            <option value="pending">Pending Review</option>
          </select>
        )}
      </div>

      {/* Resource Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
          Loading curriculum documents...
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl p-8">
          <FileText className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <p className="font-semibold text-slate-400">No matching educational resources found.</p>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin ? "Click 'Upload Resource' above to add course documents." : "Check back later or adjust your filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((res) => {
            const isPdf = res.file_type === "pdf";
            const isMd = res.file_type === "md";
            const sizeKb = (res.file_size / 1024).toFixed(0);

            return (
              <div
                key={res.id}
                className={`bg-slate-900 border rounded-xl p-5 flex flex-col justify-between transition hover:border-slate-700 ${
                  res.approved ? "border-slate-800" : "border-amber-500/30 bg-amber-950/10"
                }`}
              >
                <div>
                  {/* File Type Icon & Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${
                        isPdf ? "bg-rose-500/10 text-rose-400" : isMd ? "bg-cyan-500/10 text-cyan-400" : "bg-slate-800 text-slate-400"
                      }`}>
                        {isMd ? <FileCode className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {res.file_type}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {res.approved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          Indexed by AI Tutor
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          Pending Approval
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Topic */}
                  <h3 className="text-base font-bold text-white mb-1 leading-snug">
                    {res.title}
                  </h3>
                  <div className="text-xs text-indigo-400 font-medium mb-2">
                    {res.subject} &bull; {res.topic}
                  </div>

                  {/* Description */}
                  {res.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                      {res.description}
                    </p>
                  )}

                  {/* Tags */}
                  {Array.isArray(res.tags) && res.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {res.tags.map(tag => (
                        <span key={tag} className="text-[10px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer & Actions */}
                <div className="pt-3 border-t border-slate-800/80 mt-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3">
                    <span>{sizeKb} KB</span>
                    <span>By {res.uploader}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={getResourceDownloadUrl(res.id)}
                      download={res.original_filename}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold text-center transition flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>

                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleToggleApprove(res)}
                          title={res.approved ? "Unapprove & remove from AI index" : "Approve & index into AI Tutor"}
                          className={`p-1.5 rounded-lg border text-xs transition ${
                            res.approved
                              ? "bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border-slate-700 hover:border-rose-700"
                              : "bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border-emerald-700/60"
                          }`}
                        >
                          {res.approved ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>

                        <button
                          onClick={() => handleReindex(res)}
                          title="Rebuild BM25 index for this document"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs transition"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(res)}
                          title="Permanently delete file and index"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 text-xs transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal (Admin only) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-400" /> Upload Course Resource
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  File (.pdf, .md, .txt up to 10 MB) *
                </label>
                <input
                  type="file"
                  accept=".pdf,.md,.txt"
                  onChange={(e) => {
                    const f = e.target.files[0];
                    setUploadFile(f);
                    if (f && !uploadTitle) {
                      setUploadTitle(f.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "));
                    }
                  }}
                  className="w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Python OOP Guide & Lecture Notes"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                  <input
                    type="text"
                    value={uploadSubject}
                    onChange={(e) => setUploadSubject(e.target.value)}
                    placeholder="Python"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Topic</label>
                  <input
                    type="text"
                    value={uploadTopic}
                    onChange={(e) => setUploadTopic(e.target.value)}
                    placeholder="OOP, Functions, etc."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Brief summary of document content..."
                  rows="2"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  placeholder="lecture, cheatsheet, exam-prep"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <PrimaryButton type="submit" disabled={uploading}>
                  {uploading ? "Indexing Document..." : "Upload & Index"}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
