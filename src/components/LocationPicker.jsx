import { LOCATIONS } from "../lib/locations";

export function LocationPicker({ selectedId, onChange }) {
  return (
    <label className="location-picker">
      <span>Location</span>
      <select value={selectedId} onChange={(e) => onChange(e.target.value)}>
        {LOCATIONS.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
          </option>
        ))}
      </select>
    </label>
  );
}
