// ---------------------------------------------------------------------------
// FontManager
//
// - Bundled families are imported below so they are embedded in the build and
//   always available offline (and therefore always render into the PDF).
// - Online families are injected as Google Fonts <link> tags on demand.
// - `loadFont` guarantees the browser has actually rasterized the face before
//   Fabric re-renders, which is the classic "font shows after I click twice" bug.
// ---------------------------------------------------------------------------

// Bundled offline faces (400 + 700 where available) --------------------------
import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/700.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/700.css';
import '@fontsource/lora/400.css';
import '@fontsource/lora/700.css';
import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/700.css';
import '@fontsource/raleway/400.css';
import '@fontsource/raleway/700.css';
import '@fontsource/josefin-sans/400.css';
import '@fontsource/josefin-sans/700.css';
import '@fontsource/great-vibes/400.css';
import '@fontsource/dancing-script/400.css';
import '@fontsource/dancing-script/700.css';
import '@fontsource/parisienne/400.css';

import { BUNDLED_FONTS, findFont, SYSTEM_FONTS } from '@/data/googleFonts';

const loaded = new Set<string>([
  ...SYSTEM_FONTS.map((f) => f.family),
  ...BUNDLED_FONTS.map((f) => f.family),
]);
const injected = new Set<string>();

function injectGoogleFontLink(family: string) {
  if (injected.has(family)) return;
  injected.add(family);
  const id = `gf-${family.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const href =
    `https://fonts.googleapis.com/css2?family=` +
    encodeURIComponent(family).replace(/%20/g, '+') +
    `:wght@400;700&display=swap`;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Ensure a font family is available and rasterized. Resolves to `true` when the
 * face is ready to render on the Fabric canvas / PDF, `false` if it could not be
 * fetched (offline + not bundled). Never rejects.
 */
export async function loadFont(family: string): Promise<boolean> {
  const def = findFont(family);
  if (!def) return true; // treat unknown families as already-available system fonts

  if (!def.bundled) injectGoogleFontLink(family);

  try {
    if ('fonts' in document) {
      await Promise.race([
        Promise.all([
          document.fonts.load(`400 16px "${family}"`),
          document.fonts.load(`700 16px "${family}"`),
        ]),
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);
      await document.fonts.ready;
    }
    loaded.add(family);
    return document.fonts ? document.fonts.check(`16px "${family}"`) : true;
  } catch {
    return loaded.has(family);
  }
}

/** Pre-load every font family used by a set of Fabric objects (before export). */
export async function ensureFontsLoaded(families: string[]): Promise<void> {
  await Promise.all([...new Set(families)].map((f) => loadFont(f)));
}

export function isFontLoaded(family: string): boolean {
  return loaded.has(family);
}
