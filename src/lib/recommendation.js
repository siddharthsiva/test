import { AQI_CATEGORIES, scoreAqi, getActivityGuidance } from "./riskScoring";

const NEARBY_FIRE_MILES = 15;

function bumpSeverity(category, steps) {
  const index = AQI_CATEGORIES.indexOf(category);
  const bumped = Math.min(index + steps, AQI_CATEGORIES.length - 1);
  return AQI_CATEGORIES[bumped];
}

/**
 * Fuse AQI + wildfire proximity + activity category into one recommendation.
 * Deterministic and explainable on purpose — see riskScoring.js for why.
 * Guidance text genuinely differs by activity category (real CDE/CIF data,
 * see riskScoring.js) — this isn't a cosmetic label swap.
 *
 * @param {{ aqi: number }} aqiReading
 * @param {{ windSpeedMph: number } | null} weather
 * @param {{ distanceMiles: number, direction: string } | null} wildfire
 * @param {{ id: string, label: string, category: "recess" | "pe" | "practice" | "event" }} activity
 */
export function getRecommendation(aqiReading, weather, wildfire, activity) {
  let category = scoreAqi(aqiReading.aqi);
  const notes = [];

  const fireNearby = wildfire && wildfire.distanceMiles <= NEARBY_FIRE_MILES;
  if (fireNearby) {
    category = bumpSeverity(category, 1);
    notes.push(
      `Active wildfire detected ${wildfire.distanceMiles} mi ${wildfire.direction} of this location — AQI can change faster than usual.`
    );
  }

  if (weather?.windSpeedMph >= 20) {
    notes.push(`Wind is ${Math.round(weather.windSpeedMph)} mph — conditions can shift quickly, recheck before heading out.`);
  }

  return {
    category,
    guidance: getActivityGuidance(category, activity.category),
    notes,
  };
}

const RISK_LEVELS = ["Low", "Elevated", "High", "Severe"];
const RISK_COLORS = ["#10b981", "#f5a524", "#e0483e", "#7f1d3a"];

/**
 * A single synthesized risk verdict for Emergency Mode — combines AQI
 * severity and wildfire proximity into one plain-language tier, the way the
 * original concept's "Risk level: Elevated" example does. Deterministic:
 * AQI category sets a base tier, then proximity to an active fire escalates
 * it further (closer fire = bigger escalation), capped at "Severe."
 * @param {number} aqi
 * @param {{ distanceMiles: number } | null} wildfire
 * @returns {{ level: string, color: string }}
 */
export function getEmergencyRiskLevel(aqi, wildfire) {
  const aqiIndex = AQI_CATEGORIES.indexOf(scoreAqi(aqi));
  let tier = aqiIndex <= 1 ? 0 : aqiIndex <= 3 ? 1 : 2;

  const distance = wildfire?.distanceMiles;
  if (distance != null) {
    if (distance <= 5) tier += 2;
    else if (distance <= NEARBY_FIRE_MILES) tier += 1;
  }

  tier = Math.min(tier, RISK_LEVELS.length - 1);
  return { level: RISK_LEVELS[tier], color: RISK_COLORS[tier] };
}
