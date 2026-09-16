/**
 * Hand-built SVG mark: a gradient sky badge with a sun and layered
 * mountain silhouette. No image-generation tool is available in this
 * environment, so this is authored directly as flat geometric shapes with
 * gradient fills for depth, rather than photography or an AI-generated asset.
 */
export function BrandLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="SmokeSmart East Bay logo">
      <defs>
        <linearGradient id="ssb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dceefc" />
          <stop offset="100%" stopColor="#eaf4fb" />
        </linearGradient>
        <linearGradient id="ssb-peak-back" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7fb8f7" />
          <stop offset="100%" stopColor="#4f95ee" />
        </linearGradient>
        <linearGradient id="ssb-peak-front" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22b06f" />
          <stop offset="100%" stopColor="#0f8a53" />
        </linearGradient>
      </defs>

      <circle cx="20" cy="20" r="20" fill="url(#ssb-sky)" />
      <circle cx="12.5" cy="12" r="4.6" fill="#fbbf24" />

      <path d="M1 31 L14.5 12.5 L21.5 21.5 L26.5 14.5 L39 31 Z" fill="url(#ssb-peak-back)" />
      <path d="M13 31 L23.5 15.5 L39 31 Z" fill="url(#ssb-peak-front)" />
      <path d="M19.5 24.5 L23.5 15.5 L27.5 22.5 L23.5 22.5 Z" fill="#ffffff" opacity="0.45" />

      <circle cx="20" cy="20" r="19.25" fill="none" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.5" />
    </svg>
  );
}
