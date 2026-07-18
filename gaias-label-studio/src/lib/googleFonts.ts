/**
 * Dynamic Google Fonts loader for the Fabric.js canvas.
 *
 * Fabric renders text using the browser's normal font rendering, so a font
 * only shows up correctly on the canvas (and in the exported PDF) once its
 * `@font-face` has actually finished downloading. This module injects the
 * Google Fonts CSS2 stylesheet for a family on first use, then uses the
 * native Font Loading API to await the real font data before resolving, so
 * callers can safely re-render the canvas right after `await loadGoogleFont(...)`.
 */

export interface GoogleFontOption {
  family: string;
  category: "serif" | "sans-serif" | "display" | "handwriting";
}

// A boutique-leaning selection well suited to product / label design —
// elegant serifs, clean sans-serifs, and a few script/display accents.
export const GOOGLE_FONTS: GoogleFontOption[] = [
  { family: "Playfair Display", category: "serif" },
  { family: "Cormorant Garamond", category: "serif" },
  { family: "Libre Baskerville", category: "serif" },
  { family: "EB Garamond", category: "serif" },
  { family: "Marcellus", category: "serif" },
  { family: "Bodoni Moda", category: "serif" },
  { family: "Prata", category: "serif" },
  { family: "Cinzel", category: "serif" },
  { family: "Montserrat", category: "sans-serif" },
  { family: "Poppins", category: "sans-serif" },
  { family: "Quicksand", category: "sans-serif" },
  { family: "Nunito", category: "sans-serif" },
  { family: "Josefin Sans", category: "sans-serif" },
  { family: "Raleway", category: "sans-serif" },
  { family: "Work Sans", category: "sans-serif" },
  { family: "Lato", category: "sans-serif" },
  { family: "Comfortaa", category: "display" },
  { family: "Abril Fatface", category: "display" },
  { family: "Fjalla One", category: "display" },
  { family: "Julius Sans One", category: "sans-serif" },
  { family: "Great Vibes", category: "handwriting" },
  { family: "Sacramento", category: "handwriting" },
  { family: "Dancing Script", category: "handwriting" },
  { family: "Pacifico", category: "handwriting" },
  { family: "Caveat", category: "handwriting" },
  { family: "Parisienne", category: "handwriting" },
  { family: "Alex Brush", category: "handwriting" },
];

const loaded = new Set<string>();
const inFlight = new Map<string, Promise<void>>();

export function loadGoogleFont(family: string): Promise<void> {
  if (loaded.has(family)) return Promise.resolve();
  if (inFlight.has(family)) return inFlight.get(family)!;

  const promise = new Promise<void>((resolve) => {
    const linkId = `gf-link-${family.replace(/\s+/g, "-")}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
        family
      )}:ital,wght@0,400;0,600;0,700;1,400&display=swap`;
      document.head.appendChild(link);
    }

    const finish = () => {
      loaded.add(family);
      resolve();
    };

    // Give the stylesheet a beat to register its @font-face rules, then use
    // the Font Loading API to force-load the actual glyph data so Fabric's
    // canvas measurements are correct on first paint.
    setTimeout(() => {
      const fontSet = (document as any).fonts as FontFaceSet | undefined;
      if (!fontSet) {
        finish();
        return;
      }
      Promise.all([
        fontSet.load(`16px "${family}"`),
        fontSet.load(`bold 16px "${family}"`),
        fontSet.load(`italic 16px "${family}"`),
      ])
        .then(finish)
        .catch(finish);
    }, 60);
  });

  inFlight.set(family, promise);
  return promise;
}

export function isFontLoaded(family: string): boolean {
  return loaded.has(family);
}
