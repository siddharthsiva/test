import { distanceMiles, bearingCompass } from "./haversine";

// Cal OES "CA_EVACUATIONS" statewide aggregation layer — free, keyless
// ArcGIS FeatureServer mirroring every county's Genasys/Zonehaven evacuation
// zones, refreshed every 5 minutes. Contra Costa is a real Genasys/Zonehaven
// county (2021 contract), so this will show its real zones the moment an
// actual evacuation is declared there. Verified live before writing this:
// this layer holds ONLY active Warning/Order zones, not a permanent
// "look up your zone number" catalog — it is correctly empty on a normal
// day, same as shelters/firePerimeters, not a bug.
const BASE_URL =
  "https://services.arcgis.com/BLN4oKB0N1YSgvY8/arcgis/rest/services/CA_EVACUATIONS_CalOESHosted_view/FeatureServer/0/query";

const BOX_DEGREES = 2; // matches wildfire.js/firePerimeters.js — wide enough to catch a regional evacuation

/**
 * @param {number} lat @param {number} lng
 * @returns {Promise<{ zoneName: string, zoneId: string, status: string, eventType: string|null, criticalInfo: string|null, publicInfo: string|null, rings: [number, number][][], distanceMiles: number, direction: string }[]>}
 *   `rings` are arrays of [lat, lng] pairs, ready for a Leaflet <Polygon>. `distanceMiles`/`direction`
 *   are measured to the zone's outer-ring centroid — a reasonable stand-in for "how far is this
 *   zone" since these are large polygons, not points.
 */
export async function fetchEvacuationZones(lat, lng) {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "COUNTY,CITY,ZONE_NAME,ZONE_ID,STATUS,EVENT_TYPE,CRITICAL_INFO,PUBLIC_INFO",
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
      .map((f) => {
        // ArcGIS rings are [lng, lat]; Leaflet wants [lat, lng].
        const rings = f.geometry.rings.map((ring) => ring.map(([x, y]) => [y, x]));
        const outerRing = rings[0];
        const centroidLat = outerRing.reduce((sum, [rLat]) => sum + rLat, 0) / outerRing.length;
        const centroidLng = outerRing.reduce((sum, [, rLng]) => sum + rLng, 0) / outerRing.length;

        return {
          zoneName: f.attributes.ZONE_NAME ?? f.attributes.ZONE_ID ?? "Unnamed zone",
          zoneId: f.attributes.ZONE_ID,
          status: f.attributes.STATUS ?? "Unknown",
          eventType: f.attributes.EVENT_TYPE ?? null,
          criticalInfo: f.attributes.CRITICAL_INFO ?? null,
          publicInfo: f.attributes.PUBLIC_INFO ?? null,
          rings,
          distanceMiles: Math.round(distanceMiles(lat, lng, centroidLat, centroidLng) * 10) / 10,
          direction: bearingCompass(lat, lng, centroidLat, centroidLng),
        };
      })
      .sort((a, b) => a.distanceMiles - b.distanceMiles);
  } catch {
    return [];
  }
}
