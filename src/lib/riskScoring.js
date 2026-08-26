// EPA standard AQI breakpoints (public, from AirNow/EPA).
export const AQI_CATEGORIES = [
  { max: 50, label: "Good", color: "#10b981" },
  { max: 100, label: "Moderate", color: "#f5a524" },
  { max: 150, label: "Unhealthy for Sensitive Groups", color: "#ea7c2c" },
  { max: 200, label: "Unhealthy", color: "#e0483e" },
  { max: 300, label: "Very Unhealthy", color: "#8b5cf6" },
  { max: Infinity, label: "Hazardous", color: "#7f1d3a" },
];

/**
 * @param {number} aqi
 * @returns {{ label: string, color: string }}
 */
export function scoreAqi(aqi) {
  const category = AQI_CATEGORIES.find((c) => aqi <= c.max);
  return category ?? AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
}

// Real guidance text, sourced from "School Air Quality Activity
// Recommendations" (rev. 7/2019), jointly issued by the CA School Boards
// Association, CA Air Pollution Control Officers Association, Association of
// CA School Administrators, CA Dept of Education, CA County Superintendents
// Educational Services Association, and CA Air Resources Board —
// cde.ca.gov/ls/ep/documents/airqualityguidance.pdf.
//
// That document defines 4 real activity categories (Recess, PE, Athletic
// Practice & Training, Scheduled Sporting Events) each with its OWN guidance
// across 5 air quality levels — not one generic tier. This is what actually
// makes activity selection meaningful: the guidance text genuinely differs
// by category, not just by an artificial severity bump.
//
// The document leaves the numeric AQI mapping to local districts ("modify
// these levels to correspond with the AQI... for your region"); the mapping
// here follows the standard EPA AQI category boundaries, with Level 5
// covering both "Very Unhealthy" and "Hazardous" since the source only goes
// to 5 levels.
const CDE_GUIDANCE = {
  recess: [
    "No restrictions.",
    "Ensure sensitive individuals (asthma or other heart/lung conditions) are medically managing their condition.",
    "Sensitive individuals should exercise indoors or avoid vigorous outdoor activities.",
    "Exercise indoors or avoid vigorous outdoor activities. Sensitive individuals should remain indoors.",
    "No outdoor activity — all activities should be moved indoors.",
    "No outdoor activity — all activities should be moved indoors.",
  ],
  pe: [
    "No restrictions.",
    "Ensure sensitive individuals (asthma or other heart/lung conditions) are medically managing their condition.",
    "Sensitive individuals should exercise indoors or avoid vigorous outdoor activities.",
    "Exercise indoors, or limit vigorous outdoor activities to a maximum of 15 minutes. Sensitive individuals should remain indoors.",
    "No outdoor activity — all activities should be moved indoors.",
    "No outdoor activity — all activities should be moved indoors.",
  ],
  practice: [
    "No restrictions.",
    "Ensure sensitive individuals (asthma or other heart/lung conditions) are medically managing their condition.",
    "Reduce vigorous exercise to 30 minutes per hour of practice time, with increased rest breaks and substitutions. Ensure sensitive individuals are medically managing their condition.",
    "Exercise indoors, or reduce vigorous exercise to 30 minutes of practice time with increased rest breaks and substitutions. Sensitive individuals should remain indoors.",
    "No outdoor activity — all activities should be moved indoors.",
    "No outdoor activity — all activities should be moved indoors.",
  ],
  event: [
    "No restrictions.",
    "Ensure sensitive individuals (asthma or other heart/lung conditions) are medically managing their condition.",
    "Increase rest breaks and substitutions per CIF guidelines for extreme heat. Ensure sensitive individuals are medically managing their condition.",
    "Increase rest breaks and substitutions per CIF guidelines for extreme heat. Ensure sensitive individuals are medically managing their condition.",
    "Event must be rescheduled or relocated.",
    "Event must be rescheduled or relocated.",
  ],
};

/**
 * @param {{ label: string, color: string }} category — from scoreAqi()
 * @param {"recess" | "pe" | "practice" | "event"} activityCategory
 * @returns {string}
 */
export function getActivityGuidance(category, activityCategory) {
  const index = AQI_CATEGORIES.indexOf(category);
  const table = CDE_GUIDANCE[activityCategory] ?? CDE_GUIDANCE.recess;
  return table[index] ?? table[table.length - 1];
}

/**
 * The full guidance table for one activity category across every AQI tier —
 * lets a user see how/whether guidance changes with AQI without needing to
 * wait for bad air. At Good/Moderate, every category is genuinely identical
 * per the source document; that's real, not a bug, and this table is how a
 * user can verify that for themselves instead of it just looking broken.
 * @param {"recess" | "pe" | "practice" | "event"} activityCategory
 * @returns {{ label: string, color: string, guidance: string }[]}
 */
export function getActivityGuidanceTable(activityCategory) {
  const table = CDE_GUIDANCE[activityCategory] ?? CDE_GUIDANCE.recess;
  return AQI_CATEGORIES.map((category, i) => ({
    label: category.label,
    color: category.color,
    guidance: table[i],
  }));
}
