/**
 * Hand-built SVG mark: sky + sun + a light and dark mountain peak, matching
 * the approved reference design. No image-generation tool is available in
 * this environment, so this is authored directly as flat geometric shapes
 * rather than photography or an AI-generated asset.
 */
export function BrandLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="SmokeSmart East Bay logo">
      <circle cx="20" cy="20" r="20" fill="#eaf4fb" />
      <circle cx="13" cy="13" r="5" fill="#fbbf24" />
      <path d="M2 30 L15 13 L22 22 L27 15 L38 30 Z" fill="#60a5fa" />
      <path d="M14 30 L24 16 L38 30 Z" fill="#16a34a" />
      <path d="M14 30 L24 16 L38 30" fill="none" />
      <path d="M20 24 L24 16 L28 22 L24 22 Z" fill="#ffffff" opacity="0.5" />
    </svg>
  );
}
