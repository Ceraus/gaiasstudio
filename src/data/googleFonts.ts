// ---------------------------------------------------------------------------
// Curated, boutique-friendly font registry.
//
// `bundled` families are shipped with the app (via @fontsource) so they work
// fully offline and always export to PDF. `online` families are loaded on
// demand from Google Fonts when an internet connection is available.
// ---------------------------------------------------------------------------

export type FontCategory = 'serif' | 'sans' | 'script' | 'display' | 'mono' | 'system';

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
  // Serif
  { family: 'Playfair Display', category: 'serif', bundled: true },
  { family: 'Cormorant Garamond', category: 'serif', bundled: true },
  { family: 'EB Garamond', category: 'serif', bundled: true },
  { family: 'Lora', category: 'serif', bundled: true },
  // Display
  { family: 'Cinzel', category: 'display', bundled: true },
  // Sans
  { family: 'Montserrat', category: 'sans', bundled: true },
  { family: 'Poppins', category: 'sans', bundled: true },
  { family: 'Raleway', category: 'sans', bundled: true },
  { family: 'Josefin Sans', category: 'sans', bundled: true },
  // Script
  { family: 'Great Vibes', category: 'script', bundled: true },
  { family: 'Dancing Script', category: 'script', bundled: true },
  { family: 'Parisienne', category: 'script', bundled: true },
];

/** All families fetched from Google Fonts on demand (needs network). */
export const ONLINE_FONTS: FontDef[] = [
  // ── Sans-serif ──────────────────────────────────────────────────────────
  { family: 'Roboto', category: 'sans', bundled: false },
  { family: 'Open Sans', category: 'sans', bundled: false },
  { family: 'Lato', category: 'sans', bundled: false },
  { family: 'Oswald', category: 'sans', bundled: false },
  { family: 'Source Sans Pro', category: 'sans', bundled: false },
  { family: 'PT Sans', category: 'sans', bundled: false },
  { family: 'Nunito', category: 'sans', bundled: false },
  { family: 'Noto Sans', category: 'sans', bundled: false },
  { family: 'Ubuntu', category: 'sans', bundled: false },
  { family: 'Roboto Condensed', category: 'sans', bundled: false },
  { family: 'Work Sans', category: 'sans', bundled: false },
  { family: 'Quicksand', category: 'sans', bundled: false },
  { family: 'Varela Round', category: 'sans', bundled: false },
  { family: 'Cabin', category: 'sans', bundled: false },
  { family: 'Karla', category: 'sans', bundled: false },
  { family: 'Jost', category: 'sans', bundled: false },
  { family: 'Inter', category: 'sans', bundled: false },
  { family: 'DM Sans', category: 'sans', bundled: false },
  { family: 'IBM Plex Sans', category: 'sans', bundled: false },
  { family: 'Overpass', category: 'sans', bundled: false },
  { family: 'Chivo', category: 'sans', bundled: false },
  { family: 'Manrope', category: 'sans', bundled: false },
  { family: 'Sora', category: 'sans', bundled: false },
  { family: 'Plus Jakarta Sans', category: 'sans', bundled: false },
  { family: 'Outfit', category: 'sans', bundled: false },
  { family: 'Onest', category: 'sans', bundled: false },
  { family: 'Mulish', category: 'sans', bundled: false },
  { family: 'Asap', category: 'sans', bundled: false },
  { family: 'Fira Sans', category: 'sans', bundled: false },
  { family: 'Barlow', category: 'sans', bundled: false },
  { family: 'Barlow Condensed', category: 'sans', bundled: false },
  { family: 'Titillium Web', category: 'sans', bundled: false },
  { family: 'Exo', category: 'sans', bundled: false },
  { family: 'Exo 2', category: 'sans', bundled: false },
  { family: 'Oxanium', category: 'sans', bundled: false },
  { family: 'Rajdhani', category: 'sans', bundled: false },
  { family: 'Saira', category: 'sans', bundled: false },
  { family: 'Spartan', category: 'sans', bundled: false },
  { family: 'Tenor Sans', category: 'sans', bundled: false },
  { family: 'Julius Sans One', category: 'sans', bundled: false },
  { family: 'Comfortaa', category: 'sans', bundled: false },
  // ── Serif ────────────────────────────────────────────────────────────────
  { family: 'Merriweather', category: 'serif', bundled: false },
  { family: 'PT Serif', category: 'serif', bundled: false },
  { family: 'Noto Serif', category: 'serif', bundled: false },
  { family: 'Libre Baskerville', category: 'serif', bundled: false },
  { family: 'Josefin Slab', category: 'serif', bundled: false },
  { family: 'Crimson Text', category: 'serif', bundled: false },
  { family: 'Cardo', category: 'serif', bundled: false },
  { family: 'Spectral', category: 'serif', bundled: false },
  { family: 'Arvo', category: 'serif', bundled: false },
  { family: 'Bitter', category: 'serif', bundled: false },
  { family: 'Zilla Slab', category: 'serif', bundled: false },
  { family: 'Crete Round', category: 'serif', bundled: false },
  { family: 'IBM Plex Serif', category: 'serif', bundled: false },
  { family: 'Philosopher', category: 'serif', bundled: false },
  { family: 'DM Serif Display', category: 'serif', bundled: false },
  { family: 'Cormorant', category: 'serif', bundled: false },
  { family: 'Roboto Slab', category: 'serif', bundled: false },
  { family: 'Marcellus', category: 'serif', bundled: false },
  { family: 'Prata', category: 'serif', bundled: false },
  { family: 'Italiana', category: 'serif', bundled: false },
  { family: 'Bodoni Moda', category: 'serif', bundled: false },
  // ── Display ──────────────────────────────────────────────────────────────
  { family: 'Abril Fatface', category: 'display', bundled: false },
  { family: 'Anton', category: 'display', bundled: false },
  { family: 'Bebas Neue', category: 'display', bundled: false },
  { family: 'Fjalla One', category: 'display', bundled: false },
  { family: 'Passion One', category: 'display', bundled: false },
  { family: 'Black Han Sans', category: 'display', bundled: false },
  { family: 'Secular One', category: 'display', bundled: false },
  { family: 'Teko', category: 'display', bundled: false },
  { family: 'Righteous', category: 'display', bundled: false },
  { family: 'Fredoka One', category: 'display', bundled: false },
  { family: 'Poiret One', category: 'display', bundled: false },
  { family: 'Cinzel Decorative', category: 'display', bundled: false },
  { family: 'Forum', category: 'display', bundled: false },
  { family: 'Amatic SC', category: 'display', bundled: false },
  // ── Script / Handwriting ─────────────────────────────────────────────────
  { family: 'Pacifico', category: 'script', bundled: false },
  { family: 'Lobster', category: 'script', bundled: false },
  { family: 'Sacramento', category: 'script', bundled: false },
  { family: 'Pinyon Script', category: 'script', bundled: false },
  { family: 'Allura', category: 'script', bundled: false },
  { family: 'Tangerine', category: 'script', bundled: false },
  { family: 'Satisfy', category: 'script', bundled: false },
  { family: 'Caveat', category: 'script', bundled: false },
  { family: 'Alex Brush', category: 'script', bundled: false },
  // ── Monospace ────────────────────────────────────────────────────────────
  { family: 'Source Code Pro', category: 'mono', bundled: false },
  { family: 'Space Mono', category: 'mono', bundled: false },
  { family: 'Roboto Mono', category: 'mono', bundled: false },
  { family: 'Inconsolata', category: 'mono', bundled: false },
  { family: 'IBM Plex Mono', category: 'mono', bundled: false },
  { family: 'Overpass Mono', category: 'mono', bundled: false },
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
