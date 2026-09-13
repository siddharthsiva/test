import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

/**
 * Calls the askPlanAssistant Cloud Function (functions/index.js), which
 * reads the signed-in user's own saved plan/prep-progress server-side and
 * answers with Gemini — scoped to explaining that real data, never inventing
 * a new safety verdict. Requires the function to actually be deployed (Blaze
 * plan enabled + GEMINI_API_KEY secret set) — see README.
 * @param {string} question
 * @returns {Promise<string>}
 */
export async function askPlanAssistant(question) {
  if (!functions) throw new Error("Firebase isn't configured.");
  const call = httpsCallable(functions, "askPlanAssistant");
  const result = await call({ question });
  return result.data.answer;
}
