export type StyleName = { name: string; subtitle: string };

function parseHex(hex: string): [number, number, number] | null {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

const BANDS: Array<{
  test: (h: number, s: number, v: number) => boolean;
  options: StyleName[];
}> = [
  {
    test: (_h, s, v) => s < 0.07 && v < 0.28,
    options: [
      { name: 'Ink', subtitle: 'Soft Velvet' },
      { name: 'Charcoal', subtitle: 'Activated Charcoal' },
      { name: 'Graphite', subtitle: 'Polished Stone' },
    ],
  },
  {
    test: (_h, s, v) => s < 0.08 && v > 0.88,
    options: [
      { name: 'Ivory', subtitle: 'Handmade Paper' },
      { name: 'Pearl', subtitle: 'Woven Gauze' },
      { name: 'Snow', subtitle: 'Bleached Cotton' },
    ],
  },
  {
    test: (_h, s, v) => s < 0.1 && v >= 0.28 && v <= 0.88,
    options: [
      { name: 'Slate', subtitle: 'Polished Stone' },
      { name: 'Fog', subtitle: 'Frosted Glass' },
      { name: 'Ash', subtitle: 'Raw Clay' },
    ],
  },
  {
    test: (h, s, v) => s < 0.28 && v > 0.72 && h >= 15 && h < 60,
    options: [
      { name: 'Cream', subtitle: 'Linen Weave' },
      { name: 'Parchment', subtitle: 'Handmade Paper' },
      { name: 'Oat', subtitle: 'Raw Linen' },
      { name: 'Bone', subtitle: 'Worn Canvas' },
      { name: 'Champagne', subtitle: 'Soft Silk' },
    ],
  },
  {
    test: (h, _s, v) => v > 0.55 && h >= 20 && h < 50,
    options: [
      { name: 'Amber', subtitle: 'Raw Beeswax' },
      { name: 'Honey', subtitle: 'Spun Silk' },
      { name: 'Marigold', subtitle: 'Sunbaked Clay' },
      { name: 'Saffron', subtitle: 'Raw Jute' },
    ],
  },
  {
    test: (h, _s, v) => v > 0.35 && h >= 0 && h < 20,
    options: [
      { name: 'Terracotta', subtitle: 'Raw Clay' },
      { name: 'Copper', subtitle: 'Patinated Copper' },
      { name: 'Clay', subtitle: 'Sunbaked Clay' },
      { name: 'Rust', subtitle: 'Worn Leather' },
    ],
  },
  {
    test: (h, _s, v) => v > 0.25 && (h >= 340 || h < 15),
    options: [
      { name: 'Rose', subtitle: 'Smooth Silk' },
      { name: 'Blush', subtitle: 'Rose Petal' },
      { name: 'Coral', subtitle: 'Hammered Copper' },
    ],
  },
  {
    test: (h, _s, v) => v > 0.2 && h >= 260 && h < 320,
    options: [
      { name: 'Lavender', subtitle: 'Soft Velvet' },
      { name: 'Plum', subtitle: 'Brushed Suede' },
      { name: 'Lilac', subtitle: 'Frosted Glass' },
    ],
  },
  {
    test: (h, _s, v) => v > 0.15 && h >= 200 && h < 260,
    options: [
      { name: 'Ocean', subtitle: 'Sea Glass' },
      { name: 'Navy', subtitle: 'Matte Canvas' },
      { name: 'Indigo', subtitle: 'Washed Denim' },
    ],
  },
  {
    test: (h, _s, v) => v > 0.2 && h >= 150 && h < 200,
    options: [
      { name: 'Sage', subtitle: 'Cotton Fiber' },
      { name: 'Mint', subtitle: 'Smooth Linen' },
      { name: 'Seafoam', subtitle: 'Frosted Glass' },
    ],
  },
  {
    test: (h, _s, v) => v > 0.15 && h >= 70 && h < 150,
    options: [
      { name: 'Forest', subtitle: 'Pressed Moss' },
      { name: 'Olive', subtitle: 'Rustic Linen' },
      { name: 'Moss', subtitle: 'Aged Patina' },
    ],
  },
  {
    test: (h, _s, v) => v > 0.2 && h >= 50 && h < 70,
    options: [
      { name: 'Sand', subtitle: 'Fine Sand' },
      { name: 'Wheat', subtitle: 'Raw Linen' },
      { name: 'Khaki', subtitle: 'Raw Jute' },
    ],
  },
  {
    test: (h, _s, _v) => h >= 0 && h < 40,
    options: [
      { name: 'Espresso', subtitle: 'Dark Wood Grain' },
      { name: 'Walnut', subtitle: 'Worn Leather' },
      { name: 'Cacao', subtitle: 'Raw Almond Shell' },
    ],
  },
];

const FALLBACK: StyleName[] = [
  { name: 'Parchment', subtitle: 'Handmade Paper' },
  { name: 'Linen', subtitle: 'Soft Weave' },
  { name: 'Mist', subtitle: 'Frosted Glass' },
  { name: 'Dusk', subtitle: 'Brushed Suede' },
  { name: 'Clay', subtitle: 'Raw Clay' },
];

function pickUnused(options: StyleName[], existing: Set<string>): StyleName | null {
  return options.find((opt) => !existing.has(opt.name.toLowerCase())) ?? null;
}

/** Deterministic artistic name + tactile subtitle from a hex color. */
export function nameStyleFromHex(hex: string, existingNames: string[] = []): StyleName {
  const existing = new Set(existingNames.map((n) => n.trim().toLowerCase()).filter(Boolean));
  const rgb = parseHex(hex);
  if (rgb) {
    const hsv = rgbToHsv(...rgb);
    for (const band of BANDS) {
      if (!band.test(hsv.h, hsv.s, hsv.v)) continue;
      const hit = pickUnused(band.options, existing);
      if (hit) return hit;
    }
  }
  return pickUnused(FALLBACK, existing) ?? {
    name: 'Linen',
    subtitle: 'Soft Weave',
  };
}
