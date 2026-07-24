/**
 * Collection colours.
 *
 * Soft, print-friendly pastels so a colour-coded card never fights the label
 * artwork it frames. Ordered so consecutive new collections look distinct.
 */
export interface PaletteEntry {
  hex: string;
  /** Plain-English name shown under the swatch — no hex codes in the UI. */
  label: string;
}

export const COLLECTION_PALETTE: PaletteEntry[] = [
  { hex: '#a7d7c5', label: 'Pastel Mint' },
  { hex: '#f6c6c0', label: 'Rose Petal' },
  { hex: '#f7d9a0', label: 'Golden Honey' },
  { hex: '#c3c9ee', label: 'Lavender Mist' },
  { hex: '#bfe0f0', label: 'Sea Glass' },
  { hex: '#e6c9a8', label: 'Oat Clay' },
  { hex: '#d8c4e8', label: 'Wild Iris' },
  { hex: '#cfe3a7', label: 'Fresh Sage' },
  { hex: '#f3b7d3', label: 'Blush Bloom' },
  { hex: '#b8d8d8', label: 'Eucalyptus' },
  { hex: '#f2b8a2', label: 'Apricot' },
  { hex: '#cdd6dd', label: 'Sea Salt' },
];

export const DEFAULT_COLLECTION_COLOR = COLLECTION_PALETTE[0].hex;

/** Picks the next unused palette colour so new collections stay tellable apart. */
export function nextPaletteColor(used: string[]): string {
  const taken = new Set(used.map((c) => c.toLowerCase()));
  return (
    COLLECTION_PALETTE.find((p) => !taken.has(p.hex.toLowerCase()))?.hex
    ?? COLLECTION_PALETTE[used.length % COLLECTION_PALETTE.length].hex
  );
}

/**
 * Black or white body text, whichever stays readable on the given swatch.
 * Uses the WCAG relative-luminance formula so mid-tone pastels don't guess wrong.
 */
export function readableTextOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#1f2937';
  const int = parseInt(m[1], 16);
  const channels = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.45 ? '#1f2937' : '#ffffff';
}

/** Same hue at low opacity, for card backgrounds and chips. */
export function tint(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(148, 163, 184, ${alpha})`;
  const int = parseInt(m[1], 16);
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`;
}
