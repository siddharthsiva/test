import { pm25ToAqi } from "./pm25ToAqi";
import { distanceMiles } from "./haversine";

const PURPLEAIR_KEY = import.meta.env.VITE_PURPLEAIR_API_KEY;
const AIRNOW_KEY = import.meta.env.VITE_AIRNOW_API_KEY;

// Bounding box half-width in degrees. PurpleAir bills per row *returned by
// the API itself* — the MAX_SENSORS cap below only trims what we render
// client-side, after already paying for every row in the box. A 1.5deg box
// (~104mi half-width, ~208mi across) was burning through a fresh 1M-point
// account in days. 0.4deg (~28mi half-width, ~56mi across) still comfortably
// covers all of Contra Costa County plus neighboring Oakland/Berkeley/SF,
// at roughly 1/14th the area (and therefore roughly 1/14th the sensor rows
// billed) of the old box.
const BOX_DEGREES = 0.4;

// The "official" location AQI average only uses sensors within this radius,
// so a wider map box (above) doesn't dilute the location-specific reading
// with sensors from a neighboring city.
const LOCAL_AVERAGE_RADIUS_MILES = 8;

// Client-side render cap only — does NOT reduce billed cost (see BOX_DEGREES
// above). Kept as a safety net for render performance in unusually dense
// areas; the smaller box above now rarely approaches this anyway.
const MAX_SENSORS = 500;

// PurpleAir sensors occasionally report physically implausible raw readings
// (malfunction/miscalibration) — e.g. 4998.5 µg/m³ next to neighbors reading
// 2-7 µg/m³. Even the worst recorded wildfire smoke events rarely exceed
// ~700 µg/m³, so anything past this is treated as sensor error, not data,
// and excluded before it can skew the average or mislabel a map marker.
const MAX_PLAUSIBLE_PM25 = 1000;

/**
 * Raw PurpleAir sensor readings near a lat/lng, each with its own AQI —
 * used both to compute the averaged location reading and to plot
 * individual sensors on the map. Requires VITE_PURPLEAIR_API_KEY.
 * @param {number} lat @param {number} lng
 * @returns {Promise<{ lat: number, lng: number, pm25: number, aqi: number, distanceMiles: number }[]>}
 */
export async function fetchPurpleAirSensors(lat, lng) {
  if (!PURPLEAIR_KEY) return [];

  // Plain "pm2.5" is a single, un-smoothed 2-minute snapshot — PurpleAir's
  // own API community explicitly warns against using it for anything but a
  // live single-sensor dashboard, since normal sensor-to-sensor noise (a
  // brief gust, a momentary dip) can swing it well away from the real
  // ambient level for that instant. "pm2.5_10minute" is PurpleAir's own
  // server-computed rolling average — still genuinely real-time for a
  // wildfire-safety tool (10 minutes old, not stale), but smooths out
  // exactly the kind of noise that was making readings swing unrealistically
  // low/high compared to other sources computing an average, not a snapshot.
  // Falls back to the raw field only for a sensor too new to have 10
  // minutes of history yet (null field) rather than dropping it entirely.
  const params = new URLSearchParams({
    fields: "pm2.5_10minute,pm2.5,latitude,longitude",
    nwlat: String(lat + BOX_DEGREES),
    nwlng: String(lng - BOX_DEGREES),
    selat: String(lat - BOX_DEGREES),
    selng: String(lng + BOX_DEGREES),
  });

  try {
    const res = await fetch(`https://api.purpleair.com/v1/sensors?${params}`, {
      headers: { "X-API-Key": PURPLEAIR_KEY },
    });
    if (!res.ok) return [];

    const body = await res.json();
    const fields = body.fields ?? [];
    const pm25AvgIdx = fields.indexOf("pm2.5_10minute");
    const pm25RawIdx = fields.indexOf("pm2.5");
    const latIdx = fields.indexOf("latitude");
    const lngIdx = fields.indexOf("longitude");

    return (body.data ?? [])
      .map((row) => {
        const avg = row[pm25AvgIdx];
        const raw = row[pm25RawIdx];
        return { pm25: typeof avg === "number" ? avg : raw, lat: row[latIdx], lng: row[lngIdx] };
      })
      .filter(
        (s) =>
          typeof s.pm25 === "number" &&
          typeof s.lat === "number" &&
          typeof s.lng === "number" &&
          s.pm25 >= 0 &&
          s.pm25 <= MAX_PLAUSIBLE_PM25
      )
      .map((s) => ({
        ...s,
        aqi: pm25ToAqi(s.pm25),
        distanceMiles: distanceMiles(lat, lng, s.lat, s.lng),
      }))
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
      .slice(0, MAX_SENSORS);
  } catch {
    return [];
  }
}

/**
 * Average already-fetched PurpleAir sensors near a lat/lng into one
 * location-level AQI reading. Only sensors within LOCAL_AVERAGE_RADIUS_MILES
 * count toward the average, even though the caller's sensor list covers a
 * wider area for the map.
 *
 * Deliberately takes `sensors` as an argument instead of fetching them
 * itself — this used to call fetchPurpleAirSensors() a second time
 * internally, meaning every page load fired the same expensive wide-area
 * PurpleAir query twice (once here, once for the map) for identical data.
 * PurpleAir bills by points per field-per-sensor returned, and doubling a
 * query that already returns up to 1200 sensors is exactly what burned
 * through this project's point balance. Fetch once, reuse the result.
 */
export function averageFromSensors(sensors, lat, lng) {
  if (sensors.length === 0) return null;

  // Real distance from the point being asked about — NOT the sensor's
  // precomputed `distanceMiles`, which is relative to wherever the original
  // wide-area fetch was centered (e.g. the selected city). Re-deriving this
  // is what makes it safe to reuse the same already-fetched sensor list for
  // a different point (e.g. a saved school address) instead of firing a
  // second expensive PurpleAir query for it.
  const withDistance = sensors.map((s) => ({ ...s, distanceFromPoint: distanceMiles(lat, lng, s.lat, s.lng) }));

  const local = withDistance.filter((s) => s.distanceFromPoint <= LOCAL_AVERAGE_RADIUS_MILES);
  // Fall back to the nearest few sensors if none happen to fall inside the
  // local radius (sparse coverage), rather than reporting nothing.
  const forAverage = local.length > 0 ? local : [...withDistance].sort((a, b) => a.distanceFromPoint - b.distanceFromPoint).slice(0, 3);

  const avgPm25 = forAverage.reduce((sum, s) => sum + s.pm25, 0) / forAverage.length;
  return { aqi: pm25ToAqi(avgPm25), source: "purpleair", sensorCount: forAverage.length };
}

/**
 * Query AirNow for the current official AQI reading nearest a lat/lng.
 * Requires VITE_AIRNOW_API_KEY. Returns null if unavailable/no data.
 *
 * Uses the "Current Observations by Latitude/Longitude or ZIP Code" endpoint
 * (/aq/observation/current/ziplatlong/) — AirNow retired the old
 * /aq/observation/latLong/current/ endpoint on 2026-09-30 (confirmed via
 * AirNow's own migration notice, docs.airnowapi.org/docs/AirNowAPIUpdates2026June.pdf,
 * after the old one started returning 410 Gone). The existing API key works
 * unchanged on the new endpoint, but the response schema is different —
 * verified against a real live response rather than assumed from docs:
 * `ParameterName`/`AQI` became lowercase `parameterName`/`nowcastAQI`.
 */
async function fetchAirNow(lat, lng) {
  if (!AIRNOW_KEY) return null;

  const params = new URLSearchParams({
    format: "application/json",
    latitude: String(lat),
    longitude: String(lng),
    distance: "25",
    API_KEY: AIRNOW_KEY,
  });

  const res = await fetch(`https://www.airnowapi.org/aq/observation/current/ziplatlong/?${params}`);
  if (!res.ok) return null;

  const body = await res.json();
  const pm25Reading = body.find((r) => r.parameterName === "PM2.5");
  if (!pm25Reading) return null;

  return { aqi: pm25Reading.nowcastAQI, source: "airnow", sensorCount: 1 };
}

/** Deterministic placeholder reading so the UI is demoable with no API keys yet. */
function mockReading(location) {
  // Varies a little by location so the demo isn't identical everywhere.
  const base = 60 + (location.id.length % 5) * 20;
  return { aqi: base, source: "mock", sensorCount: 0 };
}

/**
 * Get the current AQI for a location, preferring PurpleAir (denser network),
 * falling back to AirNow, falling back to a mock reading for local dev.
 * Takes the already-fetched sensor list (see averageFromSensors' docstring
 * for why) rather than fetching it again itself.
 * @param {{ id: string, lat: number, lng: number }} location
 * @param {{ pm25: number, lat: number, lng: number, distanceMiles: number }[]} sensors
 */
export async function getCurrentAqi(location, sensors) {
  const purpleAir = averageFromSensors(sensors, location.lat, location.lng);
  if (purpleAir) return purpleAir;

  const airNow = await fetchAirNow(location.lat, location.lng).catch(() => null);
  if (airNow) return airNow;

  return mockReading(location);
}
