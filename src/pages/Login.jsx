import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGrade } from "../context/GradeContext";
import ClassDropdown from "../components/ClassDropdown";
import { GRADE_DETAILS } from "../components/GradeGrid";
import Mascot from "../components/Mascot";
import { AVATARS } from "../data/avatars";
import { playClick, playSuccess } from "../utils/sound";
import confetti from "canvas-confetti";
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
  UserPlus,
  LogIn,
  HeartHandshake,
  Check,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { checkUsernameAvailableApi } from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    loginAsGuest,
    joinWithClassCode,
    registerStudent,
    registerTeacher,
    registerParent,
  } = useAuth();
  const { activeGrade, setGrade } = useGrade();

  // If already signed in, redirect to Home (or appropriate portal)
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === "parent") {
        navigate("/parent", { replace: true });
      } else if (user.role === "teacher" || user.role === "admin") {
        navigate("/grown-ups", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  // Main Tabs: "signin" | "signup"
  const [authTab, setAuthTab] = useState("signin");
  // Role selector: "student" | "teacher" | "parent" | "join"
  const [roleMode, setRoleMode] = useState("student");

  // Selected Class
  const [selectedGrade, setSelectedGrade] = useState(activeGrade || "Class 3");
  const gradeDigits = parseInt(selectedGrade.replace(/\D/g, "") || "3", 10);
  const isJunior = gradeDigits <= 5;
  const gradeConfig = GRADE_DETAILS.find((g) => g.grade === gradeDigits) || GRADE_DETAILS[0];

  // Mascot emotion
  const [mascotMood, setMascotMood] = useState("happy");

  // Fields: Student Sign-in
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Fields: Adult Sign-in (Teacher / Parent)
  const [adultIdentifier, setAdultIdentifier] = useState("");
  const [adultPassword, setAdultPassword] = useState("");

  // Fields: Join Class
  const [joinCode, setJoinCode] = useState("");
  const [joinNickname, setJoinNickname] = useState("");

  // Fields: Student Sign-up
  const [regNickname, setRegNickname] = useState("");
  const [regSecret, setRegSecret] = useState("");
  const [regConfirmSecret, setRegConfirmSecret] = useState("");
  const [regAvatar, setRegAvatar] = useState("owl");
  const [regClassCode, setRegClassCode] = useState("");
  const [usernameStatus, setUsernameStatus] = useState(null); // { available: bool, message: string }

  // Fields: Teacher Sign-up
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherInviteCode, setTeacherInviteCode] = useState("");

  // Fields: Parent Sign-up
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPassword, setParentPassword] = useState("");
  const [parentChildName, setParentChildName] = useState("");
  const [parentLinkCode, setParentLinkCode] = useState("");

  // UI Status
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [showDemoDisclosure, setShowDemoDisclosure] = useState(false);

  const fromPath = location.state?.from?.pathname || "/";
  const isDemoEnabled = import.meta.env.VITE_DEMO_MODE !== "false";

  const handleGradeSelect = (g) => {
    setSelectedGrade(g);
    setGrade(g);
    setErrorMsg("");
    setPin("");
  };

  const handlePinKey = (digit) => {
    playClick();
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setMascotMood("thinking");
    }
  };

  const handlePinBackspace = () => {
    playClick();
    setPin((prev) => prev.slice(0, -1));
  };

  // Check username availability on blur
  const handleCheckUsername = async () => {
    const u = regNickname.trim();
    if (u.length < 3) {
      setUsernameStatus(null);
      return;
    }
    try {
      const res = await checkUsernameAvailableApi(u);
      setUsernameStatus(res);
      if (res.available) {
        setMascotMood("happy");
      }
    } catch (e) {
      setUsernameStatus(null);
    }
  };

  // Trigger celebration on successful authentication
  const triggerSuccess = (targetRoute = "/") => {
    playSuccess();
    setMascotMood("cheering");
    try {
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}
    setTimeout(() => {
      navigate(targetRoute, { replace: true });
    }, 450);
  };

  // 1. Submit: Student Login
  const handleStudentLogin = async (e) => {
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
    setMascotMood("thinking");
    try {
      const res = await login({
        username: u,
        secret: secret,
        grade: selectedGrade,
      });

      if (res && (res.success || res.status === "ok")) {
        triggerSuccess(fromPath && fromPath !== "/login" ? fromPath : "/");
      } else {
        setErrorMsg(res?.error || "Login failed. Check your nickname and secret!");
        setMascotMood("curious");
      }
    } catch (err) {
      setErrorMsg(err.message || "Login failed. Check your nickname and secret!");
      setMascotMood("curious");
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Submit: Teacher Login
  const handleTeacherLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (!adultIdentifier.trim() || !adultPassword) {
      setErrorMsg("Please enter your teacher email/username and password.");
      return;
    }

    setSubmitting(true);
    setMascotMood("thinking");
    try {
      const res = await login({
        identifier: adultIdentifier.trim(),
        password: adultPassword,
      });

      if (res && (res.success || res.status === "ok")) {
        triggerSuccess("/grown-ups");
      } else {
        setErrorMsg(res?.error || "Invalid teacher credentials.");
        setMascotMood("curious");
      }
    } catch (err) {
      setErrorMsg(err.message || "Invalid teacher credentials.");
      setMascotMood("curious");
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Submit: Parent Login
  const handleParentLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (!adultIdentifier.trim() || !adultPassword) {
      setErrorMsg("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    setMascotMood("thinking");
    try {
      const res = await login({
        identifier: adultIdentifier.trim(),
        password: adultPassword,
      });

      if (res && (res.success || res.status === "ok")) {
        triggerSuccess("/parent");
      } else {
        setErrorMsg(res?.error || "Invalid parent credentials.");
        setMascotMood("curious");
      }
    } catch (err) {
      setErrorMsg(err.message || "Invalid parent credentials.");
      setMascotMood("curious");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Submit: Join Class by Code
  const handleJoinSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (!joinCode.trim()) {
      setErrorMsg("Please enter the class join code from your teacher.");
      return;
    }

    setSubmitting(true);
    setMascotMood("thinking");
    try {
      const res = await joinWithClassCode({
        code: joinCode.trim().toUpperCase(),
        display_name: joinNickname.trim(),
      });

      if (res && (res.success || res.status === "ok")) {
        triggerSuccess(fromPath && fromPath !== "/login" ? fromPath : "/");
      } else {
        setErrorMsg(res?.error || "Could not join class. Check your code.");
        setMascotMood("curious");
      }
    } catch (err) {
      setErrorMsg(err.message || "Could not join class. Check your code.");
      setMascotMood("curious");
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Submit: Guest Login
  const handleGuestSubmit = async () => {
    setErrorMsg("");
    setSubmitting(true);
    setMascotMood("thinking");
    try {
      const res = await loginAsGuest(selectedGrade);
      if (res && (res.success || res.status === "ok")) {
        triggerSuccess(fromPath && fromPath !== "/login" ? fromPath : "/");
      } else {
        setErrorMsg(res?.error || "Could not start guest session.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Could not start guest session.");
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Submit: Student Sign-up
  const handleStudentRegister = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    const u = regNickname.trim();
    if (!u) {
      setErrorMsg("Please choose a student nickname!");
      return;
    }
    if (!regSecret) {
      setErrorMsg(isJunior ? "Please create a 4-digit secret PIN!" : "Please create a password (at least 8 chars)!");
      return;
    }
    if (regSecret !== regConfirmSecret) {
      setErrorMsg("Secrets do not match! Please check and confirm.");
      return;
    }

    setSubmitting(true);
    setMascotMood("thinking");
    try {
      const res = await registerStudent({
        username: u,
        secret: regSecret,
        confirm_secret: regConfirmSecret,
        grade: selectedGrade,
        avatar: regAvatar,
        class_code: regClassCode.trim() || undefined,
      });

      if (res && (res.success || res.status === "ok")) {
        triggerSuccess("/");
      } else {
        setErrorMsg(res?.error || "Registration failed. Try a different nickname.");
        setMascotMood("curious");
      }
    } catch (err) {
      setErrorMsg(err.message || "Registration failed. Try a different nickname.");
      setMascotMood("curious");
    } finally {
      setSubmitting(false);
    }
  };

  // 7. Submit: Teacher Sign-up
  const handleTeacherRegister = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (!teacherName.trim() || !teacherEmail.trim() || !teacherPassword) {
      setErrorMsg("Please fill in your name, email, and password.");
      return;
    }
    if (!teacherInviteCode.trim()) {
      setErrorMsg("Teacher invite code is required to register.");
      return;
    }

    setSubmitting(true);
    setMascotMood("thinking");
    try {
      const res = await registerTeacher({
        name: teacherName.trim(),
        email: teacherEmail.trim(),
        password: teacherPassword,
        invite_code: teacherInviteCode.trim(),
      });

      if (res && (res.success || res.status === "ok")) {
        triggerSuccess("/grown-ups");
      } else {
        setErrorMsg(res?.error || "Registration failed. Check your invite code.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Registration failed. Check your invite code.");
    } finally {
      setSubmitting(false);
    }
  };

  // 8. Submit: Parent Sign-up
  const handleParentRegister = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg("");

    if (!parentName.trim() || !parentEmail.trim() || !parentPassword) {
      setErrorMsg("Please fill in your name, email, and password.");
      return;
    }

    setSubmitting(true);
    setMascotMood("thinking");
    try {
      const res = await registerParent({
        name: parentName.trim(),
        email: parentEmail.trim(),
        password: parentPassword,
        child_username: parentChildName.trim() || undefined,
        link_code: parentLinkCode.trim().toUpperCase() || undefined,
      });

      if (res && (res.success || res.status === "ok")) {
        triggerSuccess("/parent");
      } else {
        setErrorMsg(res?.error || "Registration failed.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Registration failed.");
    } finally {
      setSubmitting(false);
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

  const fillDemoAdult = (ident, pw, roleTarget) => {
    setRoleMode(roleTarget);
    setAdultIdentifier(ident);
    setAdultPassword(pw);
    setErrorMsg("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #F0F4FF 0%, #FAF5FF 50%, #FFFBEB 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        fontFamily: "var(--font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative Soft Background Shapes */}
      <div
        style={{
          position: "absolute",
          top: -80,
          left: -80,
          width: 240,
          height: 240,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(234, 88, 12, 0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          right: -100,
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(79, 70, 229, 0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Main 2-Column Responsive Card (Fits 1366x768 without scrolling) */}
      <div
        style={{
          width: "100%",
          maxWidth: 900,
          background: "rgba(255, 255, 255, 0.94)",
          backdropFilter: "blur(12px)",
          borderRadius: 24,
          boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0,0,0,0.04)",
          border: "1.5px solid rgba(226, 232, 240, 0.9)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          maxHeight: "min(92vh, 660px)",
        }}
      >
        {/* LEFT COLUMN: Mascot & Edition Preview (~310px wide) */}
        <div
          style={{
            flex: "1 1 290px",
            background: "linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)",
            borderRight: "1px solid #E2E8F0",
            padding: "24px 22px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {/* Brand Header */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${gradeConfig.color}, #F97316)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFF",
                  boxShadow: `0 4px 10px ${gradeConfig.color}44`,
                  transition: "background 0.3s ease",
                }}
              >
                <Sparkles size={20} />
              </div>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 900, color: "#0F172A", margin: 0 }}>
                  Parivestra <span style={{ color: gradeConfig.color }}>AI Tutor</span>
                </h1>
                <p style={{ fontSize: 11, color: "#64748B", margin: 0, fontWeight: 700 }}>
                  Classes 3 to 10 · AI & Future Skills
                </p>
              </div>
            </div>

            {/* Mascot Interactive Showcase */}
            <div style={{ textAlign: "center", margin: "14px 0 10px 0" }}>
              <Mascot mood={mascotMood} size={76} animated />
            </div>

            {/* Active Edition Preview Card */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 16,
                padding: "12px 14px",
                border: `1.5px solid ${gradeConfig.color}44`,
                boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                transition: "all 0.3s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: gradeConfig.color,
                  }}
                >
                  {gradeConfig.band} Band
                </span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: gradeConfig.color,
                  }}
                />
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "#0F172A" }}>
                {selectedGrade} · {gradeConfig.title}
              </div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                Tagline: <em>{gradeConfig.tagline}</em>
              </div>
            </div>
          </div>

          {/* Left Column Footer Note */}
          <div
            style={{
              paddingTop: 12,
              borderTop: "1px solid #E2E8F0",
              fontSize: 11,
              color: "#64748B",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ShieldCheck size={14} color="#16A34A" />
            <span>Zero Student PII · 100% Kid Safe</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Auth Tabs & Form Controls (~450px wide) */}
        <div
          style={{
            flex: "1 1 360px",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            maxHeight: "min(92vh, 660px)",
          }}
        >
          {/* Top Primary Tabs: Sign in vs Create account */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #E2E8F0",
              background: "#F8FAFC",
            }}
          >
            <button
              type="button"
              onClick={() => { setAuthTab("signin"); setErrorMsg(""); playClick(); }}
              style={{
                flex: 1,
                padding: "12px 14px",
                border: "none",
                borderBottom: authTab === "signin" ? `3px solid ${gradeConfig.color}` : "3px solid transparent",
                background: authTab === "signin" ? "#FFFFFF" : "transparent",
                color: authTab === "signin" ? "#0F172A" : "#64748B",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.15s ease",
              }}
            >
              <LogIn size={16} />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthTab("signup"); setErrorMsg(""); playClick(); }}
              style={{
                flex: 1,
                padding: "12px 14px",
                border: "none",
                borderBottom: authTab === "signup" ? `3px solid ${gradeConfig.color}` : "3px solid transparent",
                background: authTab === "signup" ? "#FFFFFF" : "transparent",
                color: authTab === "signup" ? "#0F172A" : "#64748B",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.15s ease",
              }}
            >
              <UserPlus size={16} />
              Create Account
            </button>
          </div>

          {/* Role Chooser Segmented Control */}
          <div style={{ padding: "12px 20px 4px 20px" }}>
            <div
              style={{
                display: "flex",
                background: "#F1F5F9",
                borderRadius: 12,
                padding: 3,
                gap: 2,
              }}
            >
              {[
                { id: "student", label: "Student", icon: GraduationCap },
                { id: "teacher", label: "Teacher", icon: ShieldCheck },
                { id: "parent", label: "Parent", icon: HeartHandshake },
                ...(authTab === "signin" ? [{ id: "join", label: "Class Code", icon: Users }] : []),
              ].map((r) => {
                const isSelected = roleMode === r.id;
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setRoleMode(r.id); setErrorMsg(""); playClick(); }}
                    style={{
                      flex: 1,
                      padding: "6px 8px",
                      borderRadius: 10,
                      border: "none",
                      background: isSelected ? "#FFFFFF" : "transparent",
                      color: isSelected ? "#0F172A" : "#64748B",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      boxShadow: isSelected ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Icon size={14} />
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body Content */}
          <div style={{ padding: "14px 20px 16px 20px", flex: 1 }}>
            {/* Error Message Banner */}
            {errorMsg && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  borderRadius: 10,
                  padding: "8px 12px",
                  color: "#B91C1C",
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* TAB 1: SIGN IN */}
            {authTab === "signin" && (
              <div>
                {/* 1.1 STUDENT SIGN IN */}
                {roleMode === "student" && (
                  <form onSubmit={handleStudentLogin}>
                    {/* Class Selector Dropdown */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 4, textTransform: "uppercase" }}>
                        Your Class
                      </label>
                      <ClassDropdown
                        variant="form"
                        value={selectedGrade}
                        onChange={handleGradeSelect}
                        label="Student Grade"
                      />
                    </div>

                    {/* Nickname */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 4, textTransform: "uppercase" }}>
                        Nickname or Username
                      </label>
                      <div style={{ position: "relative" }}>
                        <User size={16} style={{ position: "absolute", left: 12, top: 11, color: "#94A3B8" }} />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="e.g. kid3, ananya_3"
                          style={{
                            width: "100%",
                            padding: "9px 12px 9px 36px",
                            borderRadius: 10,
                            border: "1.5px solid #CBD5E1",
                            fontSize: 14,
                            fontWeight: 600,
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>

                    {/* Secret Input: PIN (Junior) or Password (Middle/Senior) */}
                    {isJunior ? (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>
                            4-Digit Secret PIN
                          </span>
                          <span style={{ fontSize: 11, color: gradeConfig.color, fontWeight: 700 }}>
                            Junior Band
                          </span>
                        </div>

                        {/* PIN Dots */}
                        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 10 }}>
                          {[0, 1, 2, 3].map((idx) => (
                            <div
                              key={idx}
                              style={{
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                border: `2px solid ${gradeConfig.color}`,
                                background: pin.length > idx ? gradeConfig.color : "transparent",
                                transition: "all 0.15s ease",
                              }}
                            />
                          ))}
                        </div>

                        {/* Compact Numeric Keypad */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr)",
                            gap: 6,
                            maxWidth: 220,
                            margin: "0 auto",
                          }}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handlePinKey(num.toString())}
                              style={{
                                height: 36,
                                fontSize: 17,
                                fontWeight: 800,
                                background: "#FFFFFF",
                                border: "1.5px solid #E2E8F0",
                                borderRadius: 10,
                                cursor: "pointer",
                                color: "#0F172A",
                              }}
                            >
                              {num}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={handlePinBackspace}
                            style={{
                              height: 36,
                              background: "#F1F5F9",
                              border: "1.5px solid #E2E8F0",
                              borderRadius: 10,
                              cursor: "pointer",
                              color: "#64748B",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Delete size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePinKey("0")}
                            style={{
                              height: 36,
                              fontSize: 17,
                              fontWeight: 800,
                              background: "#FFFFFF",
                              border: "1.5px solid #E2E8F0",
                              borderRadius: 10,
                              cursor: "pointer",
                              color: "#0F172A",
                            }}
                          >
                            0
                          </button>
                          <button
                            type="button"
                            onClick={() => setPin("")}
                            style={{
                              height: 36,
                              fontSize: 11,
                              fontWeight: 800,
                              background: "#FEE2E2",
                              border: "1.5px solid #FECACA",
                              borderRadius: 10,
                              cursor: "pointer",
                              color: "#DC2626",
                            }}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 4, textTransform: "uppercase" }}>
                          Student Password
                        </label>
                        <div style={{ position: "relative" }}>
                          <Lock size={16} style={{ position: "absolute", left: 12, top: 11, color: "#94A3B8" }} />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your student password"
                            style={{
                              width: "100%",
                              padding: "9px 36px 9px 36px",
                              borderRadius: 10,
                              border: "1.5px solid #CBD5E1",
                              fontSize: 14,
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
                              right: 10,
                              top: 9,
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#94A3B8",
                            }}
                          >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                        padding: "11px",
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${gradeConfig.color}, #EA580C)`,
                        border: "none",
                        color: "#FFFFFF",
                        fontSize: 15,
                        fontWeight: 800,
                        cursor: submitting ? "not-allowed" : "pointer",
                        boxShadow: `0 4px 12px ${gradeConfig.color}44`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      {submitting ? "Signing in..." : `Start Learning (${selectedGrade})`}
                      <ArrowRight size={16} />
                    </button>
                  </form>
                )}

                {/* 1.2 TEACHER SIGN IN */}
                {roleMode === "teacher" && (
                  <form onSubmit={handleTeacherLogin}>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 4, textTransform: "uppercase" }}>
                        Teacher Email or Username
                      </label>
                      <input
                        type="text"
                        value={adultIdentifier}
                        onChange={(e) => setAdultIdentifier(e.target.value)}
                        placeholder="e.g. ms_sharma or teacher@school.edu"
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          borderRadius: 10,
                          border: "1.5px solid #CBD5E1",
                          fontSize: 14,
                          fontWeight: 600,
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 4, textTransform: "uppercase" }}>
                        Password
                      </label>
                      <input
                        type="password"
                        value={adultPassword}
                        onChange={(e) => setAdultPassword(e.target.value)}
                        placeholder="Enter teacher password"
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          borderRadius: 10,
                          border: "1.5px solid #CBD5E1",
                          fontSize: 14,
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
                        padding: "11px",
                        borderRadius: 12,
                        background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                        border: "none",
                        color: "#FFFFFF",
                        fontSize: 15,
                        fontWeight: 800,
                        cursor: submitting ? "not-allowed" : "pointer",
                      }}
                    >
                      {submitting ? "Signing In..." : "Open Grown-ups Portal"}
                    </button>
                  </form>
                )}

                {/* 1.3 PARENT SIGN IN */}
                {roleMode === "parent" && (
                  <form onSubmit={handleParentLogin}>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 4, textTransform: "uppercase" }}>
                        Parent Email or Username
                      </label>
                      <input
                        type="text"
                        value={adultIdentifier}
                        onChange={(e) => setAdultIdentifier(e.target.value)}
                        placeholder="e.g. parent@example.com"
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          borderRadius: 10,
                          border: "1.5px solid #CBD5E1",
                          fontSize: 14,
                          fontWeight: 600,
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 4, textTransform: "uppercase" }}>
                        Password
                      </label>
                      <input
                        type="password"
                        value={adultPassword}
                        onChange={(e) => setAdultPassword(e.target.value)}
                        placeholder="Enter password"
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          borderRadius: 10,
                          border: "1.5px solid #CBD5E1",
                          fontSize: 14,
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
                        padding: "11px",
                        borderRadius: 12,
                        background: "linear-gradient(135deg, #4F46E5, #4338CA)",
                        border: "none",
                        color: "#FFFFFF",
                        fontSize: 15,
                        fontWeight: 800,
                        cursor: submitting ? "not-allowed" : "pointer",
                      }}
                    >
                      {submitting ? "Signing In..." : "Open Parent Portal"}
                    </button>
                  </form>
                )}

                {/* 1.4 JOIN CLASS BY CODE */}
                {roleMode === "join" && (
                  <form onSubmit={handleJoinSubmit}>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 4, textTransform: "uppercase" }}>
                        Class Join Code
                      </label>
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="e.g. PARI-3A"
                        maxLength={10}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: 10,
                          border: "2px solid #16A34A",
                          fontSize: 18,
                          fontWeight: 900,
                          letterSpacing: 2,
                          textAlign: "center",
                          outline: "none",
                          boxSizing: "border-box",
                          background: "#F0FDF4",
                          color: "#166534",
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 4, textTransform: "uppercase" }}>
                        Your Nickname (Optional)
                      </label>
                      <input
                        type="text"
                        value={joinNickname}
                        onChange={(e) => setJoinNickname(e.target.value)}
                        placeholder="e.g. Aarav"
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          borderRadius: 10,
                          border: "1.5px solid #CBD5E1",
                          fontSize: 14,
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
                        padding: "11px",
                        borderRadius: 12,
                        background: "linear-gradient(135deg, #16A34A, #15803D)",
                        border: "none",
                        color: "#FFFFFF",
                        fontSize: 15,
                        fontWeight: 800,
                        cursor: submitting ? "not-allowed" : "pointer",
                      }}
                    >
                      {submitting ? "Joining..." : "Join Class"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: CREATE ACCOUNT */}
            {authTab === "signup" && (
              <div>
                {/* 2.1 STUDENT SIGN UP */}
                {roleMode === "student" && (
                  <form onSubmit={handleStudentRegister}>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 3, textTransform: "uppercase" }}>
                        Select Your Class
                      </label>
                      <ClassDropdown
                        variant="form"
                        value={selectedGrade}
                        onChange={handleGradeSelect}
                        label="Student Grade"
                      />
                    </div>

                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                        <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase" }}>
                          Choose Nickname
                        </label>
                        <span style={{ fontSize: 10, color: "#64748B" }}>No real names</span>
                      </div>
                      <input
                        type="text"
                        value={regNickname}
                        onChange={(e) => { setRegNickname(e.target.value); setUsernameStatus(null); }}
                        onBlur={handleCheckUsername}
                        placeholder="e.g. astro_kid, priya_4"
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: 9,
                          border: "1.5px solid #CBD5E1",
                          fontSize: 13,
                          fontWeight: 600,
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                      {usernameStatus && (
                        <div style={{ fontSize: 11, marginTop: 2, color: usernameStatus.available ? "#16A34A" : "#DC2626", fontWeight: 700 }}>
                          {usernameStatus.available ? "✓ Nickname is available!" : `✗ ${usernameStatus.reason}`}
                        </div>
                      )}
                    </div>

                    {/* Secret Fields */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 3, textTransform: "uppercase" }}>
                          {isJunior ? "4-Digit PIN" : "Password"}
                        </label>
                        <input
                          type={isJunior ? "text" : "password"}
                          value={regSecret}
                          maxLength={isJunior ? 4 : 50}
                          onChange={(e) => setRegSecret(e.target.value)}
                          placeholder={isJunior ? "4 digits" : "8+ chars"}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 9,
                            border: "1.5px solid #CBD5E1",
                            fontSize: 13,
                            fontWeight: 600,
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 3, textTransform: "uppercase" }}>
                          Confirm
                        </label>
                        <input
                          type={isJunior ? "text" : "password"}
                          value={regConfirmSecret}
                          maxLength={isJunior ? 4 : 50}
                          onChange={(e) => setRegConfirmSecret(e.target.value)}
                          placeholder={isJunior ? "Repeat PIN" : "Repeat Password"}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            borderRadius: 9,
                            border: "1.5px solid #CBD5E1",
                            fontSize: 13,
                            fontWeight: 600,
                            outline: "none",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                    </div>

                    {/* Avatar Picker */}
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 4, textTransform: "uppercase" }}>
                        Pick Avatar
                      </label>
                      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                        {AVATARS.slice(0, 6).map((av) => {
                          const isSel = regAvatar === av.id;
                          return (
                            <button
                              key={av.id}
                              type="button"
                              onClick={() => setRegAvatar(av.id)}
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                border: isSel ? `2px solid ${gradeConfig.color}` : "1.5px solid #E2E8F0",
                                background: isSel ? "#FFF7ED" : "#FFFFFF",
                                cursor: "pointer",
                                padding: 2,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {av.render ? av.render(26) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Optional Class Code */}
                    <div style={{ marginBottom: 12 }}>
                      <input
                        type="text"
                        value={regClassCode}
                        onChange={(e) => setRegClassCode(e.target.value.toUpperCase())}
                        placeholder="Class code from teacher (optional)"
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          borderRadius: 8,
                          border: "1px dashed #CBD5E1",
                          fontSize: 12,
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
                        padding: "10px",
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${gradeConfig.color}, #EA580C)`,
                        border: "none",
                        color: "#FFFFFF",
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: submitting ? "not-allowed" : "pointer",
                      }}
                    >
                      {submitting ? "Creating..." : "Create Account & Start Learning"}
                    </button>
                  </form>
                )}

                {/* 2.2 TEACHER SIGN UP */}
                {roleMode === "teacher" && (
                  <form onSubmit={handleTeacherRegister}>
                    <div style={{ marginBottom: 10 }}>
                      <input
                        type="text"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        placeholder="Full Name (e.g. Ms. Sharma)"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: "1.5px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <input
                        type="email"
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        placeholder="Teacher School Email"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: "1.5px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <input
                        type="password"
                        value={teacherPassword}
                        onChange={(e) => setTeacherPassword(e.target.value)}
                        placeholder="Password (min 8 characters)"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: "1.5px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <input
                        type="text"
                        value={teacherInviteCode}
                        onChange={(e) => setTeacherInviteCode(e.target.value)}
                        placeholder="Teacher Secret Invite Code"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: "1.5px solid #2563EB", fontSize: 13, boxSizing: "border-box", fontWeight: 700 }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: 12,
                        background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                        border: "none",
                        color: "#FFFFFF",
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: submitting ? "not-allowed" : "pointer",
                      }}
                    >
                      {submitting ? "Registering..." : "Create Teacher Account"}
                    </button>
                  </form>
                )}

                {/* 2.3 PARENT SIGN UP */}
                {roleMode === "parent" && (
                  <form onSubmit={handleParentRegister}>
                    <div style={{ marginBottom: 10 }}>
                      <input
                        type="text"
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        placeholder="Parent Name"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: "1.5px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <input
                        type="email"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        placeholder="Parent Email Address"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: "1.5px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <input
                        type="password"
                        value={parentPassword}
                        onChange={(e) => setParentPassword(e.target.value)}
                        placeholder="Password (min 8 characters)"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: "1.5px solid #CBD5E1", fontSize: 13, boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                      <input
                        type="text"
                        value={parentChildName}
                        onChange={(e) => setParentChildName(e.target.value)}
                        placeholder="Child's nickname (opt)"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: "1px dashed #CBD5E1", fontSize: 12, boxSizing: "border-box" }}
                      />
                      <input
                        type="text"
                        value={parentLinkCode}
                        onChange={(e) => setParentLinkCode(e.target.value.toUpperCase())}
                        placeholder="Teacher Link Code (opt)"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: "1px dashed #CBD5E1", fontSize: 12, boxSizing: "border-box", fontWeight: 700 }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: 12,
                        background: "linear-gradient(135deg, #4F46E5, #4338CA)",
                        border: "none",
                        color: "#FFFFFF",
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: submitting ? "not-allowed" : "pointer",
                      }}
                    >
                      {submitting ? "Registering..." : "Create Parent Account"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Guest Explorer 1-Click Link */}
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <button
                type="button"
                onClick={handleGuestSubmit}
                disabled={submitting}
                style={{
                  background: "none",
                  border: "none",
                  color: "#EA580C",
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                ⚡ Explore instantly as a Guest Explorer (No secret required)
              </button>
            </div>

            {/* Quick Demo Disclosure (Hidden unless DEMO_MODE) */}
            {isDemoEnabled && (
              <div style={{ marginTop: 10, textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => setShowDemoDisclosure(!showDemoDisclosure)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 11,
                    color: "#94A3B8",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {showDemoDisclosure ? "Hide quick demo logins" : "Demo logins"}
                </button>

                {showDemoDisclosure && (
                  <div
                    style={{
                      marginTop: 6,
                      padding: 8,
                      background: "#F8FAFC",
                      borderRadius: 10,
                      border: "1px dashed #CBD5E1",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      justifyContent: "center",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => fillDemoStudent("kid3", "8392", "Class 3")}
                      style={{ fontSize: 10, padding: "3px 6px", borderRadius: 6, background: "#FFF", border: "1px solid #CBD5E1", cursor: "pointer" }}
                    >
                      Class 3 (kid3/8392)
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoStudent("kid4", "4321", "Class 4")}
                      style={{ fontSize: 10, padding: "3px 6px", borderRadius: 6, background: "#FFF", border: "1px solid #CBD5E1", cursor: "pointer" }}
                    >
                      Class 4 (kid4/4321)
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemoAdult("ms_sharma", "teach123", "teacher")}
                      style={{ fontSize: 10, padding: "3px 6px", borderRadius: 6, background: "#FFF", border: "1px solid #CBD5E1", cursor: "pointer" }}
                    >
                      Teacher (ms_sharma)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
