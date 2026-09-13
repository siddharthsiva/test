import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Marker, Polygon, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AQI_CATEGORIES, scoreAqi } from "../lib/riskScoring";

// Leaflet divIcons take a raw HTML string (rendered outside React's tree),
// so these are hand-written SVGs rather than lucide-react components.
const PIN_SVG = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-7.28-7-12a7 7 0 0 1 14 0c0 4.72-7 12-7 12z"/><circle cx="12" cy="9" r="2.5" fill="currentColor" stroke="none"/></svg>`;

const FLAME_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2c1.2 3.2-2.6 4.4-2.6 8.2a2.6 2.6 0 0 0 5.2 0c0-.9-.5-1.7-.9-2.5 2.1 1.1 3.9 3.3 3.9 6.1a5.6 5.6 0 0 1-11.2 0C6.4 8.6 10.1 6.8 12 2z"/></svg>`;

const SHELTER_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`;

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
 */
export function MapView({ location, sensors, hotspots, firePerimeters = [], shelters = [], evacuationZones = [] }) {
  const center = [location.lat, location.lng];

  // Widening the sensor query range earlier this session means up to 1200
  // points can render at once — at a fixed radius those overlap into an
  // unreadable solid blob in dense areas. Scale the marker size down as the
  // count grows so it stays legible instead of just adding more clutter.
  const sensorRadius = sensors.length > 600 ? 4 : sensors.length > 200 ? 5 : 7;

  return (
    <div className="map-view">
      <MapContainer center={center} zoom={9} scrollWheelZoom={true} style={{ height: "360px", width: "100%" }}>
        <RecenterMap center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={center} icon={locationIcon}>
          <Popup>{location.name}</Popup>
        </Marker>

        {sensors.map((s, i) => {
          const category = scoreAqi(s.aqi);
          return (
            <CircleMarker
              key={i}
              center={[s.lat, s.lng]}
              radius={sensorRadius}
              pathOptions={{ color: "#fff", weight: sensorRadius > 5 ? 1 : 0.5, fillColor: category.color, fillOpacity: 0.8 }}
            >
              <Popup>
                AQI {s.aqi} — {category.label}
              </Popup>
            </CircleMarker>
          );
        })}

        {hotspots.map((h, i) => (
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

        {firePerimeters.map((fire, i) =>
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

        {evacuationZones.map((zone, i) =>
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

        {shelters.map((s, i) => (
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
      </MapContainer>

      <div className="map-legend">
        {AQI_CATEGORIES.map((c) => (
          <span key={c.label} className="map-legend-item">
            <span className="map-legend-swatch" style={{ backgroundColor: c.color }} />
            {c.label}
          </span>
        ))}
      </div>

      <p className="map-caption">
        {sensors.length > 0 ? `${sensors.length} air sensors` : "No live sensor data"} · {hotspots.length} active
        fire detection{hotspots.length === 1 ? "" : "s"}
        {shelters.length > 0 && <> · {shelters.length} shelter{shelters.length === 1 ? "" : "s"} open now</>}
        {evacuationZones.length > 0 && (
          <> · {evacuationZones.length} active evacuation zone{evacuationZones.length === 1 ? "" : "s"}</>
        )}
      </p>
    </div>
  );
}
