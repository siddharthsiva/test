import { pm25ToAqi } from "./pm25ToAqi";
import { distanceMiles } from "./haversine";

const PURPLEAIR_KEY = import.meta.env.VITE_PURPLEAIR_API_KEY;
const AIRNOW_KEY = import.meta.env.VITE_AIRNOW_API_KEY;

// Bounding box half-width in degrees (~1.5deg ≈ 104 miles) for the PurpleAir
// query. Wide enough that zooming out well past the county still shows a
// dense field of sensors instead of running out of data at the edges.
const BOX_DEGREES = 1.5;

// The "official" location AQI average only uses sensors within this radius,
// so a wider map box (above) doesn't dilute the location-specific reading
// with sensors from a neighboring city.
const LOCAL_AVERAGE_RADIUS_MILES = 8;

// A 1.5deg box can return several thousand sensors in dense areas —
// plotting all of them as individual map markers would hurt render
// performance, especially on phones. Capping to the closest N keeps the map
// fast while still being far richer than the old tight box.
const MAX_SENSORS = 1200;

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

  const params = new URLSearchParams({
    fields: "pm2.5,latitude,longitude",
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
    const pm25Idx = fields.indexOf("pm2.5");
    const latIdx = fields.indexOf("latitude");
    const lngIdx = fields.indexOf("longitude");

    return (body.data ?? [])
      .map((row) => ({ pm25: row[pm25Idx], lat: row[latIdx], lng: row[lngIdx] }))
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
function averageFromSensors(sensors, lat, lng) {
  if (sensors.length === 0) return null;

  const local = sensors.filter((s) => s.distanceMiles <= LOCAL_AVERAGE_RADIUS_MILES);
  // Fall back to the nearest few sensors if none happen to fall inside the
  // local radius (sparse coverage), rather than reporting nothing.
  const forAverage = local.length > 0 ? local : [...sensors].sort((a, b) => a.distanceMiles - b.distanceMiles).slice(0, 3);

  const avgPm25 = forAverage.reduce((sum, s) => sum + s.pm25, 0) / forAverage.length;
  return { aqi: pm25ToAqi(avgPm25), source: "purpleair", sensorCount: forAverage.length };
}

/**
 * Query AirNow for the current official AQI reading nearest a lat/lng.
 * Requires VITE_AIRNOW_API_KEY. Returns null if unavailable/no data.
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

  const res = await fetch(`https://www.airnowapi.org/aq/observation/latLong/current/?${params}`);
  if (!res.ok) return null;

  const body = await res.json();
  const pm25Reading = body.find((r) => r.ParameterName === "PM2.5");
  if (!pm25Reading) return null;

  return { aqi: pm25Reading.AQI, source: "airnow", sensorCount: 1 };
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
