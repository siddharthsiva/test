import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { app } from "./firebase";

const auth = app ? getAuth(app) : null;

/**
 * Anonymous per-device identity — no login screen needed. Just enough to
 * key a Firestore doc so alert settings persist across visits.
 * @returns {Promise<string | null>} uid, or null if Firebase isn't configured
 */
export function ensureSignedIn() {
  if (!auth) return Promise.resolve(null);

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve(user.uid);
      } else {
        signInAnonymously(auth)
          .then((cred) => resolve(cred.user.uid))
          .catch(() => resolve(null));
      }
    });
  });
}
