import { getActivityGuidanceTable } from "../lib/riskScoring";

export function RecommendationCard({ aqi, source, recommendation, activity }) {
  if (aqi == null || !recommendation) return <p>Loading conditions…</p>;

  const { category, guidance, notes } = recommendation;
  const table = activity ? getActivityGuidanceTable(activity.category) : [];

  return (
    <div className="recommendation-card" style={{ "--category-color": category.color }}>
      <div className="aqi-number" style={{ color: category.color }}>
        {aqi}
      </div>
      <div className="aqi-label">{category.label}</div>
      <p className="aqi-guidance">{guidance}</p>

      {notes.length > 0 && (
        <ul className="rec-notes">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      <p className="aqi-source">
        Source: {source === "mock" ? "demo data (no API key configured yet)" : source}
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

      {activity && (
        <details className="guidance-table-toggle">
          <summary>How guidance for {activity.label.toLowerCase()} changes as AQI rises</summary>
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
  );
}
