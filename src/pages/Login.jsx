import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGrade } from "../context/GradeContext";
import GradeGrid from "../components/GradeGrid";
import Mascot from "../components/Mascot";
import {
  Sparkles,
  Lock,
  User,
  GraduationCap,
  KeyRound,
  ArrowRight,
  Delete,
  ShieldCheck,
  HelpCircle,
  Eye,
  EyeOff,
  Users,
} from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginAsGuest, joinWithClassCode } = useAuth();
  const { activeGrade, setGrade, band } = useGrade();

  const [mode, setMode] = useState("student"); // 'student' | 'teacher' | 'guest' | 'join'
  const [selectedGrade, setSelectedGrade] = useState(activeGrade || "Class 3");
  
  // Student login fields
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Adult / Teacher fields
  const [adultIdentifier, setAdultIdentifier] = useState("");
  const [adultPassword, setAdultPassword] = useState("");

  // Join code fields
  const [joinCode, setJoinCode] = useState("");
  const [joinNickname, setJoinNickname] = useState("");

  // UI status
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const fromPath = location.state?.from?.pathname || "/";

  const gradeDigits = parseInt(selectedGrade.replace(/\D/g, "") || "3", 10);
  const isJunior = gradeDigits <= 5;

  const handleGradeSelect = (g) => {
    setSelectedGrade(g);
    setGrade(g);
    setErrorMsg("");
    setPin("");
  };

  const handlePinKey = (digit) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
    }
  };

  const handlePinBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleStudentSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    const u = username.trim();
    if (!u) {
      setErrorMsg("Please enter your nickname or username!");
      return;
    }

    const secret = isJunior ? pin : password;
    if (!secret) {
      setErrorMsg(isJunior ? "Please enter your 4-digit secret PIN!" : "Please enter your password!");
      return;
    }

    setSubmitting(true);
    const res = await login({
      username: u,
      secret: secret,
      grade: selectedGrade,
    });
    setSubmitting(false);

    if (res.success) {
      navigate(fromPath, { replace: true });
    } else {
      setErrorMsg(res.error || "Login failed. Please check your username and secret!");
    }
  };

  const handleAdultSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!adultIdentifier.trim() || !adultPassword) {
      setErrorMsg("Please enter your username/email and password.");
      return;
    }

    setSubmitting(true);
    const res = await login({
      identifier: adultIdentifier.trim(),
      password: adultPassword,
    });
    setSubmitting(false);

    if (res.success) {
      navigate("/grown-ups", { replace: true });
    } else {
      setErrorMsg(res.error || "Invalid teacher/admin credentials.");
    }
  };

  const handleGuestSubmit = async () => {
    setErrorMsg("");
    setSubmitting(true);
    const res = await loginAsGuest(selectedGrade);
    setSubmitting(false);

    if (res.success) {
      navigate(fromPath, { replace: true });
    } else {
      setErrorMsg(res.error || "Could not start guest session.");
    }
  };

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!joinCode.trim()) {
      setErrorMsg("Please enter the class join code from your teacher.");
      return;
    }

    setSubmitting(true);
    const res = await joinWithClassCode(joinCode.trim().toUpperCase(), joinNickname.trim());
    setSubmitting(false);

    if (res.success) {
      navigate(fromPath, { replace: true });
    } else {
      setErrorMsg(res.error || "Could not join class. Check your code.");
    }
  };

  // Quick fill helper for demo ease
  const fillDemoStudent = (demoUser, demoPin, gradeStr) => {
    setSelectedGrade(gradeStr);
    setGrade(gradeStr);
    setUsername(demoUser);
    if (parseInt(gradeStr.replace(/\D/g, "") || "3", 10) <= 5) {
      setPin(demoPin);
    } else {
      setPassword(demoPin);
    }
    setErrorMsg("");
  };

  const fillDemoTeacher = (ident, pw) => {
    setAdultIdentifier(ident);
    setAdultPassword(pw);
    setErrorMsg("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 50%, #FFFBEB 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "var(--font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "linear-gradient(135deg, #EA580C, #F97316)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFF",
            boxShadow: "0 4px 12px rgba(234, 88, 12, 0.3)",
          }}
        >
          <Sparkles size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0F172A", margin: 0 }}>
            Parivestra <span style={{ color: "#EA580C" }}>AI Tutor</span>
          </h1>
          <p style={{ fontSize: 13, color: "#64748B", margin: 0, fontWeight: 600 }}>
            Classes 3 to 10 · Learn AI & Future Skills
          </p>
        </div>
      </div>

      {/* Main Container Card */}
      <div
        style={{
          width: "100%",
          maxWidth: mode === "student" ? 780 : 500,
          background: "#FFFFFF",
          borderRadius: 24,
          boxShadow: "0 10px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.05)",
          border: "1px solid #E2E8F0",
          overflow: "hidden",
          transition: "max-width 0.3s ease",
        }}
      >
        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #E2E8F0",
            background: "#F8FAFC",
            padding: "8px 12px 0 12px",
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={() => { setMode("student"); setErrorMsg(""); }}
            style={{
              padding: "10px 16px",
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              border: "none",
              borderBottom: mode === "student" ? "3px solid #EA580C" : "3px solid transparent",
              background: mode === "student" ? "#FFFFFF" : "transparent",
              color: mode === "student" ? "#EA580C" : "#64748B",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <GraduationCap size={18} />
            Student Login
          </button>

          <button
            type="button"
            onClick={() => { setMode("teacher"); setErrorMsg(""); }}
            style={{
              padding: "10px 16px",
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              border: "none",
              borderBottom: mode === "teacher" ? "3px solid #2563EB" : "3px solid transparent",
              background: mode === "teacher" ? "#FFFFFF" : "transparent",
              color: mode === "teacher" ? "#2563EB" : "#64748B",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ShieldCheck size={18} />
            Teacher / Grown-ups
          </button>

          <button
            type="button"
            onClick={() => { setMode("join"); setErrorMsg(""); }}
            style={{
              padding: "10px 16px",
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              border: "none",
              borderBottom: mode === "join" ? "3px solid #16A34A" : "3px solid transparent",
              background: mode === "join" ? "#FFFFFF" : "transparent",
              color: mode === "join" ? "#16A34A" : "#64748B",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Users size={18} />
            Join Class
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 24 }}>
          {/* Error Banner */}
          {errorMsg && (
            <div
              style={{
                background: "#FEF2F2",
                border: "1px solid #FCA5A5",
                borderRadius: 12,
                padding: "12px 16px",
                color: "#B91C1C",
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div style={{ flex: 1 }}>{errorMsg}</div>
            </div>
          )}

          {/* MODE 1: STUDENT LOGIN */}
          {mode === "student" && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1E293B", margin: 0 }}>
                    Step 1: Pick Your Class
                  </h2>
                  <p style={{ fontSize: 13, color: "#64748B", margin: "2px 0 0 0" }}>
                    Select your grade to personalize your workbook, games, and Pari tutor!
                  </p>
                </div>
                <Mascot mood="happy" size={56} animated />
              </div>

              {/* Grade Grid */}
              <div style={{ marginBottom: 24 }}>
                <GradeGrid
                  selectedGrade={selectedGrade}
                  onSelectGrade={handleGradeSelect}
                />
              </div>

              {/* Step 2: Credentials */}
              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: 16,
                  padding: 20,
                  border: "1px solid #E2E8F0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#EA580C",
                      color: "#FFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    2
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0F172A", margin: 0 }}>
                    Enter Your Student Secret
                  </h3>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 12,
                      fontWeight: 700,
                      color: isJunior ? "#EA580C" : "#4F46E5",
                      background: isJunior ? "#FFEDD5" : "#EEF2FF",
                      padding: "4px 10px",
                      borderRadius: 12,
                    }}
                  >
                    {isJunior ? "4-Digit Secret PIN" : "Password Protected"}
                  </span>
                </div>

                <form onSubmit={handleStudentSubmit}>
                  {/* Username / Nickname field */}
                  <div style={{ marginBottom: 16 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#334155",
                        marginBottom: 6,
                      }}
                    >
                      Your Student Username or Nickname
                    </label>
                    <div style={{ position: "relative" }}>
                      <User
                        size={18}
                        style={{
                          position: "absolute",
                          left: 14,
                          top: 14,
                          color: "#94A3B8",
                        }}
                      />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. kid3, aarav_4, priya"
                        style={{
                          width: "100%",
                          padding: "12px 14px 12px 42px",
                          borderRadius: 12,
                          border: "1.5px solid #CBD5E1",
                          fontSize: 15,
                          fontWeight: 600,
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  {/* Secret Input: PIN Pad for Junior, Password for Middle/Senior */}
                  {isJunior ? (
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#334155",
                          marginBottom: 8,
                        }}
                      >
                        4-Digit Secret PIN:
                      </label>

                      {/* Visual PIN Dots */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 16,
                          marginBottom: 16,
                        }}
                      >
                        {[0, 1, 2, 3].map((idx) => (
                          <div
                            key={idx}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              border: "2px solid #EA580C",
                              background: pin.length > idx ? "#EA580C" : "transparent",
                              boxShadow:
                                pin.length > idx
                                  ? "0 0 10px rgba(234, 88, 12, 0.4)"
                                  : "none",
                              transition: "all 0.15s ease",
                            }}
                          />
                        ))}
                      </div>

                      {/* Numeric Keypad */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: 10,
                          maxWidth: 280,
                          margin: "0 auto 16px auto",
                        }}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handlePinKey(num.toString())}
                            style={{
                              padding: "14px 0",
                              fontSize: 22,
                              fontWeight: 800,
                              background: "#FFFFFF",
                              border: "1.5px solid #E2E8F0",
                              borderRadius: 12,
                              cursor: "pointer",
                              color: "#1E293B",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                            }}
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={handlePinBackspace}
                          style={{
                            padding: "14px 0",
                            fontSize: 16,
                            fontWeight: 700,
                            background: "#F1F5F9",
                            border: "1.5px solid #E2E8F0",
                            borderRadius: 12,
                            cursor: "pointer",
                            color: "#64748B",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Delete size={20} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePinKey("0")}
                          style={{
                            padding: "14px 0",
                            fontSize: 22,
                            fontWeight: 800,
                            background: "#FFFFFF",
                            border: "1.5px solid #E2E8F0",
                            borderRadius: 12,
                            cursor: "pointer",
                            color: "#1E293B",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                          }}
                        >
                          0
                        </button>
                        <button
                          type="button"
                          onClick={() => setPin("")}
                          style={{
                            padding: "14px 0",
                            fontSize: 14,
                            fontWeight: 800,
                            background: "#FEE2E2",
                            border: "1.5px solid #FECACA",
                            borderRadius: 12,
                            cursor: "pointer",
                            color: "#DC2626",
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: 20 }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#334155",
                          marginBottom: 6,
                        }}
                      >
                        Student Password
                      </label>
                      <div style={{ position: "relative" }}>
                        <Lock
                          size={18}
                          style={{
                            position: "absolute",
                            left: 14,
                            top: 14,
                            color: "#94A3B8",
                          }}
                        />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your student password"
                          style={{
                            width: "100%",
                            padding: "12px 42px 12px 42px",
                            borderRadius: 12,
                            border: "1.5px solid #CBD5E1",
                            fontSize: 15,
                            fontWeight: 600,
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: "absolute",
                            right: 12,
                            top: 12,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#94A3B8",
                          }}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      width: "100%",
                      padding: "14px 20px",
                      borderRadius: 14,
                      background: "linear-gradient(135deg, #EA580C, #F97316)",
                      border: "none",
                      color: "#FFFFFF",
                      fontSize: 16,
                      fontWeight: 800,
                      cursor: submitting ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 14px rgba(234, 88, 12, 0.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      transition: "transform 0.1s ease",
                    }}
                  >
                    {submitting ? "Checking in..." : `Start Learning (${selectedGrade})`}
                    <ArrowRight size={18} />
                  </button>
                </form>

                {/* Demo Quick-Fills */}
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 14,
                    borderTop: "1px dashed #CBD5E1",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>
                    Quick Demo Accounts:
                  </span>
                  <button
                    type="button"
                    onClick={() => fillDemoStudent("kid3", "1234", "Class 3")}
                    style={{
                      fontSize: 11,
                      padding: "4px 8px",
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                      background: "#FFFFFF",
                      cursor: "pointer",
                      fontWeight: 600,
                      color: "#0F172A",
                    }}
                  >
                    Class 3 (kid3 / PIN 1234)
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoStudent("kid4", "1234", "Class 4")}
                    style={{
                      fontSize: 11,
                      padding: "4px 8px",
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                      background: "#FFFFFF",
                      cursor: "pointer",
                      fontWeight: 600,
                      color: "#0F172A",
                    }}
                  >
                    Class 4 (kid4 / PIN 1234)
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoStudent("student6", "learn-ai-2026", "Class 6")}
                    style={{
                      fontSize: 11,
                      padding: "4px 8px",
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                      background: "#FFFFFF",
                      cursor: "pointer",
                      fontWeight: 600,
                      color: "#0F172A",
                    }}
                  >
                    Class 6 (student6 / learn-ai-2026)
                  </button>
                </div>
              </div>

              {/* Guest explorer 1-click alternative */}
              <div
                style={{
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                <button
                  type="button"
                  onClick={handleGuestSubmit}
                  disabled={submitting}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#EA580C",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  ⚡ Or explore instantly as a Guest Explorer (No login needed)
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: TEACHER / GROWN-UPS LOGIN */}
          {mode === "teacher" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: "#EEF2FF",
                    color: "#4F46E5",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  <ShieldCheck size={28} />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1E293B", margin: 0 }}>
                  Teacher & Grown-ups Portal
                </h2>
                <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0 0" }}>
                  Manage classes, review AI content, and view student progress cards.
                </p>
              </div>

              <form onSubmit={handleAdultSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#334155",
                      marginBottom: 6,
                    }}
                  >
                    Teacher Email or Username
                  </label>
                  <div style={{ position: "relative" }}>
                    <User
                      size={18}
                      style={{
                        position: "absolute",
                        left: 14,
                        top: 14,
                        color: "#94A3B8",
                      }}
                    />
                    <input
                      type="text"
                      value={adultIdentifier}
                      onChange={(e) => setAdultIdentifier(e.target.value)}
                      placeholder="e.g. ms_sharma or teacher@school.edu"
                      style={{
                        width: "100%",
                        padding: "12px 14px 12px 42px",
                        borderRadius: 12,
                        border: "1.5px solid #CBD5E1",
                        fontSize: 15,
                        fontWeight: 600,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#334155",
                      marginBottom: 6,
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock
                      size={18}
                      style={{
                        position: "absolute",
                        left: 14,
                        top: 14,
                        color: "#94A3B8",
                      }}
                    />
                    <input
                      type="password"
                      value={adultPassword}
                      onChange={(e) => setAdultPassword(e.target.value)}
                      placeholder="Enter teacher password"
                      style={{
                        width: "100%",
                        padding: "12px 14px 12px 42px",
                        borderRadius: 12,
                        border: "1.5px solid #CBD5E1",
                        fontSize: 15,
                        fontWeight: 600,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    borderRadius: 14,
                    background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: submitting ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {submitting ? "Signing In..." : "Open Grown-ups Portal"}
                  <ArrowRight size={18} />
                </button>
              </form>

              {/* Demo Fill */}
              <div
                style={{
                  marginTop: 18,
                  padding: "12px 14px",
                  background: "#F8FAFC",
                  borderRadius: 12,
                  border: "1px dashed #CBD5E1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0F172A" }}>
                    Demo Teacher Account:
                  </div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>
                    ms_sharma / teach123
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fillDemoTeacher("ms_sharma", "teach123")}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#2563EB",
                    background: "#EFF6FF",
                    border: "1px solid #BFDBFE",
                    borderRadius: 8,
                    padding: "6px 12px",
                    cursor: "pointer",
                  }}
                >
                  Quick Fill
                </button>
              </div>
            </div>
          )}

          {/* MODE 3: JOIN CLASS BY CODE */}
          {mode === "join" && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: "#DCFCE7",
                    color: "#16A34A",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 10,
                  }}
                >
                  <Users size={28} />
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1E293B", margin: 0 }}>
                  Join Your School Class
                </h2>
                <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0 0" }}>
                  Enter the 6-character class code given by your teacher!
                </p>
              </div>

              <form onSubmit={handleJoinSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#334155",
                      marginBottom: 6,
                    }}
                  >
                    Class Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. PARI-4A"
                    maxLength={10}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: 12,
                      border: "2px solid #16A34A",
                      fontSize: 20,
                      fontWeight: 800,
                      textAlign: "center",
                      letterSpacing: 3,
                      color: "#166534",
                      outline: "none",
                      boxSizing: "border-box",
                      background: "#F0FDF4",
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#334155",
                      marginBottom: 6,
                    }}
                  >
                    Your Student Nickname (Optional)
                  </label>
                  <input
                    type="text"
                    value={joinNickname}
                    onChange={(e) => setJoinNickname(e.target.value)}
                    placeholder="e.g. Aarav, Maya"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "1.5px solid #CBD5E1",
                      fontSize: 15,
                      fontWeight: 600,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "14px 20px",
                    borderRadius: 14,
                    background: "linear-gradient(135deg, #16A34A, #15803D)",
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: submitting ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(22, 163, 74, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {submitting ? "Joining Class..." : "Join Class Now"}
                  <ArrowRight size={18} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer Help */}
        <div
          style={{
            background: "#F8FAFC",
            borderTop: "1px solid #E2E8F0",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#64748B",
          }}
        >
          <span>🔒 Safe & Private · Zero PII Collected</span>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            style={{
              background: "none",
              border: "none",
              color: "#64748B",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <HelpCircle size={14} />
            Forgot Secret?
          </button>
        </div>
      </div>

      {/* Forgot Secret Help Popover */}
      {showHelp && (
        <div
          style={{
            marginTop: 16,
            background: "#FFFFFF",
            borderRadius: 12,
            padding: 16,
            maxWidth: 400,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            border: "1px solid #E2E8F0",
            fontSize: 13,
            color: "#334155",
            lineHeight: 1.5,
          }}
        >
          <strong>Forgot your student PIN or password?</strong>
          <p style={{ margin: "6px 0 0 0" }}>
            Don't worry! Ask your teacher or school admin. They can generate a fresh 1-click secret reset or print your student login card from their Grown-ups dashboard.
          </p>
        </div>
      )}
    </div>
  );
}
