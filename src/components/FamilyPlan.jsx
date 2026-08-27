import { useState, useEffect } from "react";
import { Users, Save, Plus, X } from "lucide-react";
import { geocode } from "../lib/geocode";

const EMPTY_PLAN = { home: "", school: "", work: "", meetingLocation: "", members: [], contacts: [] };

const MEMBER_TYPES = [
  { value: "adult", label: "Adult" },
  { value: "child", label: "Child" },
  { value: "elderly", label: "Elderly / needs assistance" },
  { value: "pet", label: "Pet" },
];

let nextId = 1;
function makeId() {
  return `local-${Date.now()}-${nextId++}`;
}

// Older saved plans only ever had one contact (contactName/contactPhone) and
// no household member list at all — fold that into the new shape on load so
// nothing saved earlier this session disappears from the form.
function normalize(plan) {
  if (!plan) return EMPTY_PLAN;

  const hasNewContacts = Array.isArray(plan.contacts);
  const contacts = hasNewContacts
    ? plan.contacts
    : plan.contactName || plan.contactPhone
      ? [{ id: makeId(), name: plan.contactName ?? "", phone: plan.contactPhone ?? "", relation: "" }]
      : [];

  return {
    home: plan.home ?? "",
    school: plan.school ?? "",
    schoolLat: plan.schoolLat,
    schoolLng: plan.schoolLng,
    work: plan.work ?? "",
    meetingLocation: plan.meetingLocation ?? "",
    members: Array.isArray(plan.members) ? plan.members : [],
    contacts,
  };
}

export function FamilyPlan({ plan, onSave }) {
  const [draft, setDraft] = useState(() => normalize(plan));
  const [saved, setSaved] = useState(false);
  const [locating, setLocating] = useState(false);

  // `plan` loads asynchronously from Firestore after this component's first
  // render (App.jsx starts it at null) — without this, a real saved plan
  // would never appear in the form, since useState's initializer only runs once.
  useEffect(() => {
    if (plan) setDraft(normalize(plan));
  }, [plan]);

  function updateField(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value, ...(field === "school" ? { schoolLat: null, schoolLng: null } : {}) }));
    setSaved(false);
  }

  function addMember() {
    setDraft((prev) => ({
      ...prev,
      members: [...prev.members, { id: makeId(), name: "", type: "adult", needs: "", responsibility: "" }],
    }));
    setSaved(false);
  }

  function updateMember(id, field, value) {
    setDraft((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    }));
    setSaved(false);
  }

  function removeMember(id) {
    setDraft((prev) => ({ ...prev, members: prev.members.filter((m) => m.id !== id) }));
    setSaved(false);
  }

  function addContact() {
    setDraft((prev) => ({
      ...prev,
      contacts: [...prev.contacts, { id: makeId(), name: "", phone: "", relation: "" }],
    }));
    setSaved(false);
  }

  function updateContact(id, field, value) {
    setDraft((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }));
    setSaved(false);
  }

  function removeContact(id) {
    setDraft((prev) => ({ ...prev, contacts: prev.contacts.filter((c) => c.id !== id) }));
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
          Family meeting location
          <input type="text" value={draft.meetingLocation} onChange={(e) => updateField("meetingLocation", e.target.value)} placeholder="e.g. Grandma's house" />
        </label>

        <div className="family-plan-group">
          <div className="family-plan-group-head">
            <span>Household members</span>
            <span className="family-plan-group-sub">Age/type + any needs a responder should know (medication, mobility, language)</span>
          </div>

          {draft.members.map((m) => (
            <div className="family-plan-row" key={m.id}>
              <input
                type="text"
                value={m.name}
                onChange={(e) => updateMember(m.id, "name", e.target.value)}
                placeholder="Name"
                aria-label="Member name"
              />
              <select value={m.type} onChange={(e) => updateMember(m.id, "type", e.target.value)} aria-label="Member type">
                {MEMBER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={m.needs}
                onChange={(e) => updateMember(m.id, "needs", e.target.value)}
                placeholder="Needs (optional)"
                aria-label="Member needs"
              />
              <input
                type="text"
                value={m.responsibility}
                onChange={(e) => updateMember(m.id, "responsibility", e.target.value)}
                placeholder="Responsibility (optional)"
                aria-label="Member responsibility"
              />
              <button type="button" className="family-plan-remove" onClick={() => removeMember(m.id)} aria-label="Remove member">
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          ))}

          <button type="button" className="family-plan-add" onClick={addMember}>
            <Plus size={14} strokeWidth={2.5} /> Add household member
          </button>
        </div>

        <div className="family-plan-group">
          <div className="family-plan-group-head">
            <span>Emergency contacts</span>
            <span className="family-plan-group-sub">Anyone who should be reachable if the household needs to split up</span>
          </div>

          {draft.contacts.map((c) => (
            <div className="family-plan-row family-plan-row--contact" key={c.id}>
              <input
                type="text"
                value={c.name}
                onChange={(e) => updateContact(c.id, "name", e.target.value)}
                placeholder="Name"
                aria-label="Contact name"
              />
              <input
                type="tel"
                value={c.phone}
                onChange={(e) => updateContact(c.id, "phone", e.target.value)}
                placeholder="(925) 555-0100"
                aria-label="Contact phone"
              />
              <input
                type="text"
                value={c.relation}
                onChange={(e) => updateContact(c.id, "relation", e.target.value)}
                placeholder="Relation (optional)"
                aria-label="Contact relation"
              />
              <button type="button" className="family-plan-remove" onClick={() => removeContact(c.id)} aria-label="Remove contact">
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          ))}

          <button type="button" className="family-plan-add" onClick={addContact}>
            <Plus size={14} strokeWidth={2.5} /> Add contact
          </button>
        </div>

        <button type="submit" disabled={locating}>
          <Save size={14} strokeWidth={2.5} /> {locating ? "Locating school…" : saved ? "Saved" : "Save plan"}
        </button>
      </form>
    </div>
  );
}
