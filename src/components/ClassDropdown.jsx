import React, { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Check, Lock, Search } from "lucide-react";
import { GRADE_DETAILS } from "./GradeGrid";
import { playClick } from "../utils/sound";

export default function ClassDropdown({
  value = "Class 3",
  onChange,
  disabled = false,
  allowSwitch = true,
  variant = "form", // "form" | "header"
  id,
  label = "Select Class",
  className = "",
  style = {},
}) {
  const generatedId = useId();
  const dropdownId = id || generatedId;
  const listboxId = `${dropdownId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  const selectedNum = parseInt(String(value).replace(/\D/g, "") || "3", 10);
  const currentGrade = GRADE_DETAILS.find((g) => g.grade === selectedNum) || GRADE_DETAILS[0];

  const filteredGrades = GRADE_DETAILS.filter((g) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.label.toLowerCase().includes(q) ||
      g.title.toLowerCase().includes(q) ||
      g.band.toLowerCase().includes(q) ||
      String(g.grade).includes(q)
    );
  });

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      const idx = filteredGrades.findIndex((g) => g.grade === selectedNum);
      setHighlightedIndex(idx >= 0 ? idx : 0);
      if (variant === "form" && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    } else {
      setSearchQuery("");
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled || !allowSwitch) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < filteredGrades.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredGrades.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredGrades.length) {
        selectGrade(filteredGrades[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  const selectGrade = (gradeItem) => {
    playClick();
    if (onChange) {
      onChange(gradeItem.label);
    }
    setIsOpen(false);
    setSearchQuery("");
    buttonRef.current?.focus();
  };

  const isHeader = variant === "header";

  return (
    <div
      ref={containerRef}
      className={`class-dropdown-container ${className}`}
      style={{
        position: "relative",
        display: "inline-block",
        width: isHeader ? "auto" : "100%",
        ...style,
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Combobox Trigger Button */}
      <button
        ref={buttonRef}
        id={dropdownId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={label}
        disabled={disabled || !allowSwitch}
        onClick={() => {
          if (!allowSwitch) return;
          setIsOpen((prev) => !prev);
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          width: isHeader ? "auto" : "100%",
          padding: isHeader ? "6px 14px" : "11px 16px",
          background: isHeader ? "#FFF7ED" : "#FFFFFF",
          border: isHeader
            ? "1.5px solid #FFEDD5"
            : isOpen
            ? `2px solid ${currentGrade.color}`
            : "1.5px solid #CBD5E1",
          borderRadius: isHeader ? "9999px" : 14,
          cursor: disabled || !allowSwitch ? "not-allowed" : "pointer",
          fontSize: isHeader ? 13 : 14,
          fontWeight: 700,
          color: isHeader ? "#EA580C" : "#0F172A",
          boxShadow: isHeader
            ? "none"
            : isOpen
            ? `0 0 0 3px ${currentGrade.color}22`
            : "0 1px 2px rgba(0,0,0,0.04)",
          transition: "all 0.15s ease",
          outline: "none",
          boxSizing: "border-box",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {/* Grade theme dot */}
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: currentGrade.color,
              flexShrink: 0,
              boxShadow: `0 0 6px ${currentGrade.color}66`,
            }}
          />
          <span>
            {currentGrade.label} · <span style={{ fontWeight: 600, color: isHeader ? "#EA580C" : "#64748B" }}>{currentGrade.title}</span>
          </span>
        </span>

        {allowSwitch ? (
          <ChevronDown
            size={16}
            style={{
              color: isHeader ? "#EA580C" : "#64748B",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
              flexShrink: 0,
            }}
          />
        ) : (
          <Lock size={14} style={{ color: "#94A3B8", flexShrink: 0 }} />
        )}
      </button>

      {/* Floating Dropdown Listbox */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Available classes"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: isHeader ? "auto" : 0,
            right: 0,
            minWidth: isHeader ? 280 : "100%",
            maxWidth: 360,
            background: "#FFFFFF",
            borderRadius: 16,
            border: "1px solid #E2E8F0",
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.15), 0 2px 6px rgba(15, 23, 42, 0.05)",
            zIndex: 9999,
            padding: 8,
            boxSizing: "border-box",
            animation: "fadeInDropdown 0.15s ease",
          }}
        >
          {/* Search box for type-to-search */}
          <div
            style={{
              position: "relative",
              marginBottom: 6,
              padding: "4px 8px",
              borderBottom: "1px solid #F1F5F9",
            }}
          >
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 16,
                top: 13,
                color: "#94A3B8",
              }}
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search class or topic..."
              aria-label="Filter classes"
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                borderRadius: 8,
                border: "1px solid #E2E8F0",
                fontSize: 12,
                fontWeight: 600,
                outline: "none",
                boxSizing: "border-box",
                background: "#F8FAFC",
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Escape") {
                  handleKeyDown(e);
                }
              }}
            />
          </div>

          {/* Options list */}
          <div
            ref={listRef}
            style={{
              maxHeight: 250,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {filteredGrades.length === 0 ? (
              <div style={{ padding: "12px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
                No matching classes
              </div>
            ) : (
              filteredGrades.map((g, idx) => {
                const isSelected = g.grade === selectedNum;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={g.grade}
                    id={`${dropdownId}-option-${g.grade}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectGrade(g)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      background: isSelected
                        ? `${g.color}15`
                        : isHighlighted
                        ? "#F8FAFC"
                        : "transparent",
                      color: isSelected ? g.color : "#1E293B",
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: 13,
                      transition: "background 0.1s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: g.color,
                          flexShrink: 0,
                          boxShadow: `0 0 6px ${g.color}44`,
                        }}
                      />
                      <div>
                        <div>{g.label} · <span style={{ fontWeight: 600, color: isSelected ? g.color : "#475569" }}>{g.title}</span></div>
                        <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 500 }}>
                          {g.band} Band · {g.tagline}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={16} style={{ color: g.color, strokeWidth: 3, flexShrink: 0 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

