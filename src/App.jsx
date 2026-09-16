import { useEffect, useState } from "react";
import {
  Leaf,
  WifiOff,
  Wind,
  Flame as FlameIcon,
  Home as HomeIcon,
  Users,
  Calendar,
  Bell,
  BookOpen,
  Info,
  Phone,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "./components/BrandLogo";
import { LOCATIONS } from "./lib/locations";
import { ACTIVITIES } from "./lib/activities";
import { getCurrentAqi, fetchPurpleAirSensors, averageFromSensors } from "./lib/airQuality";
import { fetchWeather, windDirectionCompass } from "./lib/weather";
import { fetchWildfireHotspots, nearestWildfire, nearestWildfireFrom } from "./lib/wildfire";
import { fetchFirePerimeters } from "./lib/firePerimeters";
import { fetchOpenShelters } from "./lib/shelters";
import { fetchRoadClosures } from "./lib/roadClosures";
import { fetchEvacuationZones } from "./lib/evacuationZones";
import { getRecommendation, getEmergencyRiskLevel } from "./lib/recommendation";
import { scoreAqi } from "./lib/riskScoring";
import { recordReading, predictSeries } from "./lib/trendPrediction";
import { ensureSignedIn } from "./lib/auth";
import { getAlertSettings, saveAlertSettings, checkAndNotify, checkAndNotifyWildfire } from "./lib/alerts";
import { getFamilyPlan, saveFamilyPlan } from "./lib/familyPlan";
import { getPrepProgress, savePrepProgress } from "./lib/prepProgress";
import { saveSnapshot, getSnapshot } from "./lib/offlineCache";
import { LocationPicker } from "./components/LocationPicker";
import { ActivityPicker } from "./components/ActivityPicker";
import { MapView } from "./components/MapView";
import { RecommendationCard } from "./components/RecommendationCard";
import { StatWidgets } from "./components/StatWidgets";
import { ForecastSparkline } from "./components/ForecastSparkline";
import { EmergencyMode } from "./components/EmergencyMode";
import { AlertSettings } from "./components/AlertSettings";
import { FamilyPlan } from "./components/FamilyPlan";
import { PrepChecklist } from "./components/PrepChecklist";
import { RecoveryResources } from "./components/RecoveryResources";
import { AssistantChat } from "./components/AssistantChat";
import { SchoolDashboard } from "./components/SchoolDashboard";
import "./App.css";

const DEFAULT_ALERT_SETTINGS = { thresholdAqi: 150, wildfireThresholdMiles: 20, notificationsEnabled: false };

function App() {
  const [view, setView] = useState("home"); // "home" | "school" | "household"
  const [emergencyActive, setEmergencyActive] = useState(false);

  const [selectedLocationId, setSelectedLocationId] = useState(LOCATIONS[0].id);
  const [selectedActivityId, setSelectedActivityId] = useState(ACTIVITIES[0].id);

  const [aqiReading, setAqiReading] = useState(null);
  const [weather, setWeather] = useState(null);
  const [sensors, setSensors] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [firePerimeters, setFirePerimeters] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [roadClosures, setRoadClosures] = useState([]);
  const [evacuationZones, setEvacuationZones] = useState([]);
  const [forecast, setForecast] = useState([]);
  const [offlineSince, setOfflineSince] = useState(null); // timestamp of the cached snapshot being shown, or null if live
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [noCacheForLocation, setNoCacheForLocation] = useState(false);

  const [uid, setUid] = useState(null);
  const [alertSettings, setAlertSettings] = useState(DEFAULT_ALERT_SETTINGS);
  const [familyPlan, setFamilyPlan] = useState(null);
  const [prepProgress, setPrepProgress] = useState([]);
  const [schoolWeather, setSchoolWeather] = useState(null);

  // Sign in (anonymous, no login screen) and load any previously saved alert
  // settings, family plan, and prep checklist progress.
  useEffect(() => {
    ensureSignedIn().then(async (id) => {
      setUid(id);
      if (!id) return;
      const [savedAlerts, savedPlan, savedPrep] = await Promise.all([
        getAlertSettings(id),
        getFamilyPlan(id),
        getPrepProgress(id),
      ]);
      if (savedAlerts) setAlertSettings(savedAlerts);
      if (savedPlan) setFamilyPlan(savedPlan);
      if (savedPrep) setPrepProgress(savedPrep);
    });
  }, []);

  // React to connectivity actually changing, not just to location/settings
  // changes — otherwise losing the network mid-session wouldn't be noticed
  // until the user happened to touch a picker.
  useEffect(() => {
    function goOffline() {
      setIsOffline(true);
    }
    function goOnline() {
      setIsOffline(false);
    }
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  // Real weather specifically at the saved school's coordinates, not the
  // selected city's — Open-Meteo is free/keyless so there's no cost concern
  // fetching it separately (unlike the PurpleAir sensor query, which is
  // reused rather than re-fetched — see averageFromSensors).
  useEffect(() => {
    if (familyPlan?.schoolLat == null || familyPlan?.schoolLng == null || isOffline) {
      setSchoolWeather(null);
      return;
    }
    let cancelled = false;
    fetchWeather(familyPlan.schoolLat, familyPlan.schoolLng).then((result) => {
      if (!cancelled) setSchoolWeather(result);
    });
    return () => {
      cancelled = true;
    };
  }, [familyPlan?.schoolLat, familyPlan?.schoolLng, isOffline]);

  useEffect(() => {
    const location = LOCATIONS.find((l) => l.id === selectedLocationId);
    let cancelled = false;

    // Offline: skip the live fetch entirely (which would otherwise silently
    // fall back to mock/demo data) and show the last real reading instead.
    // Always clear every field first — if this specific location was never
    // cached, we must not leave a *different* location's stale data on
    // screen mislabeled under the current one.
    if (isOffline) {
      setAqiReading(null);
      setWeather(null);
      setSensors([]);
      setHotspots([]);
      setFirePerimeters([]);
      setShelters([]);
      setRoadClosures([]);
      setEvacuationZones([]);
      setForecast([]);
      setOfflineSince(null);
      setNoCacheForLocation(false);

      const snapshot = getSnapshot(location.id);
      if (snapshot) {
        setAqiReading(snapshot.aqiReading);
        setWeather(snapshot.weather);
        setHotspots(snapshot.hotspots);
        setSensors(snapshot.sensors ?? []);
        setFirePerimeters(snapshot.firePerimeters ?? []);
        setShelters(snapshot.shelters ?? []);
        setEvacuationZones(snapshot.evacuationZones ?? []);
        setForecast(snapshot.forecast);
        setOfflineSince(snapshot.savedAt);
      } else {
        setNoCacheForLocation(true);
      }
      return;
    }

    setAqiReading(null);
    setWeather(null);
    setSensors([]);
    setHotspots([]);
    setFirePerimeters([]);
    setShelters([]);
    setRoadClosures([]);
    setEvacuationZones([]);
    setForecast([]);
    setOfflineSince(null);
    setNoCacheForLocation(false);

    // Sensors are fetched once here and reused for both the AQI average and
    // the map, instead of getCurrentAqi() fetching the same expensive
    // wide-area PurpleAir query a second time internally — that duplicate
    // call was doubling PurpleAir's point cost on every single location
    // load for identical data (see averageFromSensors' docstring).
    fetchPurpleAirSensors(location.lat, location.lng).then((sensorsResult) => {
      if (cancelled) return;

      Promise.all([
        getCurrentAqi(location, sensorsResult),
        fetchWeather(location.lat, location.lng),
        fetchWildfireHotspots(location.lat, location.lng),
        fetchFirePerimeters(location.lat, location.lng),
        fetchOpenShelters(location.lat, location.lng),
        fetchRoadClosures(location.lat, location.lng),
        fetchEvacuationZones(location.lat, location.lng),
      ]).then(([aqiResult, weatherResult, hotspotsResult, firePerimeterResult, sheltersResult, roadClosuresResult, evacuationZonesResult]) => {
      if (cancelled) return;

      setAqiReading(aqiResult);
      setWeather(weatherResult);
      setHotspots(hotspotsResult);
      setSensors(sensorsResult);
      setFirePerimeters(firePerimeterResult);
      setShelters(sheltersResult);
      setRoadClosures(roadClosuresResult);
      setEvacuationZones(evacuationZonesResult);

      const history = recordReading(location.id, aqiResult.aqi);
      const forecastResult = predictSeries(history);
      setForecast(forecastResult);

      if (aqiResult.source !== "mock") {
        saveSnapshot(location.id, {
          aqiReading: aqiResult,
          weather: weatherResult,
          hotspots: hotspotsResult,
          sensors: sensorsResult,
          firePerimeters: firePerimeterResult,
          shelters: sheltersResult,
          evacuationZones: evacuationZonesResult,
          forecast: forecastResult,
        });
      }

      if (alertSettings.notificationsEnabled) {
        checkAndNotify(aqiResult.aqi, alertSettings.thresholdAqi, location.name);
        checkAndNotifyWildfire(nearestWildfire(hotspotsResult), alertSettings.wildfireThresholdMiles, location.name);
      }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    selectedLocationId,
    isOffline,
    alertSettings.notificationsEnabled,
    alertSettings.thresholdAqi,
    alertSettings.wildfireThresholdMiles,
  ]);

  function handleAlertSettingsChange(updates) {
    const next = { ...alertSettings, ...updates };
    setAlertSettings(next);
    if (uid) saveAlertSettings(uid, next);
  }

  function handleFamilyPlanSave(plan) {
    setFamilyPlan(plan);
    if (uid) saveFamilyPlan(uid, plan);
  }

  function handlePrepToggle(itemId) {
    const next = prepProgress.includes(itemId)
      ? prepProgress.filter((id) => id !== itemId)
      : [...prepProgress, itemId];
    setPrepProgress(next);
    if (uid) savePrepProgress(uid, next);
  }

  const location = LOCATIONS.find((l) => l.id === selectedLocationId);
  const activity = ACTIVITIES.find((a) => a.id === selectedActivityId);
  const nearestFire = nearestWildfire(hotspots);
  const recommendation = aqiReading
    ? getRecommendation(aqiReading, weather, nearestFire, activity)
    : null;

  // Real distance from the family's specific school (geocoded), not just
  // the selected city's center — only available once a school address has
  // been saved and successfully located.
  const hasSchoolLocation = familyPlan?.schoolLat != null && familyPlan?.schoolLng != null;
  const schoolFire = hasSchoolLocation ? nearestWildfireFrom(hotspots, familyPlan.schoolLat, familyPlan.schoolLng) : nearestFire;

  // School's own AQI reading, recomputed from the already-fetched sensor
  // list around the school's real coordinates instead of the city center —
  // no extra PurpleAir call (see averageFromSensors' docstring on why that
  // matters). Falls back to the city-level reading when no school address
  // is saved yet, so School always shows *something* real, just less
  // site-specific.
  const schoolAqiReading = hasSchoolLocation ? averageFromSensors(sensors, familyPlan.schoolLat, familyPlan.schoolLng) ?? aqiReading : aqiReading;

  // Same regression already backing the forecast sparkline — just read as a
  // direction label instead of re-run, so this stays consistent with it.
  const trendDirection =
    forecast.length >= 2
      ? forecast[forecast.length - 1].predictedAqi - forecast[0].predictedAqi > 5
        ? "rising"
        : forecast[forecast.length - 1].predictedAqi - forecast[0].predictedAqi < -5
          ? "falling"
          : "steady"
      : null;

  const schoolAqiCategory = schoolAqiReading ? scoreAqi(schoolAqiReading.aqi) : { label: "—", color: "var(--text-muted)", bg: "var(--surface)" };
  const schoolWeatherEffective = hasSchoolLocation ? schoolWeather ?? weather : weather;
  const schoolRisk = schoolAqiReading ? getEmergencyRiskLevel(schoolAqiReading.aqi, schoolFire) : { level: "—", color: "var(--text-muted)" };

  function scrollToMap() {
    document.getElementById("school-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className={emergencyActive ? "page-root emergency-active" : "page-root"}>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-icon">
              <BrandLogo size={42} />
            </span>
            <div className="brand-text">
              <span className="brand-name">SmokeSmart East Bay</span>
              <span className="brand-tagline">Cleaner Air. Safer Schools. Stronger Families.</span>
            </div>
          </div>

          <nav className="view-tabs">
            <button type="button" className={view === "home" ? "active" : ""} onClick={() => setView("home")}>
              Home
            </button>
            <button type="button" className={view === "school" ? "active" : ""} onClick={() => setView("school")}>
              School
            </button>
            <button type="button" className={view === "household" ? "active" : ""} onClick={() => setView("household")}>
              Household
            </button>
          </nav>

          <div className="topbar-locality">
            <span className="locality-name">Contra Costa County, CA</span>
            <span className="locality-tagline">
              <Leaf size={12} strokeWidth={2.25} /> Real Data. Real Peace of Mind.
            </span>
          </div>
        </div>
      </header>

      <div className="app-shell">
      {offlineSince && (
        <div className="offline-banner">
          <WifiOff size={15} strokeWidth={2.25} />
          Offline — showing cached data from {new Date(offlineSince).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </div>
      )}

      {noCacheForLocation && (
        <div className="offline-banner">
          <WifiOff size={15} strokeWidth={2.25} />
          Offline, and {location.name} hasn't been loaded on this device before — no cached data to show. Try a location you've viewed while online.
        </div>
      )}

      {emergencyActive && (
        <div className="emergency-banner">
          <EmergencyMode
            aqi={aqiReading?.aqi}
            weather={weather}
            wildfire={nearestFire}
            schoolName={familyPlan?.school}
            members={familyPlan?.members}
            contacts={familyPlan?.contacts}
            schoolWildfire={schoolFire}
            shelters={shelters}
            roadClosures={roadClosures}
            evacuationZones={evacuationZones}
          />
          {familyPlan && (familyPlan.contacts?.length > 0 || familyPlan.meetingLocation) && (
            <div className="family-plan-recap">
              <strong>Your family plan:</strong>{" "}
              {familyPlan.meetingLocation && <>Meet at {familyPlan.meetingLocation}. </>}
              {familyPlan.contacts?.length > 0 && (
                <>
                  Contact {familyPlan.contacts[0].name}
                  {familyPlan.contacts[0].phone && ` (${familyPlan.contacts[0].phone})`}
                  {familyPlan.contacts.length > 1 && ` +${familyPlan.contacts.length - 1} more`}.
                </>
              )}
            </div>
          )}
        </div>
      )}

      {view === "home" ? (
        <>
          <div className="controls-row">
            <LocationPicker selectedId={selectedLocationId} onChange={setSelectedLocationId} />
            <ActivityPicker selectedId={selectedActivityId} onChange={setSelectedActivityId} />
            <div className="emergency-toggle-card">
              <div className="emergency-toggle-text">
                <span className="emergency-toggle-title">Emergency Mode</span>
                <span className="emergency-toggle-sub">Get critical info across all tabs</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={emergencyActive}
                  onChange={(e) => setEmergencyActive(e.target.checked)}
                  aria-label="Toggle Emergency Mode"
                />
                <span className="switch-track">
                  <span className="switch-thumb" />
                </span>
              </label>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-main">
              <RecommendationCard
                aqi={aqiReading?.aqi}
                source={aqiReading?.source}
                recommendation={recommendation}
                activity={activity}
              />

              <section className="map-hero">
                <MapView
                  location={location}
                  sensors={sensors}
                  hotspots={hotspots}
                  firePerimeters={firePerimeters}
                  shelters={shelters}
                  evacuationZones={evacuationZones}
                  roadClosures={roadClosures}
                />
              </section>
            </div>

            <div className="dashboard-side">
              <StatWidgets weather={weather} wildfire={nearestFire} trendDirection={trendDirection} />
              <ForecastSparkline series={forecast} />
              <AlertSettings
                thresholdAqi={alertSettings.thresholdAqi}
                wildfireThresholdMiles={alertSettings.wildfireThresholdMiles}
                notificationsEnabled={alertSettings.notificationsEnabled}
                onChange={handleAlertSettingsChange}
              />
            </div>
          </div>

          <div className="feature-grid">
            <div className="feature-card">
              <span className="feature-icon feature-icon--blue">
                <Wind size={20} strokeWidth={2.25} />
              </span>
              <h3>Know the Air</h3>
              <p>Live air quality from PurpleAir and AirNow — the same real sensor data behind the number above.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon feature-icon--red">
                <FlameIcon size={20} strokeWidth={2.25} />
              </span>
              <h3>Track the Risk</h3>
              <p>Wildfire hotspots, real fire perimeters, and evacuation zones, updated continuously on the map.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon feature-icon--green">
                <HomeIcon size={20} strokeWidth={2.25} />
              </span>
              <h3>Be Prepared</h3>
              <p>Build a family plan and a go-bag checklist in the Household tab, sourced from CAL FIRE guidance.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon feature-icon--purple">
                <Users size={20} strokeWidth={2.25} />
              </span>
              <h3>Stay Connected</h3>
              <p>Find open shelters, road closures, and official resources the moment conditions change.</p>
            </div>
          </div>

          <div className="emergency-cta-band">
            <div>
              <h3>When conditions change, we're here to help.</h3>
              <p>Switch on Emergency Mode for a focused view of what matters most.</p>
            </div>
            <button type="button" className="emergency-cta-button" onClick={() => setEmergencyActive(true)}>
              <FlameIcon size={16} strokeWidth={2.5} /> Turn On Emergency Mode
            </button>
          </div>
        </>
      ) : view === "school" ? (
        <>
          <div className="controls-row">
            <LocationPicker selectedId={selectedLocationId} onChange={setSelectedLocationId} />
            <div className="school-date">
              <Calendar size={15} strokeWidth={2.25} />
              <span>Today</span>
              <strong>
                {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </strong>
            </div>
          </div>

          {!hasSchoolLocation && (
            <div className="offline-banner">
              No school address saved yet — showing conditions for {location.name} instead. Save your school's address in
              the Household tab for site-specific readings.
            </div>
          )}

          <div className="recommendation-row">
            <div className="recommendation-card" style={{ "--category-color": schoolAqiCategory.color, "--category-bg": schoolAqiCategory.bg }}>
              <span className="card-eyebrow">School AQI{hasSchoolLocation && familyPlan?.school ? ` — ${familyPlan.school}` : ""}</span>
              <div className="aqi-number" style={{ color: schoolAqiCategory.color }}>
                {schoolAqiReading?.aqi ?? "—"}
              </div>
              <span className="aqi-pill" style={{ background: schoolAqiCategory.color }}>
                {schoolAqiCategory.label}
              </span>
              <p className="aqi-guidance">Air quality is {schoolAqiCategory.label === "Good" ? "satisfactory" : "acceptable or a concern"} for most people.</p>
              <p className="aqi-source">
                Source: {schoolAqiReading?.source === "mock" ? "demo data" : schoolAqiReading?.source ?? "—"} (just now)
              </p>
            </div>

            <div className="activity-card">
              <span className="card-eyebrow">Wildfire Risk</span>
              <div className="activity-status" style={{ color: schoolRisk.color }}>
                <FlameIcon size={22} strokeWidth={2.25} />
                <span>{schoolRisk.level}</span>
              </div>
              {schoolFire ? (
                <p className="activity-desc">
                  Nearest fire: {schoolFire.distanceMiles} mi {schoolFire.direction}
                  <br />
                  Wind:{" "}
                  {schoolWeatherEffective
                    ? `${Math.round(schoolWeatherEffective.windSpeedMph)} mph ${windDirectionCompass(schoolWeatherEffective.windDirectionDeg)}`
                    : "—"}
                </p>
              ) : (
                <p className="activity-desc">
                  No active wildfire detected nearby right now.
                  <br />
                  Wind:{" "}
                  {schoolWeatherEffective
                    ? `${Math.round(schoolWeatherEffective.windSpeedMph)} mph ${windDirectionCompass(schoolWeatherEffective.windDirectionDeg)}`
                    : "—"}
                </p>
              )}
              <button type="button" className="view-on-map-button" onClick={scrollToMap}>
                View on Map
              </button>
            </div>
          </div>

          <SchoolDashboard aqiReading={schoolAqiReading} weather={schoolWeatherEffective} wildfire={schoolFire} />

          <section className="map-hero" id="school-map">
            <h3 className="section-heading">
              School Location &amp; Nearby Risks{hasSchoolLocation && familyPlan?.school ? ` — ${familyPlan.school}` : ""}
            </h3>
            <MapView
              location={
                hasSchoolLocation
                  ? { lat: familyPlan.schoolLat, lng: familyPlan.schoolLng, name: familyPlan.school }
                  : location
              }
              sensors={sensors}
              hotspots={hotspots}
              firePerimeters={firePerimeters}
              shelters={shelters}
              evacuationZones={evacuationZones}
              roadClosures={roadClosures}
            />
          </section>

          <h3 className="section-heading">School Resources</h3>
          <div className="feature-grid">
            <a className="feature-card resource-link" href="#alerts" onClick={(e) => e.preventDefault()}>
              <span className="feature-icon feature-icon--blue">
                <Bell size={20} strokeWidth={2.25} />
              </span>
              <h3>School Alerts</h3>
              <p>Sign up for notifications</p>
            </a>
            <a
              className="feature-card resource-link"
              href="https://www.cde.ca.gov/ls/ep/documents/airqualityguidance.pdf"
              target="_blank"
              rel="noreferrer"
            >
              <span className="feature-icon feature-icon--green">
                <BookOpen size={20} strokeWidth={2.25} />
              </span>
              <h3>CDE Guidance</h3>
              <p>Official school guidance</p>
            </a>
            <a className="feature-card resource-link" href="https://www.airnow.gov/" target="_blank" rel="noreferrer">
              <span className="feature-icon feature-icon--purple">
                <Info size={20} strokeWidth={2.25} />
              </span>
              <h3>Air Quality Info</h3>
              <p>PurpleAir &amp; AirNow</p>
            </a>
            <a className="feature-card resource-link" href="#contact" onClick={(e) => e.preventDefault()}>
              <span className="feature-icon feature-icon--red">
                <Phone size={20} strokeWidth={2.25} />
              </span>
              <h3>Contact District</h3>
              <p>Get in touch</p>
            </a>
          </div>
        </>
      ) : (
        <>
          <div className="household-banner">
            <span className="household-banner-icon">
              <Users size={22} strokeWidth={2.25} />
            </span>
            <div className="household-banner-text">
              <h3>Your Household Plan</h3>
              <p>Be prepared. Stay informed. Keep your family safe.</p>
            </div>
            <button type="button" className="household-banner-button" onClick={() => document.getElementById("assistant-input")?.focus()}>
              <Sparkles size={15} strokeWidth={2.25} /> Ask About Your Plan
            </button>
          </div>

          <section className="household-view">
            <div className="household-col">
              <FamilyPlan plan={familyPlan} onSave={handleFamilyPlanSave} />
            </div>
            <div className="household-col">
              <PrepChecklist checkedIds={prepProgress} onToggle={handlePrepToggle} />
              <AssistantChat />
              <RecoveryResources />
            </div>
          </section>
        </>
      )}
      </div>

      <footer className="site-footer">
        <div className="footer-brand">
          <span className="brand-name">SmokeSmart East Bay</span>
          <p>For healthier classrooms, safer homes, and a more resilient Contra Costa County.</p>
        </div>
        <div className="footer-links">
          <a href="#data-sources">Data Sources</a>
          <a href="#about">About</a>
          <a href="#privacy">Privacy</a>
        </div>
        <div className="footer-tagline">
          <Leaf size={13} strokeWidth={2.25} /> Real Data. Real People. A Safer Tomorrow.
        </div>
      </footer>
    </div>
  );
}

export default App;
