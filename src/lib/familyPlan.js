import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * @typedef {{ id: string, name: string, type: "adult"|"child"|"elderly"|"pet", needs: string, responsibility: string }} HouseholdMember
 * @typedef {{ id: string, name: string, phone: string, relation: string }} EmergencyContact
 * @typedef {{ home: string, school: string, schoolLat: number|null, schoolLng: number|null,
 *   work: string, meetingLocation: string, members: HouseholdMember[], contacts: EmergencyContact[] }} FamilyPlan
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
