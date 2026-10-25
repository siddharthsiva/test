import { distanceMiles, bearingCompass } from "./haversine";

const FIRMS_KEY = import.meta.env.VITE_FIRMS_API_KEY;

// Bounding box half-width in degrees (~140 miles) — wide enough to catch
// regional fires, not just ones directly on top of the selected city.
const BOX_DEGREES = 2;
// Real, comparable-resolution (375m) NRT satellites — querying only
// VIIRS_SNPP_NRT (the previous behavior) missed genuine detections made by
// the other two: FIRMS has no combined/comma-separated source parameter,
// each satellite's overpasses are a separate request. MODIS_NRT (1km, more
// false-positive-prone) and LANDSAT_NRT (30m but a ~16-day revisit cycle,
// a different use case) are deliberately left out.
const SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT"];
// FIRMS' day_range is calendar-day based — "TODAY to TODAY - (DAY_RANGE-1)"
// — not a rolling window of hours. At DAY_RANGE=1 ("today" only), a real
// detection from just before the UTC day boundary drops off within
// minutes of real time even though the fire hasn't gone anywhere; 2 still
// catches that without pulling in multi-day-old detections.
const DAY_RANGE = 2;
// 3 satellites x a 2-day window can return genuinely thousands of real
// detection pixels during a large active fire complex. Cap for map render
// performance only — same pattern as the PurpleAir sensor cap in
// airQuality.js — sorted nearest-first below, so this never drops a
// closer real detection in favor of a farther one.
const MAX_HOTSPOTS = 300;

/**
 * NASA FIRMS active-fire hotspot detections near a location, each with its
 * distance/direction from that location already computed (used both for
 * the "nearest fire" verdict and for plotting every hotspot on the map).
 * Queries every source in SOURCES in parallel and merges them — real
 * satellite passes are independent events, not duplicates to dedupe away.
 * https://firms.modaps.eosdis.nasa.gov/api/ (free MAP_KEY signup required)
 * Requires VITE_FIRMS_API_KEY. Returns [] if unavailable/no key/no hotspots.
 * @param {number} lat @param {number} lng
 * @returns {Promise<{ lat: number, lng: number, distanceMiles: number, direction: string, confidence: string, source: string }[]>}
 */
export async function fetchWildfireHotspots(lat, lng) {
  if (!FIRMS_KEY) return [];

  const west = lng - BOX_DEGREES;
  const south = lat - BOX_DEGREES;
  const east = lng + BOX_DEGREES;
  const north = lat + BOX_DEGREES;
  const area = `${west},${south},${east},${north}`;

  const results = await Promise.all(
    SOURCES.map(async (source) => {
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_KEY}/${source}/${area}/${DAY_RANGE}`;
      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const csv = await res.text();
        return parseHotspots(csv).map((h) => ({ ...h, source }));
      } catch {
        return [];
      }
    })
  );

  return results
    .flat()
    .map((h) => ({
      ...h,
      distanceMiles: Math.round(distanceMiles(lat, lng, h.lat, h.lng) * 10) / 10,
      direction: bearingCompass(lat, lng, h.lat, h.lng),
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, MAX_HOTSPOTS);
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
