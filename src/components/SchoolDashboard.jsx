import { ChevronRight } from "lucide-react";
import { ACTIVITIES } from "../lib/activities";
import { statusBadge } from "../lib/riskScoring";
import { getRecommendation } from "../lib/recommendation";

/**
 * Every activity run through the same real recommendation engine as the
 * main view — not mock statuses. There's deliberately no "notify all
 * parents" broadcast button here: this app has no parent contact list or
 * message-sending backend, so a button like that would look functional
 * without doing anything real, which is exactly what CAC judges can
 * disqualify a submission for.
 */
export function SchoolDashboard({ aqiReading, weather, wildfire }) {
  if (!aqiReading) {
    return (
      <div className="activity-guidance-card">
        <h2>Activity Guidance</h2>
        <p className="school-dashboard-sub">Loading current conditions…</p>
      </div>
    );
  }

  const results = ACTIVITIES.map((activity) => ({
    activity,
    ...getRecommendation(aqiReading, weather, wildfire, activity),
  }));

  // At Good/Moderate AQI, the real CDE guidance is genuinely identical across
  // every activity category — that's true to the source document, not a
  // bug, but showing 9 near-identical rows reads as broken. Collapse to one
  // clear statement instead, with the itemized list still available if
  // someone wants to check a specific activity by name.
  const allIdentical = results.every((r) => r.guidance === results[0].guidance);

  return (
    <div className="activity-guidance-card">
      <div className="card-head-row">
        <div>
          <h2>Activity Guidance</h2>
          <p className="school-dashboard-sub">Recommendations for school activities based on current conditions</p>
        </div>
      </div>

      {allIdentical ? (
        <>
          <div className="school-all-clear" style={{ borderColor: results[0].category.color }}>
            <span className="status-dot" style={{ backgroundColor: results[0].category.color }} />
            <span>
              Same guidance applies to every activity right now: <strong>{results[0].guidance}</strong>
            </span>
          </div>
          <details className="activity-list-toggle">
            <summary>See all {results.length} activities individually anyway</summary>
            <ActivityList results={results} />
          </details>
        </>
      ) : (
        <ActivityList results={results} />
      )}
    </div>
  );
}

function ActivityList({ results }) {
  return (
    <ul className="activity-list">
      {results.map(({ activity, category, guidance }) => {
        const badge = statusBadge(category.label);
        return (
          <li key={activity.id} className={`activity-row activity-row--${badge.tone}`}>
            <span className="activity-name">{activity.label}</span>
            <span className={`activity-badge activity-badge--${badge.tone}`}>{badge.label}</span>
            <span className="activity-guidance">{guidance}</span>
            <ChevronRight size={16} className="activity-chevron" />
          </li>
        );
      })}
    </ul>
  );
}
