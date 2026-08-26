// Each activity maps to one of the 4 real categories from the CDE/CIF school
// air quality guidance (see riskScoring.js) — that's what actually drives
// different guidance text, not just a name. "commute" and "general" aren't
// CDE categories; they're treated as "recess"-tier (brief, light exposure)
// since that's the closest real analogue.
export const ACTIVITIES = [
  { id: "soccer-practice", label: "Soccer practice", category: "practice" },
  { id: "cross-country", label: "Cross country practice", category: "practice" },
  { id: "football-practice", label: "Football practice", category: "practice" },
  { id: "marching-band", label: "Marching band rehearsal", category: "practice" },
  { id: "pe-class", label: "PE class", category: "pe" },
  { id: "recess", label: "Recess", category: "recess" },
  { id: "sporting-event", label: "Scheduled game or meet", category: "event" },
  { id: "walk-bike-commute", label: "Walk/bike to school", category: "recess" },
  { id: "general-outdoor", label: "General outdoor time", category: "recess" },
];
