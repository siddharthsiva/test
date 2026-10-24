const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
// "gemini-flash-latest" silently hung on every real generateContent call —
// no error, no response, until our own abort cut it off — even though the
// API key and connectivity were both fine (confirmed by a live GET to
// /v1beta/models, which answered in 116ms and listed this id as current).
// Use a real, API-confirmed model id instead of the "-latest" alias.
const MODEL = "gemini-2.5-flash";

// Kept in sync by hand with src/lib/prepChecklist.js's phase labels and
// src/lib/riskScoring.js's CDE categories — functions/ is a separate
// deployable package from src/ (Node CommonJS vs. the Vite/ESM client), so
// this is a short, curated summary rather than an import, to keep the
// system prompt small and cheap to run on every question.
const STATIC_GUIDANCE = `
SmokeSmart shows real-time AQI (PurpleAir/AirNow), wildfire distance (NASA FIRMS),
weather/wind (Open-Meteo), active fire perimeters (NIFC), open shelters (FEMA NSS),
active evacuation zones (Cal OES statewide feed), and road closures (511.org SF Bay).
Activity guidance follows the real CDE/CAPCOA "School Air Quality Activity
Recommendations" document across 4 categories (Recess, PE, Athletic Practice,
Scheduled Event) and 6 AQI tiers (Good/Moderate/Unhealthy for Sensitive
Groups/Unhealthy/Very Unhealthy/Hazardous).
Fire-season prep checklist phases: Ready (before fire season), Set (build a Go
Bag: water, food, medications, first aid kit, flashlight, radio, N95 masks,
phone charger, sturdy clothes, cash, pet supplies), Go (during: follow local
officials, leave early if advised, close up the house if time allows), After
(wait for officials to confirm it's safe, don't re-enter a damaged home until
inspected).
`.trim();

/**
 * Answers a question about the household's OWN saved plan + this app's real,
 * already-shown guidance. Deliberately scoped: never invents an evacuation
 * route, a new safety verdict, or medical advice — that would break this
 * project's rule that only deterministic, sourced logic drives safety
 * decisions. This assistant explains existing data, it doesn't decide
 * anything new.
 */
exports.askPlanAssistant = onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign-in required.");
  }

  const question = (request.data?.question ?? "").trim();
  if (!question) {
    throw new HttpsError("invalid-argument", "A question is required.");
  }
  if (question.length > 1000) {
    throw new HttpsError("invalid-argument", "Question is too long.");
  }

  const uid = request.auth.uid;
  const db = getFirestore();

  const [planSnap, prepSnap] = await Promise.all([
    db.collection("familyPlans").doc(uid).get(),
    db.collection("prepProgress").doc(uid).get(),
  ]);

  const plan = planSnap.exists ? planSnap.data() : null;
  const checkedIds = prepSnap.exists ? (prepSnap.data().checkedIds ?? []) : [];

  const planSummary = plan
    ? JSON.stringify(
        {
          home: plan.home || null,
          school: plan.school || null,
          work: plan.work || null,
          meetingLocation: plan.meetingLocation || null,
          members: plan.members ?? [],
          contacts: (plan.contacts ?? []).map((c) => ({ name: c.name, relation: c.relation })),
        },
        null,
        2
      )
    : "No plan saved yet.";

  const systemPrompt = `You are the SmokeSmart plan assistant, embedded in a wildfire/air-quality
preparedness app for Contra Costa County, CA households. Answer the user's question using ONLY:
1) their own saved household plan (below), 2) their prep checklist progress (below), and
3) the app's real static guidance (below).

Hard rules:
- Never invent an evacuation route, a safety verdict, or medical advice beyond what's in the
  saved plan/checklist. If asked for something outside that scope (e.g. "what evacuation route
  should I take"), say that's not something this assistant decides, and point to the official
  sources: Contra Costa County Community Warning System (cwsalerts.com) and Cal Fire
  (fire.ca.gov/incidents).
- Be concise — a few sentences, not an essay.
- If the plan is empty or missing something the question needs, say so plainly and suggest
  filling in the Household tab.

App static guidance:
${STATIC_GUIDANCE}

Household's saved plan:
${planSummary}

Prep checklist items already checked off: ${checkedIds.length ? checkedIds.join(", ") : "none yet"}`;

  // Every observed production failure has been a silent hang on this fetch —
  // the function running out its full default timeout with no error ever
  // logged, which looks identical whether Gemini is just slow or the call
  // never lands at all. An explicit abort well under the function's own
  // timeout turns that into a fast, loggable error instead of a mystery.
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), 25_000);

  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY.value(),
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: question }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 500 },
        }),
        signal: controller.signal,
      }
    );
  } catch (err) {
    console.error("askPlanAssistant: Gemini fetch failed", err);
    const timedOut = err.name === "AbortError";
    throw new HttpsError("internal", timedOut ? "Assistant request timed out." : "Assistant request failed.");
  } finally {
    clearTimeout(abortTimer);
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error(`askPlanAssistant: Gemini responded ${res.status}`, errorText);
    throw new HttpsError("internal", `Assistant request failed (${res.status}).`);
  }

  const body = await res.json();
  const answer = body.candidates?.[0]?.content?.parts?.[0]?.text ?? "No answer returned.";

  return { answer };
});
