import { useState, useEffect } from "react";
import { Users, Save } from "lucide-react";
import { geocode } from "../lib/geocode";

const EMPTY_PLAN = { home: "", school: "", work: "", contactName: "", contactPhone: "", meetingLocation: "" };

export function FamilyPlan({ plan, onSave }) {
  const [draft, setDraft] = useState(plan ?? EMPTY_PLAN);
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);

  // `plan` loads asynchronously from Firestore after this component's first
  // render (App.jsx starts it at null) — without this, a real saved plan
  // would never appear in the form, since useState's initializer only runs once.
  useEffect(() => {
    if (plan) setDraft(plan);
  }, [plan]);

  function updateField(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value, ...(field === "school" ? { schoolLat: null, schoolLng: null } : {}) }));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();

    let next = draft;
    // Only geocode if the school text changed since the last successful
    // lookup (schoolLat/Lng got cleared in updateField above when it did).
    if (draft.school && draft.schoolLat == null) {
      setLocating(true);
      const coords = await geocode(`${draft.school}, Contra Costa County, CA`);
      setLocating(false);
      next = { ...draft, schoolLat: coords?.lat ?? null, schoolLng: coords?.lng ?? null };
      setDraft(next);
    }

    onSave(next);
    setSaved(true);
  }

  return (
    <div className="family-plan">
      <h2>
        <Users size={17} strokeWidth={2.25} /> Family Plan
      </h2>
      <p className="family-plan-sub">
        Saved to your device's profile, so it's here if Emergency Mode activates — you won't need to remember it under pressure.
      </p>

      <form onSubmit={handleSave} className="family-plan-form">
        <label>
          Home address
          <input type="text" value={draft.home} onChange={(e) => updateField("home", e.target.value)} placeholder="e.g. 123 Oak St, Concord" />
        </label>
        <label>
          School
          <input type="text" value={draft.school} onChange={(e) => updateField("school", e.target.value)} placeholder="e.g. Concord High School" />
          {draft.school && draft.schoolLat != null && (
            <span className="family-plan-hint">✓ Located — Emergency Mode will show distance from this school specifically.</span>
          )}
        </label>
        <label>
          Work / other location
          <input type="text" value={draft.work} onChange={(e) => updateField("work", e.target.value)} placeholder="optional" />
        </label>
        <label>
          Emergency contact name
          <input type="text" value={draft.contactName} onChange={(e) => updateField("contactName", e.target.value)} placeholder="e.g. Mom, Dad, Aunt Maria" />
        </label>
        <label>
          Emergency contact phone
          <input type="tel" value={draft.contactPhone} onChange={(e) => updateField("contactPhone", e.target.value)} placeholder="(925) 555-0100" />
        </label>
        <label>
          Family meeting location
          <input type="text" value={draft.meetingLocation} onChange={(e) => updateField("meetingLocation", e.target.value)} placeholder="e.g. Grandma's house" />
        </label>

        <button type="submit" disabled={locating}>
          <Save size={14} strokeWidth={2.5} /> {locating ? "Locating school…" : saved ? "Saved" : "Save plan"}
        </button>
      </form>
    </div>
  );
}
