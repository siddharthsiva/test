import { useEffect, useState } from "react";
import { Flame, WifiOff } from "lucide-react";
import { LOCATIONS } from "./lib/locations";
import { ACTIVITIES } from "./lib/activities";
import { getCurrentAqi, fetchPurpleAirSensors } from "./lib/airQuality";
import { fetchWeather } from "./lib/weather";
import { fetchWildfireHotspots, nearestWildfire, nearestWildfireFrom } from "./lib/wildfire";
import { fetchFirePerimeters } from "./lib/firePerimeters";
import { fetchOpenShelters } from "./lib/shelters";
import { fetchRoadClosures } from "./lib/roadClosures";
import { fetchEvacuationZones } from "./lib/evacuationZones";
import { getRecommendation } from "./lib/recommendation";
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
  const schoolFire = hasSchoolLocation ? nearestWildfireFrom(hotspots, familyPlan.schoolLat, familyPlan.schoolLng) : null;

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

  return (
    <div className={emergencyActive ? "page-root emergency-active" : "page-root"}>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-icon">
              <Flame size={20} strokeWidth={2.25} />
            </span>
            <span className="brand-name">SmokeSmart</span>
            <span className="locality-badge">Contra Costa County</span>
          </div>

          <nav className="view-tabs">
            <button type="button" className={view === "home" ? "active" : ""} onClick={() => setView("home")}>
              Home
            </button>
            <button type="button" className={view === "school" ? "active" : ""} onClick={() => setView("school")}>
              School Dashboard
            </button>
            <button type="button" className={view === "household" ? "active" : ""} onClick={() => setView("household")}>
              Household
            </button>
          </nav>

          <div className="mode-toggle">
            <button type="button" className={!emergencyActive ? "active" : ""} onClick={() => setEmergencyActive(false)}>
              Normal
            </button>
            <button
              type="button"
              className={`emergency${emergencyActive ? " active" : ""}`}
              onClick={() => setEmergencyActive(true)}
            >
              <Flame size={14} strokeWidth={2.5} /> Emergency
            </button>
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
          <div className="dashboard-grid">
            <div className="dashboard-main">
              <div className="hero-pickers">
                <LocationPicker selectedId={selectedLocationId} onChange={setSelectedLocationId} />
                <ActivityPicker selectedId={selectedActivityId} onChange={setSelectedActivityId} />
              </div>

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
              {!emergencyActive && (
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
              )}
            </div>
          </div>
        </>
      ) : view === "school" ? (
        <div className="dashboard-grid">
          <div className="dashboard-main">
            <SchoolDashboard
              locationName={location.name}
              aqiReading={aqiReading}
              weather={weather}
              wildfire={nearestFire}
            />
            <section className="map-hero">
              <MapView
                location={location}
                sensors={sensors}
                hotspots={hotspots}
                firePerimeters={firePerimeters}
                shelters={shelters}
                evacuationZones={evacuationZones}
              />
            </section>
          </div>

          <div className="dashboard-side">
            <StatWidgets weather={weather} wildfire={nearestFire} trendDirection={trendDirection} />
            <ForecastSparkline series={forecast} />
          </div>
        </div>
      ) : (
        <section className="household-view">
          <div className="household-col">
            <FamilyPlan plan={familyPlan} onSave={handleFamilyPlanSave} />
            <PrepChecklist checkedIds={prepProgress} onToggle={handlePrepToggle} />
          </div>
          <div className="household-col">
            <AssistantChat />
            <RecoveryResources />
          </div>
        </section>
      )}
      </div>
    </div>
  );
}

export default App;
