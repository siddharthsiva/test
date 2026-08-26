// EPA's official piecewise-linear PM2.5 (µg/m³) -> AQI conversion.
// PurpleAir sensors report raw PM2.5, not AQI, so this conversion is
// required before running a reading through riskScoring.js.
const BREAKPOINTS = [
  { cLow: 0.0, cHigh: 12.0, aqiLow: 0, aqiHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, aqiLow: 51, aqiHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, aqiLow: 101, aqiHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, aqiLow: 151, aqiHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, aqiLow: 201, aqiHigh: 300 },
  { cLow: 250.5, cHigh: 350.4, aqiLow: 301, aqiHigh: 400 },
  { cLow: 350.5, cHigh: 500.4, aqiLow: 401, aqiHigh: 500 },
];

/** @param {number} pm25 concentration in µg/m³ */
export function pm25ToAqi(pm25) {
  const c = Math.max(0, pm25);
  const bp = BREAKPOINTS.find((b) => c <= b.cHigh) ?? BREAKPOINTS[BREAKPOINTS.length - 1];
  const aqi =
    ((bp.aqiHigh - bp.aqiLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.aqiLow;
  return Math.round(aqi);
}
