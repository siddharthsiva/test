// Caches the last successfully-fetched REAL reading per location, so that
// losing connectivity shows honest "last known" data with a timestamp
// instead of either a blank screen or (worse) silently falling back to the
// mock/demo reading, which would be actively misleading during a real
// outage. Never stores fabricated data — only what was genuinely fetched.
const PREFIX = "smokesmart:snapshot:";

/**
 * @param {string} locationId
 * @param {{ aqiReading: object, weather: object|null, hotspots: object[], forecast: object[], sensors: object[], firePerimeters: object[], shelters: object[], evacuationZones: object[] }} snapshot
 */
export function saveSnapshot(locationId, snapshot) {
  try {
    localStorage.setItem(PREFIX + locationId, JSON.stringify({ ...snapshot, savedAt: Date.now() }));
  } catch {
    // localStorage unavailable/full — non-critical, skip silently
  }
}

/** @param {string} locationId */
export function getSnapshot(locationId) {
  try {
    const raw = localStorage.getItem(PREFIX + locationId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
