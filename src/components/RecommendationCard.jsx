import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { getActivityGuidanceTable, statusBadge } from "../lib/riskScoring";

const TONE_TEXT = { good: "Good to go!", caution: "Use caution", bad: "Not recommended" };
const TONE_ICON = { good: CheckCircle2, caution: AlertTriangle, bad: XCircle };

// Same real tone mapping used on the School activity list
// (statusBadge in riskScoring.js) — just friendlier hero wording here
// ("Good to go!" vs. the list's compact "Normal" badge) for the same tone.
function activityFraming(categoryLabel) {
  const { tone } = statusBadge(categoryLabel);
  return { text: TONE_TEXT[tone], tone, Icon: TONE_ICON[tone] };
}

export function RecommendationCard({ aqi, source, recommendation, activity }) {
  if (aqi == null || !recommendation) {
    // Mirrors the real card's shape (same panel, same block sizes) so the
    // layout doesn't jump once data arrives — a bare "Loading…" line would
    // collapse the card down to one row and then snap open.
    return (
      <div className="recommendation-row">
        <div className="recommendation-card recommendation-card--skeleton" aria-busy="true" aria-label="Loading conditions">
          <div className="skeleton-block skeleton-number" />
          <div className="skeleton-block skeleton-label" />
        </div>
        <div className="activity-card recommendation-card--skeleton" aria-busy="true">
          <div className="skeleton-block skeleton-line" />
          <div className="skeleton-block skeleton-line" style={{ width: "80%" }} />
        </div>
      </div>
    );
  }

  const { category, guidance, notes } = recommendation;
  const table = activity ? getActivityGuidanceTable(activity.category) : [];
  const framing = activityFraming(category.label);

  return (
    <div className="recommendation-row">
      <div className="recommendation-card" style={{ "--category-color": category.color, "--category-bg": category.bg }}>
        <span className="card-eyebrow">Current AQI</span>
        <div className="aqi-number" style={{ color: category.color }}>
          {aqi}
        </div>
        <span className="aqi-pill" style={{ background: category.color }}>
          {category.label}
        </span>
        <p className="aqi-guidance">{guidance}</p>

        <p className="aqi-source">
          Source: {source === "mock" ? "demo data (no API key configured yet)" : source} (just now)
        </p>

        {source === "purpleair" && aqi >= 150 && (
          <p className="aqi-caveat">
            Note: PurpleAir sensors are known to overestimate at AQI 150+ versus official
            EPA-calibrated monitors (per CA school air quality guidance). Cross-check{" "}
            <a href="https://www.airnow.gov/" target="_blank" rel="noreferrer">
              AirNow.gov
            </a>{" "}
            for the official reading before making a decision.
          </p>
        )}
      </div>

      <div className={`activity-card activity-card--${framing.tone}`}>
        <span className="card-eyebrow">For Your Activity: {activity?.label ?? "Outdoor activity"}</span>
        <div className="activity-status">
          <framing.Icon size={22} strokeWidth={2.25} />
          <span>{framing.text}</span>
        </div>
        <p className="activity-desc">{guidance}</p>

        {notes.length > 0 && (
          <ul className="rec-notes">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}

        {activity && (
          <details className="guidance-table-toggle">
            <summary>See how guidance changes as AQI rises</summary>
            <table className="guidance-table">
              <tbody>
                {table.map((row) => (
                  <tr key={row.label} className={row.label === category.label ? "current" : ""}>
                    <td className="guidance-table-tier" style={{ color: row.color }}>
                      {row.label}
                    </td>
                    <td>{row.guidance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </div>
    </div>
  );
}
