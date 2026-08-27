import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null;

// Persistent local cache (IndexedDB) so alert settings and the family plan
// are readable offline once they've been loaded once — real Firestore
// behavior, not a custom cache. Falls back to the plain in-memory client if
// persistence can't be enabled (e.g. private browsing).
function createDb() {
  if (!app) return null;
  try {
    return initializeFirestore(app, { localCache: persistentLocalCache() });
  } catch {
    return getFirestore(app);
  }
}

export const db = createDb();

// Used by assistant.js to call the askPlanAssistant Cloud Function. Only
// works once that function is deployed (requires the Blaze plan) — see
// README for the manual setup step.
export const functions = app ? getFunctions(app) : null;
