import { useId } from "react";
import { TrendingUp } from "lucide-react";

const WIDTH = 260;
const HEIGHT = 70;
const PADDING_TOP = 18;
const PADDING_BOTTOM = 18;

const STEP_LABELS = { 0: "now", 60: "+1h", 120: "+2h", 180: "+3h" };

export function ForecastSparkline({ series }) {
  const gradientId = useId();

  if (!series || series.length < 2) return null;

  const values = series.map((p) => p.predictedAqi);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1); // avoid divide-by-zero on a flat line

  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const baseline = PADDING_TOP + plotHeight;
  const xStep = WIDTH / (series.length - 1);

  const points = series.map((p, i) => {
    const x = i * xStep;
    const y = baseline - ((p.predictedAqi - min) / span) * plotHeight;
    return { ...p, x, y };
  });

  const linePath = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath = `M${points[0].x},${baseline} L${linePath.replaceAll(" ", " L")} L${points[points.length - 1].x},${baseline} Z`;
  const last = points[points.length - 1];

  return (
    <div className="forecast-sparkline">
      <h2>
        <TrendingUp size={17} strokeWidth={2.25} /> 3-hour AQI forecast
      </h2>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label="3-hour AQI forecast">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />

        <polyline points={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 5 : 4}
            fill="var(--accent)"
            stroke="var(--surface)"
            strokeWidth="2"
          >
            <title>
              {STEP_LABELS[p.minutesAhead] ?? `+${p.minutesAhead}min`}: AQI {p.predictedAqi}
            </title>
          </circle>
        ))}

        <text x={last.x} y={last.y - 10} textAnchor="end" fontSize="11" fontWeight="700" fill="var(--text)">
          {last.predictedAqi}
        </text>

        {points.map((p, i) => (
          <text key={i} x={p.x} y={HEIGHT - 2} textAnchor="middle" fontSize="9" fill="var(--text-muted)">
            {STEP_LABELS[p.minutesAhead] ?? `+${p.minutesAhead}m`}
          </text>
        ))}
      </svg>
    </div>
  );
}
