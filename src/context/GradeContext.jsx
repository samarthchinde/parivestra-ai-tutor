import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { getBandForGrade, getBandConfig, normalizeGrade, ALL_GRADES } from "../config/bands";
import { playClick } from "../utils/sound";

const GradeContext = createContext(null);

export function GradeProvider({ children }) {
  const { user, switchGrade, isAuthenticated } = useAuth();

  const [activeGrade, setActiveGrade] = useState(() => {
    return normalizeGrade(user?.active_grade || localStorage.getItem("parivestra_grade") || "Class 3");
  });

  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState("");

  // Sync with authenticated user's active grade
  useEffect(() => {
    if (user?.active_grade) {
      const norm = normalizeGrade(user.active_grade);
      setActiveGrade(norm);
      localStorage.setItem("parivestra_grade", norm);
    }
  }, [user?.active_grade]);

  const gradeNum = parseInt(activeGrade.replace(/\D/g, "") || "3", 10);
  const band = getBandForGrade(activeGrade);
  const bandConfig = getBandConfig(activeGrade);
  const allowGradeSwitch = user?.allow_grade_switch !== false;

  const handleSetGrade = async (targetGrade) => {
    const norm = normalizeGrade(targetGrade);
    if (norm === activeGrade) return;

    if (!allowGradeSwitch && user?.role === "student") {
      setSwitchError(`Your teacher has locked learning to ${user?.class?.grade || activeGrade}.`);
      return;
    }

    setSwitchError("");
    setIsSwitching(true);
    playClick();

    try {
      if (isAuthenticated) {
        await switchGrade(norm);
      }
      setActiveGrade(norm);
      localStorage.setItem("parivestra_grade", norm);
    } catch (err) {
      setSwitchError(err.message || "Failed to switch grade");
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <GradeContext.Provider
      value={{
        activeGrade,
        gradeNum,
        band,
        bandConfig,
        allGrades: ALL_GRADES,
        allowGradeSwitch,
        isSwitching,
        switchError,
        setGrade: handleSetGrade,
        clearSwitchError: () => setSwitchError(""),
      }}
    >
      {children}
    </GradeContext.Provider>
  );
}

export function useGrade() {
  const ctx = useContext(GradeContext);
  if (!ctx) throw new Error("useGrade must be used within a GradeProvider");
  return ctx;
}
