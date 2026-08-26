import { distanceMiles, bearingCompass } from "./haversine";

const FIRMS_KEY = import.meta.env.VITE_FIRMS_API_KEY;

// Bounding box half-width in degrees (~140 miles) — wide enough to catch
// regional fires, not just ones directly on top of the selected city.
const BOX_DEGREES = 2;
const SOURCE = "VIIRS_SNPP_NRT";
const DAY_RANGE = 1;

/**
 * NASA FIRMS active-fire hotspot detections near a location, each with its
 * distance/direction from that location already computed (used both for
 * the "nearest fire" verdict and for plotting every hotspot on the map).
 * https://firms.modaps.eosdis.nasa.gov/api/ (free MAP_KEY signup required)
 * Requires VITE_FIRMS_API_KEY. Returns [] if unavailable/no key/no hotspots.
 * @param {number} lat @param {number} lng
 * @returns {Promise<{ lat: number, lng: number, distanceMiles: number, direction: string, confidence: string }[]>}
 */
export async function fetchWildfireHotspots(lat, lng) {
  if (!FIRMS_KEY) return [];

  const west = lng - BOX_DEGREES;
  const south = lat - BOX_DEGREES;
  const east = lng + BOX_DEGREES;
  const north = lat + BOX_DEGREES;
  const area = `${west},${south},${east},${north}`;

  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_KEY}/${SOURCE}/${area}/${DAY_RANGE}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const csv = await res.text();
    const hotspots = parseHotspots(csv);

    return hotspots
      .map((h) => ({
        ...h,
        distanceMiles: Math.round(distanceMiles(lat, lng, h.lat, h.lng) * 10) / 10,
        direction: bearingCompass(lat, lng, h.lat, h.lng),
      }))
      .sort((a, b) => a.distanceMiles - b.distanceMiles);
  } catch {
    return [];
  }
}

/** Convenience wrapper for the "nearest fire" verdict used by recommendation.js. */
export function nearestWildfire(hotspots) {
  return hotspots.length > 0 ? hotspots[0] : null;
}

/**
 * Re-derive the nearest hotspot relative to an arbitrary point (e.g. a
 * specific school's geocoded location) instead of the original query
 * center — same real hotspot data, just measured from somewhere else.
 * @param {{ lat: number, lng: number }[]} hotspots
 * @param {number} lat @param {number} lng
 */
export function nearestWildfireFrom(hotspots, lat, lng) {
  if (hotspots.length === 0) return null;

  return hotspots
    .map((h) => ({
      ...h,
      distanceMiles: Math.round(distanceMiles(lat, lng, h.lat, h.lng) * 10) / 10,
      direction: bearingCompass(lat, lng, h.lat, h.lng),
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)[0];
}

function parseHotspots(csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].split(",");
  const latIdx = header.indexOf("latitude");
  const lngIdx = header.indexOf("longitude");
  const confIdx = header.indexOf("confidence");

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    return {
      lat: parseFloat(cols[latIdx]),
      lng: parseFloat(cols[lngIdx]),
      confidence: cols[confIdx] ?? "unknown",
    };
  }).filter((h) => !Number.isNaN(h.lat) && !Number.isNaN(h.lng));
}
