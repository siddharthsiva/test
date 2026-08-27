import { ClipboardCheck } from "lucide-react";
import { PREP_PHASES, PREP_ITEMS } from "../lib/prepChecklist";

export function PrepChecklist({ checkedIds, onToggle }) {
  const checkedSet = new Set(checkedIds);
  const total = PREP_ITEMS.length;
  const done = checkedIds.length;

  return (
    <div className="prep-checklist">
      <h2>
        <ClipboardCheck size={17} strokeWidth={2.25} /> Fire Season Prep
      </h2>
      <p className="family-plan-sub">
        {done} of {total} done — sourced from CAL FIRE's Ready, Set, Go! program and ready.gov/wildfires.
      </p>

      {PREP_PHASES.map((phase) => (
        <div className="prep-phase" key={phase.id}>
          <h3>{phase.label}</h3>
          <ul className="prep-items">
            {PREP_ITEMS.filter((item) => item.phase === phase.id).map((item) => (
              <li key={item.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={checkedSet.has(item.id)}
                    onChange={() => onToggle(item.id)}
                  />
                  <span>{item.text}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
