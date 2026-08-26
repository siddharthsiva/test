import { distanceMiles, bearingCompass } from "./haversine";

// FEMA's National Shelter System "Open Shelters" service — free, keyless,
// public ArcGIS REST API, synced from the real Red Cross shelter database.
// This tracks shelters CURRENTLY OPEN during an active declared emergency —
// it is correctly empty outside of a real disaster, not a static directory
// of "potential" sites. Verified live before writing this.
const BASE_URL = "https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/MapServer/0/query";

const BOX_DEGREES = 0.75; // ~50 miles

/**
 * @param {number} lat @param {number} lng
 * @returns {Promise<{ name: string, address: string, city: string, distanceMiles: number, direction: string, capacity: number|null, petFriendly: boolean, adaCompliant: boolean }[]>}
 */
export async function fetchOpenShelters(lat, lng) {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "shelter_name,address,city,state,shelter_status,evacuation_capacity,pet_accommodations_code,ada_compliant,latitude,longitude",
    geometry: `${lng - BOX_DEGREES},${lat - BOX_DEGREES},${lng + BOX_DEGREES},${lat + BOX_DEGREES}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    f: "json",
  });

  try {
    const res = await fetch(`${BASE_URL}?${params}`);
    if (!res.ok) return [];

    const body = await res.json();

    return (body.features ?? [])
      .map((f) => f.attributes)
      .filter((a) => typeof a.latitude === "number" && typeof a.longitude === "number")
      .map((a) => ({
        name: a.shelter_name,
        address: a.address,
        city: a.city,
        lat: a.latitude,
        lng: a.longitude,
        distanceMiles: Math.round(distanceMiles(lat, lng, a.latitude, a.longitude) * 10) / 10,
        direction: bearingCompass(lat, lng, a.latitude, a.longitude),
        capacity: a.evacuation_capacity ?? null,
        petFriendly: a.pet_accommodations_code === "Y",
        adaCompliant: a.ada_compliant === "Y",
      }))
      .sort((a, b) => a.distanceMiles - b.distanceMiles);
  } catch {
    return [];
  }
}
