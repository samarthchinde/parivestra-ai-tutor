import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { getAuthMe, loginUser, logoutUser, loginGuest, switchGradeApi, joinClassByCodeApi, updateUserProfile } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);
  const [idleSecondsLeft, setIdleSecondsLeft] = useState(60);

  const lastActivityRef = useRef(Date.now());
  const idleCheckIntervalRef = useRef(null);

  // Load session on startup
  const refreshUser = async () => {
    try {
      const data = await getAuthMe();
      if (data && data.user) {
        setUser(data.user);
        setIsGuest(data.user.username === "guest" || data.user.id.startsWith("guest_"));
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  // Activity detection for idle timeout
  useEffect(() => {
    if (!user) return;

    const resetActivity = () => {
      lastActivityRef.current = Date.now();
      if (idleWarning) {
        setIdleWarning(false);
        setIdleSecondsLeft(60);
      }
    };

    window.addEventListener("mousemove", resetActivity);
    window.addEventListener("keydown", resetActivity);
    window.addEventListener("click", resetActivity);
    window.addEventListener("touchstart", resetActivity);

    // Idle ticker: checks every 5 seconds
    const interval = setInterval(() => {
      const idleTimeMs = Date.now() - lastActivityRef.current;
      const isStudent = user?.role === "student";
      // 14 minutes for student warning (15m total), 29m for adult (30m total)
      const warningThresholdMs = isStudent ? 14 * 60 * 1000 : 29 * 60 * 1000;
      const logoutThresholdMs = isStudent ? 15 * 60 * 1000 : 30 * 60 * 1000;

      if (idleTimeMs >= logoutThresholdMs) {
        // Automatic logout
        handleLogout();
      } else if (idleTimeMs >= warningThresholdMs) {
        setIdleWarning(true);
        const rem = Math.max(0, Math.round((logoutThresholdMs - idleTimeMs) / 1000));
        setIdleSecondsLeft(rem);
      } else {
        setIdleWarning(false);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", resetActivity);
      window.removeEventListener("keydown", resetActivity);
      window.removeEventListener("click", resetActivity);
      window.removeEventListener("touchstart", resetActivity);
    };
  }, [user, idleWarning]);

  const handleLogin = async ({ username, email, secret, grade }) => {
    setIsLoading(true);
    try {
      const data = await loginUser({ username, email, secret, grade });
      setUser(data.user);
      setIsGuest(false);
      lastActivityRef.current = Date.now();
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setIsGuest(false);
      setIdleWarning(false);
      // Clean up sensitive localStorage keys for shared device safety
      localStorage.removeItem("parivestra_display_name");
      localStorage.removeItem("parivestra_avatar");
    }
  };

  const handleGuestLogin = async (grade = "Class 3") => {
    setIsLoading(true);
    try {
      const data = await loginGuest(grade);
      setUser(data.user);
      setIsGuest(true);
      lastActivityRef.current = Date.now();
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchGrade = async (grade) => {
    const data = await switchGradeApi(grade);
    setUser((prev) => (prev ? { ...prev, active_grade: data.active_grade } : prev));
    return data;
  };

  const handleJoinClass = async (payload) => {
    const data = await joinClassByCodeApi(payload);
    setUser(data.user);
    setIsGuest(false);
    lastActivityRef.current = Date.now();
    return data;
  };

  const staySignedIn = () => {
    lastActivityRef.current = Date.now();
    setIdleWarning(false);
    setIdleSecondsLeft(60);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || "student",
        isAuthenticated: !!user,
        isLoading,
        isGuest,
        idleWarning,
        idleSecondsLeft,
        login: handleLogin,
        logout: handleLogout,
        guestLogin: handleGuestLogin,
        switchGrade: handleSwitchGrade,
        joinClass: handleJoinClass,
        staySignedIn,
        refreshUser,
        updateUser: setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
