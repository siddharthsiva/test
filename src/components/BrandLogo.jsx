/**
 * Hand-built SVG mark: a civic-style circular badge (navy ring, tree +
 * rolling hills + bay wave) evoking a county-seal aesthetic without
 * reproducing any real government seal — SmokeSmart East Bay is not an
 * official county product. No image-generation tool is available in this
 * environment, so this is authored directly as flat geometric shapes.
 */
export function BrandLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="SmokeSmart East Bay logo">
      <defs>
        <linearGradient id="ssb-hill-far" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5c7a52" />
          <stop offset="100%" stopColor="#3d5e3a" />
        </linearGradient>
        <linearGradient id="ssb-hill-near" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2f4a2c" />
          <stop offset="100%" stopColor="#233920" />
        </linearGradient>
      </defs>

      <circle cx="20" cy="20" r="20" fill="#10284b" />
      <circle cx="20" cy="20" r="17" fill="#eaf4ff" />

      {/* rolling hills */}
      <path d="M2 26 Q10 17 17 23 Q24 15 33 22 L38 26 Z" fill="url(#ssb-hill-far)" />
      <path d="M2 30 Q12 21 20 27 Q28 20 38 28 L38 33.5 Q20 36 2 33.5 Z" fill="url(#ssb-hill-near)" />

      {/* tree */}
      <path d="M15.5 21.5 L18.5 21.5 L17 18.5 Z" fill="#eaf4ff" opacity="0" />
      <path
        d="M17 12.5 L14.3 17.6 L15.8 17.6 L13.4 21.6 L20.6 21.6 L18.2 17.6 L19.7 17.6 Z"
        fill="#2f4a2c"
      />
      <rect x="16.3" y="21.4" width="1.4" height="2.1" fill="#2f4a2c" />

      {/* bay wave */}
      <path
        d="M3 30.5 Q8 28.7 13 30.5 Q18 32.3 23 30.5 Q28 28.7 33 30.5 Q35.5 31.4 37 31"
        fill="none"
        stroke="#0c75e8"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.75"
      />

      <circle cx="20" cy="20" r="17" fill="none" stroke="#10284b" strokeWidth="1.4" />
      <circle cx="20" cy="20" r="19.25" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.2" />
    </svg>
  );
}
