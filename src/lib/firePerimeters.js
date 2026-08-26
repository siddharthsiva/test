// NIFC WFIGS (Wildland Fire Interagency Geospatial Services) — free,
// keyless, public ArcGIS REST API for the REAL current perimeter of active
// fires, updated every ~5 minutes. This is the actual current boundary,
// not a predicted/simulated future shape — a legitimate map layer, distinct
// from the "digital twin fire movement simulation" this project declined.
// Verified live before writing this.
const BASE_URL =
  "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query";

const BOX_DEGREES = 2; // matches wildfire.js hotspot box, ~140 miles

/**
 * @param {number} lat @param {number} lng
 * @returns {Promise<{ name: string, acres: number, rings: [number, number][][] }[]>}
 *   `rings` are arrays of [lat, lng] pairs, ready for a Leaflet <Polygon>.
 */
export async function fetchFirePerimeters(lat, lng) {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "poly_IncidentName,poly_GISAcres",
    geometry: `${lng - BOX_DEGREES},${lat - BOX_DEGREES},${lng + BOX_DEGREES},${lat + BOX_DEGREES}`,
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    outSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    returnGeometry: "true",
    f: "json",
  });

  try {
    const res = await fetch(`${BASE_URL}?${params}`);
    if (!res.ok) return [];

    const body = await res.json();

    return (body.features ?? [])
      .filter((f) => f.geometry?.rings?.length)
      .map((f) => ({
        name: f.attributes.poly_IncidentName ?? "Unnamed fire",
        acres: f.attributes.poly_GISAcres ?? null,
        // ArcGIS rings are [lng, lat]; Leaflet wants [lat, lng].
        rings: f.geometry.rings.map((ring) => ring.map(([x, y]) => [y, x])),
      }));
  } catch {
    return [];
  }
}
