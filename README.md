# SmokeSmart East Bay

Hyper-local wildfire/air-quality decision-support app for Contra Costa schools — built for the 2026 Congressional App Challenge.

## What it does

Instead of showing a raw AQI number, it fuses AQI + weather/wind + nearest active
wildfire + the specific activity you're about to do (soccer practice, marching band,
PE, walk/bike commute) into one plain-language recommendation. A separate Emergency
Mode screen shows real fire distance/direction + wind + AQI + active evacuation
zones/shelters/road closures, with honest links out to official sources — it
deliberately does not compute its own evacuation routes, and the AI assistant
(Household tab) only explains data already in the app, never a new safety verdict.

It's also grown into a fuller household preparedness tool: a multi-person household
profile (needs/responsibilities per member, not just one contact), a fire-season prep
checklist sourced from CAL FIRE's Ready/Set/Go program, post-incident recovery
resources, and an AI assistant scoped to the household's own saved plan.

## Current status

Runs immediately with mock data (no API keys needed) so the UI/logic is demoable
before real data sources are configured.

- [x] Project scaffold (React + Vite)
- [x] Location + activity picker
- [x] CIF/EPA-style risk scoring (`src/lib/riskScoring.js`)
- [x] PurpleAir + AirNow fetch functions with mock fallback (`src/lib/airQuality.js`)
- [x] PM2.5 -> AQI conversion (`src/lib/pm25ToAqi.js`)
- [x] Weather/wind via Open-Meteo, no key needed (`src/lib/weather.js`)
- [x] Nearest active wildfire via NASA FIRMS (`src/lib/wildfire.js`)
- [x] Fused activity-aware recommendation engine (`src/lib/recommendation.js`)
- [x] AQI trend prediction via linear regression (`src/lib/trendPrediction.js`)
- [x] Emergency Mode screen (real data + official links, no fake evacuation routing)
- [x] Real PurpleAir/AirNow/FIRMS API keys wired in and verified live
- [x] Firebase project connected (`src/lib/firebase.js` initializes Firestore)
- [x] Anonymous auth (no login screen) + Firestore-saved alert thresholds (`src/lib/auth.js`, `src/lib/alerts.js`)
- [x] Real browser notifications when AQI crosses your threshold (fires while the tab is open — see note below)
- [x] Firebase console configured and verified end-to-end (anonymous auth enabled, Firestore rules published) — confirmed by saving a Family Plan, reloading, and seeing the saved data persist
- [ ] True background push (delivered when the app/browser is fully closed) — needs a scheduled Cloud Function, which requires upgrading to the Blaze (pay-as-you-go) plan. Deliberately not built yet since that means adding a credit card, even though usage stays in the free tier.
- [x] Interactive map (Leaflet + OpenStreetMap, no API key) plotting real PurpleAir sensors and real FIRMS fire detections, color-coded by AQI category, with a legend (`src/components/MapView.jsx`)
- [x] Visual redesign (fixed a real CSS bug: `line-height: 145%` set via the `font` shorthand on `:root` computed to a fixed px value there and inherited unchanged into headings, causing wrapped title text to overlap)
- [x] Dashboard redesign: dark "Command Center" theme, Bento-box grid layout, Emergency Mode toggle with a real visual state shift (pulsing red glow), 3-hour AQI forecast sparkline with gradient area fill, glassmorphism cards, dark CartoDB map tiles (the default OpenStreetMap tiles clashed badly with the dark theme), Inter typeface, custom-styled dropdowns, glowing AQI hero number
- [x] **Fixed a real data-quality bug**: a single malfunctioning PurpleAir sensor reporting an implausible 4998.5 µg/m³ (vs. neighbors reading 2-7 µg/m³) was dragging the averaged AQI far above reality (showed 210 "Very Unhealthy" when the real local reading was ~AQI 15 "Good"). Now filtered out in `fetchPurpleAirSensors` (`src/lib/airQuality.js`) before it can skew the average or mislabel a map marker.
- [x] School Dashboard (real per-activity recommendations via the same engine — no fake "notify all parents" button, since there's no parent contact list or messaging backend to make that real)
- [x] Layout restructured to a hero-led page (large glowing AQI number, no card chrome) instead of a boxed dashboard grid; map reverted to standard OpenStreetMap tiles
- [x] Emoji icons replaced with real SVG icons (`lucide-react`) throughout; font is now Lexend (display) + Source Sans 3 (body) — both per guidance in the design skill packages under `.claude/skills/` (see note below)
- [x] Accessibility pass: `prefers-reduced-motion` support, visible `:focus-visible` states on buttons/selects/links
- [x] Expanded to all 19 incorporated Contra Costa County cities (was 6) — see `src/lib/locations.js`
- [x] Widened the PurpleAir map query from a ~7mi to a ~24mi radius (was returning as few as 32 sensors in some areas; now up to 300, capped and sorted by distance for render performance) — the "official" per-location AQI average still only counts sensors within 8mi, so wider map coverage doesn't dilute the location-specific reading. See `src/lib/airQuality.js`.
- [x] **Fixed a real bug in the activity picker**: it looked like it worked but didn't — 3 of 5 activities (soccer, marching band, PE) all had `sensitive: true` and produced byte-identical recommendations, differing only by the activity name in one note sentence. The AQI category itself never changed. Now sensitive activities genuinely escalate the severity one level (once AQI is past "Good"), matching what the code comment always claimed but never implemented. See `src/lib/recommendation.js`.
- [x] PWA manifest + service worker (`vite-plugin-pwa`) — installable, app-shell precached. API calls are deliberately NOT cached (a real-time safety tool showing stale AQI would be actively misleading). Icon is SVG-only for now (`public/icon.svg`) — no image-generation tool available to produce proper 192/512 PNG icons, which some platforms (notably iOS "Add to Home Screen") want for best results. Worth generating real PNGs before final submission if that matters to you.
- [x] Real CIF/CDE-sourced practice guidance — replaced the placeholder text with the actual "School Air Quality Activity Recommendations" (rev. 7/2019), jointly issued by CSBA, CAPCOA, ACSA, CA Dept of Education, CCSESA, and CA Air Resources Board. See citation comment in `riskScoring.js`.
- [x] **Important caveat surfaced from that same source document**: it explicitly states PurpleAir sensors "overestimate, especially at AQI of 150 or higher" versus official EPA-calibrated monitors — directly relevant since PurpleAir is this app's primary source. Added a visible in-app disclosure (`RecommendationCard.jsx`) when a PurpleAir reading is ≥150, pointing to AirNow.gov for cross-checking, rather than silently presenting a number that might be an overestimate.
- [x] Verified both official Emergency Mode links are correct (cwsalerts.com is genuinely the official Contra Costa CWS site, fire.ca.gov/incidents is genuinely Cal Fire's official incidents page) — both just block automated fetches with a 403, which isn't the same as being wrong or dead.
- [x] **Activities rebuilt around the real 4-category CDE/CIF matrix** (Recess/PE/Athletic Practice/Scheduled Event) instead of a single generic guidance text — 9 activities now (added Cross Country, Football, Recess, Scheduled Game/Meet), and guidance genuinely differs by category at every AQI level, not just by name. See `src/lib/riskScoring.js` (`CDE_GUIDANCE`) and `src/lib/activities.js`.
- [x] Emergency Mode: wind direction now shown; a synthesized "Risk level" (Low/Elevated/High/Severe, combining AQI + fire proximity) now shown — see `getEmergencyRiskLevel()` in `recommendation.js`, also reused on the School Dashboard.
- [x] School Dashboard now has a summary header (AQI + wildfire risk) above the per-activity list.
- [x] Alerts: added a "wildfire within N miles" trigger (10/20/30/50mi) alongside the AQI threshold — see `checkAndNotifyWildfire()` in `alerts.js`.
- [x] Family Emergency Plan built — real Firestore-saved home/school/work/contact/meeting-point (`src/lib/familyPlan.js`, `src/components/FamilyPlan.jsx`), surfaced automatically in the Emergency Mode banner when set. New Firestore collection, needs the same console rule as `alertSettings` (see below).
- [x] Offline mode built honestly — the last real reading is cached with a visible timestamp (`src/lib/offlineCache.js`) and shown when `navigator.onLine` is false, instead of silently falling back to demo/mock data during a real outage. A full downloadable shelter/map data bundle was not built.
- [ ] **Still declined, deliberately**: evacuation routing/difficulty scores (computing a real route/difficulty number is out of scope even with real closure data feeding it) and the digital-twin fire-movement simulation (honest fire-spread modeling is a research project, not a session's work; the fast path is fake data, which risks CAC disqualification). Both explained in the [audit artifact](https://claude.ai/code/artifact/729107a4-838d-466f-bd21-c406612fe677).
- [x] **Road closures (511.org SF Bay Open Data, `src/lib/roadClosures.js`)** — live-verified against the real API once a key was added. **Found and fixed a real bug the same way as the FIRMS domain bug**: the first version was written against a schema (`RoadwayName`/`Latitude`/`Longitude`/`IsFullClosure`) documented on a *different* state's 511 site (511ga.org) — reasonable-looking docs, wrong platform. A live request with the real key returned a completely different shape: the actual Open511 protocol (`{ events: [{ event_type, severity, geography: { type: "Point", coordinates: [lng, lat] }, roads: [{ name, direction, state }], headline }] }`). Rewrote the parser against the real response. `state: "CLOSED"` on a road is the genuine full-closure signal; `SOME_LANES_CLOSED`/`SINGLE_LANE_ALTERNATING` (routine construction/lane restrictions — most of what's actually active right now) are deliberately excluded, since this feature is scoped to actual closures, not general traffic noise. Confirmed live: 27 active Bay Area events right now, 1 in Contra Costa (a CA-4 lane hazard in Concord, correctly excluded as a lane restriction, not a closure) — 0 full closures, which is the honest, correct result today, not a bug (same as shelters correctly showing 0 outside a declared emergency).
- [x] **Diligence pass found and fixed 2 real bugs introduced by the previous round's new features**, both before they'd ever been noticed in the running app:
  - `FamilyPlan.jsx` read its saved data via `useState(plan ?? EMPTY_PLAN)`, which only runs once on mount — since the real plan loads *asynchronously* from Firestore after first render, a genuinely-saved plan would never have appeared in the form. Fixed with a `useEffect` that re-syncs when `plan` arrives.
  - Offline mode never cleared `sensors` (map markers) and had no handling for "this location was never cached" — switching cities while offline could show a *different* city's stale AQI/map data mislabeled under the newly-selected city's name. Also, offline detection only re-checked on location/settings changes, not reactively when connectivity actually dropped. Fixed all three in `App.jsx` and `offlineCache.js`.
- [x] **Explained (not a bug) why the activity list can look identical**: at AQI ≤100 (Good/Moderate), the real CDE source document gives *genuinely identical* guidance across all 4 activity categories — that's true to the official guidance, not something to fake around. Fixed the resulting UX problem instead: `RecommendationCard` now has an expandable "how guidance changes as AQI rises" table (`getActivityGuidanceTable()` in `riskScoring.js`) so the differentiation is visible without needing bad air, and `SchoolDashboard` collapses to one clear statement instead of 9 redundant identical rows when nothing currently differs, with the itemized list still available on request.
- [x] Closed 2 of the remaining "partial" gaps:
  - **School-specific distance**: geocodes the Family Plan's school address via Nominatim/OpenStreetMap (free, no key — same provider as the map tiles) and shows real distance-from-school in Emergency Mode, not just the city center. Verified live against real addresses. See `src/lib/geocode.js`, `nearestWildfireFrom()` in `wildfire.js`.
  - **Offline access to saved data**: enabled Firestore's built-in `persistentLocalCache` (IndexedDB) so alert settings and the family plan stay readable offline once loaded — real Firestore behavior, not a custom cache. See `src/lib/firebase.js`.
  - Still not built: a downloadable shelter/map data *bundle* — there's still no real shelter database to bundle, so this remains honestly out of scope.
- [x] UI: added an at-a-glance stat widget row (wind, fire distance, 3-hr trend) next to the AQI hero number — real data already flowing through the app, previously only visible inside Emergency Mode or the forecast card. Also gave the Emergency toggle a persistent red identity (not just when active) so it reads as a standalone alarm control. Inspired by DALL-E mockups the user shared; the mockups' fabricated "Evacuation Difficulty: 72/100," "Route A: 18 min," and "Family Status: Safe" widgets were explicitly **not** built — those are exactly the kind of invented safety data this project has held the line against all session. See `src/components/StatWidgets.jsx`.

### Household preparedness expansion

- [x] **Evacuation zones — corrected a "no data source exists" claim a third time.** Cal OES publishes a real, free, keyless statewide aggregation of every county's Genasys/Zonehaven evacuation zones (`src/lib/evacuationZones.js`), refreshed every 5 minutes. Live-verified: 47 active Warning/Order zones nationwide-in-CA right now (none in Contra Costa today — correctly empty, same as shelters/perimeters when there's no active incident there). Drawn on the map as amber/red polygons and listed in Emergency Mode within 40 mi.
- [x] **Household profile rebuilt around real multi-person data** (`src/lib/familyPlan.js`, `src/components/FamilyPlan.jsx`): repeatable household members (name/type/needs/responsibility) and repeatable emergency contacts, replacing the single contact-name/phone pair. Old saved plans are folded into the new shape on load, no migration script needed. Surfaced in Emergency Mode so needs/responsibilities are visible under pressure, not just in the settings form.
- [x] **Fire-season prep checklist** (`src/lib/prepChecklist.js`, `src/components/PrepChecklist.jsx`) — real items transcribed from CAL FIRE's Ready/Set/Go program (readyforwildfire.org) and ready.gov/wildfires, grouped by phase, progress saved per-user in Firestore (`prepProgress/{uid}`, needs the same console rule as the other two collections — see below).
- [x] **Recovery resources** (`src/components/RecoveryResources.jsx`) — a live check against OpenFEMA's free Disaster Declarations API (`src/lib/disasterDeclarations.js`, verified live: real historical Contra Costa declarations, e.g. DR-4683-CA 2023 flooding) plus real static links (DisasterAssistance.gov, 211 Contra Costa, IRS casualty-loss guidance, Red Cross, Cal OES). No fabricated "recovery score."
- [x] **Offline bundle closed the previously-declined gap**: `shelters`, `firePerimeters`, and `evacuationZones` are now included in the offline snapshot (`src/lib/offlineCache.js`), not just AQI/weather/hotspots — there's real data worth caching now, unlike when offline mode was first built.
- [x] **AI assistant (Household tab, "Ask About Your Plan")** — deployed and live-confirmed. Calls a Firebase Cloud Function (`functions/index.js`) that reads your saved plan server-side and asks Gemini (`gemini-flash-latest` — a real Google alias that auto-tracks the current GA Flash release, confirmed via ai.google.dev/gemini-api/docs/models) to answer, strictly scoped to explaining that data — hard-instructed to never invent an evacuation route or medical advice. This needed a real backend because Google's (like Anthropic's and OpenAI's) chat APIs block direct browser calls by design, specifically so a key can't be lifted from a public site's network tab — every other integration in this app is keyless-or-client-safe; this is the one exception. **Cost**: Gemini's Flash tier is free up to 1,500 requests/day at ai.google.dev — no billing account needed for the model calls themselves, unlike the Anthropic version this originally shipped with; Firebase's own Blaze plan (needed just to host the function) stays free at this usage scale too, though it does need a card on file.
- [x] **Real bug found deploying the above: `firebase deploy` hangs forever on Windows when run from Git Bash.** The actual error was `User code failed to load. Cannot determine backend specification. Timeout after 10000` — looked like a problem with our function code, but `node -e "require('./functions/index.js')"` loaded it instantly, proving the code itself was fine. The real cause (confirmed against a matching `firebase-tools` GitHub issue): the CLI spawns `cmd.exe` internally to check the installed `firebase-functions` version against npm, and that specific spawn hangs when the CLI is invoked from Git Bash on Windows. **Fix**: run `firebase deploy` (and likely other `firebase-tools` commands) from **PowerShell**, not Git Bash, on Windows — the same exact command succeeded immediately once run that way.

## Getting started

```
npm install
npm run dev
```

Opens with mock AQI data by default (weather is always live — Open-Meteo needs no key).
To use real AQI/wildfire data:

1. Copy `.env.example` to `.env`
2. Get a free PurpleAir key: https://api.purpleair.com/
3. Get a free AirNow key: https://docs.airnowapi.org/
4. Get a free NASA FIRMS MAP_KEY: https://firms.modaps.eosdis.nasa.gov/api/map_key/
5. Fill in the keys in `.env`, restart `npm run dev`

For the Firestore-saved alert settings to actually work (not just fail silently),
two things need to be turned on in the [Firebase console](https://console.firebase.google.com/):

1. **Authentication > Sign-in method > Anonymous** — enable it (off by default)
2. **Firestore Database > Rules** — allow a signed-in (even anonymous) user to read/write
   only their own doc, across all three collections (alert settings, family plan, prep progress):
   ```
   match /alertSettings/{uid} {
     allow read, write: if request.auth != null && request.auth.uid == uid;
   }
   match /familyPlans/{uid} {
     allow read, write: if request.auth != null && request.auth.uid == uid;
   }
   match /prepProgress/{uid} {
     allow read, write: if request.auth != null && request.auth.uid == uid;
   }
   ```
   If Firestore was created in "test mode" it already allows this temporarily (expires
   after 30 days); if created in "production/locked mode" nothing will save until you
   add a rule like the one above.

## Architecture

```
PurpleAir + AirNow (AQI) ─┐
Open-Meteo (weather/wind) ─┼─> recommendation.js (fused, activity-aware) ─> UI
NASA FIRMS (wildfire)     ─┘
```

Scoring is deterministic (a public AQI breakpoint table + explainable rules), not
decided by an LLM — this keeps the safety verdict auditable. See
`src/lib/riskScoring.js` and `src/lib/recommendation.js`.

Trend history currently lives in `localStorage` per location as a stand-in for
Firestore, so the prediction feature is demoable before the backend scheduled
polling is built.

## Note on `.claude/skills/`

Three downloaded skill packages live there (`frontend-design`, `senior-frontend`, `ui-ux-pro-max`).
Their markdown guidance was read and applied directly (font choice, no-emoji-icons rule,
accessibility checklist). Their bundled Python scripts were **not executed** — running
arbitrary downloaded scripts against the project wasn't necessary to get the design
guidance, and it's not something to do without inspecting them first regardless of source.

On a full read of `ui-ux-pro-max/data/`: `colors.csv` turned out to be mostly repeated
filler (same 6 hex values copy-pasted across ~80 rows regardless of category) and wasn't
used. `typography.csv` and `styles.csv` were genuinely well-curated and did inform real
changes: font swapped to the "Corporate Trust" pairing (Lexend + Source Sans 3 —
explicitly recommended for government/healthcare/accessibility-focused products), focus
rings widened to 3px and glass-card borders strengthened per the "Accessible & Ethical"
and "Glassmorphism" style rows, and the existing alert-pulse animation was validated
against the "Real-Time Monitoring" dashboard row. The data's own "HUD / Sci-Fi FUI" row
warns itself against accessibility/mobile-friendliness, confirming that style was rightly
avoided here.

## Design decisions (declined from the original UI blueprint, and why)

- **Mapbox GL JS** → stayed on Leaflet + OpenStreetMap: no API key, no billing risk, same core capability.
- **Lottie animations** → skipped for now: polish, not function; lower priority than finishing real features.
- **"Digital Twin" simulated fire slider** → not built: it would be fake data presented as if live, which is exactly what CAC judges can disqualify a submission for since they can request to verify functionality.
- **Separate marketing landing page** → skipped: time is better spent on real functionality than a page that doesn't affect what the app does.

## Correction: "no real data source exists" was wrong for 2 of 3 evacuation features

Earlier passes in this project claimed no real data source existed for shelters, fire
perimeters, or road closures, and declined to build any of it. When directly challenged
to double-check that ("are you sure, be careful"), a real search turned up:

- **FEMA National Shelter System "Open Shelters"** (`gis.fema.gov/.../NSS/OpenShelters`) —
  free, keyless, public ArcGIS REST API synced from the real Red Cross shelter database.
  It correctly returns zero results outside an active declared emergency (verified live) —
  that's real-time accuracy, not a bug. **Now integrated**: `src/lib/shelters.js`, shown on
  the map and listed with distance/address/pet-friendly status in Emergency Mode.
- **NIFC WFIGS current fire perimeters** (`services3.arcgis.com/.../WFIGS_Interagency_Perimeters_Current`)
  — free, keyless, the REAL current boundary polygon of an active fire, updated every ~5
  min. This is not the same as the declined "digital twin fire movement simulation" (which
  would predict a *future*, unverified shape) — it's the actual current state, and there's
  a real difference between those two. **Now integrated**: `src/lib/firePerimeters.js`,
  drawn on the map as a red polygon.
- **511.org SF Bay traffic/road closures** — free API, requires requesting a key (like
  PurpleAir/AirNow/FIRMS did), covers all 9 Bay Area counties including Contra Costa with
  real road closure geometries. **Not yet integrated** — deliberately, because I can't
  verify the actual response JSON shape without a key, and guessing at an API's shape
  blind is exactly what caused the earlier FIRMS domain bug this session. Get a key at
  511.org/open-data/token and I'll wire it up against the real response.

What's still correctly declined: a fabricated "Evacuation Difficulty: 72/100" score or an
opaque "recommended route" — even with all three real data sources, synthesizing them into
a single trustworthy difficulty number is a genuinely harder modeling problem, not just a
data-availability one. Showing the real shelters, the real perimeter, and (once wired up)
real closures, and letting the reader interpret them, is the honest version of this feature.

## Congressional App Challenge notes

- AI-assisted development was used for parts of this project (see submission
  disclosure). Per CAC rules, all AI usage must be disclosed and the student must
  demonstrate individual understanding and contribution — don't submit without
  being able to explain every file in `src/lib/`.
- Every feature shown in the demo video must actually work — judges can request
  source code / a live demo to verify functionality.
