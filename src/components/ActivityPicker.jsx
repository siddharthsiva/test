import { ACTIVITIES } from "../lib/activities";

export function ActivityPicker({ selectedId, onChange }) {
  return (
    <label className="activity-picker">
      <span>Activity</span>
      <select value={selectedId} onChange={(e) => onChange(e.target.value)}>
        {ACTIVITIES.map((activity) => (
          <option key={activity.id} value={activity.id}>
            {activity.label}
          </option>
        ))}
      </select>
    </label>
  );
}
