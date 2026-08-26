import { distanceMiles, bearingCompass } from "./haversine";

// 511.org SF Bay Open Data — Traffic Events API (Open511 protocol, covers
// all 9 Bay Area counties incl. Contra Costa). Free, but requires a
// developer key: https://511.org/open-data/token
// https://511.org/open-data/traffic
//
// Schema below is confirmed against a REAL live response (not just docs) —
// an earlier version of this file was written against a different vendor's
// schema (RoadwayName/Latitude/Longitude/IsFullClosure) found in another
// state's 511 docs, which turned out to be wrong for 511.org itself. Live
// testing here found the real shape: { events: [{ event_type, severity,
// geography: { type: "Point", coordinates: [lng, lat] }, roads: [{ name,
// direction, state }], headline, ... }] }. "state": "CLOSED" on a road is
// the genuine full-closure signal (SOME_LANES_CLOSED / SINGLE_LANE_ALTERNATING
// are partial and deliberately excluded — this feature is scoped to actual
// closures, not general lane restrictions).
//
// No server-side geo filter exists (confirmed: same endpoint returns every
// active Bay Area event regardless of query params), so distance filtering
// happens client-side, same as PurpleAir/FIRMS elsewhere in this app.
const KEY = import.meta.env.VITE_511_API_KEY;
const BASE_URL = "https://api.511.org/traffic/events";

const RADIUS_MILES = 20;

/**
 * Active full road closures near a location, distance/direction-annotated
 * and sorted nearest-first. Returns [] if no key, request failure, or
 * nothing within range — never fabricated/mock data. It is normal and
 * correct for this to return [] most of the time (full closures are rare;
 * this deliberately excludes routine lane restrictions/construction noise).
 * @param {number} lat @param {number} lng
 * @returns {Promise<{ id: string, roadway: string, direction: string|null, headline: string, severity: string, eventType: string, lat: number, lng: number, distanceMiles: number, compassDirection: string }[]>}
 */
export async function fetchRoadClosures(lat, lng) {
  if (!KEY) return [];

  const params = new URLSearchParams({ api_key: KEY, format: "json", limit: "500" });

  try {
    const res = await fetch(`${BASE_URL}?${params}`);
    if (!res.ok) return [];

    const body = await res.json();
    const events = body.events ?? [];

    return events
      .filter((e) => e.geography?.type === "Point" && Array.isArray(e.geography.coordinates))
      .filter((e) => (e.roads ?? []).some((r) => r.state === "CLOSED"))
      .map((e) => {
        const [eLng, eLat] = e.geography.coordinates;
        const closedRoad = e.roads.find((r) => r.state === "CLOSED");
        return {
          id: e.id,
          roadway: closedRoad?.name ?? "Unknown road",
          direction: closedRoad?.direction ?? null,
          headline: e.headline ?? "",
          severity: e.severity ?? "Unknown",
          eventType: e.event_type ?? "unknown",
          lat: eLat,
          lng: eLng,
          distanceMiles: Math.round(distanceMiles(lat, lng, eLat, eLng) * 10) / 10,
          compassDirection: bearingCompass(lat, lng, eLat, eLng),
        };
      })
      .filter((e) => e.distanceMiles <= RADIUS_MILES)
      .sort((a, b) => a.distanceMiles - b.distanceMiles);
  } catch {
    return [];
  }
}
