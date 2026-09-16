import { useState } from "react";
import { ClipboardCheck, Sparkles, Backpack, LogOut, RotateCcw, ChevronDown } from "lucide-react";
import { PREP_PHASES, PREP_ITEMS } from "../lib/prepChecklist";

const PHASE_ICONS = { ready: Sparkles, gobag: Backpack, during: LogOut, after: RotateCcw };
const PHASE_SHORT_LABEL = {
  ready: "Get Ready",
  gobag: "Build a Go-Bag",
  during: "Go",
  after: "After the Emergency",
};

export function PrepChecklist({ checkedIds, onToggle }) {
  const checkedSet = new Set(checkedIds);
  const total = PREP_ITEMS.length;
  const done = checkedIds.length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const [openPhase, setOpenPhase] = useState(null);

  return (
    <div className="prep-checklist">
      <h2>
        <ClipboardCheck size={17} strokeWidth={2.25} /> Prep Checklist
      </h2>
      <p className="family-plan-sub">Real guidance from CAL FIRE and ready.gov.</p>

      <div className="prep-progress-row">
        <span>
          {done} / {total} complete
        </span>
        <span>{percent}%</span>
      </div>
      <div className="prep-progress-bar">
        <div className="prep-progress-fill" style={{ width: `${percent}%` }} />
      </div>

      <ul className="prep-phase-list">
        {PREP_PHASES.map((phase) => {
          const items = PREP_ITEMS.filter((item) => item.phase === phase.id);
          const phaseDone = items.filter((item) => checkedSet.has(item.id)).length;
          const Icon = PHASE_ICONS[phase.id];
          const isOpen = openPhase === phase.id;

          return (
            <li key={phase.id} className="prep-phase-item">
              <button type="button" className="prep-phase-row" onClick={() => setOpenPhase(isOpen ? null : phase.id)}>
                <span className={`prep-phase-icon prep-phase-icon--${phase.id}`}>
                  <Icon size={16} strokeWidth={2.25} />
                </span>
                <span className="prep-phase-label">{PHASE_SHORT_LABEL[phase.id]}</span>
                <span className="prep-phase-count">
                  {phaseDone} / {items.length}
                </span>
                <ChevronDown size={16} className={`prep-phase-chevron${isOpen ? " open" : ""}`} />
              </button>

              {isOpen && (
                <ul className="prep-items">
                  {items.map((item) => (
                    <li key={item.id}>
                      <label>
                        <input type="checkbox" checked={checkedSet.has(item.id)} onChange={() => onToggle(item.id)} />
                        <span>{item.text}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
