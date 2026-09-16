import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Marker, Polygon, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AQI_CATEGORIES, scoreAqi } from "../lib/riskScoring";
import { distanceMiles, bearingCompass } from "../lib/haversine";

// Leaflet divIcons take a raw HTML string (rendered outside React's tree),
// so these are hand-written SVGs rather than lucide-react components.
const PIN_SVG = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-7.28-7-12a7 7 0 0 1 14 0c0 4.72-7 12-7 12z"/><circle cx="12" cy="9" r="2.5" fill="currentColor" stroke="none"/></svg>`;

const FLAME_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2c1.2 3.2-2.6 4.4-2.6 8.2a2.6 2.6 0 0 0 5.2 0c0-.9-.5-1.7-.9-2.5 2.1 1.1 3.9 3.3 3.9 6.1a5.6 5.6 0 0 1-11.2 0C6.4 8.6 10.1 6.8 12 2z"/></svg>`;

const SHELTER_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`;

const CLOSURE_SVG = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10" fill="currentColor" stroke="none"/><line x1="6" y1="12" x2="18" y2="12" stroke="#fff"/></svg>`;

const locationIcon = L.divIcon({
  html: PIN_SVG,
  className: "map-svg-icon map-svg-icon--location",
  iconSize: [26, 26],
  iconAnchor: [13, 24],
});

const fireIcon = L.divIcon({
  html: FLAME_SVG,
  className: "map-svg-icon map-svg-icon--fire",
  iconSize: [24, 24],
  iconAnchor: [12, 20],
});

const shelterIcon = L.divIcon({
  html: SHELTER_SVG,
  className: "map-svg-icon map-svg-icon--shelter",
  iconSize: [22, 22],
  iconAnchor: [11, 20],
});

const closureIcon = L.divIcon({
  html: CLOSURE_SVG,
  className: "map-svg-icon map-svg-icon--closure",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const LAYER_TABS = ["Air Quality", "Wildfires", "Evacuation Zones", "Shelters", "Road Closures"];

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

/**
 * @param {{ lat: number, lng: number, name: string }} location
 * @param {{ lat: number, lng: number, aqi: number }[]} sensors
 * @param {{ lat: number, lng: number, distanceMiles: number, direction: string, confidence: string }[]} hotspots
 * @param {{ name: string, acres: number|null, rings: [number, number][][] }[]} firePerimeters
 * @param {{ lat: number, lng: number, name: string, address: string, city: string, distanceMiles: number }[]} shelters
 * @param {{ zoneName: string, status: string, publicInfo: string|null, rings: [number, number][][] }[]} evacuationZones
 * @param {{ lat: number, lng: number, roadway: string, headline: string, distanceMiles: number }[]} roadClosures
 */
export function MapView({
  location,
  sensors,
  hotspots,
  firePerimeters = [],
  shelters = [],
  evacuationZones = [],
  roadClosures = [],
}) {
  const center = [location.lat, location.lng];
  const [activeLayer, setActiveLayer] = useState("Air Quality");

  // hotspots/shelters/roadClosures arrive with distance/direction already
  // computed by their fetch functions — but relative to WHATEVER point was
  // passed to that fetch (e.g. the selected city), not necessarily the point
  // this map is currently centered on (e.g. a saved school address). Both
  // points are almost always inside the same wide fetch box, so the pins
  // themselves are correct real data — only the "X mi [direction] of Y" text
  // needs re-deriving relative to `location`, exactly the same free,
  // no-refetch pattern already used for nearestWildfireFrom/averageFromSensors.
  const hotspotsFromHere = useMemo(
    () =>
      hotspots.map((h) => ({
        ...h,
        distanceMiles: Math.round(distanceMiles(location.lat, location.lng, h.lat, h.lng) * 10) / 10,
        direction: bearingCompass(location.lat, location.lng, h.lat, h.lng),
      })),
    [hotspots, location.lat, location.lng]
  );

  const sheltersFromHere = useMemo(
    () =>
      shelters.map((s) => ({
        ...s,
        distanceMiles: Math.round(distanceMiles(location.lat, location.lng, s.lat, s.lng) * 10) / 10,
        direction: bearingCompass(location.lat, location.lng, s.lat, s.lng),
      })),
    [shelters, location.lat, location.lng]
  );

  const roadClosuresFromHere = useMemo(
    () =>
      roadClosures.map((c) => ({
        ...c,
        distanceMiles: Math.round(distanceMiles(location.lat, location.lng, c.lat, c.lng) * 10) / 10,
        compassDirection: bearingCompass(location.lat, location.lng, c.lat, c.lng),
      })),
    [roadClosures, location.lat, location.lng]
  );

  // "Air Quality" is the overview tab — everything real shows at once, same
  // as the approved reference. The other tabs isolate one dataset so a
  // busy map can be decluttered on demand, without hiding anything by
  // default.
  const showSensors = activeLayer === "Air Quality";
  const showFire = activeLayer === "Air Quality" || activeLayer === "Wildfires";
  const showZones = activeLayer === "Air Quality" || activeLayer === "Evacuation Zones";
  const showShelters = activeLayer === "Air Quality" || activeLayer === "Shelters";
  const showClosures = activeLayer === "Air Quality" || activeLayer === "Road Closures";

  // Widening the sensor query range earlier this session means up to 1200
  // points can render at once — at a fixed radius those overlap into an
  // unreadable solid blob in dense areas. Scale the marker size down as the
  // count grows so it stays legible instead of just adding more clutter.
  const sensorRadius = sensors.length > 600 ? 4 : sensors.length > 200 ? 5 : 7;

  return (
    <div className="map-view">
      <div className="map-layer-tabs">
        {LAYER_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeLayer === tab ? "active" : ""}
            onClick={() => setActiveLayer(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="map-view-body">
        <MapContainer center={center} zoom={9} scrollWheelZoom={true} style={{ height: "440px", width: "100%" }}>
          <RecenterMap center={center} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Marker position={center} icon={locationIcon}>
            <Popup>{location.name}</Popup>
          </Marker>

          {showSensors &&
            sensors.map((s, i) => {
              const category = scoreAqi(s.aqi);
              return (
                <CircleMarker
                  key={i}
                  center={[s.lat, s.lng]}
                  radius={sensorRadius}
                  pathOptions={{ color: "#fff", weight: sensorRadius > 5 ? 1 : 0.5, fillColor: category.color, fillOpacity: 0.85 }}
                >
                  <Popup>
                    AQI {s.aqi} — {category.label}
                  </Popup>
                </CircleMarker>
              );
            })}

          {showFire &&
            hotspotsFromHere.map((h, i) => (
              <Marker key={i} position={[h.lat, h.lng]} icon={fireIcon}>
                <Popup>
                  Active fire detection
                  <br />
                  {h.distanceMiles} mi {h.direction} of {location.name}
                  <br />
                  Confidence: {h.confidence}
                </Popup>
              </Marker>
            ))}

          {showFire &&
            firePerimeters.map((fire, i) =>
              fire.rings.map((ring, j) => (
                <Polygon
                  key={`${i}-${j}`}
                  positions={ring}
                  pathOptions={{ color: "#ff3b3b", weight: 3, fillColor: "#ff3b3b", fillOpacity: 0.3, className: "fire-perimeter-path" }}
                >
                  <Popup>
                    {fire.name}
                    {fire.acres && <> — {Math.round(fire.acres).toLocaleString()} acres</>}
                    <br />
                    Real current perimeter (NIFC), updated every ~5 min.
                  </Popup>
                </Polygon>
              ))
            )}

          {showZones &&
            evacuationZones.map((zone, i) =>
              zone.rings.map((ring, j) => (
                <Polygon
                  key={`zone-${i}-${j}`}
                  positions={ring}
                  pathOptions={{
                    color: zone.status === "Evacuation Order" ? "#ff3b3b" : "#f5a623",
                    weight: 3,
                    dashArray: "8 5",
                    fillColor: zone.status === "Evacuation Order" ? "#ff3b3b" : "#f5a623",
                    fillOpacity: 0.25,
                    className: zone.status === "Evacuation Order" ? "evac-zone-path evac-zone-path--order" : "evac-zone-path",
                  }}
                >
                  <Popup>
                    <strong>{zone.zoneName}</strong> — {zone.status}
                    {zone.publicInfo && (
                      <>
                        <br />
                        {zone.publicInfo}
                      </>
                    )}
                    <br />
                    Cal OES statewide evacuation feed, updated every ~5 min.
                  </Popup>
                </Polygon>
              ))
            )}

          {showShelters &&
            sheltersFromHere.map((s, i) => (
              <Marker key={i} position={[s.lat, s.lng]} icon={shelterIcon}>
                <Popup>
                  <strong>{s.name}</strong> — open now
                  <br />
                  {s.address}, {s.city}
                  <br />
                  {s.distanceMiles} mi {s.direction} of {location.name}
                  {s.petFriendly && (
                    <>
                      <br />
                      Pet-friendly
                    </>
                  )}
                </Popup>
              </Marker>
            ))}

          {showClosures &&
            roadClosuresFromHere.map((c) => (
              <Marker key={c.id} position={[c.lat, c.lng]} icon={closureIcon}>
                <Popup>
                  <strong>{c.roadway}</strong>
                  <br />
                  {c.headline}
                  <br />
                  {c.distanceMiles} mi {c.compassDirection} of {location.name}
                </Popup>
              </Marker>
            ))}
        </MapContainer>

        <div className="map-legend">
          <span className="map-legend-heading">Your Location</span>
          <span className="map-legend-heading">Air Quality (AQI)</span>
          {AQI_CATEGORIES.map((c) => (
            <span key={c.label} className="map-legend-item">
              <span className="map-legend-swatch" style={{ backgroundColor: c.color }} />
              {c.label}
            </span>
          ))}
          <span className="map-legend-item">
            <span className="map-legend-swatch map-legend-swatch--fire" /> Fire Hotspot (NASA)
          </span>
          <span className="map-legend-item">
            <span className="map-legend-swatch" style={{ backgroundColor: "#ff3b3b", opacity: 0.4 }} /> Fire Perimeter (NIFC)
          </span>
          <span className="map-legend-item">
            <span className="map-legend-swatch" style={{ backgroundColor: "#f5a623", opacity: 0.4 }} /> Evacuation Zone (Cal OES)
          </span>
          <span className="map-legend-item">
            <span className="map-legend-swatch" style={{ backgroundColor: "#2563eb" }} /> Shelter (FEMA)
          </span>
          <span className="map-legend-item">
            <span className="map-legend-swatch" style={{ backgroundColor: "#dc2626" }} /> Road Closure (511)
          </span>
          <span className="map-legend-footnote">Live data · Updated just now</span>
        </div>
      </div>

      <div className="map-counts">
        <span className="map-count">
          <span className="map-count-dot" style={{ background: "#16a34a" }} /> {sensors.length} AQI sensors
        </span>
        <span className="map-count">
          <span className="map-count-dot" style={{ background: "#dc2626" }} /> {hotspots.length} Fire hotspots
        </span>
        <span className="map-count">
          <span className="map-count-dot" style={{ background: "#ff3b3b" }} /> {firePerimeters.length} Fire perimeters
        </span>
        <span className="map-count">
          <span className="map-count-dot" style={{ background: "#f5a623" }} /> {evacuationZones.length} Evacuation zones
        </span>
        <span className="map-count">
          <span className="map-count-dot" style={{ background: "#2563eb" }} /> {shelters.length} Open shelters
        </span>
        <span className="map-count">
          <span className="map-count-dot" style={{ background: "#dc2626" }} /> {roadClosures.length} Road closures
        </span>
      </div>
    </div>
  );
}
