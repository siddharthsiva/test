// EPA's official piecewise-linear PM2.5 (µg/m³) -> AQI conversion, per the
// breakpoint table revised May 6, 2024 (EPA's reconsideration of the PM
// NAAQS — lowered the "Good" threshold from 12.0 to 9.0 µg/m³ and tightened
// the Very Unhealthy/Hazardous bands, reflecting newer health-risk research
// at lower concentrations). The pre-2024 table (12.0/35.4/55.4/150.4/...)
// is still what a lot of older code examples online use, but it now
// under-reports AQI relative to every current official source (AirNow,
// IQAir, PurpleAir's own site) — confirmed against a live mismatch (this
// app showing AQI 11 for Antioch while IQAir's multi-station aggregate
// showed 28 for the same moment) before tracing it to this stale table.
// PurpleAir sensors report raw PM2.5, not AQI, so this conversion is
// required before running a reading through riskScoring.js.
const BREAKPOINTS = [
  { cLow: 0.0, cHigh: 9.0, aqiLow: 0, aqiHigh: 50 },
  { cLow: 9.1, cHigh: 35.4, aqiLow: 51, aqiHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, aqiLow: 101, aqiHigh: 150 },
  { cLow: 55.5, cHigh: 125.4, aqiLow: 151, aqiHigh: 200 },
  { cLow: 125.5, cHigh: 225.4, aqiLow: 201, aqiHigh: 300 },
  { cLow: 225.5, cHigh: 325.4, aqiLow: 301, aqiHigh: 500 },
];

/** @param {number} pm25 concentration in µg/m³ */
export function pm25ToAqi(pm25) {
  const c = Math.max(0, pm25);
  const bp = BREAKPOINTS.find((b) => c <= b.cHigh) ?? BREAKPOINTS[BREAKPOINTS.length - 1];
  const aqi =
    ((bp.aqiHigh - bp.aqiLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.aqiLow;
  return Math.round(aqi);
}
