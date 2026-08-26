// Nominatim (OpenStreetMap's free geocoding search) — same provider as the
// map tiles already used in MapView.jsx, no API key. This is a light,
// one-off lookup (only runs when a user saves their school address in the
// Family Plan form), consistent with Nominatim's usage policy for small,
// non-bulk client use: https://operations.osmfoundation.org/policies/nominatim/
const BASE_URL = "https://nominatim.openstreetmap.org/search";

/**
 * @param {string} address free-text address/place name
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
export async function geocode(address) {
  if (!address || !address.trim()) return null;

  const params = new URLSearchParams({
    q: address,
    format: "jsonv2",
    limit: "1",
  });

  try {
    const res = await fetch(`${BASE_URL}?${params}`);
    if (!res.ok) return null;

    const results = await res.json();
    if (!results.length) return null;

    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}
