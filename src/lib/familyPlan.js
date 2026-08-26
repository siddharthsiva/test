import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * @typedef {{ home: string, school: string, work: string, contactName: string,
 *   contactPhone: string, meetingLocation: string }} FamilyPlan
 */

/**
 * @param {string} uid
 * @returns {Promise<FamilyPlan | null>}
 */
export async function getFamilyPlan(uid) {
  if (!db || !uid) return null;
  try {
    const snap = await getDoc(doc(db, "familyPlans", uid));
    return snap.exists() ? snap.data() : null;
  } catch {
    // Most likely Firestore security rules haven't been opened up yet.
    return null;
  }
}

/**
 * @param {string} uid
 * @param {FamilyPlan} plan
 */
export async function saveFamilyPlan(uid, plan) {
  if (!db || !uid) return;
  try {
    await setDoc(doc(db, "familyPlans", uid), plan, { merge: true });
  } catch {
    // Most likely Firestore security rules haven't been opened up yet.
  }
}
