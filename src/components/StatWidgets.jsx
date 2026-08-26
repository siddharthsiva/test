import { Wind, Flame, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { windDirectionCompass } from "../lib/weather";

const TREND_ICONS = { rising: TrendingUp, falling: TrendingDown, steady: Minus };

/**
 * At-a-glance widget row (wind, fire distance, short-term trend) — all real
 * data already flowing through the app, just surfaced alongside the AQI
 * hero number instead of only inside Emergency Mode / the forecast card.
 */
export function StatWidgets({ weather, wildfire, trendDirection }) {
  const TrendIcon = trendDirection ? TREND_ICONS[trendDirection] : null;

  return (
    <div className="stat-widgets">
      <div className="stat-widget">
        <Wind size={20} strokeWidth={2.25} />
        <span className="stat-widget-value">
          {weather ? `${Math.round(weather.windSpeedMph)} mph` : "—"}
        </span>
        <span className="stat-widget-label">
          {weather ? `Wind, ${windDirectionCompass(weather.windDirectionDeg)}` : "Wind"}
        </span>
      </div>

      <div className="stat-widget">
        <Flame size={20} strokeWidth={2.25} />
        <span className="stat-widget-value">{wildfire ? `${wildfire.distanceMiles} mi` : "None"}</span>
        <span className="stat-widget-label">{wildfire ? `Fire, ${wildfire.direction}` : "Nearby fire"}</span>
      </div>

      <div className="stat-widget">
        {TrendIcon ? <TrendIcon size={20} strokeWidth={2.25} /> : <Minus size={20} strokeWidth={2.25} />}
        <span className="stat-widget-value">{trendDirection ?? "—"}</span>
        <span className="stat-widget-label">3-hr trend</span>
      </div>
    </div>
  );
}
