import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * @param {string} uid
 * @returns {Promise<{ locationId: string, thresholdAqi: number, notificationsEnabled: boolean } | null>}
 */
export async function getAlertSettings(uid) {
  if (!db || !uid) return null;
  try {
    const snap = await getDoc(doc(db, "alertSettings", uid));
    return snap.exists() ? snap.data() : null;
  } catch {
    // Most likely Firestore security rules haven't been opened up yet.
    return null;
  }
}

/**
 * @param {string} uid
 * @param {{ locationId: string, thresholdAqi: number, notificationsEnabled: boolean }} settings
 */
export async function saveAlertSettings(uid, settings) {
  if (!db || !uid) return;
  try {
    await setDoc(doc(db, "alertSettings", uid), settings, { merge: true });
  } catch {
    // Most likely Firestore security rules haven't been opened up yet.
  }
}

/**
 * Ask the browser for notification permission. Must be called from a user
 * gesture (e.g. a button click), not on page load.
 * @returns {Promise<boolean>} whether permission was granted
 */
export async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  const result = await Notification.requestPermission();
  return result === "granted";
}

// Avoid re-notifying every single refresh once the threshold is crossed —
// only notify again if AQI has moved by a meaningful amount since last time.
const RENOTIFY_DELTA = 10;
let lastNotifiedAqi = null;

/**
 * Fire a real browser notification if the current AQI has crossed the
 * user's threshold. Client-side only — fires while the tab is open, not a
 * true background push (see README for why).
 * @param {number} aqi @param {number} thresholdAqi @param {string} locationName
 */
export function checkAndNotify(aqi, thresholdAqi, locationName) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (aqi < thresholdAqi) {
    lastNotifiedAqi = null; // reset once conditions improve
    return;
  }

  const alreadyNotifiedThisRange =
    lastNotifiedAqi != null && Math.abs(aqi - lastNotifiedAqi) < RENOTIFY_DELTA;
  if (alreadyNotifiedThisRange) return;

  lastNotifiedAqi = aqi;
  new Notification("SmokeSmart Alert", {
    body: `AQI in ${locationName} is ${aqi}, at or above your alert threshold of ${thresholdAqi}.`,
  });
}

let lastNotifiedFire = false;

/**
 * Fire a real browser notification if an active wildfire is within the
 * user's chosen distance. Separate de-dup state from the AQI alert so the
 * two conditions don't interfere with each other.
 * @param {{ distanceMiles: number, direction: string } | null} wildfire
 * @param {number} thresholdMiles @param {string} locationName
 */
export function checkAndNotifyWildfire(wildfire, thresholdMiles, locationName) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const withinThreshold = wildfire != null && wildfire.distanceMiles <= thresholdMiles;
  if (!withinThreshold) {
    lastNotifiedFire = false; // reset once no longer within range
    return;
  }

  if (lastNotifiedFire) return; // already alerted for this fire, don't repeat every refresh

  lastNotifiedFire = true;
  new Notification("SmokeSmart Wildfire Alert", {
    body: `An active wildfire is ${wildfire.distanceMiles} mi ${wildfire.direction} of ${locationName}, within your ${thresholdMiles} mi alert range.`,
  });
}
