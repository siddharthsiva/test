import { Wind, Flame, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { windDirectionCompass } from "../lib/weather";

const TREND_ICONS = { rising: TrendingUp, falling: TrendingDown, steady: Minus };

/**
 * At-a-glance stat rows (wind, fire distance, short-term trend) — all real
 * data already flowing through the app. Laid out as a compact sidebar
 * module (icon + label + value per row) rather than a horizontal strip, so
 * it reads as a dashboard module next to the map instead of a floating row
 * of squares.
 */
export function StatWidgets({ weather, wildfire, trendDirection }) {
  const TrendIcon = trendDirection ? TREND_ICONS[trendDirection] : Minus;

  return (
    <div className="stat-widgets">
      <div className="stat-widget">
        <span className="stat-widget-icon">
          <Wind size={16} strokeWidth={2.25} />
        </span>
        <span className="stat-widget-label">
          {weather ? `Wind, ${windDirectionCompass(weather.windDirectionDeg)}` : "Wind"}
        </span>
        <span className="stat-widget-value">
          {weather ? `${Math.round(weather.windSpeedMph)} mph` : "—"}
        </span>
      </div>

      <div className="stat-widget">
        <span className="stat-widget-icon">
          <Flame size={16} strokeWidth={2.25} />
        </span>
        <span className="stat-widget-label">{wildfire ? `Fire, ${wildfire.direction}` : "Nearby fire"}</span>
        <span className="stat-widget-value">{wildfire ? `${wildfire.distanceMiles} mi` : "None"}</span>
      </div>

      <div className="stat-widget">
        <span className="stat-widget-icon">
          <TrendIcon size={16} strokeWidth={2.25} />
        </span>
        <span className="stat-widget-label">3-hr trend</span>
        <span className="stat-widget-value">{trendDirection ?? "—"}</span>
      </div>
    </div>
  );
}
