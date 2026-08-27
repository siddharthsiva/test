import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Which prep-checklist item IDs (see prepChecklist.js) the household has
 * already checked off. Same read/write shape as alerts.js's alert settings —
 * one small doc per user, needs the same Firestore rule added in the console.
 * @param {string} uid
 * @returns {Promise<string[] | null>}
 */
export async function getPrepProgress(uid) {
  if (!db || !uid) return null;
  try {
    const snap = await getDoc(doc(db, "prepProgress", uid));
    return snap.exists() ? (snap.data().checkedIds ?? []) : null;
  } catch {
    // Most likely Firestore security rules haven't been opened up yet.
    return null;
  }
}

/**
 * @param {string} uid
 * @param {string[]} checkedIds
 */
export async function savePrepProgress(uid, checkedIds) {
  if (!db || !uid) return;
  try {
    await setDoc(doc(db, "prepProgress", uid), { checkedIds }, { merge: true });
  } catch {
    // Most likely Firestore security rules haven't been opened up yet.
  }
}
