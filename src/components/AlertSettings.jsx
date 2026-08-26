import { useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { requestNotificationPermission } from "../lib/alerts";

const AQI_THRESHOLD_OPTIONS = [100, 150, 200];
const FIRE_THRESHOLD_OPTIONS = [10, 20, 30, 50];

export function AlertSettings({ thresholdAqi, wildfireThresholdMiles, notificationsEnabled, onChange }) {
  const [requesting, setRequesting] = useState(false);

  async function handleEnable() {
    setRequesting(true);
    const granted = await requestNotificationPermission();
    setRequesting(false);
    onChange({ notificationsEnabled: granted });
  }

  return (
    <div className="alert-settings">
      <h2>
        <Bell size={17} strokeWidth={2.25} /> Alerts
      </h2>

      <label>
        Notify me when AQI reaches
        <select value={thresholdAqi} onChange={(e) => onChange({ thresholdAqi: Number(e.target.value) })}>
          {AQI_THRESHOLD_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>

      <label>
        Notify me if a wildfire is within
        <select
          value={wildfireThresholdMiles}
          onChange={(e) => onChange({ wildfireThresholdMiles: Number(e.target.value) })}
        >
          {FIRE_THRESHOLD_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v} mi
            </option>
          ))}
        </select>
      </label>

      {notificationsEnabled ? (
        <p className="alert-status">
          <CheckCircle2 size={15} strokeWidth={2.25} /> Notifications enabled
        </p>
      ) : (
        <button type="button" onClick={handleEnable} disabled={requesting}>
          {requesting ? "Requesting…" : "Enable browser notifications"}
        </button>
      )}

      <p className="alert-note">
        Fires while this tab is open. Settings are saved to your device so they persist next visit.
      </p>
    </div>
  );
}
