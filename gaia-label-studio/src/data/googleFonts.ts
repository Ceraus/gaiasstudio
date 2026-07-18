// ---------------------------------------------------------------------------
// Curated, boutique-friendly font registry.
//
// `bundled` families are shipped with the app (via @fontsource) so they work
// fully offline and always export to PDF. `online` families are loaded on
// demand from Google Fonts when an internet connection is available.
// ---------------------------------------------------------------------------

export type FontCategory = 'serif' | 'sans' | 'script' | 'display' | 'system';

export interface FontDef {
  family: string;
  category: FontCategory;
  /** true = shipped offline, false = fetched from Google Fonts on demand. */
  bundled: boolean;
}

export const SYSTEM_FONTS: FontDef[] = [
  { family: 'Arial', category: 'system', bundled: true },
  { family: 'Helvetica', category: 'system', bundled: true },
  { family: 'Georgia', category: 'system', bundled: true },
  { family: 'Times New Roman', category: 'system', bundled: true },
  { family: 'Courier New', category: 'system', bundled: true },
];

export const BUNDLED_FONTS: FontDef[] = [
  { family: 'Playfair Display', category: 'serif', bundled: true },
  { family: 'Cormorant Garamond', category: 'serif', bundled: true },
  { family: 'EB Garamond', category: 'serif', bundled: true },
  { family: 'Lora', category: 'serif', bundled: true },
  { family: 'Cinzel', category: 'display', bundled: true },
  { family: 'Montserrat', category: 'sans', bundled: true },
  { family: 'Poppins', category: 'sans', bundled: true },
  { family: 'Raleway', category: 'sans', bundled: true },
  { family: 'Josefin Sans', category: 'sans', bundled: true },
  { family: 'Great Vibes', category: 'script', bundled: true },
  { family: 'Dancing Script', category: 'script', bundled: true },
  { family: 'Parisienne', category: 'script', bundled: true },
];

/** Extra elegant families fetched from Google Fonts on demand (needs network). */
export const ONLINE_FONTS: FontDef[] = [
  { family: 'Marcellus', category: 'serif', bundled: false },
  { family: 'Tenor Sans', category: 'sans', bundled: false },
  { family: 'Prata', category: 'serif', bundled: false },
  { family: 'Italiana', category: 'serif', bundled: false },
  { family: 'Bodoni Moda', category: 'serif', bundled: false },
  { family: 'Libre Baskerville', category: 'serif', bundled: false },
  { family: 'Cardo', category: 'serif', bundled: false },
  { family: 'Spectral', category: 'serif', bundled: false },
  { family: 'Forum', category: 'display', bundled: false },
  { family: 'Cinzel Decorative', category: 'display', bundled: false },
  { family: 'Quicksand', category: 'sans', bundled: false },
  { family: 'Nunito', category: 'sans', bundled: false },
  { family: 'Work Sans', category: 'sans', bundled: false },
  { family: 'Josefin Slab', category: 'serif', bundled: false },
  { family: 'Alex Brush', category: 'script', bundled: false },
  { family: 'Sacramento', category: 'script', bundled: false },
  { family: 'Pinyon Script', category: 'script', bundled: false },
  { family: 'Allura', category: 'script', bundled: false },
  { family: 'Tangerine', category: 'script', bundled: false },
  { family: 'Satisfy', category: 'script', bundled: false },
  { family: 'Caveat', category: 'script', bundled: false },
  { family: 'Amatic SC', category: 'display', bundled: false },
];

export const ALL_FONTS: FontDef[] = [
  ...SYSTEM_FONTS,
  ...BUNDLED_FONTS,
  ...ONLINE_FONTS,
];

export const DEFAULT_FONT = 'Playfair Display';

export function findFont(family: string): FontDef | undefined {
  return ALL_FONTS.find((f) => f.family === family);
}
