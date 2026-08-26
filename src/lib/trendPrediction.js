// Simple least-squares linear regression over recent AQI readings.
// This is intentionally lightweight (no ML library) — the point is a
// defensible, explainable short-term trend, not a sophisticated model.
// Once readings are polled server-side (Firebase Cloud Function) this
// same function can run there over Firestore history instead of localStorage.

const HISTORY_LIMIT = 12; // keep last N readings per location

function historyKey(locationId) {
  return `smokesmart:history:${locationId}`;
}

/** @param {string} locationId @param {number} aqi */
export function recordReading(locationId, aqi) {
  const history = getHistory(locationId);
  history.push({ t: Date.now(), aqi });
  const trimmed = history.slice(-HISTORY_LIMIT);
  localStorage.setItem(historyKey(locationId), JSON.stringify(trimmed));
  return trimmed;
}

/** @param {string} locationId @returns {{ t: number, aqi: number }[]} */
export function getHistory(locationId) {
  try {
    return JSON.parse(localStorage.getItem(historyKey(locationId)) ?? "[]");
  } catch {
    return [];
  }
}

/**
 * Least-squares fit of AQI vs. minutes-since-first-reading.
 * @param {{ t: number, aqi: number }[]} history
 * @returns {{ slope: number, intercept: number, lastX: number } | null}
 */
function fitLine(history) {
  if (history.length < 3) return null; // not enough points for a meaningful fit

  const t0 = history[0].t;
  const xs = history.map((p) => (p.t - t0) / 60000); // minutes since first reading
  const ys = history.map((p) => p.aqi);
  const n = xs.length;

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0);
  const sumXX = xs.reduce((sum, x) => sum + x * x, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept, lastX: xs[xs.length - 1] };
}

/**
 * @param {{ t: number, aqi: number }[]} history
 * @param {number} minutesAhead
 * @returns {{ predictedAqi: number, direction: "rising" | "falling" | "steady" } | null}
 */
export function predictTrend(history, minutesAhead = 120) {
  const fit = fitLine(history);
  if (!fit) return null;

  const predictedAqi = Math.round(fit.intercept + fit.slope * (fit.lastX + minutesAhead));
  const direction = fit.slope > 0.05 ? "rising" : fit.slope < -0.05 ? "falling" : "steady";

  return { predictedAqi: Math.max(0, predictedAqi), direction };
}

/**
 * Sample the same fitted trend line at several future points, for charting
 * (e.g. a 3-hour forecast sparkline). Same regression as predictTrend, just
 * evaluated at multiple x values instead of one.
 * @param {{ t: number, aqi: number }[]} history
 * @param {number[]} minutesAheadSteps
 * @returns {{ minutesAhead: number, predictedAqi: number }[]}
 */
export function predictSeries(history, minutesAheadSteps = [0, 60, 120, 180]) {
  const fit = fitLine(history);
  if (!fit) return [];

  return minutesAheadSteps.map((minutesAhead) => ({
    minutesAhead,
    predictedAqi: Math.max(0, Math.round(fit.intercept + fit.slope * (fit.lastX + minutesAhead))),
  }));
}
