// Age bands and pedagogical configurations for Classes 3 to 10

export const AGE_BANDS = {
  junior: {
    key: "junior",
    name: "Junior Explorers",
    grades: ["Class 3", "Class 4", "Class 5"],
    ageRange: "8 - 11 years",
    readingLevelLimit: 12,
    subjects: ["Maths", "English", "EVS"],
    mascotSize: 110,
    showMascotGreeting: true,
    tagline: "Explore, play, and discover with Pari!",
    theme: "playful",
    games: ["ninja", "word", "bughunt"],
    badgeLabel: "Quest Star",
  },
  middle: {
    key: "middle",
    name: "Middle School Scholars",
    grades: ["Class 6", "Class 7", "Class 8"],
    ageRange: "11 - 14 years",
    readingLevelLimit: 16,
    subjects: ["Maths", "English", "Science", "Social Science"],
    mascotSize: 70,
    showMascotGreeting: true,
    tagline: "Build deep conceptual understanding and problem-solving skills.",
    theme: "calm",
    games: ["ninja", "word", "bughunt"],
    badgeLabel: "Concept Master",
  },
  senior: {
    key: "senior",
    name: "Senior Academy",
    grades: ["Class 9", "Class 10"],
    ageRange: "14 - 16 years",
    readingLevelLimit: 20,
    subjects: ["Maths", "English", "Science", "Social Science"],
    scienceUnits: ["Physics", "Chemistry", "Biology"],
    mascotSize: 45,
    showMascotGreeting: false, // subtle helper icon only
    tagline: "Targeted CBSE board prep, formula sheets, and exam-style practice.",
    theme: "focused",
    games: ["sprint", "ninja", "word"],
    badgeLabel: "Academic Scholar",
  },
};

export const ALL_GRADES = [
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
];

export function normalizeGrade(grade) {
  if (!grade) return "Class 3";
  const digits = String(grade).replace(/\D/g, "");
  if (digits && Number(digits) >= 3 && Number(digits) <= 10) {
    return `Class ${digits}`;
  }
  return "Class 3";
}

export function getBandForGrade(grade) {
  const norm = normalizeGrade(grade);
  for (const [key, band] of Object.entries(AGE_BANDS)) {
    if (band.grades.includes(norm)) {
      return key;
    }
  }
  return "junior";
}

export function getBandConfig(grade) {
  const bandKey = getBandForGrade(grade);
  return AGE_BANDS[bandKey];
}

export function getSubjectsForGrade(grade) {
  return getBandConfig(grade).subjects;
}

export function getPreviousGrade(grade) {
  const norm = normalizeGrade(grade);
  const idx = ALL_GRADES.indexOf(norm);
  if (idx > 0) {
    return ALL_GRADES[idx - 1];
  }
  return null;
}
