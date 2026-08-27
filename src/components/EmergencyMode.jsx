import { Flame, Home, Construction, ShieldAlert, Users, Phone } from "lucide-react";
import { windDirectionCompass } from "../lib/weather";
import { getEmergencyRiskLevel } from "../lib/recommendation";

const NEARBY_ZONE_MILES = 40;

// Real data only (fire distance/direction, wind, AQI, open shelters, active
// road closures, active evacuation zones) plus links to the actual
// authoritative sources — deliberately does NOT compute its own evacuation
// routes. See README for why. Both links below were verified against
// independent search results (not just fetched) to be the genuine official
// Contra Costa CWS and Cal Fire incidents pages.
export function EmergencyMode({ aqi, weather, wildfire, schoolName, schoolWildfire, shelters = [], roadClosures = [], evacuationZones = [], members = [], contacts = [] }) {
  const nearbyZones = evacuationZones.filter((z) => z.distanceMiles <= NEARBY_ZONE_MILES);
  const hasFire = wildfire != null;
  const risk = aqi != null ? getEmergencyRiskLevel(aqi, wildfire) : null;

  return (
    <div className="emergency-mode">
      <h2>
        <Flame size={18} strokeWidth={2.25} /> Emergency Mode
      </h2>

      {risk && (
        <p className="risk-level" style={{ color: risk.color }}>
          Risk level: <strong>{risk.level}</strong>
        </p>
      )}

      {hasFire ? (
        <p>
          Nearest detected active fire: <strong>{wildfire.distanceMiles} mi {wildfire.direction}</strong> of this
          location (satellite confidence: {wildfire.confidence}).
        </p>
      ) : (
        <p>No active wildfire detected nearby in the last day.</p>
      )}

      {schoolName && schoolWildfire && (
        <p>
          {schoolName}: <strong>{schoolWildfire.distanceMiles} mi {schoolWildfire.direction}</strong> from the affected area
          <span className="school-distance-note"> (real distance from your saved school, not the city center)</span>
        </p>
      )}

      {weather && (
        <p>
          Wind: {Math.round(weather.windSpeedMph)} mph from the {windDirectionCompass(weather.windDirectionDeg)}, {Math.round(weather.temperatureF)}°F
        </p>
      )}

      {aqi != null && <p>Current AQI: {aqi}</p>}

      {members.length > 0 && (
        <div className="shelter-list">
          <p className="shelter-list-heading">
            <Users size={14} strokeWidth={2.25} /> Household ({members.length})
          </p>
          <ul>
            {members.map((m) => (
              <li key={m.id}>
                <strong>{m.name || "Unnamed"}</strong> — {m.type}
                {m.needs && (
                  <>
                    <br />
                    Needs: {m.needs}
                  </>
                )}
                {m.responsibility && (
                  <>
                    <br />
                    Responsible for: {m.responsibility}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {contacts.length > 0 && (
        <div className="shelter-list">
          <p className="shelter-list-heading">
            <Phone size={14} strokeWidth={2.25} /> Contacts
          </p>
          <ul>
            {contacts.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong>{c.relation && ` (${c.relation})`}
                {c.phone && (
                  <>
                    <br />
                    {c.phone}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {nearbyZones.length > 0 && (
        <div className="shelter-list">
          <p className="shelter-list-heading">
            <ShieldAlert size={14} strokeWidth={2.25} /> {nearbyZones.length} active evacuation zone{nearbyZones.length === 1 ? "" : "s"} within {NEARBY_ZONE_MILES} mi
            (Cal OES statewide feed)
          </p>
          <ul>
            {nearbyZones.slice(0, 3).map((z) => (
              <li key={z.zoneId}>
                <strong>{z.zoneName}</strong> — {z.status}, {z.distanceMiles} mi {z.direction}
                {z.publicInfo && (
                  <>
                    <br />
                    {z.publicInfo}
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {shelters.length > 0 && (
        <div className="shelter-list">
          <p className="shelter-list-heading">
            <Home size={14} strokeWidth={2.25} /> {shelters.length} shelter{shelters.length === 1 ? "" : "s"} open now
            (FEMA National Shelter System)
          </p>
          <ul>
            {shelters.slice(0, 3).map((s) => (
              <li key={s.name + s.address}>
                <strong>{s.name}</strong> — {s.distanceMiles} mi {s.direction}
                <br />
                {s.address}, {s.city}
                {s.petFriendly && " · pet-friendly"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {roadClosures.length > 0 && (
        <div className="shelter-list">
          <p className="shelter-list-heading">
            <Construction size={14} strokeWidth={2.25} /> {roadClosures.length} road closure{roadClosures.length === 1 ? "" : "s"} nearby
            (511 SF Bay)
          </p>
          <ul>
            {roadClosures.slice(0, 3).map((c) => (
              <li key={c.id}>
                <strong>{c.roadway}</strong> — {c.distanceMiles} mi {c.compassDirection}
                {c.direction && ` (${c.direction})`}
                <br />
                {c.headline}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="disclaimer">
        This is decision support, not an official alert. For evacuation zones and road closures,
        always check:
      </p>
      <ul className="official-links">
        <li>
          <a href="https://cwsalerts.com/" target="_blank" rel="noreferrer">
            Contra Costa County Community Warning System
          </a>
        </li>
        <li>
          <a href="https://www.fire.ca.gov/incidents" target="_blank" rel="noreferrer">
            Cal Fire — active incidents
          </a>
        </li>
      </ul>
    </div>
  );
}
