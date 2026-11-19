import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Mascot from "./Mascot";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#F8FAFC",
          gap: 16,
        }}
      >
        <Mascot mood="thinking" size={96} animated />
        <h2 style={{ fontSize: 20, color: "#1E293B", fontWeight: 700 }}>
          Waking up Pari...
        </h2>
        <p style={{ color: "#64748B", fontSize: 14 }}>
          Preparing your learning space
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role || "student";
    if (!allowedRoles.includes(userRole)) {
      // Role not allowed (e.g. student trying to access /grown-ups)
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

