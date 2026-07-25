/**
 * Ingredient-specific SVG icons — 60+ ingredient name keywords mapped to
 * flat 24×24 vector paths. Used by IngredientIcon as overrides; any
 * ingredient whose normalized name contains a key uses this specific shape
 * instead of the generic category icon.
 *
 * Lookup is case-insensitive and checks if the ingredient name INCLUDES
 * the key string (longest keys take priority).
 */
import type { JSX } from 'react';
import type { ReactNode } from 'react';

export interface SpecificIcon {
  path: ReactNode;
  /** Tailwind text + bg classes (overrides the category colour) */
  colors: string;
}

/** Keys are lowercase substrings; longer/more-specific keys take priority. */
export const INGREDIENT_ICON_MAP: Record<string, SpecificIcon> = {

  // ─── OILS ────────────────────────────────────────────────────────────────

  'avocado': {
    colors: 'text-green-700 bg-green-50',
    path: (
      <>
        {/* avocado half with pit */}
        <path d="M12 3 C8 3 5 7 5 12 C5 17 8 21 12 21 C16 21 19 17 19 12 C19 7 16 3 12 3Z" />
        <circle cx="12" cy="13" r="3.5" fill="white" opacity="0.85" />
        <circle cx="12" cy="13" r="2" fill="currentColor" opacity="0.4" />
      </>
    ),
  },

  'rosehip': {
    colors: 'text-rose-600 bg-rose-50',
    path: (
      <>
        {/* rosehip berry */}
        <ellipse cx="12" cy="14" rx="5" ry="6" />
        <path d="M10 8 C10 8 8 5 9 3" strokeWidth="1.5" strokeLinecap="round" stroke="currentColor" fill="none" />
        <path d="M14 8 C14 8 16 5 15 3" strokeWidth="1.5" strokeLinecap="round" stroke="currentColor" fill="none" />
        <path d="M12 8 L12 4" strokeWidth="1.5" strokeLinecap="round" stroke="currentColor" fill="none" />
        <ellipse cx="12" cy="14" rx="2" ry="2.5" fill="white" opacity="0.25" />
      </>
    ),
  },

  'argan': {
    colors: 'text-amber-700 bg-amber-50',
    path: (
      <>
        {/* argan nut oval */}
        <ellipse cx="12" cy="13" rx="6" ry="8" />
        <path d="M9 8 C10 6 14 6 15 8" fill="none" strokeWidth="1.5" stroke="currentColor" />
        <path d="M9 16 C10 18 14 18 15 16" fill="none" strokeWidth="1.5" stroke="currentColor" opacity="0.5" />
      </>
    ),
  },

  'hemp': {
    colors: 'text-green-600 bg-green-50',
    path: (
      <>
        {/* hemp leaf – 5 pointed radiating blades */}
        <path d="M12 20 L12 8" strokeWidth="2" strokeLinecap="round" stroke="currentColor" fill="none" />
        <path d="M12 14 C12 14 7 8 4 9 C6 14 12 14 12 14Z" />
        <path d="M12 14 C12 14 17 8 20 9 C18 14 12 14 12 14Z" />
        <path d="M12 11 C12 11 7 5 5 5 C7 9 12 11 12 11Z" opacity="0.7" />
        <path d="M12 11 C12 11 17 5 19 5 C17 9 12 11 12 11Z" opacity="0.7" />
      </>
    ),
  },

  'sunflower': {
    colors: 'text-yellow-500 bg-yellow-50',
    path: (
      <>
        {/* sunflower head with petals */}
        <circle cx="12" cy="12" r="4" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const r = deg * Math.PI / 180;
          return (
            <ellipse
              key={deg}
              cx={12 + 7 * Math.sin(r)}
              cy={12 - 7 * Math.cos(r)}
              rx="2"
              ry="3.5"
              transform={`rotate(${deg} ${12 + 7 * Math.sin(r)} ${12 - 7 * Math.cos(r)})`}
              opacity="0.8"
            />
          );
        })}
        <circle cx="12" cy="12" r="3" fill="white" opacity="0.3" />
      </>
    ),
  },

  'jojoba': {
    colors: 'text-amber-600 bg-amber-50',
    path: (
      <>
        {/* jojoba shrub beans on stem */}
        <path d="M12 20 L12 11" strokeWidth="2" strokeLinecap="round" stroke="currentColor" fill="none" />
        <ellipse cx="9" cy="10" rx="3" ry="4" transform="rotate(-15 9 10)" />
        <ellipse cx="15" cy="9" rx="3" ry="4" transform="rotate(15 15 9)" />
        <ellipse cx="12" cy="7" rx="2.5" ry="3.5" />
      </>
    ),
  },

  'grapeseed': {
    colors: 'text-purple-600 bg-purple-50',
    path: (
      <>
        {/* grape cluster */}
        <circle cx="9"  cy="10" r="2.5" />
        <circle cx="15" cy="10" r="2.5" />
        <circle cx="12" cy="8"  r="2.5" />
        <circle cx="9"  cy="15" r="2.5" />
        <circle cx="15" cy="15" r="2.5" />
        <circle cx="12" cy="13" r="2.5" />
        <circle cx="12" cy="19" r="2.5" />
        <path d="M12 5 L12 8" strokeWidth="1.5" strokeLinecap="round" stroke="currentColor" fill="none" />
        <path d="M12 5 C12 5 15 3 17 4" strokeWidth="1.5" strokeLinecap="round" stroke="currentColor" fill="none" />
      </>
    ),
  },

  'coconut': {
    colors: 'text-amber-700 bg-amber-50',
    path: (
      <>
        {/* coconut cut in half */}
        <path d="M4 12 A8 8 0 0 1 20 12 Z" />
        <path d="M4 12 Q4 20 12 20 Q20 20 20 12 Z" opacity="0.6" />
        <path d="M4 12 L20 12" strokeWidth="1.5" stroke="currentColor" fill="none" />
        <circle cx="9"  cy="8.5" r="1.2" fill="white" opacity="0.7" />
        <circle cx="12" cy="7"   r="1"   fill="white" opacity="0.5" />
        <circle cx="15" cy="8.5" r="1.2" fill="white" opacity="0.7" />
        <path d="M12 12 Q10 15 9 18" strokeWidth="1.5" stroke="white" fill="none" opacity="0.3" strokeLinecap="round" />
        <path d="M12 12 Q14 15 15 18" strokeWidth="1.5" stroke="white" fill="none" opacity="0.3" strokeLinecap="round" />
      </>
    ),
  },

  'olive': {
    colors: 'text-green-700 bg-green-50',
    path: (
      <>
        {/* olive branch with olives */}
        <path d="M5 19 Q10 12 19 5" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <ellipse cx="8"  cy="16" rx="2.5" ry="3.5" transform="rotate(30 8 16)" />
        <ellipse cx="13" cy="11" rx="2.5" ry="3.5" transform="rotate(30 13 11)" />
        <path d="M12 13 Q15 10 17 7" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.6" />
      </>
    ),
  },

  'almond': {
    colors: 'text-amber-600 bg-amber-50',
    path: (
      <>
        {/* almond shape */}
        <path d="M12 3 C16 3 20 7 20 12 C20 17 16 21 12 21 C8 21 4 17 4 12 C4 7 8 3 12 3Z
                 M12 3 C8 3 8 12 12 21" fill="currentColor" />
        <path d="M12 6 C14 7 16 10 16 13" fill="none" strokeWidth="1" stroke="white" opacity="0.4" strokeLinecap="round" />
      </>
    ),
  },

  'castor': {
    colors: 'text-amber-700 bg-amber-50',
    path: (
      <>
        {/* castor bean pod with spiky texture */}
        <ellipse cx="12" cy="13" rx="5" ry="7" />
        <path d="M9 9 L8 6" strokeWidth="1.2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 7 L12 4" strokeWidth="1.2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M15 9 L16 6" strokeWidth="1.2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <ellipse cx="12" cy="13" rx="2" ry="3" fill="white" opacity="0.2" />
      </>
    ),
  },

  'pumpkin seed': {
    colors: 'text-green-700 bg-green-50',
    path: (
      <>
        {/* pumpkin shape */}
        <path d="M12 6 C12 6 7 7 7 13 C7 17 9 20 12 20 C15 20 17 17 17 13 C17 7 12 6 12 6Z" />
        <path d="M9 8 C9 8 5 9 5 13 C5 16 7 18 9 18" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
        <path d="M15 8 C15 8 19 9 19 13 C19 16 17 18 15 18" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
        <path d="M12 6 L12 4" strokeWidth="2" stroke="currentColor" strokeLinecap="round" fill="none" />
      </>
    ),
  },

  // ─── CLAYS ───────────────────────────────────────────────────────────────

  'kaolin': {
    colors: 'text-pink-400 bg-pink-50',
    path: (
      <>
        {/* smooth bowl */}
        <ellipse cx="12" cy="10" rx="8" ry="3" opacity="0.7" />
        <path d="M4 10 Q4 19 12 19 Q20 19 20 10" fill="none" strokeWidth="2" strokeLinecap="round" stroke="currentColor" />
        <path d="M7 12 Q7 17 12 17 Q17 17 17 12" fill="none" strokeWidth="1" stroke="currentColor" opacity="0.3" />
      </>
    ),
  },

  'bentonite': {
    colors: 'text-stone-600 bg-stone-50',
    path: (
      <>
        {/* rough clay chunk */}
        <path d="M5 8 L8 5 L16 5 L19 8 L20 15 L16 20 L8 20 L4 15 Z" />
        <path d="M8 5 L8 9 M16 5 L16 9 M4 11 L8 11 M16 11 L20 11" stroke="white" strokeWidth="1" fill="none" opacity="0.3" />
      </>
    ),
  },

  'french green': {
    colors: 'text-green-600 bg-green-50',
    path: (
      <>
        <ellipse cx="12" cy="10" rx="8" ry="3" />
        <path d="M4 10 Q4 19 12 19 Q20 19 20 10" fill="none" strokeWidth="2" strokeLinecap="round" stroke="currentColor" />
        <path d="M8 13 L16 13" strokeWidth="1.5" stroke="currentColor" fill="none" opacity="0.4" />
        <path d="M9 16 L15 16" strokeWidth="1.5" stroke="currentColor" fill="none" opacity="0.3" />
      </>
    ),
  },

  'rhassoul': {
    colors: 'text-orange-700 bg-orange-50',
    path: (
      <>
        <path d="M6 8 Q6 5 12 5 Q18 5 18 8 L20 14 Q20 20 12 20 Q4 20 4 14 Z" />
        <path d="M8 5 Q12 3 16 5" fill="none" strokeWidth="1.5" stroke="currentColor" opacity="0.5" />
      </>
    ),
  },

  'rose kaolin': {
    colors: 'text-rose-400 bg-rose-50',
    path: (
      <>
        <ellipse cx="12" cy="10" rx="8" ry="3" />
        <path d="M4 10 Q4 19 12 19 Q20 19 20 10" fill="none" strokeWidth="2" strokeLinecap="round" stroke="currentColor" />
        {/* small heart inside */}
        <path d="M10.5 13 C10.5 13 9 11.5 9 10.5 A1.5 1.5 0 0 1 12 10.5 A1.5 1.5 0 0 1 15 10.5 C15 11.5 13.5 13 12 14.5 C10.5 13 10.5 13 10.5 13Z" fill="white" opacity="0.5" />
      </>
    ),
  },

  // ─── BOTANICALS ──────────────────────────────────────────────────────────

  'aloe': {
    colors: 'text-green-500 bg-green-50',
    path: (
      <>
        {/* aloe vera succulent leaf */}
        <path d="M12 20 C12 20 6 15 6 9 C6 6 8 4 10 5 L12 20Z" />
        <path d="M12 20 C12 20 18 15 18 9 C18 6 16 4 14 5 L12 20Z" opacity="0.7" />
        <path d="M12 20 L12 5" strokeWidth="1.5" stroke="currentColor" fill="none" opacity="0.3" />
        <path d="M8 10 L10 9 M8 13 L10 12 M8 16 L10 15" strokeWidth="1" stroke="white" fill="none" opacity="0.4" strokeLinecap="round" />
      </>
    ),
  },

  'calendula': {
    colors: 'text-orange-400 bg-orange-50',
    path: (
      <>
        {/* calendula / marigold daisy */}
        <circle cx="12" cy="12" r="3" />
        {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((deg) => {
          const r = deg * Math.PI / 180;
          const cx = 12 + 6 * Math.sin(r);
          const cy = 12 - 6 * Math.cos(r);
          return <ellipse key={deg} cx={cx} cy={cy} rx="1.8" ry="3.5"
                   transform={`rotate(${deg} ${cx} ${cy})`} opacity="0.9" />;
        })}
      </>
    ),
  },

  'chamomile': {
    colors: 'text-yellow-400 bg-yellow-50',
    path: (
      <>
        {/* chamomile — white petals droop slightly */}
        <circle cx="12" cy="12" r="3" />
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const r = deg * Math.PI / 180;
          const cx = 12 + 5.5 * Math.sin(r);
          const cy = 12 - 5.5 * Math.cos(r);
          return <ellipse key={deg} cx={cx} cy={cy} rx="2" ry="4"
                   transform={`rotate(${deg} ${cx} ${cy})`} opacity="0.7" />;
        })}
        <path d="M12 19 L12 22" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
      </>
    ),
  },

  'green tea': {
    colors: 'text-green-600 bg-green-50',
    path: (
      <>
        {/* pointed tea leaf */}
        <path d="M12 4 C12 4 4 10 4 16 C4 19 7 21 12 21 C17 21 20 19 20 16 C20 10 12 4 12 4Z" />
        <path d="M12 4 L12 21" strokeWidth="1" stroke="white" fill="none" opacity="0.3" />
        <path d="M6 13 Q12 11 18 13" strokeWidth="1" stroke="white" fill="none" opacity="0.3" />
        <path d="M5 16 Q12 14 19 16" strokeWidth="1" stroke="white" fill="none" opacity="0.3" />
      </>
    ),
  },

  'spirulina': {
    colors: 'text-teal-600 bg-teal-50',
    path: (
      <>
        {/* spiral ribbon — spirulina cyanobacteria helix */}
        <path d="M5 18 C5 14 8 12 12 12 C16 12 19 10 19 6"
          fill="none" strokeWidth="3" strokeLinecap="round" stroke="currentColor" />
        <path d="M5 14 C5 10 8 8 12 8 C16 8 19 6 19 2"
          fill="none" strokeWidth="2" strokeLinecap="round" stroke="currentColor" opacity="0.5" />
        <path d="M5 22 C5 18 8 16 12 16 C16 16 19 14 19 10"
          fill="none" strokeWidth="2" strokeLinecap="round" stroke="currentColor" opacity="0.4" />
      </>
    ),
  },

  'activated charcoal': {
    colors: 'text-slate-800 bg-slate-100',
    path: (
      <>
        {/* charcoal chunk — irregular hexagonal lump */}
        <path d="M8 4 L16 4 L21 10 L19 18 L13 21 L5 19 L3 11 Z" />
        <path d="M8 4 L5 8 M16 4 L19 8 M3 11 L8 10 M21 10 L16 11" stroke="white" strokeWidth="0.8" fill="none" opacity="0.25" />
      </>
    ),
  },

  'charcoal': {
    colors: 'text-slate-800 bg-slate-100',
    path: (
      <>
        <path d="M8 4 L16 4 L21 10 L19 18 L13 21 L5 19 L3 11 Z" />
        <path d="M8 4 L5 8 M16 4 L19 8 M3 11 L8 10 M21 10 L16 11" stroke="white" strokeWidth="0.8" fill="none" opacity="0.25" />
      </>
    ),
  },

  'turmeric': {
    colors: 'text-yellow-600 bg-yellow-50',
    path: (
      <>
        {/* turmeric root knuckle */}
        <path d="M4 14 Q4 10 8 9 L11 9 Q14 9 14 12 Q14 16 11 16 L8 16 Q4 16 4 14Z" />
        <path d="M11 9 L14 9 Q18 9 18 12 Q18 16 14 16 L11 16" fill="none" strokeWidth="1.5" stroke="currentColor" />
        <path d="M14 9 L17 9 Q21 9 21 12 Q21 16 17 16 L14 16" fill="none" strokeWidth="1.5" stroke="currentColor" opacity="0.5" />
        <path d="M8 9 L8 6 M11 9 L12 6" strokeWidth="2" stroke="currentColor" strokeLinecap="round" fill="none" opacity="0.5" />
      </>
    ),
  },

  'neem': {
    colors: 'text-green-700 bg-green-50',
    path: (
      <>
        {/* compound neem leaf — central stem with leaflets */}
        <path d="M12 20 L12 8" strokeWidth="2" strokeLinecap="round" stroke="currentColor" fill="none" />
        <path d="M12 17 C9 15 6 13 5 11 C7 10 10 13 12 17Z" />
        <path d="M12 17 C15 15 18 13 19 11 C17 10 14 13 12 17Z" />
        <path d="M12 14 C9 12 6 10 5 8 C7 7 10 10 12 14Z" opacity="0.7" />
        <path d="M12 14 C15 12 18 10 19 8 C17 7 14 10 12 14Z" opacity="0.7" />
        <path d="M12 11 C10 9 8 7 7 5 C9 4.5 11 7 12 11Z" opacity="0.5" />
        <path d="M12 11 C14 9 16 7 17 5 C15 4.5 13 7 12 11Z" opacity="0.5" />
      </>
    ),
  },

  'matcha': {
    colors: 'text-green-600 bg-green-50',
    path: (
      <>
        {/* matcha bowl */}
        <path d="M5 10 Q5 20 12 20 Q19 20 19 10 Z" />
        <ellipse cx="12" cy="10" rx="7" ry="2.5" />
        <ellipse cx="12" cy="10" rx="5" ry="1.5" fill="white" opacity="0.15" />
        <path d="M7 7 L17 7" strokeWidth="1" stroke="currentColor" fill="none" opacity="0.4" />
      </>
    ),
  },

  // ─── FLORALS ─────────────────────────────────────────────────────────────

  'rose': {
    colors: 'text-rose-500 bg-rose-50',
    path: (
      <>
        {/* open rose blossom — spiral petals */}
        <circle cx="12" cy="12" r="3" />
        <path d="M12 9 C10 7 7 7 7 10 C7 13 10 13 12 12" fill="none" strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" opacity="0.9" />
        <path d="M9 12 C7 14 7 17 10 17 C13 17 13 14 12 12" fill="none" strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" opacity="0.8" />
        <path d="M12 15 C14 17 17 17 17 14 C17 11 14 11 12 12" fill="none" strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" opacity="0.7" />
        <path d="M15 12 C17 10 17 7 14 7 C11 7 11 10 12 12" fill="none" strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" opacity="0.6" />
        <path d="M12 20 L12 16" strokeWidth="2" stroke="currentColor" strokeLinecap="round" fill="none" opacity="0.4" />
      </>
    ),
  },

  'lavender': {
    colors: 'text-violet-500 bg-violet-50',
    path: (
      <>
        {/* lavender sprig */}
        <path d="M12 22 L12 10" strokeWidth="2" strokeLinecap="round" stroke="currentColor" fill="none" />
        {/* buds up the stem */}
        {[10, 13, 16].map((y, i) => (
          <>
            <ellipse key={`l${i}`} cx={11} cy={y} rx="1.5" ry="2" />
            <ellipse key={`r${i}`} cx={13} cy={y} rx="1.5" ry="2" />
          </>
        ))}
        <ellipse cx="12" cy="8" rx="1.5" ry="2.5" />
        <path d="M10 18 C8 17 7 15 8 13" fill="none" strokeWidth="1" stroke="currentColor" opacity="0.4" strokeLinecap="round" />
        <path d="M14 18 C16 17 17 15 16 13" fill="none" strokeWidth="1" stroke="currentColor" opacity="0.4" strokeLinecap="round" />
      </>
    ),
  },

  'jasmine': {
    colors: 'text-yellow-100 bg-yellow-50',
    path: (
      <>
        {/* five-petal jasmine in a warm cream */}
        <circle cx="12" cy="12" r="2.5" fill="currentColor" className="text-yellow-300" />
        {[0, 72, 144, 216, 288].map((deg) => {
          const r = deg * Math.PI / 180;
          const cx = 12 + 5.5 * Math.sin(r);
          const cy = 12 - 5.5 * Math.cos(r);
          return <ellipse key={deg} cx={cx} cy={cy} rx="2.2" ry="3.8"
                   transform={`rotate(${deg} ${cx} ${cy})`} opacity="0.85" />;
        })}
      </>
    ),
  },

  'ylang': {
    colors: 'text-yellow-500 bg-yellow-50',
    path: (
      <>
        {/* star-shaped ylang ylang */}
        {[0, 60, 120, 180, 240, 300].map((deg) => {
          const r = deg * Math.PI / 180;
          const cx = 12 + 7 * Math.sin(r);
          const cy = 12 - 7 * Math.cos(r);
          return <path key={deg}
                   d={`M12 12 C${12 + 3 * Math.sin(r - 0.5)} ${12 - 3 * Math.cos(r - 0.5)} ${cx - 1} ${cy - 1} ${cx} ${cy} C${cx + 1} ${cy + 1} ${12 + 3 * Math.sin(r + 0.5)} ${12 - 3 * Math.cos(r + 0.5)} 12 12`}
                   opacity={0.6 + (deg % 120 === 0 ? 0.3 : 0)} />;
        })}
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
  },

  'hibiscus': {
    colors: 'text-red-500 bg-red-50',
    path: (
      <>
        {[0, 72, 144, 216, 288].map((deg) => {
          const r = deg * Math.PI / 180;
          const cx = 12 + 6 * Math.sin(r);
          const cy = 12 - 6 * Math.cos(r);
          return <path key={deg}
                   d={`M12 12 Q${12 + 2 * Math.sin(r - 0.8)} ${12 - 2 * Math.cos(r - 0.8)} ${cx} ${cy} Q${12 + 2 * Math.sin(r + 0.8)} ${12 - 2 * Math.cos(r + 0.8)} 12 12`} />;
        })}
        <circle cx="12" cy="12" r="2" fill="white" opacity="0.5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
  },

  'elder flower': {
    colors: 'text-white bg-emerald-50',
    path: (
      <>
        {/* tiny cluster */}
        <circle cx="12" cy="9"  r="1.5" />
        <circle cx="8"  cy="12" r="1.5" />
        <circle cx="16" cy="12" r="1.5" />
        <circle cx="9"  cy="16" r="1.5" />
        <circle cx="15" cy="16" r="1.5" />
        <circle cx="12" cy="18" r="1.5" />
        <path d="M12 9 L8 12 M12 9 L16 12 M8 12 L9 16 M16 12 L15 16 M9 16 L12 18 M15 16 L12 18 M12 9 L12 6" strokeWidth="1" stroke="currentColor" fill="none" />
      </>
    ),
  },

  // ─── CITRUS ──────────────────────────────────────────────────────────────

  'lemon': {
    colors: 'text-yellow-400 bg-yellow-50',
    path: (
      <>
        {/* lemon with bumpy tip */}
        <path d="M6 12 C6 7 8.5 3 12 3 C15.5 3 18 7 18 12 C18 17 15.5 21 12 21 C8.5 21 6 17 6 12Z" />
        <path d="M18 12 C18 12 20 11 21 12 C20 13 18 12 18 12Z" />
        <path d="M6 12 C6 12 4 11 3 12 C4 13 6 12 6 12Z" />
        <path d="M12 3 L12 21 M6 12 L18 12" stroke="white" strokeWidth="0.8" fill="none" opacity="0.3" />
      </>
    ),
  },

  'grapefruit': {
    colors: 'text-red-400 bg-red-50',
    path: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3 L12 21 M3 12 L21 12 M5.6 5.6 L18.4 18.4 M18.4 5.6 L5.6 18.4" stroke="white" strokeWidth="0.8" fill="none" opacity="0.4" />
        <circle cx="12" cy="12" r="3" fill="white" opacity="0.15" />
      </>
    ),
  },

  'lime': {
    colors: 'text-green-400 bg-green-50',
    path: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3 L12 21 M3 12 L21 12" stroke="white" strokeWidth="0.8" fill="none" opacity="0.4" />
        <path d="M5.6 5.6 L18.4 18.4" stroke="white" strokeWidth="0.8" fill="none" opacity="0.4" />
        <circle cx="12" cy="12" r="2.5" fill="white" opacity="0.12" />
      </>
    ),
  },

  'orange': {
    colors: 'text-orange-500 bg-orange-50',
    path: (
      <>
        <circle cx="12" cy="13" r="8.5" />
        <path d="M12 4.5 L12 21.5 M3.5 13 L20.5 13" stroke="white" strokeWidth="1" fill="none" opacity="0.4" />
        <path d="M6 6.5 L18 19.5 M18 6.5 L6 19.5" stroke="white" strokeWidth="0.8" fill="none" opacity="0.3" />
        <path d="M12 3 Q14 2 14 4" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  // ─── EXFOLIANTS ──────────────────────────────────────────────────────────

  'oatmeal': {
    colors: 'text-amber-500 bg-amber-50',
    path: (
      <>
        {/* oat grain stalk */}
        <path d="M12 22 L12 6" strokeWidth="2" strokeLinecap="round" stroke="currentColor" fill="none" />
        <ellipse cx="10" cy="10" rx="2.5" ry="4"  transform="rotate(-20 10 10)" />
        <ellipse cx="14" cy="13" rx="2.5" ry="4"  transform="rotate(20 14 13)" />
        <ellipse cx="10" cy="16" rx="2.5" ry="4"  transform="rotate(-20 10 16)" />
        <ellipse cx="12" cy="7"  rx="2"   ry="3.5" />
      </>
    ),
  },

  'coffee': {
    colors: 'text-amber-800 bg-amber-50',
    path: (
      <>
        {/* coffee bean */}
        <ellipse cx="12" cy="12" rx="7" ry="9" />
        <path d="M12 3 C12 3 12 12 12 21" strokeWidth="1.5" stroke="white" fill="none" opacity="0.4" strokeLinecap="round" />
        <path d="M5 12 C7 10 9 12 12 12 C15 12 17 10 19 12" fill="none" strokeWidth="1.5" stroke="white" opacity="0.3" strokeLinecap="round" />
      </>
    ),
  },

  'sugar': {
    colors: 'text-yellow-300 bg-yellow-50',
    path: (
      <>
        {/* sugar crystals — geometric shapes */}
        <rect x="5"  y="5"  width="5"  height="5"  rx="1" transform="rotate(15 7.5 7.5)" />
        <rect x="14" y="6"  width="6"  height="6"  rx="1" transform="rotate(-10 17 9)" />
        <rect x="6"  y="13" width="6"  height="6"  rx="1" transform="rotate(5 9 16)" />
        <rect x="14" y="14" width="5"  height="5"  rx="1" transform="rotate(-20 16.5 16.5)" />
      </>
    ),
  },

  'sea salt': {
    colors: 'text-cyan-600 bg-cyan-50',
    path: (
      <>
        {/* salt crystals — cubic shapes */}
        <path d="M7 7 L7 13 L13 13 L13 7 Z" />
        <path d="M7 7 L9 5 L15 5 L13 7" opacity="0.6" />
        <path d="M13 7 L15 5 L15 11 L13 13" opacity="0.7" />
        <path d="M14 15 L14 20 L19 20 L19 15 Z" opacity="0.7" />
      </>
    ),
  },

  'himalayan': {
    colors: 'text-rose-400 bg-rose-50',
    path: (
      <>
        {/* pink himalayan salt - mountain with crystal sparkle */}
        <path d="M4 20 L9 10 L12 15 L15 8 L20 20 Z" />
        <path d="M10 7 L11 4 L12 7" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M7 5 L8 3 L9 5" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.5" />
      </>
    ),
  },

  'dead sea': {
    colors: 'text-blue-600 bg-blue-50',
    path: (
      <>
        {/* dead sea salt — wave + crystal */}
        <path d="M3 14 C5 12 7 16 9 14 C11 12 13 16 15 14 C17 12 19 16 21 14" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
        <path d="M9 10 L10 7 L11 10" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M13 8 L14 5 L15 8" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
      </>
    ),
  },

  'pumice': {
    colors: 'text-stone-500 bg-stone-50',
    path: (
      <>
        {/* pumice stone — porous oval */}
        <ellipse cx="12" cy="13" rx="8" ry="7" />
        <circle cx="9"  cy="11" r="1.2" fill="white" opacity="0.5" />
        <circle cx="14" cy="10" r="1"   fill="white" opacity="0.4" />
        <circle cx="11" cy="15" r="1.5" fill="white" opacity="0.4" />
        <circle cx="15" cy="15" r="1"   fill="white" opacity="0.3" />
        <circle cx="8"  cy="15" r="0.8" fill="white" opacity="0.3" />
        <circle cx="13" cy="13" r="0.7" fill="white" opacity="0.5" />
      </>
    ),
  },

  'poppy': {
    colors: 'text-orange-500 bg-orange-50',
    path: (
      <>
        {/* poppy seed pod */}
        <ellipse cx="12" cy="11" rx="5" ry="7" />
        <path d="M9 4 L9 2 M12 4 L12 2 M15 4 L15 2" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.7" />
        <ellipse cx="12" cy="11" rx="3" ry="4" fill="white" opacity="0.2" />
        <path d="M8 18 L16 18" strokeWidth="2" stroke="currentColor" strokeLinecap="round" fill="none" />
        <path d="M10 18 L10 22 M14 18 L14 22" strokeWidth="2" stroke="currentColor" strokeLinecap="round" fill="none" />
      </>
    ),
  },

  'walnut': {
    colors: 'text-amber-800 bg-amber-50',
    path: (
      <>
        {/* walnut half */}
        <path d="M5 12 A7 7 0 0 1 19 12 Z" />
        <path d="M5 12 Q5 20 12 20 Q19 20 19 12" opacity="0.7" />
        <path d="M5 12 L19 12" strokeWidth="1" stroke="white" fill="none" opacity="0.3" />
        <path d="M12 12 Q10 16 9 19 M12 12 Q14 16 15 19" strokeWidth="1" stroke="white" fill="none" opacity="0.25" strokeLinecap="round" />
      </>
    ),
  },

  // ─── ESSENTIAL OILS ──────────────────────────────────────────────────────

  'peppermint': {
    colors: 'text-emerald-500 bg-emerald-50',
    path: (
      <>
        {/* mint leaf with cool radiating lines */}
        <path d="M12 4 C8 4 4 8 4 13 C4 18 8 21 12 21 C16 21 20 18 20 13 C20 8 16 4 12 4Z" />
        <path d="M12 4 L12 21" strokeWidth="1" stroke="white" fill="none" opacity="0.35" />
        <path d="M6 10 L18 10 M5 13 L19 13 M6 16 L18 16" stroke="white" strokeWidth="0.8" fill="none" opacity="0.3" />
      </>
    ),
  },

  'tea tree': {
    colors: 'text-green-600 bg-green-50',
    path: (
      <>
        {/* tea tree branch */}
        <path d="M12 21 L12 12" strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" fill="none" />
        <path d="M12 16 L8 12 M12 16 L16 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 13 L9 9 M12 13 L15 9" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M9 9 L11 5 M15 9 L13 5" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <circle cx="11" cy="5" r="1.5" />
        <circle cx="13" cy="5" r="1.5" />
      </>
    ),
  },

  'eucalyptus': {
    colors: 'text-teal-600 bg-teal-50',
    path: (
      <>
        {/* elongated eucalyptus leaves on arcing stem */}
        <path d="M8 20 Q12 12 16 4" strokeWidth="2" strokeLinecap="round" stroke="currentColor" fill="none" />
        <path d="M8 20 Q5 13 10 10" fill="currentColor" opacity="0.85" />
        <path d="M11 15 Q7 10 12 7" fill="currentColor" opacity="0.7" />
        <path d="M13 10 Q9 7 14 4" fill="currentColor" opacity="0.55" />
      </>
    ),
  },

  'frankincense': {
    colors: 'text-amber-600 bg-amber-50',
    path: (
      <>
        {/* resin teardrop tears */}
        <path d="M9 6 C9 6 7 9 7 11 A2 2 0 0 0 11 11 C11 9 9 6 9 6Z" />
        <path d="M15 4 C15 4 13 8 13 11 A2 2 0 0 0 17 11 C17 8 15 4 15 4Z" />
        <path d="M11 14 C11 14 9 17 9 19 A2 2 0 0 0 13 19 C13 17 11 14 11 14Z" />
        <path d="M17 15 C17 15 16 17 16 18.5 A1.5 1.5 0 0 0 19 18.5 C19 17 17 15 17 15Z" opacity="0.7" />
      </>
    ),
  },

  'patchouli': {
    colors: 'text-amber-700 bg-amber-50',
    path: (
      <>
        {/* wide patchouli leaf with veins */}
        <path d="M12 21 C12 21 3 16 4 10 C5 6 8 4 12 5 C16 4 19 6 20 10 C21 16 12 21 12 21Z" />
        <path d="M12 21 L12 5" strokeWidth="1" stroke="white" fill="none" opacity="0.3" />
        <path d="M4 10 Q8 9 12 10 Q16 11 20 10" stroke="white" strokeWidth="0.8" fill="none" opacity="0.25" />
        <path d="M5 14 Q9 13 12 14 Q15 15 19 14" stroke="white" strokeWidth="0.8" fill="none" opacity="0.2" />
      </>
    ),
  },

  // ─── ADDITIVES ───────────────────────────────────────────────────────────

  'honey': {
    colors: 'text-amber-500 bg-amber-50',
    path: (
      <>
        {/* honey pot with drip */}
        <path d="M7 10 Q7 5 12 5 Q17 5 17 10 L17 18 Q17 21 12 21 Q7 21 7 18 Z" />
        <path d="M9 5 Q10 3 12 3 Q14 3 15 5" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
        <path d="M12 3 L12 2" strokeWidth="2" stroke="currentColor" strokeLinecap="round" fill="none" />
        <ellipse cx="12" cy="13" rx="3" ry="2" fill="white" opacity="0.25" />
        {/* drip outside right */}
        <path d="M17 10 C17 10 19 11 19 13 A1.5 1.5 0 0 1 16 13 C16 11 17 10 17 10Z" opacity="0.8" />
      </>
    ),
  },

  'beeswax': {
    colors: 'text-amber-600 bg-amber-50',
    path: (
      <>
        {/* honeycomb cells */}
        <polygon points="12,3 17,6 17,12 12,15 7,12 7,6" />
        <polygon points="12,15 17,12 22,15 22,21 17,24 12,21" opacity="0.7" />
        <polygon points="12,15 7,12 2,15 2,21 7,24 12,21" opacity="0.7" />
        <polygon points="12,3 17,6 17,12 12,15 7,12 7,6" fill="white" opacity="0.1" />
      </>
    ),
  },

  'glycerin': {
    colors: 'text-sky-400 bg-sky-50',
    path: (
      <>
        {/* glycerin — water drop with inner bubbles */}
        <path d="M12 3 C12 3 5 11 5 16 A7 7 0 0 0 19 16 C19 11 12 3 12 3Z" />
        <circle cx="10" cy="15" r="1.5" fill="white" opacity="0.5" />
        <circle cx="14" cy="14" r="1"   fill="white" opacity="0.4" />
        <circle cx="12" cy="18" r="1"   fill="white" opacity="0.4" />
      </>
    ),
  },

  'vitamin e': {
    colors: 'text-orange-400 bg-orange-50',
    path: (
      <>
        {/* vitamin E capsule */}
        <rect x="6" y="8" width="12" height="9" rx="4.5" />
        <path d="M6 12.5 L18 12.5" stroke="white" strokeWidth="1" fill="none" opacity="0.4" />
        {/* E letterform */}
        <path d="M10 10 L10 15 M10 10 L14 10 M10 12.5 L13 12.5 M10 15 L14 15" stroke="white" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },

  'baking soda': {
    colors: 'text-blue-400 bg-blue-50',
    path: (
      <>
        {/* baking soda box */}
        <rect x="5" y="8" width="14" height="13" rx="1.5" />
        <path d="M5 8 L8 4 L16 4 L19 8" fill="currentColor" opacity="0.6" />
        {/* NaHCO3 abbreviation dots pattern */}
        <circle cx="9" cy="14" r="1" fill="white" opacity="0.6" />
        <circle cx="12" cy="14" r="1" fill="white" opacity="0.6" />
        <circle cx="15" cy="14" r="1" fill="white" opacity="0.6" />
        <path d="M8 17 L16 17" stroke="white" strokeWidth="1" fill="none" opacity="0.4" />
      </>
    ),
  },

  'apple cider vinegar': {
    colors: 'text-amber-600 bg-amber-50',
    path: (
      <>
        {/* jug / bottle */}
        <path d="M9 4 L9 8 Q6 9 5 13 L5 18 Q5 21 8 21 L16 21 Q19 21 19 18 L19 13 Q18 9 15 8 L15 4 Z" />
        <path d="M9 4 L15 4" strokeWidth="1.5" strokeLinecap="round" stroke="currentColor" fill="none" />
        <path d="M15 8 Q17 7 18 6" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <ellipse cx="12" cy="15" rx="4" ry="2.5" fill="white" opacity="0.2" />
      </>
    ),
  },

  // ─── MILKS ───────────────────────────────────────────────────────────────

  'goat milk': {
    colors: 'text-slate-400 bg-slate-50',
    path: (
      <>
        {/* simplified goat head */}
        <path d="M8 14 Q6 12 6 9 Q6 5 10 5 Q12 4 14 5 Q18 5 18 9 Q18 12 16 14 Q14 16 12 16 Q10 16 8 14Z" />
        <path d="M10 5 Q10 3 8 2" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
        <path d="M14 5 Q14 3 16 2" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
        <circle cx="10" cy="9" r="1" fill="white" opacity="0.7" />
        <circle cx="14" cy="9" r="1" fill="white" opacity="0.7" />
        <ellipse cx="12" cy="13" rx="2" ry="1" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
        <path d="M9 16 Q9 20 12 21 Q15 20 15 16" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
      </>
    ),
  },

  'coconut milk': {
    colors: 'text-amber-100 bg-amber-50',
    path: (
      <>
        <path d="M4 12 A8 8 0 0 1 20 12 Z" />
        <path d="M4 12 Q4 20 12 20 Q20 20 20 12 Z" opacity="0.6" />
        <path d="M4 12 L20 12" strokeWidth="1.5" stroke="currentColor" fill="none" />
        <path d="M7 17 Q12 15 17 17" fill="none" strokeWidth="1.5" stroke="white" opacity="0.4" strokeLinecap="round" />
      </>
    ),
  },

  // ─── SOAP BASES ──────────────────────────────────────────────────────────

  'sodium hydroxide': {
    colors: 'text-slate-600 bg-slate-100',
    path: (
      <>
        {/* flask with caustic bubbles */}
        <path d="M10 4 L10 10 L5 18 Q4 20 6 20 L18 20 Q20 20 19 18 L14 10 L14 4 Z" />
        <path d="M9 4 L15 4" strokeWidth="1.5" strokeLinecap="round" stroke="currentColor" fill="none" />
        <circle cx="9"  cy="16" r="1.5" fill="white" opacity="0.5" />
        <circle cx="12" cy="18" r="1"   fill="white" opacity="0.4" />
        <circle cx="15" cy="16" r="1.5" fill="white" opacity="0.5" />
        <circle cx="11" cy="14" r="1"   fill="white" opacity="0.3" />
      </>
    ),
  },

  'lye': {
    colors: 'text-slate-600 bg-slate-100',
    path: (
      <>
        <path d="M10 4 L10 10 L5 18 Q4 20 6 20 L18 20 Q20 20 19 18 L14 10 L14 4 Z" />
        <path d="M9 4 L15 4" strokeWidth="1.5" strokeLinecap="round" stroke="currentColor" fill="none" />
        <circle cx="9"  cy="16" r="1.5" fill="white" opacity="0.5" />
        <circle cx="12" cy="18" r="1"   fill="white" opacity="0.4" />
        <circle cx="15" cy="16" r="1.5" fill="white" opacity="0.5" />
      </>
    ),
  },

  'melt & pour': {
    colors: 'text-amber-400 bg-amber-50',
    path: (
      <>
        {/* pouring soap shape */}
        <path d="M6 4 L18 4 L18 12 Q18 14 16 14 L8 14 Q6 14 6 12 Z" />
        <path d="M11 14 Q11 18 8 21 L16 21 Q13 18 13 14" opacity="0.8" />
        <path d="M9 8 L15 8" stroke="white" strokeWidth="1" fill="none" opacity="0.4" />
        <path d="M9 11 L15 11" stroke="white" strokeWidth="1" fill="none" opacity="0.3" />
      </>
    ),
  },

  // ─── WAXES ───────────────────────────────────────────────────────────────

  'carnauba': {
    colors: 'text-yellow-600 bg-yellow-50',
    path: (
      <>
        {/* palm leaf — carnauba comes from a palm */}
        <path d="M12 22 L12 12" strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" fill="none" />
        <path d="M12 12 Q6 8 4 3 Q9 5 12 12Z" />
        <path d="M12 12 Q18 8 20 3 Q15 5 12 12Z" opacity="0.8" />
        <path d="M12 12 Q8 6 12 3" fill="none" strokeWidth="1.5" stroke="currentColor" opacity="0.4" strokeLinecap="round" />
        <path d="M12 12 Q16 6 12 3" fill="none" strokeWidth="1.5" stroke="currentColor" opacity="0.4" strokeLinecap="round" />
      </>
    ),
  },

  // ─── SPICES ──────────────────────────────────────────────────────────────

  'vanilla': {
    colors: 'text-amber-700 bg-amber-50',
    path: (
      <>
        {/* vanilla pod with seeds */}
        <path d="M9 3 Q9 3 7 3 Q6 3 6 4 Q6 5 7 5 Q9 5 11 7 L15 19 Q16 21 17 21 Q18 21 18 20 Q18 19 17 19 Q16 19 15 17 L11 5 Q10 3 9 3Z" />
        <path d="M8 8 L12 8 M9 11 L13 11 M10 14 L14 14 M11 17 L15 17" stroke="white" strokeWidth="0.8" fill="none" opacity="0.4" strokeLinecap="round" />
      </>
    ),
  },

  'cinnamon': {
    colors: 'text-red-800 bg-red-50',
    path: (
      <>
        {/* cinnamon sticks */}
        <rect x="5"  y="8"  width="14" height="4.5" rx="2.25" transform="rotate(-25 12 12)" />
        <rect x="6"  y="10" width="13" height="4"   rx="2"    transform="rotate(-5  12 12)" opacity="0.75" />
        <rect x="5"  y="12" width="12" height="4"   rx="2"    transform="rotate(15  12 12)" opacity="0.6" />
      </>
    ),
  },

  // ─── SEEDS / PODS ────────────────────────────────────────────────────────

  'shea': {
    colors: 'text-yellow-600 bg-yellow-50',
    path: (
      <>
        {/* shea nut in leaf */}
        <path d="M12 20 C12 20 5 16 5 10 C5 6 8 4 12 4 C16 4 19 6 19 10 C19 16 12 20 12 20Z" opacity="0.5" />
        <ellipse cx="12" cy="12" rx="5" ry="6" />
        <path d="M10 8 Q12 7 14 8" fill="none" strokeWidth="1.5" stroke="white" opacity="0.4" strokeLinecap="round" />
      </>
    ),
  },

  'cocoa': {
    colors: 'text-amber-900 bg-amber-50',
    path: (
      <>
        {/* cacao pod elongated */}
        <path d="M7 5 Q5 9 5 13 Q5 20 12 21 Q19 20 19 13 Q19 9 17 5 Q15 3 12 3 Q9 3 7 5Z" />
        <path d="M7 5 L17 5 M6 9 L18 9 M5 13 L19 13 M6 17 L18 17" stroke="white" strokeWidth="0.8" fill="none" opacity="0.25" />
        <path d="M12 3 L12 2" strokeWidth="2" stroke="currentColor" strokeLinecap="round" fill="none" />
      </>
    ),
  },

  'zinc oxide': {
    colors: 'text-white bg-slate-100',
    path: (
      <>
        {/* mineral crystal powder — geometric cluster */}
        <path d="M9 5 L15 5 L18 10 L15 15 L9 15 L6 10 Z" />
        <path d="M9 15 L15 15 L18 20 L15 20 L9 20 L6 20 Z" opacity="0.6" />
        <path d="M9 5 L6 10 L6 20" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.4" />
        <path d="M15 5 L18 10 L18 20" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.4" />
      </>
    ),
  },

  'mango': {
    colors: 'text-orange-400 bg-orange-50',
    path: (
      <>
        <path d="M6 7 Q5 12 6 16 Q8 21 12 21 Q16 21 18 16 Q19 12 18 7 Q16 3 12 3 Q8 3 6 7Z" />
        <ellipse cx="12" cy="12" rx="4" ry="5" fill="white" opacity="0.2" />
        <path d="M12 5 Q14 4 15 6" fill="none" strokeWidth="1.5" stroke="white" opacity="0.3" strokeLinecap="round" />
      </>
    ),
  },

  // ─── OILS (additional) ────────────────────────────────────────────────────

  'babassu': {
    colors: 'text-amber-600 bg-amber-50',
    path: (
      <>
        {/* round coconut-like nut */}
        <circle cx="12" cy="13" r="7" />
        <path d="M9 9 Q12 6 15 9" fill="none" strokeWidth="1.5" stroke="white" opacity="0.4" strokeLinecap="round" />
        <path d="M8 13 Q12 11 16 13" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" />
        <path d="M9 17 Q12 15 15 17" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" />
        <path d="M12 6 L12 4 M10 5 L12 4 L14 5" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'tamanu': {
    colors: 'text-green-800 bg-green-50',
    path: (
      <>
        {/* round dark green fruit on leaf */}
        <path d="M4 18 Q4 8 12 5 Q20 8 20 18 Q16 22 12 22 Q8 22 4 18Z" opacity="0.35" />
        <circle cx="12" cy="13" r="5" />
        <path d="M10 11 Q12 9 14 11" fill="none" strokeWidth="1.5" stroke="white" opacity="0.4" strokeLinecap="round" />
      </>
    ),
  },

  'sea buckthorn': {
    colors: 'text-orange-500 bg-orange-50',
    path: (
      <>
        {/* clusters of small berries on twig */}
        <path d="M12 20 L12 8" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 10 L8 7" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 14 L7 12" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 10 L16 7" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 14 L17 12" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <circle cx="7" cy="6" r="2.5" />
        <circle cx="16" cy="6" r="2.5" />
        <circle cx="6" cy="11" r="2.5" />
        <circle cx="18" cy="11" r="2.5" />
      </>
    ),
  },

  'moringa': {
    colors: 'text-green-600 bg-green-50',
    path: (
      <>
        {/* drumstick / moringa pod with leaves */}
        <path d="M12 3 L12 21" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <ellipse cx="8" cy="8" rx="3" ry="2" transform="rotate(-30 8 8)" />
        <ellipse cx="16" cy="8" rx="3" ry="2" transform="rotate(30 16 8)" />
        <ellipse cx="7" cy="14" rx="3" ry="2" transform="rotate(-20 7 14)" />
        <ellipse cx="17" cy="14" rx="3" ry="2" transform="rotate(20 17 14)" />
      </>
    ),
  },

  'apricot': {
    colors: 'text-orange-400 bg-orange-50',
    path: (
      <>
        {/* apricot halves */}
        <path d="M5 13 Q5 7 12 6 Q19 7 19 13 Q19 20 12 21 Q5 20 5 13Z" />
        <path d="M12 6 L12 21" strokeWidth="1" stroke="white" opacity="0.3" fill="none" />
        <path d="M12 4 Q13 2 12 1" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <ellipse cx="9" cy="12" rx="2" ry="3" fill="white" opacity="0.2" />
      </>
    ),
  },

  'meadowfoam': {
    colors: 'text-white bg-slate-100',
    path: (
      <>
        {/* small 5-petal white flower */}
        <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.6" />
        {[0,72,144,216,288].map((deg, i) => {
          const r = deg * Math.PI / 180;
          const cx = 12 + 6 * Math.sin(r);
          const cy = 12 - 6 * Math.cos(r);
          return <ellipse key={i} cx={cx} cy={cy} rx="2.5" ry="3.5" transform={`rotate(${deg} ${cx} ${cy})`} />;
        })}
      </>
    ),
  },

  'marula': {
    colors: 'text-yellow-600 bg-yellow-50',
    path: (
      <>
        {/* oval yellow marula fruit */}
        <ellipse cx="12" cy="13" rx="6" ry="7" />
        <path d="M10 9 Q12 7 14 9" fill="none" strokeWidth="1.5" stroke="white" opacity="0.4" strokeLinecap="round" />
        <path d="M12 6 L12 4 Q13 2 12 1" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <ellipse cx="10" cy="13" rx="2" ry="3" fill="white" opacity="0.15" />
      </>
    ),
  },

  'safflower': {
    colors: 'text-red-500 bg-red-50',
    path: (
      <>
        {/* thistle-like orange safflower head */}
        <path d="M12 20 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 12 Q9 8 10 5" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M12 12 Q15 8 14 5" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M12 12 Q7 10 6 7" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M12 12 Q17 10 18 7" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M12 12 Q11 7 12 4" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'rice bran': {
    colors: 'text-amber-500 bg-amber-50',
    path: (
      <>
        {/* rice grains on stalk */}
        <path d="M12 22 L12 10" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 10 L10 7 M12 10 L14 7" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <ellipse cx="10" cy="5.5" rx="2" ry="3.5" transform="rotate(-15 10 5.5)" />
        <ellipse cx="14" cy="5.5" rx="2" ry="3.5" transform="rotate(15 14 5.5)" />
        <ellipse cx="12" cy="4" rx="2" ry="3.5" />
        <path d="M8 14 L12 12 M16 14 L12 12" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
      </>
    ),
  },

  'black seed': {
    colors: 'text-slate-800 bg-slate-100',
    path: (
      <>
        {/* nigella / black seeds scattered */}
        <ellipse cx="8"  cy="8"  rx="2.5" ry="4" transform="rotate(-20 8 8)"  />
        <ellipse cx="16" cy="7"  rx="2.5" ry="4" transform="rotate(20 16 7)"  />
        <ellipse cx="12" cy="12" rx="2.5" ry="4" transform="rotate(-5 12 12)" />
        <ellipse cx="7"  cy="16" rx="2.5" ry="4" transform="rotate(15 7 16)"  />
        <ellipse cx="17" cy="16" rx="2.5" ry="4" transform="rotate(-10 17 16)" />
      </>
    ),
  },

  'evening primrose': {
    colors: 'text-yellow-400 bg-yellow-50',
    path: (
      <>
        {/* 4-petal yellow flower */}
        <ellipse cx="12" cy="6"  rx="3" ry="5" />
        <ellipse cx="12" cy="18" rx="3" ry="5" />
        <ellipse cx="6"  cy="12" rx="5" ry="3" />
        <ellipse cx="18" cy="12" rx="5" ry="3" />
        <circle cx="12" cy="12" r="3" fill="white" opacity="0.6" />
        <circle cx="12" cy="12" r="1.5" opacity="0.8" />
      </>
    ),
  },

  'pomegranate': {
    colors: 'text-rose-700 bg-rose-50',
    path: (
      <>
        {/* pomegranate cross-section with arils */}
        <path d="M5 13 Q5 21 12 21 Q19 21 19 13 Q19 7 12 6 Q5 7 5 13Z" />
        <path d="M12 6 Q12 3 11 2 M12 6 Q13 3 14 2" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        {/* crown */}
        <path d="M9 7 L8 4 M12 6 L12 3 M15 7 L16 4" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        {/* arils */}
        <circle cx="9" cy="13" r="1.5" fill="white" opacity="0.5" />
        <circle cx="13" cy="11" r="1.5" fill="white" opacity="0.5" />
        <circle cx="15" cy="15" r="1.5" fill="white" opacity="0.5" />
        <circle cx="9" cy="17" r="1.5" fill="white" opacity="0.5" />
        <circle cx="13" cy="17" r="1.5" fill="white" opacity="0.5" />
      </>
    ),
  },

  'borage': {
    colors: 'text-blue-500 bg-blue-50',
    path: (
      <>
        {/* star-shaped blue borage flower */}
        {[0,72,144,216,288].map((deg, i) => {
          const r = deg * Math.PI / 180;
          const x1 = 12 + 3 * Math.sin(r), y1 = 12 - 3 * Math.cos(r);
          const x2 = 12 + 8 * Math.sin(r), y2 = 12 - 8 * Math.cos(r);
          return <path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" />;
        })}
        <circle cx="12" cy="12" r="3" fill="white" opacity="0.8" />
        <circle cx="12" cy="12" r="1.5" opacity="0.6" />
      </>
    ),
  },

  // ─── BUTTERS (additional) ─────────────────────────────────────────────────

  'cocoa butter': {
    colors: 'text-amber-800 bg-amber-50',
    path: (
      <>
        {/* cacao pod — distinct from cocoa powder */}
        <path d="M8 3 Q5 8 5 13 Q5 20 12 21 Q19 20 19 13 Q19 8 16 3 Q14 1 12 1 Q10 1 8 3Z" />
        <path d="M8 3 L16 3 M6 8 L18 8 M5 13 L19 13" stroke="white" strokeWidth="0.8" fill="none" opacity="0.25" />
        <path d="M12 1 L12 0" strokeWidth="2" stroke="currentColor" strokeLinecap="round" fill="none" />
      </>
    ),
  },

  'kokum': {
    colors: 'text-purple-600 bg-purple-50',
    path: (
      <>
        {/* round purple-brown kokum fruit */}
        <circle cx="12" cy="13" r="8" />
        <path d="M9 9 Q12 7 15 9" fill="none" strokeWidth="1.5" stroke="white" opacity="0.4" strokeLinecap="round" />
        <path d="M10 7 L12 4 L14 7" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <ellipse cx="9" cy="13" rx="2" ry="3" fill="white" opacity="0.15" />
      </>
    ),
  },

  'murumuru': {
    colors: 'text-green-700 bg-green-50',
    path: (
      <>
        {/* palm fruit cluster */}
        <path d="M12 22 L12 14" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <circle cx="12" cy="10" r="4" />
        <circle cx="7"  cy="14" r="3" opacity="0.8" />
        <circle cx="17" cy="14" r="3" opacity="0.8" />
        <circle cx="9"  cy="8"  r="2.5" opacity="0.6" />
        <circle cx="15" cy="8"  r="2.5" opacity="0.6" />
      </>
    ),
  },

  'illipe': {
    colors: 'text-stone-600 bg-stone-50',
    path: (
      <>
        {/* elongated oval nut */}
        <ellipse cx="12" cy="13" rx="5" ry="7" />
        <path d="M9 9 Q12 7 15 9" fill="none" strokeWidth="1.5" stroke="white" opacity="0.4" strokeLinecap="round" />
        <path d="M12 6 L12 4" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <ellipse cx="10" cy="14" rx="1.5" ry="3" fill="white" opacity="0.15" />
      </>
    ),
  },

  'cupua': {
    colors: 'text-amber-700 bg-amber-50',
    path: (
      <>
        {/* oval melon-like cacao relative */}
        <ellipse cx="12" cy="13" rx="7" ry="8" />
        <path d="M6 10 L18 10 M5 14 L19 14 M7 18 L17 18" stroke="white" strokeWidth="0.8" fill="none" opacity="0.25" />
        <path d="M12 5 L12 3 Q13 1 14 2" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  // ─── CLAYS (additional) ───────────────────────────────────────────────────

  'red clay': {
    colors: 'text-red-700 bg-red-50',
    path: (
      <>
        {/* bowl of red clay */}
        <path d="M5 10 Q5 20 12 20 Q19 20 19 10 Z" />
        <path d="M5 10 Q12 7 19 10" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <ellipse cx="12" cy="10" rx="7" ry="2" opacity="0.6" />
        <path d="M8 14 Q12 12 16 14" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" />
      </>
    ),
  },

  'australian red': {
    colors: 'text-red-700 bg-red-50',
    path: (
      <>
        <path d="M5 10 Q5 20 12 20 Q19 20 19 10 Z" />
        <path d="M5 10 Q12 7 19 10" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <ellipse cx="12" cy="10" rx="7" ry="2" opacity="0.6" />
      </>
    ),
  },

  'fuller': {
    colors: 'text-stone-500 bg-stone-50',
    path: (
      <>
        {/* clay slab / tablet */}
        <rect x="4" y="8" width="16" height="11" rx="2" />
        <path d="M7 11 L17 11 M7 14 L17 14 M7 17 L13 17" stroke="white" strokeWidth="1" fill="none" opacity="0.4" strokeLinecap="round" />
        <path d="M4 8 Q12 5 20 8" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  // ─── BOTANICALS (additional) ──────────────────────────────────────────────

  'rosemary': {
    colors: 'text-green-600 bg-green-50',
    path: (
      <>
        {/* rosemary sprig with needle leaves */}
        <path d="M12 22 L12 4" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        {[6,8,10,12,14,16,18].map((y, i) => (
          <path key={i} d={i%2===0 ? `M12 ${y} L8 ${y-2}` : `M12 ${y} L16 ${y-2}`}
            strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        ))}
      </>
    ),
  },

  'nettle': {
    colors: 'text-green-500 bg-green-50',
    path: (
      <>
        {/* serrated nettle leaf */}
        <path d="M12 21 L12 3" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 8 Q7 10 5 15 Q8 18 12 17 Q16 18 19 15 Q17 10 12 8Z" />
        <path d="M12 8 L12 17" stroke="white" strokeWidth="0.8" fill="none" opacity="0.4" />
        <path d="M8 11 L16 11 M7 14 L17 14" stroke="white" strokeWidth="0.6" fill="none" opacity="0.3" />
      </>
    ),
  },

  'comfrey': {
    colors: 'text-purple-500 bg-purple-50',
    path: (
      <>
        {/* bell-shaped flower cluster */}
        <path d="M12 20 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 12 L8 8 M12 12 L16 8 M12 12 L12 6" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        {/* bells */}
        <path d="M6 8 Q4 6 6 4 Q8 3 10 5 Q10 8 8 8Z" />
        <path d="M14 8 Q16 6 18 4 Q20 3 18 5 Q18 8 16 8Z" opacity="0.8" />
        <path d="M10 6 Q10 3 12 2 Q14 3 14 6 Q14 8 12 8Z" opacity="0.9" />
      </>
    ),
  },

  'plantain herb': {
    colors: 'text-green-400 bg-green-50',
    path: (
      <>
        {/* broad oval plantain leaf */}
        <path d="M12 21 L12 3" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M4 14 Q12 3 20 14 Q18 21 12 21 Q6 21 4 14Z" opacity="0.85" />
        <path d="M6 16 L18 16 M5 13 L19 13 M7 10 L17 10" stroke="white" strokeWidth="0.7" fill="none" opacity="0.35" />
      </>
    ),
  },

  'st. john': {
    colors: 'text-yellow-500 bg-yellow-50',
    path: (
      <>
        {/* bright yellow star flower */}
        {[0,60,120,180,240,300].map((deg, i) => {
          const r = deg * Math.PI / 180;
          const x = 12 + 8 * Math.sin(r), y = 12 - 8 * Math.cos(r);
          return <line key={i} x1="12" y1="12" x2={x} y2={y} strokeWidth="4" strokeLinecap="round" stroke="currentColor" />;
        })}
        <circle cx="12" cy="12" r="3.5" fill="white" opacity="0.9" />
      </>
    ),
  },

  'dandelion': {
    colors: 'text-yellow-400 bg-yellow-50',
    path: (
      <>
        {/* dandelion seed head */}
        <path d="M12 22 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        {[0,45,90,135,180,225,270,315].map((deg, i) => {
          const r = deg * Math.PI / 180;
          const x = 12 + 8 * Math.sin(r), y = 12 - 8 * Math.cos(r);
          return <g key={i}><line x1="12" y1="12" x2={x} y2={y} strokeWidth="1" stroke="currentColor" strokeLinecap="round" /><circle cx={x} cy={y} r="1.5" /></g>;
        })}
        <circle cx="12" cy="12" r="2" fill="white" opacity="0.6" />
      </>
    ),
  },

  'arnica': {
    colors: 'text-yellow-500 bg-yellow-50',
    path: (
      <>
        {/* yellow daisy */}
        {[0,36,72,108,144,180,216,252,288,324].map((deg, i) => {
          const r = deg * Math.PI / 180;
          const cx = 12 + 6 * Math.sin(r), cy = 12 - 6 * Math.cos(r);
          return <ellipse key={i} cx={cx} cy={cy} rx="2" ry="3.5" transform={`rotate(${deg} ${cx} ${cy})`} opacity="0.85" />;
        })}
        <circle cx="12" cy="12" r="4" fill="white" opacity="0.5" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
  },

  // ─── ESSENTIAL OILS (additional) ──────────────────────────────────────────

  'lemongrass': {
    colors: 'text-lime-500 bg-lime-50',
    path: (
      <>
        {/* tall grass stalks with drooping tips */}
        <path d="M8 22 Q8 14 10 8 Q11 4 9 2" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 22 Q12 13 14 7 Q15 3 13 1" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M16 22 Q16 15 18 9 Q19 5 17 3" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
      </>
    ),
  },

  'bergamot': {
    colors: 'text-lime-600 bg-lime-50',
    path: (
      <>
        {/* small citrus fruit with distinctive nipple */}
        <circle cx="12" cy="13" r="8" />
        <path d="M12 5 Q12 3 13 2" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M10 7 Q12 5 14 7" fill="none" strokeWidth="1.5" stroke="white" opacity="0.3" strokeLinecap="round" />
        <ellipse cx="9" cy="13" rx="2" ry="3" fill="white" opacity="0.15" />
        <circle cx="12" cy="13" r="3" fill="none" stroke="white" strokeWidth="0.8" opacity="0.25" />
      </>
    ),
  },

  'cedarwood': {
    colors: 'text-amber-800 bg-amber-50',
    path: (
      <>
        {/* cedar cone / stylized tree */}
        <path d="M12 22 L12 16" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M4 16 L12 6 L20 16Z" />
        <path d="M6 20 L12 12 L18 20Z" opacity="0.7" />
        <path d="M7 16 L17 16 M8 13 L16 13" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" />
      </>
    ),
  },

  'geranium': {
    colors: 'text-pink-500 bg-pink-50',
    path: (
      <>
        {/* 5-petal geranium flower */}
        {[0,72,144,216,288].map((deg, i) => {
          const r = deg * Math.PI / 180;
          const cx = 12 + 6 * Math.sin(r), cy = 12 - 6 * Math.cos(r);
          return <ellipse key={i} cx={cx} cy={cy} rx="2.5" ry="3.5" transform={`rotate(${deg} ${cx} ${cy})`} />;
        })}
        <circle cx="12" cy="12" r="3" fill="white" opacity="0.7" />
        <circle cx="12" cy="12" r="1.5" opacity="0.8" />
        <path d="M12 20 L12 22" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
      </>
    ),
  },

  'clary sage': {
    colors: 'text-purple-400 bg-purple-50',
    path: (
      <>
        {/* sage leaf pairs */}
        <path d="M12 22 L12 6" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <ellipse cx="8" cy="9"  rx="4" ry="2.5" transform="rotate(-25 8 9)"  />
        <ellipse cx="16" cy="9" rx="4" ry="2.5" transform="rotate(25 16 9)"  />
        <ellipse cx="7"  cy="15" rx="4" ry="2.5" transform="rotate(-20 7 15)" />
        <ellipse cx="17" cy="15" rx="4" ry="2.5" transform="rotate(20 17 15)" />
        <path d="M10 6 Q12 3 14 6" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'sandalwood': {
    colors: 'text-amber-700 bg-amber-50',
    path: (
      <>
        {/* wood grain rings */}
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="6.5" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
        <circle cx="12" cy="12" r="4"   fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
        <circle cx="12" cy="12" r="2"   fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
        <path d="M3 12 L21 12" stroke="white" strokeWidth="0.5" fill="none" opacity="0.2" />
        <path d="M12 3 L12 21" stroke="white" strokeWidth="0.5" fill="none" opacity="0.2" />
      </>
    ),
  },

  'spearmint': {
    colors: 'text-green-400 bg-green-50',
    path: (
      <>
        {/* serrated spear-shaped leaf */}
        <path d="M12 22 L12 5" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 6 Q7 9 6 14 Q7 19 12 20 Q17 19 18 14 Q17 9 12 6Z" />
        <path d="M7 12 L17 12 M8 15 L16 15 M9 9 L15 9" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" />
        <path d="M12 5 Q11 2 12 1" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'neroli': {
    colors: 'text-orange-300 bg-orange-50',
    path: (
      <>
        {/* delicate orange blossom with 5 petals */}
        {[0,72,144,216,288].map((deg, i) => {
          const r = deg * Math.PI / 180;
          const cx = 12 + 6.5 * Math.sin(r), cy = 12 - 6.5 * Math.cos(r);
          return <ellipse key={i} cx={cx} cy={cy} rx="2" ry="3.5" transform={`rotate(${deg} ${cx} ${cy})`} />;
        })}
        <circle cx="12" cy="12" r="2.5" fill="white" opacity="0.8" />
        <circle cx="12" cy="12" r="1.5" opacity="0.7" />
        {/* leaf on stem */}
        <path d="M12 21 L12 22" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
      </>
    ),
  },

  'vetiver': {
    colors: 'text-stone-600 bg-stone-50',
    path: (
      <>
        {/* root system */}
        <path d="M12 4 L12 11" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 11 Q8 14 7 20" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 11 Q12 15 12 21" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 11 Q16 14 17 20" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 13 Q9 16 6 17" strokeWidth="1" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M12 15 Q15 17 18 17" strokeWidth="1" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M10 4 Q12 2 14 4" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'clove': {
    colors: 'text-amber-900 bg-amber-50',
    path: (
      <>
        {/* clove buds */}
        <path d="M10 22 L10 12" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M14 22 L14 10" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <ellipse cx="10" cy="9"  rx="3" ry="4" />
        <ellipse cx="14" cy="7"  rx="3" ry="4" />
        <path d="M10 12 L14 10" strokeWidth="1" stroke="currentColor" fill="none" opacity="0.4" />
      </>
    ),
  },

  'ginger': {
    colors: 'text-amber-600 bg-amber-50',
    path: (
      <>
        {/* ginger root with knobby lobes */}
        <path d="M6 14 Q5 10 8 8 Q11 6 12 8 Q14 6 17 8 Q19 10 18 14 Q17 18 14 19 Q11 20 9 18 Q6 17 6 14Z" />
        <path d="M12 8 Q13 4 15 3" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M8 10 Q6 7 7 5" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M9 13 Q11 11 13 13" fill="none" strokeWidth="1" stroke="white" opacity="0.35" strokeLinecap="round" />
      </>
    ),
  },

  'black pepper': {
    colors: 'text-slate-700 bg-slate-100',
    path: (
      <>
        {/* pepper berry cluster */}
        <circle cx="9"  cy="10" r="3.5" />
        <circle cx="15" cy="10" r="3.5" />
        <circle cx="12" cy="16" r="3.5" />
        <circle cx="9"  cy="10" r="1.2" fill="white" opacity="0.3" />
        <circle cx="15" cy="10" r="1.2" fill="white" opacity="0.3" />
        <circle cx="12" cy="16" r="1.2" fill="white" opacity="0.3" />
        <path d="M12 6 L12 3" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
      </>
    ),
  },

  // ─── COLORANTS (additional) ───────────────────────────────────────────────

  'paprika': {
    colors: 'text-red-500 bg-red-50',
    path: (
      <>
        {/* bell pepper */}
        <path d="M9 7 Q5 9 5 14 Q5 20 12 21 Q19 20 19 14 Q19 9 15 7Z" />
        <path d="M9 7 L9 5 Q10 3 12 4 Q14 3 15 5 L15 7" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M12 4 L12 2" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M9 11 Q12 9 15 11" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" />
      </>
    ),
  },

  'indigo': {
    colors: 'text-indigo-700 bg-indigo-50',
    path: (
      <>
        {/* indigo plant leaf / dye */}
        <path d="M4 18 Q4 8 12 4 Q20 8 20 18 Q16 21 12 22 Q8 21 4 18Z" opacity="0.3" />
        <rect x="5" y="12" width="14" height="9" rx="2" opacity="0.9" />
        <path d="M5 12 Q12 9 19 12" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        {/* dye vat ripples */}
        <path d="M8 15 Q12 13 16 15 M8 18 Q12 16 16 18" stroke="white" strokeWidth="0.8" fill="none" opacity="0.35" strokeLinecap="round" />
      </>
    ),
  },

  'madder': {
    colors: 'text-rose-700 bg-rose-50',
    path: (
      <>
        {/* madder root */}
        <path d="M12 6 Q10 10 8 15 Q7 19 9 21" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 6 Q14 10 16 15 Q17 19 15 21" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.8" />
        <path d="M12 9 Q8 11 7 14" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M12 9 Q16 11 17 14" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M10 4 Q12 2 14 4" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'annatto': {
    colors: 'text-orange-600 bg-orange-50',
    path: (
      <>
        {/* annatto / achiote spiky seed pod */}
        <path d="M12 4 Q16 5 18 9 Q19 13 17 16 Q14 20 12 20 Q10 20 7 16 Q5 13 6 9 Q8 5 12 4Z" />
        {/* spikes */}
        <path d="M12 4 L12 1 M15 5 L17 2 M17 8 L21 7 M18 12 L22 12 M17 16 L20 18 M12 20 L12 23 M7 16 L4 18 M6 12 L2 12 M7 8 L3 7 M9 5 L7 2" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" />
        <ellipse cx="12" cy="12" rx="3" ry="4" fill="white" opacity="0.2" />
      </>
    ),
  },

  'mica': {
    colors: 'text-violet-400 bg-violet-50',
    path: (
      <>
        {/* layered mineral shard */}
        <path d="M6 18 L4 10 L12 4 L20 10 L18 18Z" />
        <path d="M6 18 L4 10 L12 4" fill="none" stroke="white" strokeWidth="0.8" opacity="0.4" />
        <path d="M8 16 L6 10 L13 5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
        <path d="M10 14 L8 10 L14 6" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2" />
        <ellipse cx="13" cy="13" rx="4" ry="2" fill="white" opacity="0.15" />
      </>
    ),
  },

  'iron oxide': {
    colors: 'text-red-600 bg-red-50',
    path: (
      <>
        {/* mineral crystal cluster */}
        <path d="M12 3 L16 8 L20 7 L18 12 L21 16 L16 15 L12 21 L8 15 L3 16 L6 12 L4 7 L8 8Z" />
        <path d="M12 8 L12 16 M8 10 L16 14 M16 10 L8 14" stroke="white" strokeWidth="0.7" fill="none" opacity="0.25" />
      </>
    ),
  },

  'ultramarine': {
    colors: 'text-blue-700 bg-blue-50',
    path: (
      <>
        {/* blue mineral chunk */}
        <path d="M8 4 L16 4 L20 10 L18 18 L12 20 L6 18 L4 10Z" />
        <path d="M8 4 L4 10 L6 18" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" />
        <path d="M10 7 L6 12 L8 17" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2" />
        <path d="M12 4 L12 20" stroke="white" strokeWidth="0.5" fill="none" opacity="0.15" />
      </>
    ),
  },

  // ─── WAXES (additional) ───────────────────────────────────────────────────

  'candelilla': {
    colors: 'text-yellow-500 bg-yellow-50',
    path: (
      <>
        {/* candelilla plant — upright green reeds */}
        <path d="M8 22 Q8 14 9 8 Q10 3 8 1" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 22 Q12 13 13 7 Q14 2 12 1" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M16 22 Q16 15 17 9 Q18 4 16 2" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M6 16 L18 16" strokeWidth="1" stroke="currentColor" fill="none" opacity="0.3" strokeLinecap="round" />
      </>
    ),
  },

  // ─── MILKS (additional) ───────────────────────────────────────────────────

  'whole milk': {
    colors: 'text-slate-400 bg-slate-50',
    path: (
      <>
        {/* glass milk bottle */}
        <path d="M9 5 L9 8 Q6 9 5 13 L5 18 Q5 21 8 21 L16 21 Q19 21 19 18 L19 13 Q18 9 15 8 L15 5Z" />
        <path d="M9 5 L15 5" strokeWidth="1.5" strokeLinecap="round" stroke="currentColor" fill="none" />
        <path d="M15 8 Q17 7 18 5" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <ellipse cx="12" cy="16" rx="4" ry="2" fill="white" opacity="0.3" />
      </>
    ),
  },

  'oat milk': {
    colors: 'text-amber-400 bg-amber-50',
    path: (
      <>
        {/* oat grain on stalk above milk glass */}
        <path d="M12 14 L12 8" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <ellipse cx="12" cy="5.5" rx="2.5" ry="4" />
        <path d="M12 8 L9 10 M12 8 L15 10" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        {/* glass */}
        <path d="M7 14 L8 22 L16 22 L17 14Z" opacity="0.8" />
        <path d="M7 14 L17 14" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <ellipse cx="12" cy="19" rx="3" ry="1" fill="white" opacity="0.3" />
      </>
    ),
  },

  'almond milk': {
    colors: 'text-amber-300 bg-amber-50',
    path: (
      <>
        {/* almond on stem + milk drop */}
        <ellipse cx="12" cy="9" rx="4" ry="6" />
        <path d="M10 5 Q12 3 14 5" fill="none" strokeWidth="1.5" stroke="white" opacity="0.3" strokeLinecap="round" />
        <path d="M12 15 L12 17" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 17 Q12 21 10 21 Q8 21 8 19 Q8 17 12 17Z" opacity="0.7" />
      </>
    ),
  },

  'buttermilk': {
    colors: 'text-yellow-300 bg-yellow-50',
    path: (
      <>
        {/* churn / pitcher */}
        <path d="M8 7 L8 20 Q8 22 12 22 Q16 22 16 20 L16 7Z" />
        <path d="M8 7 Q12 5 16 7" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <rect x="7" y="4" width="10" height="4" rx="2" />
        <path d="M16 12 Q19 11 19 13" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
        <path d="M10 14 Q12 12 14 14" fill="none" strokeWidth="1" stroke="white" opacity="0.4" strokeLinecap="round" />
      </>
    ),
  },

  // ─── EXFOLIANTS (additional) ──────────────────────────────────────────────

  'bamboo': {
    colors: 'text-green-500 bg-green-50',
    path: (
      <>
        {/* bamboo stalk with nodes */}
        <path d="M10 22 L10 2" strokeWidth="3" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M9 6 L11 6 M9 11 L11 11 M9 16 L11 16" strokeWidth="1.5" stroke="currentColor" fill="none" opacity="0.6" />
        {/* leaves */}
        <path d="M11 4 Q16 3 17 7 Q14 7 11 4Z" />
        <path d="M11 9 Q16 8 18 12 Q15 12 11 9Z" opacity="0.8" />
        <path d="M11 14 Q15 13 16 17 Q13 17 11 14Z" opacity="0.6" />
      </>
    ),
  },

  'loofah': {
    colors: 'text-amber-400 bg-amber-50',
    path: (
      <>
        {/* fibrous sponge texture */}
        <rect x="3" y="7" width="18" height="13" rx="4" />
        {/* fiber lines */}
        <path d="M6 10 L18 10 M6 13 L18 13 M6 16 L18 16" stroke="white" strokeWidth="1" fill="none" opacity="0.35" />
        <path d="M9 7 L9 20 M13 7 L13 20 M17 7 L17 20" stroke="white" strokeWidth="0.7" fill="none" opacity="0.25" />
      </>
    ),
  },

  // ─── FRUITS / ENZYMES ─────────────────────────────────────────────────────

  'papaya': {
    colors: 'text-orange-400 bg-orange-50',
    path: (
      <>
        {/* papaya half with seeds */}
        <path d="M8 3 Q5 8 5 14 Q5 21 12 22 Q19 21 19 14 Q19 8 16 3 Q14 1 12 1 Q10 1 8 3Z" />
        <path d="M12 4 L12 21" stroke="white" strokeWidth="0.8" fill="none" opacity="0.25" />
        {/* seeds */}
        <ellipse cx="10" cy="13" rx="1.5" ry="2" fill="white" opacity="0.5" />
        <ellipse cx="14" cy="13" rx="1.5" ry="2" fill="white" opacity="0.5" />
        <ellipse cx="12" cy="16" rx="1.5" ry="2" fill="white" opacity="0.5" />
        <ellipse cx="10" cy="10" rx="1.2" ry="1.8" fill="white" opacity="0.35" />
        <ellipse cx="14" cy="10" rx="1.2" ry="1.8" fill="white" opacity="0.35" />
      </>
    ),
  },

  'pineapple': {
    colors: 'text-yellow-500 bg-yellow-50',
    path: (
      <>
        {/* pineapple body with crown */}
        <path d="M7 9 Q6 14 7 18 Q9 22 12 22 Q15 22 17 18 Q18 14 17 9 Q15 6 12 6 Q9 6 7 9Z" />
        <path d="M9 9 L15 9 M8 12 L16 12 M8 15 L16 15 M9 18 L15 18" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" />
        {/* crown */}
        <path d="M10 6 Q9 3 10 1 M12 5 L12 1 M14 6 Q15 3 14 1" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M8 7 Q6 4 8 2 M16 7 Q18 4 16 2" fill="none" strokeWidth="1" stroke="currentColor" strokeLinecap="round" opacity="0.7" />
      </>
    ),
  },

  // ─── ADDITIVES (additional) ───────────────────────────────────────────────

  'vitamin c': {
    colors: 'text-orange-400 bg-orange-50',
    path: (
      <>
        {/* orange slice / ascorbic acid crystal */}
        <circle cx="12" cy="12" r="9" />
        {/* segments */}
        {[0,60,120,180,240,300].map((deg, i) => {
          const r = deg * Math.PI / 180;
          return <line key={i} x1="12" y1="12" x2={12 + 9 * Math.sin(r)} y2={12 - 9 * Math.cos(r)} strokeWidth="0.8" stroke="white" opacity="0.4" />;
        })}
        <circle cx="12" cy="12" r="3" fill="white" opacity="0.5" />
      </>
    ),
  },

  'sodium lactate': {
    colors: 'text-blue-400 bg-blue-50',
    path: (
      <>
        {/* dropper bottle */}
        <path d="M9 8 L9 18 Q9 21 12 21 Q15 21 15 18 L15 8Z" />
        <rect x="8" y="5" width="8" height="4" rx="2" />
        <path d="M12 4 L12 2" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 21 Q12 23 11 24" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M10 13 Q12 11 14 13" fill="none" strokeWidth="1" stroke="white" opacity="0.4" strokeLinecap="round" />
      </>
    ),
  },

  'citric acid': {
    colors: 'text-yellow-500 bg-yellow-50',
    path: (
      <>
        {/* lemon + fizz bubbles */}
        <ellipse cx="11" cy="14" rx="6" ry="7" />
        <path d="M8 9 Q11 6 14 9" fill="none" strokeWidth="1.5" stroke="white" opacity="0.3" strokeLinecap="round" />
        <path d="M8 8 Q10 5 11 4 M14 8 Q12 5 11 4" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        {/* bubbles */}
        <circle cx="19" cy="8"  r="1.5" opacity="0.7" />
        <circle cx="17" cy="5"  r="1"   opacity="0.6" />
        <circle cx="21" cy="5"  r="1.2" opacity="0.5" />
      </>
    ),
  },

  'arrowroot': {
    colors: 'text-slate-300 bg-slate-50',
    path: (
      <>
        {/* arrowhead plant leaf */}
        <path d="M12 22 L12 10" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 10 L5 16 L12 22 L19 16Z" />
        <path d="M12 10 L12 22 M7 14 L17 14" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" />
        <path d="M12 10 Q10 6 12 2" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'silk': {
    colors: 'text-pink-300 bg-pink-50',
    path: (
      <>
        {/* silk cocoon */}
        <ellipse cx="12" cy="13" rx="7" ry="8" />
        <ellipse cx="12" cy="13" rx="5" ry="6" fill="none" stroke="white" strokeWidth="0.8" opacity="0.35" />
        <ellipse cx="12" cy="13" rx="3" ry="4" fill="none" stroke="white" strokeWidth="0.8" opacity="0.25" />
        {/* thread */}
        <path d="M12 5 Q17 4 19 6" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'panthenol': {
    colors: 'text-teal-500 bg-teal-50',
    path: (
      <>
        {/* dropper / medicine dropper */}
        <path d="M10 10 L10 19 Q10 22 12 22 Q14 22 14 19 L14 10Z" />
        <path d="M9 7 Q9 4 12 4 Q15 4 15 7 L14 10 L10 10Z" />
        <path d="M12 3 L12 1" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 22 Q12 24 11 25" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <ellipse cx="12" cy="16" rx="1.5" ry="3" fill="white" opacity="0.25" />
      </>
    ),
  },

  'decyl glucoside': {
    colors: 'text-emerald-500 bg-emerald-50',
    path: (
      <>
        {/* surfactant / bubble foam */}
        <circle cx="8"  cy="10" r="5" />
        <circle cx="16" cy="10" r="5" />
        <circle cx="12" cy="17" r="5" />
        <circle cx="8"  cy="10" r="2" fill="white" opacity="0.35" />
        <circle cx="16" cy="10" r="2" fill="white" opacity="0.35" />
        <circle cx="12" cy="17" r="2" fill="white" opacity="0.35" />
      </>
    ),
  },

  'polysorbate': {
    colors: 'text-cyan-500 bg-cyan-50',
    path: (
      <>
        {/* emulsifier molecule / circular arrows */}
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M20 12 Q22 8 20 6" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M4 12 Q2 16 4 18" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'preservative': {
    colors: 'text-slate-500 bg-slate-50',
    path: (
      <>
        {/* shield icon for protection */}
        <path d="M12 2 L20 6 L20 13 Q20 18 12 22 Q4 18 4 13 L4 6Z" />
        <path d="M8 12 L11 15 L16 9" fill="none" strokeWidth="2.5" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },

  'potassium hydroxide': {
    colors: 'text-slate-500 bg-slate-100',
    path: (
      <>
        {/* flask with KOH — same as sodium hydroxide but with different label bubbles */}
        <path d="M10 4 L10 10 L5 18 Q4 20 6 20 L18 20 Q20 20 19 18 L14 10 L14 4 Z" />
        <path d="M9 4 L15 4" strokeWidth="1.5" strokeLinecap="round" stroke="currentColor" fill="none" />
        <circle cx="9"  cy="16" r="2" fill="white" opacity="0.45" />
        <circle cx="14" cy="17" r="1.5" fill="white" opacity="0.35" />
        <circle cx="16" cy="15" r="1" fill="white" opacity="0.3" />
      </>
    ),
  },

  'glycerin base': {
    colors: 'text-indigo-500 bg-indigo-50',
    path: (
      <>
        {/* rectangular glycerin block / bar */}
        <rect x="3" y="8" width="18" height="13" rx="3" />
        <path d="M3 12 Q12 9 21 12" fill="none" strokeWidth="1" stroke="white" opacity="0.3" />
        <path d="M3 16 Q12 13 21 16" fill="none" strokeWidth="1" stroke="white" opacity="0.2" />
        {/* M&P pour line */}
        <path d="M8 5 Q12 4 16 5" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
        <path d="M12 4 L12 2" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <ellipse cx="12" cy="15" rx="5" ry="2" fill="white" opacity="0.15" />
      </>
    ),
  },

  'sodium cocoyl': {
    colors: 'text-teal-400 bg-teal-50',
    path: (
      <>
        {/* surfactant foam burst */}
        <circle cx="12" cy="12" r="4" />
        {[0,45,90,135,180,225,270,315].map((deg, i) => {
          const r = deg * Math.PI / 180;
          const x1 = 12 + 5 * Math.sin(r), y1 = 12 - 5 * Math.cos(r);
          const x2 = 12 + 9 * Math.sin(r), y2 = 12 - 9 * Math.cos(r);
          return <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="1.5" stroke="currentColor" /><circle cx={x2} cy={y2} r="1.5" /></g>;
        })}
      </>
    ),
  },

  // ─── CARRIER OILS (new) ───────────────────────────────────────────────────

  'baobab': {
    colors: 'text-amber-600 bg-amber-50',
    path: (
      <>
        {/* baobab trunk + wide crown */}
        <path d="M10 22 L10 14 Q10 12 12 12 Q14 12 14 14 L14 22" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 12 Q7 10 5 6 Q9 5 12 9Z" />
        <path d="M12 12 Q17 10 19 6 Q15 5 12 9Z" opacity="0.85" />
        <path d="M12 12 Q8 8 6 4 Q10 3 12 8Z" opacity="0.7" />
        <path d="M12 12 Q16 8 18 4 Q14 3 12 8Z" opacity="0.7" />
        <ellipse cx="12" cy="12" rx="2" ry="1.5" />
      </>
    ),
  },

  'flaxseed': {
    colors: 'text-amber-500 bg-amber-50',
    path: (
      <>
        {/* flax flower with 5 petals and slim stem */}
        <path d="M12 22 L12 11" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        {[0,72,144,216,288].map((deg, i) => {
          const r = deg * Math.PI / 180;
          const cx = 12 + 5.5 * Math.sin(r), cy = 11 - 5.5 * Math.cos(r);
          return <ellipse key={i} cx={cx} cy={cy} rx="2.2" ry="3.5" transform={`rotate(${deg} ${cx} ${cy})`} opacity="0.9" />;
        })}
        <circle cx="12" cy="11" r="2" fill="white" opacity="0.6" />
        <path d="M8 18 L12 16 L16 18" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
      </>
    ),
  },

  'macadamia': {
    colors: 'text-amber-700 bg-amber-50',
    path: (
      <>
        {/* round macadamia nut with shell marking */}
        <circle cx="12" cy="13" r="8" />
        <circle cx="12" cy="13" r="5.5" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" />
        <path d="M10 9 Q12 7 14 9" fill="none" strokeWidth="1.5" stroke="white" opacity="0.4" strokeLinecap="round" />
        <path d="M9 5 Q12 3 15 5" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <ellipse cx="10" cy="13" rx="2.5" ry="3" fill="white" opacity="0.12" />
      </>
    ),
  },

  'squalane': {
    colors: 'text-sky-500 bg-sky-50',
    path: (
      <>
        {/* molecular chain — lightweight emollient */}
        <circle cx="4"  cy="12" r="2.5" />
        <circle cx="10" cy="8"  r="2.5" />
        <circle cx="16" cy="8"  r="2.5" />
        <circle cx="20" cy="12" r="2.5" />
        <circle cx="10" cy="16" r="2"   opacity="0.7" />
        <circle cx="16" cy="16" r="2"   opacity="0.7" />
        <path d="M6 12 L8 8 M12 8 L14 8 M18 8 L18 12 M6 12 L8 16 M12 16 L14 16 M18 12 L18 16" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'tallow': {
    colors: 'text-amber-600 bg-amber-50',
    path: (
      <>
        {/* rendered fat block */}
        <path d="M5 9 L5 18 Q5 21 12 21 Q19 21 19 18 L19 9 Q19 6 12 6 Q5 6 5 9Z" />
        <path d="M5 9 Q12 12 19 9" fill="none" strokeWidth="1.5" stroke="white" opacity="0.3" strokeLinecap="round" />
        <path d="M5 14 Q12 17 19 14" fill="none" strokeWidth="1" stroke="white" opacity="0.2" strokeLinecap="round" />
        <path d="M10 3 Q12 1 14 3" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'lard': {
    colors: 'text-stone-400 bg-stone-50',
    path: (
      <>
        {/* lard — pig silhouette simplified */}
        <path d="M6 14 Q5 10 7 8 Q10 5 14 6 Q18 6 19 9 Q20 12 18 14 Q16 18 12 18 Q8 18 6 14Z" />
        <circle cx="9" cy="10" r="0.8" fill="white" opacity="0.7" />
        <circle cx="13" cy="9" r="0.8" fill="white" opacity="0.7" />
        <path d="M9 14 Q12 16 15 14" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" />
        <path d="M7 17 Q7 21 6 22 M9 18 Q10 22 10 23" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
        <path d="M17 17 Q17 21 18 22 M15 18 Q14 22 14 23" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
      </>
    ),
  },

  'palm oil': {
    colors: 'text-orange-500 bg-orange-50',
    path: (
      <>
        {/* palm tree silhouette */}
        <path d="M12 22 L12 12" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 12 Q5 8 3 3 Q8 4 12 12Z" />
        <path d="M12 12 Q19 8 21 3 Q16 4 12 12Z" opacity="0.85" />
        <path d="M12 12 Q9 6 10 2 Q13 4 12 12Z" opacity="0.7" />
        <path d="M12 12 Q15 6 14 2 Q11 4 12 12Z" opacity="0.7" />
        <circle cx="12" cy="12" r="2" opacity="0.8" />
      </>
    ),
  },

  'wheat germ': {
    colors: 'text-amber-400 bg-amber-50',
    path: (
      <>
        {/* wheat stalk with grain head */}
        <path d="M12 22 L12 6" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <ellipse cx="12" cy="4" rx="2.5" ry="3" />
        <path d="M9 8 L6 6 M9 11 L6 9 M9 14 L6 12" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.7" />
        <path d="M15 8 L18 6 M15 11 L18 9 M15 14 L18 12" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.7" />
        <ellipse cx="12" cy="4" rx="1.2" ry="1.5" fill="white" opacity="0.25" />
      </>
    ),
  },

  'prickly pear': {
    colors: 'text-green-500 bg-green-50',
    path: (
      <>
        {/* cactus pad with fruit */}
        <path d="M8 18 Q5 16 5 12 Q5 8 9 7 Q13 7 14 10 Q14 14 11 16 Q9 18 8 18Z" />
        <path d="M14 10 Q17 8 18 11 Q18 14 15 15 Q14 16 14 14" />
        <path d="M7 9 L6 7 M11 8 L11 6 M14 12 L16 12" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
        <ellipse cx="10" cy="19.5" rx="3" ry="2.5" />
        <path d="M10 17 L10 15" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
      </>
    ),
  },

  'red raspberry': {
    colors: 'text-red-500 bg-red-50',
    path: (
      <>
        {/* raspberry drupelets */}
        <circle cx="9"  cy="9"  r="2.5" />
        <circle cx="15" cy="9"  r="2.5" />
        <circle cx="12" cy="7"  r="2.5" />
        <circle cx="9"  cy="14" r="2.5" />
        <circle cx="15" cy="14" r="2.5" />
        <circle cx="12" cy="12" r="2.5" />
        <circle cx="12" cy="17" r="2"   opacity="0.8" />
        <circle cx="9"  cy="9"  r="0.8" fill="white" opacity="0.4" />
        <circle cx="15" cy="9"  r="0.8" fill="white" opacity="0.4" />
        <circle cx="12" cy="7"  r="0.8" fill="white" opacity="0.4" />
        <path d="M10 5 Q12 3 14 5" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'blackberry seed': {
    colors: 'text-purple-700 bg-purple-50',
    path: (
      <>
        {/* blackberry drupelets — darker purple */}
        <circle cx="9"  cy="9"  r="2.5" />
        <circle cx="15" cy="9"  r="2.5" />
        <circle cx="12" cy="7"  r="2.5" />
        <circle cx="9"  cy="14" r="2.5" />
        <circle cx="15" cy="14" r="2.5" />
        <circle cx="12" cy="12" r="2.5" />
        <circle cx="12" cy="17" r="2"   opacity="0.8" />
        <circle cx="9"  cy="9"  r="0.8" fill="white" opacity="0.25" />
        <circle cx="15" cy="9"  r="0.8" fill="white" opacity="0.25" />
        <path d="M10 5 Q12 3 14 5" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'blueberry': {
    colors: 'text-blue-600 bg-blue-50',
    path: (
      <>
        {/* blueberry cluster */}
        <circle cx="12" cy="14" r="5" />
        <circle cx="7"  cy="11" r="3.5" opacity="0.85" />
        <circle cx="17" cy="11" r="3.5" opacity="0.85" />
        <path d="M10 9 Q12 7 14 9" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
        {/* crown dimple */}
        <path d="M11 9 Q12 8 13 9" fill="none" strokeWidth="1.2" stroke="white" opacity="0.4" strokeLinecap="round" />
        <path d="M6 9 Q7 8 8 9" fill="none" strokeWidth="1.2" stroke="white" opacity="0.35" strokeLinecap="round" />
        <path d="M16 9 Q17 8 18 9" fill="none" strokeWidth="1.2" stroke="white" opacity="0.35" strokeLinecap="round" />
      </>
    ),
  },

  'kukui': {
    colors: 'text-amber-500 bg-amber-50',
    path: (
      <>
        {/* kukui nut — round with distinctive suture line */}
        <circle cx="12" cy="13" r="7.5" />
        <path d="M12 5.5 Q12 13 12 20.5" strokeWidth="1.5" stroke="white" fill="none" opacity="0.35" strokeLinecap="round" />
        <path d="M9 7 Q12 6 15 7" fill="none" strokeWidth="1.5" stroke="white" opacity="0.3" strokeLinecap="round" />
        <ellipse cx="9" cy="13" rx="2" ry="3.5" fill="white" opacity="0.12" />
        <path d="M10 21 Q12 23 14 21" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  // ─── BUTTERS (new) ────────────────────────────────────────────────────────

  'brazil nut': {
    colors: 'text-amber-700 bg-amber-50',
    path: (
      <>
        {/* brazil nut — elongated triangular nut */}
        <path d="M8 5 Q6 8 5 13 Q5 19 8 21 Q12 23 16 21 Q19 19 19 13 Q18 8 16 5 Q14 3 12 3 Q10 3 8 5Z" />
        <path d="M8 5 L16 5 M6 10 L18 10 M5.5 15 L18.5 15" stroke="white" strokeWidth="0.8" fill="none" opacity="0.25" />
        <path d="M12 3 L12 1" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
      </>
    ),
  },

  'sal butter': {
    colors: 'text-yellow-700 bg-yellow-50',
    path: (
      <>
        {/* sal leaf with nut */}
        <path d="M4 18 Q5 10 12 5 Q19 10 20 18 Q16 21 12 22 Q8 21 4 18Z" opacity="0.35" />
        <ellipse cx="12" cy="14" rx="5" ry="6" />
        <path d="M10 10 Q12 8 14 10" fill="none" strokeWidth="1.5" stroke="white" opacity="0.4" strokeLinecap="round" />
        <path d="M12 7 L12 5 Q13 3 12 2" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'tucuma': {
    colors: 'text-orange-600 bg-orange-50',
    path: (
      <>
        {/* tucuma palm fruit cluster on stem */}
        <path d="M12 22 L12 14" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <ellipse cx="12" cy="11" rx="4.5" ry="5" />
        <ellipse cx="7"  cy="15" rx="3.5" ry="4" opacity="0.8" />
        <ellipse cx="17" cy="15" rx="3.5" ry="4" opacity="0.8" />
        <path d="M10 9 Q12 7 14 9" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" />
      </>
    ),
  },

  'neem butter': {
    colors: 'text-green-700 bg-green-50',
    path: (
      <>
        {/* neem butter — neem leaf with butter jar underneath */}
        <path d="M12 11 L12 4" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 9 C9 7 6 5 5 3 C7 2.5 10 5 12 9Z" />
        <path d="M12 9 C15 7 18 5 19 3 C17 2.5 14 5 12 9Z" opacity="0.8" />
        <rect x="6" y="13" width="12" height="9" rx="2" />
        <path d="M6 17 Q12 15 18 17" stroke="white" strokeWidth="0.8" fill="none" opacity="0.3" strokeLinecap="round" />
      </>
    ),
  },

  // ─── ESSENTIAL OILS (new) ─────────────────────────────────────────────────

  'cypress': {
    colors: 'text-emerald-700 bg-emerald-50',
    path: (
      <>
        {/* tall cypress tree — conical */}
        <path d="M12 22 L12 18" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M7 18 L12 10 L17 18Z" />
        <path d="M8 14 L12 8 L16 14Z" opacity="0.85" />
        <path d="M9 11 L12 6 L15 11Z" opacity="0.7" />
        <path d="M10 8 L12 4 L14 8Z" opacity="0.55" />
      </>
    ),
  },

  'juniper berry': {
    colors: 'text-blue-700 bg-blue-50',
    path: (
      <>
        {/* juniper berries on needled twig */}
        <path d="M12 22 L12 10" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 10 L8 7 M12 14 L7 12 M12 10 L16 7 M12 14 L17 12" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <circle cx="7"  cy="6"  r="3" />
        <circle cx="16" cy="6"  r="3" />
        <circle cx="6"  cy="11" r="2.5" opacity="0.85" />
        <circle cx="18" cy="11" r="2.5" opacity="0.85" />
        <circle cx="7"  cy="6"  r="1" fill="white" opacity="0.35" />
        <circle cx="16" cy="6"  r="1" fill="white" opacity="0.35" />
      </>
    ),
  },

  'myrrh': {
    colors: 'text-amber-800 bg-amber-50',
    path: (
      <>
        {/* myrrh resin drops — amber tears */}
        <path d="M7 8 C7 8 5 12 5 14 A3 3 0 0 0 11 14 C11 12 7 8 7 8Z" />
        <path d="M17 5 C17 5 15 10 15 13 A2.5 2.5 0 0 0 20 13 C20 10 17 5 17 5Z" />
        <path d="M12 15 C12 15 10 18 10 20 A2 2 0 0 0 14 20 C14 18 12 15 12 15Z" opacity="0.8" />
        <path d="M5 4 L10 2 Q12 2 12 4 Q12 6 10 6 L5 6 Z" opacity="0.4" />
      </>
    ),
  },

  'pine': {
    colors: 'text-green-700 bg-green-50',
    path: (
      <>
        {/* pine tree with cone */}
        <path d="M12 22 L12 16" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M5 16 L12 6 L19 16Z" />
        <path d="M7 13 L12 5 L17 13Z" opacity="0.8" />
        <path d="M8 10 L12 4 L16 10Z" opacity="0.65" />
        {/* pine cone */}
        <ellipse cx="16" cy="19" rx="2.5" ry="3" />
        <path d="M14 17 L18 17 M13.5 19 L18.5 19 M14 21 L18 21" stroke="white" strokeWidth="0.7" fill="none" opacity="0.35" strokeLinecap="round" />
      </>
    ),
  },

  'thyme': {
    colors: 'text-green-500 bg-green-50',
    path: (
      <>
        {/* thyme sprig with tiny oval leaves */}
        <path d="M12 22 L12 5" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        {[7,9,11,13,15,17,19].map((y, i) => (
          <ellipse key={i} cx={i % 2 === 0 ? 9 : 15} cy={y} rx="2.5" ry="1.5"
            transform={`rotate(${i % 2 === 0 ? -20 : 20} ${i % 2 === 0 ? 9 : 15} ${y})`} />
        ))}
      </>
    ),
  },

  'yarrow': {
    colors: 'text-white bg-emerald-50',
    path: (
      <>
        {/* yarrow — flat-topped cluster of tiny flowers */}
        <path d="M12 22 L12 13" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 13 L7 10 M12 13 L17 10 M12 13 L9 8 M12 13 L15 8 M12 13 L12 8" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <circle cx="7"  cy="9"  r="1.5" />
        <circle cx="17" cy="9"  r="1.5" />
        <circle cx="9"  cy="7"  r="1.5" />
        <circle cx="15" cy="7"  r="1.5" />
        <circle cx="12" cy="7"  r="1.5" />
        <circle cx="5"  cy="11" r="1.2" opacity="0.8" />
        <circle cx="19" cy="11" r="1.2" opacity="0.8" />
      </>
    ),
  },

  'cardamom': {
    colors: 'text-green-600 bg-green-50',
    path: (
      <>
        {/* cardamom pod with seeds inside */}
        <path d="M8 4 Q6 8 6 13 Q6 18 8 20 Q12 22 16 20 Q18 18 18 13 Q18 8 16 4 Q14 2 12 2 Q10 2 8 4Z" />
        <path d="M8 4 L16 4 M7 9 L17 9 M7 14 L17 14 M8 19 L16 19" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" />
        <ellipse cx="10" cy="11.5" rx="1.5" ry="2" fill="white" opacity="0.3" />
        <ellipse cx="14" cy="11.5" rx="1.5" ry="2" fill="white" opacity="0.3" />
        <path d="M10 2 L12 0 L14 2" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'fennel': {
    colors: 'text-green-400 bg-green-50',
    path: (
      <>
        {/* fennel — feathery fronds with umbel */}
        <path d="M12 22 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        {/* fronds */}
        <path d="M12 15 Q8 12 5 14 Q7 17 12 15Z" opacity="0.7" />
        <path d="M12 15 Q16 12 19 14 Q17 17 12 15Z" opacity="0.7" />
        <path d="M12 12 Q8 9 6 10 Q8 13 12 12Z" opacity="0.6" />
        <path d="M12 12 Q16 9 18 10 Q16 13 12 12Z" opacity="0.6" />
        {/* umbel flowers */}
        {[0,60,120,180,240,300].map((deg, i) => {
          const r2 = deg * Math.PI / 180;
          const cx = 12 + 5 * Math.sin(r2), cy = 8 - 5 * Math.cos(r2);
          return <circle key={i} cx={cx} cy={cy} r="1.2" />;
        })}
        <circle cx="12" cy="8" r="1.5" />
      </>
    ),
  },

  'allspice': {
    colors: 'text-amber-800 bg-amber-50',
    path: (
      <>
        {/* allspice berries on branch */}
        <path d="M12 21 L12 10" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 10 L8 7 M12 13 L8 11 M12 10 L16 7 M12 13 L16 11" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <circle cx="7"  cy="6"  r="2.5" />
        <circle cx="16" cy="6"  r="2.5" />
        <circle cx="7"  cy="10" r="2.5" />
        <circle cx="17" cy="10" r="2.5" />
        <circle cx="12" cy="8"  r="2" opacity="0.8" />
        <path d="M6.5 4.5 Q7 4 7.5 4.5" fill="none" strokeWidth="1" stroke="white" opacity="0.4" strokeLinecap="round" />
      </>
    ),
  },

  'mandarin': {
    colors: 'text-orange-400 bg-orange-50',
    path: (
      <>
        {/* mandarin orange — rounder and cuter than regular orange */}
        <circle cx="12" cy="13" r="8" />
        <path d="M12 5 L12 21 M4 13 L20 13" stroke="white" strokeWidth="0.8" fill="none" opacity="0.35" />
        <path d="M6 7 L18 19 M18 7 L6 19" stroke="white" strokeWidth="0.6" fill="none" opacity="0.25" />
        <path d="M10 4 Q12 2 14 4" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
        <ellipse cx="9" cy="13" rx="2.5" ry="3" fill="white" opacity="0.12" />
      </>
    ),
  },

  'manuka': {
    colors: 'text-amber-600 bg-amber-50',
    path: (
      <>
        {/* manuka — small five-petal flower on twig */}
        {[0,72,144,216,288].map((deg, i) => {
          const r2 = deg * Math.PI / 180;
          const cx = 12 + 5.5 * Math.sin(r2), cy = 10 - 5.5 * Math.cos(r2);
          return <ellipse key={i} cx={cx} cy={cy} rx="2" ry="3" transform={`rotate(${deg} ${cx} ${cy})`} />;
        })}
        <circle cx="12" cy="10" r="2.5" fill="white" opacity="0.7" />
        <circle cx="12" cy="10" r="1.5" opacity="0.7" />
        <path d="M12 17 L12 22" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M10 19 L14 19" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
      </>
    ),
  },

  // ─── BOTANICALS (new) ────────────────────────────────────────────────────

  'ashwagandha': {
    colors: 'text-amber-600 bg-amber-50',
    path: (
      <>
        {/* ashwagandha root — forked root with berry */}
        <path d="M12 6 Q10 11 8 16 Q7 20 8 22" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 6 Q14 11 16 16 Q17 20 16 22" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.8" />
        <path d="M12 10 Q8 12 7 15" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M12 10 Q16 12 17 15" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.6" />
        {/* cherry berry */}
        <circle cx="12" cy="4" r="2.5" />
        <path d="M12 6 L12 4" strokeWidth="1" stroke="currentColor" fill="none" />
        <circle cx="12" cy="4" r="0.8" fill="white" opacity="0.4" />
      </>
    ),
  },

  'echinacea': {
    colors: 'text-purple-500 bg-purple-50',
    path: (
      <>
        {/* echinacea cone flower */}
        <path d="M12 22 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        {/* drooping petals */}
        {[0,45,90,135,180,225,270,315].map((deg, i) => {
          const r2 = (deg + 22) * Math.PI / 180;
          const cx = 12 + 7 * Math.sin(r2), cy = 10 - 7 * Math.cos(r2);
          return <ellipse key={i} cx={cx} cy={cy} rx="1.5" ry="3.5" transform={`rotate(${deg + 22 + 15} ${cx} ${cy})`} opacity="0.75" />;
        })}
        {/* cone center */}
        <ellipse cx="12" cy="10" rx="3.5" ry="3.5" />
        <circle cx="12" cy="10" r="2" fill="white" opacity="0.2" />
      </>
    ),
  },

  'licorice root': {
    colors: 'text-amber-700 bg-amber-50',
    path: (
      <>
        {/* licorice root — bundled woody sticks */}
        <rect x="5" y="9" width="14" height="3.5" rx="1.75" transform="rotate(-10 12 12)" />
        <rect x="5" y="12" width="14" height="3.5" rx="1.75" opacity="0.8" />
        <rect x="5" y="15" width="13" height="3" rx="1.5" transform="rotate(8 12 12)" opacity="0.65" />
        <path d="M8 6 Q12 4 16 6" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'marshmallow root': {
    colors: 'text-pink-300 bg-pink-50',
    path: (
      <>
        {/* marshmallow plant — soft flower petals */}
        {[0,72,144,216,288].map((deg, i) => {
          const r2 = deg * Math.PI / 180;
          const cx = 12 + 6 * Math.sin(r2), cy = 10 - 6 * Math.cos(r2);
          return <ellipse key={i} cx={cx} cy={cy} rx="2.5" ry="3.8" transform={`rotate(${deg} ${cx} ${cy})`} opacity="0.85" />;
        })}
        <circle cx="12" cy="10" r="3" fill="white" opacity="0.7" />
        <circle cx="12" cy="10" r="1.5" opacity="0.6" />
        {/* root */}
        <path d="M10 18 L12 16 L14 18 L12 22 Z" opacity="0.7" />
      </>
    ),
  },

  'milk thistle': {
    colors: 'text-purple-400 bg-purple-50',
    path: (
      <>
        {/* thistle head with spiky bracts */}
        <path d="M12 22 L12 14" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <circle cx="12" cy="10" r="5" />
        {/* spiky bracts */}
        {[0,45,90,135,180,225,270,315].map((deg, i) => {
          const r2 = deg * Math.PI / 180;
          const x1 = 12 + 5 * Math.sin(r2), y1 = 10 - 5 * Math.cos(r2);
          const x2 = 12 + 8 * Math.sin(r2), y2 = 10 - 8 * Math.cos(r2);
          return <path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} strokeWidth="2" strokeLinecap="round" stroke="currentColor" fill="none" />;
        })}
        <circle cx="12" cy="10" r="3" fill="white" opacity="0.3" />
      </>
    ),
  },

  'burdock': {
    colors: 'text-amber-600 bg-amber-50',
    path: (
      <>
        {/* burdock burr — spiky ball */}
        <circle cx="12" cy="12" r="6" />
        {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
          const r2 = deg * Math.PI / 180;
          const x1 = 12 + 6 * Math.sin(r2), y1 = 12 - 6 * Math.cos(r2);
          const x2 = 12 + 9 * Math.sin(r2), y2 = 12 - 9 * Math.cos(r2);
          return <path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} strokeWidth="1.5" strokeLinecap="round" stroke="currentColor" fill="none" />;
        })}
        <circle cx="12" cy="12" r="3" fill="white" opacity="0.2" />
      </>
    ),
  },

  'elder berr': {
    colors: 'text-purple-700 bg-purple-50',
    path: (
      <>
        {/* elderberry cluster */}
        <path d="M12 20 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 12 L7 8 M12 12 L17 8 M12 12 L9 10 M12 12 L15 10 M12 12 L12 8" strokeWidth="1.2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <circle cx="7"  cy="7"  r="2" />
        <circle cx="17" cy="7"  r="2" />
        <circle cx="8"  cy="9"  r="1.8" />
        <circle cx="16" cy="9"  r="1.8" />
        <circle cx="12" cy="7"  r="2" />
        <circle cx="10" cy="5"  r="1.5" opacity="0.8" />
        <circle cx="14" cy="5"  r="1.5" opacity="0.8" />
      </>
    ),
  },

  'butterfly pea': {
    colors: 'text-blue-600 bg-blue-50',
    path: (
      <>
        {/* butterfly pea flower */}
        <path d="M12 14 Q9 11 8 7 Q11 7 12 14Z" />
        <path d="M12 14 Q15 11 16 7 Q13 7 12 14Z" opacity="0.85" />
        <path d="M12 14 Q7 13 5 10 Q7 9 12 14Z" opacity="0.7" />
        <path d="M12 14 Q17 13 19 10 Q17 9 12 14Z" opacity="0.7" />
        <circle cx="12" cy="14" r="2" />
        <path d="M12 16 Q12 20 10 22" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
      </>
    ),
  },

  'kelp': {
    colors: 'text-green-600 bg-green-50',
    path: (
      <>
        {/* kelp fronds undulating */}
        <path d="M7 22 Q8 16 10 12 Q11 8 9 4" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 22 Q13 15 15 10 Q16 5 14 2" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.85" />
        <path d="M17 22 Q17 16 18 11 Q19 6 17 3" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.65" />
        {/* air bladder dots */}
        <circle cx="10" cy="14" r="1.5" fill="white" opacity="0.4" />
        <circle cx="15" cy="12" r="1.5" fill="white" opacity="0.4" />
      </>
    ),
  },

  'moringa leaf': {
    colors: 'text-green-600 bg-green-50',
    path: (
      <>
        {/* moringa compound leaf — pairs of round leaflets */}
        <path d="M12 22 L12 4" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        {[6,9,12,15,18].map((y, i) => (
          <>
            <ellipse key={`l${i}`} cx={9} cy={y} rx="2.5" ry="1.8" transform={`rotate(-15 9 ${y})`} opacity={0.9 - i * 0.1} />
            <ellipse key={`r${i}`} cx={15} cy={y} rx="2.5" ry="1.8" transform={`rotate(15 15 ${y})`} opacity={0.9 - i * 0.1} />
          </>
        ))}
      </>
    ),
  },

  'mugwort': {
    colors: 'text-stone-600 bg-stone-50',
    path: (
      <>
        {/* mugwort — deeply lobed leaf */}
        <path d="M12 22 L12 6" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 12 Q8 9 6 11 Q7 14 12 12Z" />
        <path d="M12 12 Q16 9 18 11 Q17 14 12 12Z" opacity="0.85" />
        <path d="M12 8 Q8 5 7 7 Q8 10 12 8Z" opacity="0.7" />
        <path d="M12 8 Q16 5 17 7 Q16 10 12 8Z" opacity="0.7" />
        <path d="M12 6 Q11 3 12 2 Q13 3 12 6Z" opacity="0.6" />
      </>
    ),
  },

  // ─── CLAYS (new) ─────────────────────────────────────────────────────────

  'cambrian blue': {
    colors: 'text-blue-700 bg-blue-50',
    path: (
      <>
        {/* blue clay bowl with mineral veins */}
        <ellipse cx="12" cy="10" rx="8" ry="3" />
        <path d="M4 10 Q4 19 12 19 Q20 19 20 10" fill="none" strokeWidth="2" strokeLinecap="round" stroke="currentColor" />
        <path d="M7 13 Q10 11 13 13 Q16 15 19 13" fill="none" strokeWidth="1" stroke="white" opacity="0.35" strokeLinecap="round" />
        <path d="M6 16 Q9 14 12 16 Q15 18 18 16" fill="none" strokeWidth="0.8" stroke="white" opacity="0.25" strokeLinecap="round" />
      </>
    ),
  },

  'sea clay': {
    colors: 'text-teal-500 bg-teal-50',
    path: (
      <>
        {/* sea clay — wave over clay mound */}
        <path d="M3 14 C5 12 7 16 9 14 C11 12 13 16 15 14 C17 12 19 16 21 14" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
        <path d="M5 17 Q5 20 12 20 Q19 20 19 17" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" opacity="0.7" />
        <ellipse cx="12" cy="17" rx="7" ry="2" opacity="0.5" />
        <path d="M8 17 Q12 15 16 17" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" />
      </>
    ),
  },

  'zeolite': {
    colors: 'text-slate-400 bg-slate-50',
    path: (
      <>
        {/* zeolite — crystalline lattice / cage structure */}
        <path d="M4 8 L12 4 L20 8 L20 16 L12 20 L4 16 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M4 8 L4 16 M20 8 L20 16 M12 4 L12 20" stroke="currentColor" strokeWidth="1" opacity="0.6" fill="none" />
        <path d="M4 8 L12 12 L20 8 M4 16 L12 12 L20 16" stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="4"  cy="8"  r="1.5" />
        <circle cx="20" cy="8"  r="1.5" />
        <circle cx="4"  cy="16" r="1.5" />
        <circle cx="20" cy="16" r="1.5" />
      </>
    ),
  },

  'montmorillonite': {
    colors: 'text-stone-500 bg-stone-50',
    path: (
      <>
        {/* swelling clay — layered sheets */}
        <rect x="3"  y="7"  width="18" height="3"   rx="1.5" />
        <rect x="4"  y="12" width="16" height="3"   rx="1.5" opacity="0.8" />
        <rect x="5"  y="17" width="14" height="2.5" rx="1.25" opacity="0.6" />
        <path d="M12 7 L12 4 M8 7 L7 4 M16 7 L17 4" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
      </>
    ),
  },

  // ─── COLORANTS (new) ─────────────────────────────────────────────────────

  'beet root': {
    colors: 'text-red-600 bg-red-50',
    path: (
      <>
        {/* beet with leafy top */}
        <path d="M7 14 Q6 9 8 7 Q10 5 12 5 Q14 5 16 7 Q18 9 17 14 Q16 19 12 20 Q8 19 7 14Z" />
        <path d="M12 5 L12 3 Q11 1 10 0" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M12 5 L14 2 Q15 1 17 1" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.7" />
        <path d="M12 5 L10 2 Q9 1 7 1" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.7" />
        <path d="M9 11 Q12 9 15 11" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" />
        <path d="M12 20 L12 23" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.5" />
      </>
    ),
  },

  'blue tansy': {
    colors: 'text-blue-500 bg-blue-50',
    path: (
      <>
        {/* tansy — multi-petaled button flower */}
        {[0,36,72,108,144,180,216,252,288,324].map((deg, i) => {
          const r2 = deg * Math.PI / 180;
          const cx = 12 + 6 * Math.sin(r2), cy = 12 - 6 * Math.cos(r2);
          return <ellipse key={i} cx={cx} cy={cy} rx="1.8" ry="3" transform={`rotate(${deg} ${cx} ${cy})`} opacity="0.85" />;
        })}
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="12" cy="12" r="2" fill="white" opacity="0.3" />
        <path d="M12 20 L12 22" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
      </>
    ),
  },

  'chlorella': {
    colors: 'text-green-500 bg-green-50',
    path: (
      <>
        {/* chlorella — single-cell algae cluster */}
        <circle cx="12" cy="12" r="5" />
        <circle cx="6"  cy="9"  r="3.5" opacity="0.8" />
        <circle cx="18" cy="9"  r="3.5" opacity="0.8" />
        <circle cx="9"  cy="17" r="3.5" opacity="0.7" />
        <circle cx="15" cy="17" r="3.5" opacity="0.7" />
        {/* chlorophyll inner */}
        <circle cx="12" cy="12" r="2" fill="white" opacity="0.25" />
        <circle cx="6"  cy="9"  r="1.2" fill="white" opacity="0.2" />
        <circle cx="18" cy="9"  r="1.2" fill="white" opacity="0.2" />
      </>
    ),
  },

  'saffron': {
    colors: 'text-yellow-500 bg-yellow-50',
    path: (
      <>
        {/* saffron stigmas — three red threads */}
        <path d="M9 22 Q9 14 11 8 Q12 4 11 2" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 22 Q12 13 12 7 Q12 3 12 1" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.9" />
        <path d="M15 22 Q15 14 13 8 Q12 4 13 2" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        {/* flower petals */}
        <ellipse cx="8"  cy="14" rx="3" ry="5" transform="rotate(-20 8 14)" opacity="0.4" />
        <ellipse cx="16" cy="14" rx="3" ry="5" transform="rotate(20 16 14)" opacity="0.4" />
      </>
    ),
  },

  'titanium dioxide': {
    colors: 'text-white bg-slate-100',
    path: (
      <>
        {/* bright white powder — geometric crystal lattice */}
        <path d="M12 3 L19 7.5 L19 16.5 L12 21 L5 16.5 L5 7.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 7.5 L12 12 L19 7.5 M12 12 L12 21" stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none" />
        <circle cx="12" cy="12" r="3.5" fill="white" opacity="0.8" />
        <circle cx="12" cy="12" r="2"   fill="currentColor" opacity="0.15" />
        <path d="M5 16.5 L12 12 L19 16.5" stroke="currentColor" strokeWidth="1" opacity="0.4" fill="none" />
      </>
    ),
  },

  'spinach': {
    colors: 'text-green-600 bg-green-50',
    path: (
      <>
        {/* spinach leaf — rounded with wavy edge */}
        <path d="M12 21 L12 5" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M4 14 Q5 8 12 5 Q19 8 20 14 Q19 19 12 21 Q5 19 4 14Z" />
        <path d="M7 11 L17 11 M6 14 L18 14 M7 17 L17 17" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" />
      </>
    ),
  },

  'woad': {
    colors: 'text-indigo-600 bg-indigo-50',
    path: (
      <>
        {/* woad leaf — elongated with blue dye vat */}
        <path d="M12 10 Q8 12 6 16 Q8 20 12 21 Q16 20 18 16 Q16 12 12 10Z" opacity="0.5" />
        <rect x="5" y="12" width="14" height="9" rx="2" />
        <path d="M5 12 Q12 9 19 12" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M8 15 Q12 13 16 15 M8 18 Q12 16 16 18" stroke="white" strokeWidth="0.8" fill="none" opacity="0.35" strokeLinecap="round" />
      </>
    ),
  },

  'black walnut': {
    colors: 'text-stone-800 bg-stone-100',
    path: (
      <>
        {/* black walnut hull — deeply textured dark */}
        <circle cx="12" cy="13" r="8" />
        <circle cx="12" cy="13" r="6" fill="none" stroke="white" strokeWidth="0.8" opacity="0.2" />
        <circle cx="12" cy="13" r="3.5" fill="none" stroke="white" strokeWidth="0.8" opacity="0.15" />
        <path d="M4 13 Q8 10 12 13 Q16 16 20 13" fill="none" strokeWidth="1.2" stroke="white" opacity="0.2" strokeLinecap="round" />
        <path d="M12 5 L11 3 Q12 2 13 3 L12 5" fill="currentColor" opacity="0.7" />
      </>
    ),
  },

  // ─── EXFOLIANTS (new) ────────────────────────────────────────────────────

  'jojoba bead': {
    colors: 'text-amber-400 bg-amber-50',
    path: (
      <>
        {/* perfect round beads — uniform spheres */}
        <circle cx="7"  cy="8"  r="3" />
        <circle cx="14" cy="7"  r="3" />
        <circle cx="18" cy="12" r="3" />
        <circle cx="6"  cy="15" r="3" />
        <circle cx="13" cy="15" r="3" />
        <circle cx="10" cy="11" r="3" />
        <circle cx="7"  cy="8"  r="1" fill="white" opacity="0.4" />
        <circle cx="14" cy="7"  r="1" fill="white" opacity="0.4" />
        <circle cx="10" cy="11" r="1" fill="white" opacity="0.4" />
      </>
    ),
  },

  'konjac': {
    colors: 'text-stone-400 bg-stone-50',
    path: (
      <>
        {/* konjac tuber — lumpy oval root */}
        <path d="M6 14 Q5 10 7 8 Q9 5 12 5 Q16 5 18 8 Q20 11 18 15 Q16 19 12 20 Q8 19 6 14Z" />
        <path d="M8 8 Q10 6 13 7" fill="none" strokeWidth="1.5" stroke="white" opacity="0.3" strokeLinecap="round" />
        <path d="M9 12 Q12 10 15 12" fill="none" strokeWidth="1" stroke="white" opacity="0.25" strokeLinecap="round" />
        <path d="M12 5 L12 3 Q13 2 14 3" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M7 8 L5 6 M17 8 L19 6" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
      </>
    ),
  },

  'volcanic ash': {
    colors: 'text-stone-600 bg-stone-100',
    path: (
      <>
        {/* volcano eruption — smoke and ash particles */}
        <path d="M5 20 L9 12 L12 14 L15 12 L19 20Z" />
        <path d="M9 12 L12 6 L15 12" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
        {/* ash particles */}
        <circle cx="8"  cy="7"  r="1.2" opacity="0.7" />
        <circle cx="14" cy="5"  r="1"   opacity="0.6" />
        <circle cx="17" cy="8"  r="1.5" opacity="0.65" />
        <circle cx="6"  cy="10" r="0.8" opacity="0.5" />
        <circle cx="18" cy="6"  r="0.8" opacity="0.5" />
        <ellipse cx="12" cy="17" rx="4" ry="1.5" fill="white" opacity="0.2" />
      </>
    ),
  },

  'rice flour': {
    colors: 'text-amber-200 bg-amber-50',
    path: (
      <>
        {/* rice grains scattered */}
        <ellipse cx="8"  cy="9"  rx="2.5" ry="4" transform="rotate(-15 8 9)" />
        <ellipse cx="15" cy="8"  rx="2.5" ry="4" transform="rotate(20 15 8)" />
        <ellipse cx="12" cy="14" rx="2.5" ry="4" transform="rotate(-5 12 14)" />
        <ellipse cx="6"  cy="16" rx="2.5" ry="4" transform="rotate(10 6 16)" />
        <ellipse cx="18" cy="15" rx="2"   ry="3.5" transform="rotate(-20 18 15)" />
        <ellipse cx="8"  cy="9"  rx="1" ry="1.5" fill="white" opacity="0.3" transform="rotate(-15 8 9)" />
        <ellipse cx="15" cy="8"  rx="1" ry="1.5" fill="white" opacity="0.3" transform="rotate(20 15 8)" />
      </>
    ),
  },

  'apricot shell': {
    colors: 'text-orange-400 bg-orange-50',
    path: (
      <>
        {/* apricot powder — apricot fruit with shell texture */}
        <path d="M5 13 Q5 7 12 6 Q19 7 19 13 Q19 20 12 21 Q5 20 5 13Z" />
        <path d="M12 6 L12 21" strokeWidth="1" stroke="white" opacity="0.3" fill="none" />
        <path d="M12 3 Q14 1 12 0" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M7 12 Q12 10 17 12" fill="none" strokeWidth="0.8" stroke="white" opacity="0.25" strokeLinecap="round" />
        <path d="M8 15 Q12 13 16 15" fill="none" strokeWidth="0.8" stroke="white" opacity="0.2" strokeLinecap="round" />
      </>
    ),
  },

  // ─── ADDITIVES (new) ─────────────────────────────────────────────────────

  'allantoin': {
    colors: 'text-teal-400 bg-teal-50',
    path: (
      <>
        {/* allantoin crystal — comfrey-derived */}
        <path d="M8 5 L16 5 L20 11 L16 17 L8 17 L4 11Z" />
        <path d="M8 5 L4 11 L8 17" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" />
        <path d="M10 8 L14 8 L16.5 12 L14 16 L10 16 L7.5 12Z" fill="white" opacity="0.15" />
        <circle cx="12" cy="11" r="2" fill="white" opacity="0.3" />
      </>
    ),
  },

  'hyaluronic acid': {
    colors: 'text-blue-400 bg-blue-50',
    path: (
      <>
        {/* hyaluronic acid — water droplet with wave/hydration */}
        <path d="M12 2 C12 2 4 10 4 15 A8 8 0 0 0 20 15 C20 10 12 2 12 2Z" />
        {/* water waves inside */}
        <path d="M7 14 Q9 12 11 14 Q13 16 15 14 Q17 12 18 14" fill="none" strokeWidth="1.5" stroke="white" opacity="0.5" strokeLinecap="round" />
        <path d="M8 17 Q10 15 12 17 Q14 19 16 17" fill="none" strokeWidth="1.2" stroke="white" opacity="0.35" strokeLinecap="round" />
      </>
    ),
  },

  'niacinamide': {
    colors: 'text-amber-500 bg-amber-50',
    path: (
      <>
        {/* niacinamide — pyridine ring (hexagon with N) */}
        <path d="M12 4 L18 8 L18 16 L12 20 L6 16 L6 8Z" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="8"  r="1.5" />
        <circle cx="17" cy="11" r="1.5" />
        <circle cx="17" cy="14" r="1.5" />
        <circle cx="12" cy="17" r="1.5" />
        <circle cx="7"  cy="14" r="1.5" />
        <circle cx="7"  cy="11" r="1.5" />
        {/* N marker */}
        <path d="M10 11 L10 14 L12 11 L12 14" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },

  'retinol': {
    colors: 'text-orange-500 bg-orange-50',
    path: (
      <>
        {/* retinol — vitamin A molecular symbol */}
        <path d="M4 18 L8 10 L12 14 L16 6 L20 10" fill="none" strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        {/* vitamin A letter */}
        <circle cx="12" cy="18" r="4" opacity="0.8" />
        <path d="M10 20 L12 16 L14 20 M10.5 18.5 L13.5 18.5" fill="none" strokeWidth="1.5" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },

  'bakuchiol': {
    colors: 'text-green-500 bg-green-50',
    path: (
      <>
        {/* bakuchiol — babchi leaf with molecule */}
        <path d="M12 20 C12 20 5 15 5 9 C5 5 8 3 12 4 C16 3 19 5 19 9 C19 15 12 20 12 20Z" opacity="0.5" />
        <path d="M6 9 C8 7 12 8 12 12 C12 8 16 7 18 9" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="1.5" fill="white" opacity="0.4" />
        <path d="M12 15 L12 20" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.5" />
      </>
    ),
  },

  'caffeine': {
    colors: 'text-amber-800 bg-amber-50',
    path: (
      <>
        {/* caffeine — coffee cup with steam */}
        <path d="M5 10 L7 20 Q7 22 12 22 Q17 22 17 20 L19 10Z" />
        <path d="M5 10 L19 10" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M19 12 Q22 12 22 14 Q22 16 19 16" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
        {/* steam */}
        <path d="M9 7 Q8 5 9 3" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
        <path d="M12 6 Q11 4 12 2" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.7" />
        <path d="M15 7 Q14 5 15 3" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
      </>
    ),
  },

  'salicylic acid': {
    colors: 'text-lime-600 bg-lime-50',
    path: (
      <>
        {/* salicylic acid — willow bark / BHA */}
        <path d="M12 22 L12 10" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 14 Q8 11 6 8 Q9 7 12 14Z" />
        <path d="M12 14 Q16 11 18 8 Q15 7 12 14Z" opacity="0.85" />
        <path d="M12 10 Q8 7 7 4 Q10 3 12 10Z" opacity="0.7" />
        <path d="M12 10 Q16 7 17 4 Q14 3 12 10Z" opacity="0.7" />
        {/* acid drops */}
        <circle cx="6" cy="18" r="1.5" opacity="0.8" />
        <circle cx="9" cy="19" r="1" opacity="0.7" />
        <circle cx="3" cy="16" r="1" opacity="0.6" />
      </>
    ),
  },

  'kojic acid': {
    colors: 'text-yellow-400 bg-yellow-50',
    path: (
      <>
        {/* kojic acid — brightening/mushroom derived */}
        <path d="M6 13 Q6 8 8 6 Q10 4 12 4 Q14 4 16 6 Q18 8 18 13 Q18 18 12 19 Q6 18 6 13Z" opacity="0.6" />
        <path d="M5 16 Q12 12 19 16" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <path d="M4 19 Q12 15 20 19" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.7" />
        {/* bright sparkle */}
        <path d="M12 4 L12 1 M12 4 L14 2 M12 4 L10 2" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.7" />
      </>
    ),
  },

  'lactic acid': {
    colors: 'text-yellow-300 bg-yellow-50',
    path: (
      <>
        {/* lactic acid — milk drop with bubbles */}
        <path d="M12 3 C12 3 5 11 5 16 A7 7 0 0 0 19 16 C19 11 12 3 12 3Z" />
        <circle cx="9"  cy="15" r="1.8" fill="white" opacity="0.45" />
        <circle cx="13" cy="14" r="1.2" fill="white" opacity="0.35" />
        <circle cx="11" cy="18" r="1.2" fill="white" opacity="0.35" />
        <path d="M15 8 Q17 7 18 9" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
      </>
    ),
  },

  'ferulic acid': {
    colors: 'text-amber-400 bg-amber-50',
    path: (
      <>
        {/* ferulic acid — rice/wheat antioxidant grain */}
        <ellipse cx="12" cy="12" rx="6" ry="8" />
        <path d="M12 4 L12 3 M12 20 L12 21 M6 12 L4 12 M18 12 L20 12" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
        <path d="M9 7 Q12 5 15 7" fill="none" strokeWidth="1.2" stroke="white" opacity="0.35" strokeLinecap="round" />
        <path d="M8 11 Q12 9 16 11 M8 14 Q12 12 16 14" fill="none" strokeWidth="0.8" stroke="white" opacity="0.25" strokeLinecap="round" />
      </>
    ),
  },

  'azelaic acid': {
    colors: 'text-rose-400 bg-rose-50',
    path: (
      <>
        {/* azelaic acid — wheat germ / molecular chain */}
        <path d="M4 14 L7 8 L10 14 L13 8 L16 14 L19 8" fill="none" strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="4"  cy="14" r="2" />
        <circle cx="10" cy="14" r="2" />
        <circle cx="16" cy="14" r="2" />
        <circle cx="7"  cy="8"  r="1.5" opacity="0.7" />
        <circle cx="13" cy="8"  r="1.5" opacity="0.7" />
        <circle cx="19" cy="8"  r="1.5" opacity="0.7" />
      </>
    ),
  },

  'resveratrol': {
    colors: 'text-purple-600 bg-purple-50',
    path: (
      <>
        {/* resveratrol — grape-derived antioxidant */}
        <circle cx="9"  cy="9"  r="2.5" />
        <circle cx="15" cy="9"  r="2.5" />
        <circle cx="12" cy="7"  r="2.5" />
        <circle cx="9"  cy="14" r="2.5" />
        <circle cx="15" cy="14" r="2.5" />
        <circle cx="12" cy="12" r="2.5" />
        <circle cx="12" cy="18" r="2"   opacity="0.8" />
        <path d="M12 5 L12 7" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 5 C12 5 15 3 17 4" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        {/* molecular double-bond symbol */}
        <path d="M5 5 L7 3 L9 5" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
      </>
    ),
  },

  'ceramide': {
    colors: 'text-teal-500 bg-teal-50',
    path: (
      <>
        {/* ceramide — lipid bilayer membrane */}
        <rect x="3"  y="9"  width="18" height="2.5" rx="1.25" />
        <rect x="3"  y="13" width="18" height="2.5" rx="1.25" />
        {/* lipid tails */}
        <path d="M6 9 L6 5 M10 9 L10 5 M14 9 L14 5 M18 9 L18 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M6 15 L6 19 M10 15 L10 19 M14 15 L14 19 M18 15 L18 19" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6" />
      </>
    ),
  },

  'peptide': {
    colors: 'text-violet-500 bg-violet-50',
    path: (
      <>
        {/* peptide — amino acid chain */}
        <circle cx="4"  cy="12" r="2.5" />
        <circle cx="10" cy="8"  r="2.5" />
        <circle cx="16" cy="8"  r="2.5" />
        <circle cx="20" cy="12" r="2.5" />
        <circle cx="16" cy="16" r="2"   opacity="0.8" />
        <circle cx="10" cy="16" r="2"   opacity="0.8" />
        <path d="M6 12 L8 8 M12 8 L14 8 M18 8 L18 12 M18 12 L16 16 M14 16 L12 16 M10 16 L8 12" fill="none" strokeWidth="1.8" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'tranexamic': {
    colors: 'text-rose-500 bg-rose-50',
    path: (
      <>
        {/* tranexamic acid — brightening hexagon structure */}
        <path d="M12 3 L19 7.5 L19 16.5 L12 21 L5 16.5 L5 7.5Z" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 8.5 L12 15.5 M8.5 12 L15.5 12" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
      </>
    ),
  },

  'glutathione': {
    colors: 'text-yellow-400 bg-yellow-50',
    path: (
      <>
        {/* glutathione — tripeptide antioxidant */}
        <circle cx="5"  cy="14" r="2.5" />
        <circle cx="12" cy="8"  r="2.5" />
        <circle cx="19" cy="14" r="2.5" />
        <path d="M7 14 L10 8 M14 8 L17 14" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
        <path d="M7 14 L17 14" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.7" />
        {/* S bridge */}
        <circle cx="12" cy="17" r="2" />
        <path d="M10 14 L11 17 M14 14 L13 17" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
      </>
    ),
  },

  'tremella': {
    colors: 'text-amber-300 bg-amber-50',
    path: (
      <>
        {/* tremella mushroom — snow fungus frilly shape */}
        <path d="M12 20 Q8 18 6 14 Q5 10 8 8 Q10 6 12 8 Q14 6 16 8 Q19 10 18 14 Q16 18 12 20Z" opacity="0.7" />
        <path d="M7 13 Q9 10 12 11 Q15 10 17 13" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
        <path d="M8 16 Q10 13 12 14 Q14 13 16 16" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" opacity="0.8" />
        <path d="M10 9 Q12 6 14 9" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.7" />
        <path d="M12 5 L12 3" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
      </>
    ),
  },

  // ─── MILKS (new) ─────────────────────────────────────────────────────────

  'camel milk': {
    colors: 'text-amber-400 bg-amber-50',
    path: (
      <>
        {/* camel hump silhouette — simplified */}
        <path d="M3 17 Q3 13 6 12 Q8 11 9 12 Q9 9 11 8 Q13 9 13 12 Q14 11 16 12 Q19 13 19 17 Z" />
        <path d="M6 17 L6 22 M9 17 L9 22 M13 17 L13 22 M17 17 L17 22" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
        <path d="M4 12 Q5 9 5 7" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
      </>
    ),
  },

  'donkey milk': {
    colors: 'text-slate-400 bg-slate-50',
    path: (
      <>
        {/* donkey head — simplified */}
        <path d="M7 14 Q5 11 5 8 Q5 4 9 4 Q11 3 13 4 Q17 4 17 8 Q17 11 15 14 Q13 16 10 16 Q8 16 7 14Z" />
        {/* ears */}
        <path d="M9 4 L8 1 Q10 0 10 3" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
        <path d="M13 4 L14 1 Q12 0 12 3" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" />
        <circle cx="9"  cy="9" r="1" fill="white" opacity="0.7" />
        <circle cx="13" cy="9" r="1" fill="white" opacity="0.7" />
        <path d="M9 16 Q10 20 10 22" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
      </>
    ),
  },

  'kefir': {
    colors: 'text-yellow-200 bg-yellow-50',
    path: (
      <>
        {/* kefir — fermented milk jar with bubbles */}
        <path d="M8 7 L8 18 Q8 21 12 21 Q16 21 16 18 L16 7Z" />
        <path d="M8 7 Q12 5 16 7" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <rect x="7" y="4" width="10" height="4" rx="2" />
        {/* bubbles — probiotic */}
        <circle cx="10" cy="12" r="1.5" fill="white" opacity="0.5" />
        <circle cx="14" cy="11" r="1"   fill="white" opacity="0.45" />
        <circle cx="12" cy="15" r="1.5" fill="white" opacity="0.4" />
        <circle cx="10" cy="17" r="1"   fill="white" opacity="0.4" />
      </>
    ),
  },

  'sheep milk': {
    colors: 'text-slate-300 bg-slate-50',
    path: (
      <>
        {/* fluffy sheep head */}
        <circle cx="12" cy="10" r="6" />
        <circle cx="8"  cy="8"  r="3" />
        <circle cx="16" cy="8"  r="3" />
        <circle cx="10" cy="6"  r="2.5" />
        <circle cx="14" cy="6"  r="2.5" />
        {/* face */}
        <ellipse cx="12" cy="12" rx="3.5" ry="3" />
        <circle cx="10.5" cy="11.5" r="0.8" fill="white" opacity="0.7" />
        <circle cx="13.5" cy="11.5" r="0.8" fill="white" opacity="0.7" />
        <path d="M10 16 Q12 18 14 16" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.4" />
      </>
    ),
  },

  'soy milk': {
    colors: 'text-yellow-400 bg-yellow-50',
    path: (
      <>
        {/* soybean on plant */}
        <path d="M12 22 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <ellipse cx="8"  cy="10" rx="3.5" ry="4.5" transform="rotate(-15 8 10)" />
        <ellipse cx="16" cy="10" rx="3.5" ry="4.5" transform="rotate(15 16 10)" />
        <ellipse cx="12" cy="8"  rx="3"   ry="4" />
        <path d="M8 5 Q12 3 16 5" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
      </>
    ),
  },

  'rice milk': {
    colors: 'text-amber-200 bg-amber-50',
    path: (
      <>
        {/* rice in bowl of milk */}
        <path d="M5 10 Q5 19 12 19 Q19 19 19 10 Z" />
        <ellipse cx="12" cy="10" rx="7" ry="2.5" />
        <ellipse cx="9"  cy="12" rx="1.5" ry="2.5" transform="rotate(-10 9 12)" fill="white" opacity="0.5" />
        <ellipse cx="13" cy="11" rx="1.5" ry="2.5" transform="rotate(15 13 11)" fill="white" opacity="0.5" />
        <ellipse cx="15" cy="14" rx="1.5" ry="2.5" transform="rotate(-5 15 14)" fill="white" opacity="0.4" />
        <ellipse cx="10" cy="15" rx="1.5" ry="2.5" transform="rotate(10 10 15)" fill="white" opacity="0.4" />
      </>
    ),
  },

  // ─── WAXES (new) ─────────────────────────────────────────────────────────

  'lanolin': {
    colors: 'text-amber-500 bg-amber-50',
    path: (
      <>
        {/* lanolin — wool fleece icon */}
        <circle cx="8"  cy="12" r="4" />
        <circle cx="14" cy="12" r="4" />
        <circle cx="11" cy="8"  r="3.5" />
        <circle cx="17" cy="8"  r="3" opacity="0.85" />
        <circle cx="5"  cy="8"  r="3" opacity="0.85" />
        {/* legs */}
        <path d="M7 15 L7 20 M9 16 L9 21 M13 16 L13 21 M15 15 L15 20" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
      </>
    ),
  },

  'paraffin': {
    colors: 'text-slate-300 bg-slate-50',
    path: (
      <>
        {/* paraffin candle with flame */}
        <rect x="8" y="10" width="8" height="12" rx="1.5" />
        <path d="M12 10 L12 8" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 8 C12 8 10 6 10 4.5 C10 3 11 2 12 3 C13 2 14 3 14 4.5 C14 6 12 8 12 8Z" />
        <path d="M11 5 C11 5 11.5 4 12 4" fill="none" strokeWidth="1" stroke="white" opacity="0.5" strokeLinecap="round" />
        <path d="M8 14 Q12 12 16 14" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" />
      </>
    ),
  },

  'soy wax': {
    colors: 'text-yellow-400 bg-yellow-50',
    path: (
      <>
        {/* soy wax — soybean + wax block */}
        <ellipse cx="8"  cy="8"  rx="3" ry="4" transform="rotate(-15 8 8)" />
        <ellipse cx="15" cy="7"  rx="3" ry="4" transform="rotate(15 15 7)" />
        <path d="M6 6 Q8 3 11 4 Q14 3 17 5" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
        <rect x="4" y="14" width="16" height="8" rx="2" />
        <path d="M4 18 Q12 16 20 18" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" />
      </>
    ),
  },

  'stearic acid': {
    colors: 'text-stone-400 bg-stone-50',
    path: (
      <>
        {/* stearic acid — long fatty chain + carboxyl */}
        <path d="M4 12 L7 9 L10 12 L13 9 L16 12 L19 9" fill="none" strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="4"  cy="12" r="2" />
        <circle cx="10" cy="12" r="2" />
        <circle cx="16" cy="12" r="2" />
        <circle cx="7"  cy="9"  r="1.5" opacity="0.7" />
        <circle cx="13" cy="9"  r="1.5" opacity="0.7" />
        <path d="M4 12 L4 17 M3 16 L5 16" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'emulsifying wax': {
    colors: 'text-emerald-400 bg-emerald-50',
    path: (
      <>
        {/* emulsifying wax — oil droplets in water */}
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="8"  cy="10" r="3" />
        <circle cx="14" cy="8"  r="2.5" />
        <circle cx="15" cy="14" r="2.5" opacity="0.85" />
        <circle cx="8"  cy="15" r="2"   opacity="0.8" />
        <circle cx="12" cy="12" r="1.5" opacity="0.7" />
        {/* water waves */}
        <path d="M4 18 C5 17 7 19 9 18 C11 17 13 19 15 18 C17 17 19 19 20 18" fill="none" strokeWidth="1" stroke="currentColor" strokeLinecap="round" opacity="0.4" />
      </>
    ),
  },

  'cetyl alcohol': {
    colors: 'text-sky-400 bg-sky-50',
    path: (
      <>
        {/* cetyl alcohol — smooth fatty alcohol crystal */}
        <path d="M5 8 L9 4 L19 4 L19 16 L15 20 L5 20Z" />
        <path d="M5 8 L5 20 M9 4 L9 16 L5 20" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" />
        <ellipse cx="13" cy="12" rx="4" ry="3" fill="white" opacity="0.15" />
        <path d="M9 7 L17 7 M9 11 L17 11 M9 15 L17 15" stroke="white" strokeWidth="0.7" fill="none" opacity="0.25" strokeLinecap="round" />
      </>
    ),
  },

  'japan wax': {
    colors: 'text-amber-500 bg-amber-50',
    path: (
      <>
        {/* japan wax — sumac berry cluster */}
        <path d="M12 22 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 12 L8 9 M12 12 L16 9 M12 12 L9 11 M12 12 L15 11 M12 12 L12 9" strokeWidth="1.2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <ellipse cx="7"  cy="8"  rx="2.5" ry="2" />
        <ellipse cx="16" cy="8"  rx="2.5" ry="2" />
        <ellipse cx="9"  cy="10" rx="2"   ry="1.5" />
        <ellipse cx="15" cy="10" rx="2"   ry="1.5" />
        <ellipse cx="12" cy="8"  rx="2.5" ry="2" />
      </>
    ),
  },

  // ─── PRESERVATIVES / OTHER (new) ─────────────────────────────────────────

  'germaben': {
    colors: 'text-slate-500 bg-slate-50',
    path: (
      <>
        {/* germaben — shield with bacteria-X */}
        <path d="M12 2 L20 6 L20 13 Q20 18 12 22 Q4 18 4 13 L4 6Z" />
        {/* X pattern — kills bacteria */}
        <path d="M9 9 L15 15 M15 9 L9 15" fill="none" strokeWidth="2.5" stroke="white" strokeLinecap="round" />
      </>
    ),
  },

  'phenoxyethanol': {
    colors: 'text-indigo-500 bg-indigo-50',
    path: (
      <>
        {/* phenoxyethanol — benzene ring preservative */}
        <path d="M12 3 L18 7 L18 15 L12 19 L6 15 L6 7Z" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="11" r="2.5" />
        <path d="M12 7 L12 8.5 M12 13.5 L12 15 M6.5 10 L8 10.75 M16 11.25 L17.5 12 M7.5 14 L8.5 12.5" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        {/* OH group */}
        <circle cx="19" cy="19" r="2.5" />
        <path d="M17.3 17.3 Q18 17 19 19" fill="none" strokeWidth="1" stroke="currentColor" strokeLinecap="round" />
      </>
    ),
  },

  'potassium sorbate': {
    colors: 'text-green-500 bg-green-50',
    path: (
      <>
        {/* potassium sorbate — natural crystal preservative */}
        <path d="M7 6 L17 6 L20 12 L17 18 L7 18 L4 12Z" />
        <path d="M7 6 L4 12 L7 18" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" />
        <path d="M9 9 L15 9 M8 12 L16 12 M9 15 L15 15" stroke="white" strokeWidth="1" fill="none" opacity="0.3" strokeLinecap="round" />
        {/* K symbol */}
        <path d="M11 9 L11 15 M11 12 L14 9 M11 12 L14 15" fill="none" strokeWidth="1.5" stroke="white" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      </>
    ),
  },

  'sodium benzoate': {
    colors: 'text-teal-600 bg-teal-50',
    path: (
      <>
        {/* sodium benzoate — hexagon with Na */}
        <path d="M12 4 L18 8 L18 16 L12 20 L6 16 L6 8Z" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="8"  r="1.2" />
        <circle cx="17" cy="11" r="1.2" />
        <circle cx="17" cy="14" r="1.2" />
        <circle cx="12" cy="17" r="1.2" />
        <circle cx="7"  cy="14" r="1.2" />
        <circle cx="7"  cy="11" r="1.2" />
        {/* Na text */}
        <path d="M9.5 11 L9.5 14 L11.5 11 L11.5 14" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      </>
    ),
  },

  // ─── FRAGRANCE OILS (new) ─────────────────────────────────────────────────

  'amber': {
    colors: 'text-amber-600 bg-amber-50',
    path: (
      <>
        {/* amber resin — organic teardrop with inclusions */}
        <path d="M12 3 Q8 5 6 10 Q5 15 8 18 Q10 21 12 21 Q14 21 16 18 Q19 15 18 10 Q16 5 12 3Z" />
        <ellipse cx="10" cy="13" rx="2.5" ry="3" fill="white" opacity="0.2" />
        <circle  cx="15" cy="10" r="1.5" fill="white" opacity="0.15" />
        {/* insect inclusion */}
        <path d="M14 15 Q15 14 15 15" fill="none" strokeWidth="1" stroke="white" opacity="0.35" strokeLinecap="round" />
        <path d="M13 14 L15 13 M13 16 L15 17" fill="none" strokeWidth="0.8" stroke="white" opacity="0.3" strokeLinecap="round" />
      </>
    ),
  },

  "dragon's blood": {
    colors: 'text-red-700 bg-red-50',
    path: (
      <>
        {/* dragon's blood — dragon claw scratch on resin */}
        <path d="M7 5 Q5 9 5 14 Q5 20 12 21 Q19 20 19 14 Q19 9 17 5 Q15 3 12 3 Q9 3 7 5Z" />
        <path d="M9 9 L15 15 M9 13 L13 9" fill="none" strokeWidth="2" stroke="white" opacity="0.4" strokeLinecap="round" />
        <path d="M8 5 L6 2 M12 4 L12 1 M16 5 L18 2" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.6" />
      </>
    ),
  },

  'egyptian musk': {
    colors: 'text-amber-700 bg-amber-50',
    path: (
      <>
        {/* egyptian musk — ankh / perfume bottle */}
        <path d="M9 10 L9 20 Q9 22 12 22 Q15 22 15 20 L15 10Z" />
        <rect x="8" y="7" width="8" height="4" rx="2" />
        <path d="M12 6 L12 4" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        {/* Egyptian cross top */}
        <circle cx="12" cy="3" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 8 L15 8" strokeWidth="1" stroke="white" fill="none" opacity="0.4" />
        <ellipse cx="12" cy="16" rx="2.5" ry="2" fill="white" opacity="0.2" />
      </>
    ),
  },

  'white musk': {
    colors: 'text-slate-300 bg-slate-50',
    path: (
      <>
        {/* white musk — clean scent wave radiating */}
        <circle cx="12" cy="12" r="3" />
        {[0,45,90,135,180,225,270,315].map((deg, i) => {
          const r2 = deg * Math.PI / 180;
          const x1 = 12 + 4.5 * Math.sin(r2), y1 = 12 - 4.5 * Math.cos(r2);
          const x2 = 12 + 8 * Math.sin(r2), y2 = 12 - 8 * Math.cos(r2);
          return <path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" fill="none" opacity={0.3 + (i % 2) * 0.2} />;
        })}
      </>
    ),
  },

  // ─── BUTTERS (new) ───────────────────────────────────────────────────────

  'mowrah': {
    colors: 'text-yellow-700 bg-yellow-50',
    path: (
      <>
        {/* mowrah flower — five petals around a center */}
        <circle cx="12" cy="12" r="2.5" />
        {[0,72,144,216,288].map((deg) => {
          const r = deg * Math.PI / 180;
          const cx = 12 + 5.5 * Math.sin(r);
          const cy = 12 - 5.5 * Math.cos(r);
          return <ellipse key={deg} cx={cx} cy={cy} rx="2.5" ry="3.8"
                   transform={`rotate(${deg} ${cx} ${cy})`} opacity="0.85" />;
        })}
        <path d="M12 19 L12 22" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />
      </>
    ),
  },

  // ─── ESSENTIAL OILS (new) ────────────────────────────────────────────────

  'elemi': {
    colors: 'text-lime-600 bg-lime-50',
    path: (
      <>
        {/* elemi resin drop with drip lines */}
        <path d="M12 3 Q9 7 8 12 Q7 17 10 19 Q12 21 14 19 Q17 17 16 12 Q15 7 12 3Z" />
        <path d="M10 14 Q12 16 14 14" fill="none" strokeWidth="1.2" stroke="white" opacity="0.4" strokeLinecap="round" />
        <path d="M10 10 Q12 12 14 10" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" />
        {/* drips */}
        <path d="M9 8 Q7 6 6 4" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
        <path d="M15 8 Q17 6 18 4" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" opacity="0.5" />
      </>
    ),
  },

  // ─── FRAGRANCE OILS (new) ────────────────────────────────────────────────

  'pink sugar': {
    colors: 'text-pink-400 bg-pink-50',
    path: (
      <>
        {/* pink sugar — crystalline cube with sparkle */}
        <rect x="6" y="9" width="10" height="10" rx="1.5" />
        <path d="M6 9 L10 5 L20 5 L20 15 L16 19" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
        <path d="M10 5 L10 9 M20 5 L16 9" fill="none" strokeWidth="1" stroke="currentColor" opacity="0.5" strokeLinecap="round" />
        {/* sparkle */}
        <path d="M4 4 L4 7 M2.5 5.5 L5.5 5.5" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.7" />
        <circle cx="4" cy="5.5" r="0.8" opacity="0.5" />
      </>
    ),
  },

  // ─── BOTANICALS (new) ────────────────────────────────────────────────────

  'irish moss': {
    colors: 'text-emerald-600 bg-emerald-50',
    path: (
      <>
        {/* irish moss — seaweed fronds */}
        <path d="M12 22 L12 15" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />
        <path d="M12 18 Q8 14 5 15 Q7 19 12 18Z" />
        <path d="M12 16 Q16 12 19 13 Q17 17 12 16Z" />
        <path d="M12 14 Q9 10 6 11 Q8 15 12 14Z" opacity="0.8" />
        <path d="M12 12 Q15 8 18 9 Q16 13 12 12Z" opacity="0.8" />
        <path d="M12 10 Q10 6 8 7 Q10 10 12 10Z" opacity="0.6" />
        <path d="M12 10 Q14 6 16 7 Q14 10 12 10Z" opacity="0.6" />
      </>
    ),
  },

  // ─── ADDITIVES (new) ─────────────────────────────────────────────────────

  'hyaluronic': {
    colors: 'text-cyan-500 bg-cyan-50',
    path: (
      <>
        {/* hyaluronic acid — water drop with H letter */}
        <path d="M12 3 Q7 8 7 13 A5 5 0 0 0 17 13 Q17 8 12 3Z" />
        {/* H letter inside */}
        <path d="M9.5 10 L9.5 16 M14.5 10 L14.5 16 M9.5 13 L14.5 13" fill="none" strokeWidth="1.8" stroke="white" strokeLinecap="round" opacity="0.85" />
      </>
    ),
  },

  'kojic': {
    colors: 'text-amber-500 bg-amber-50',
    path: (
      <>
        {/* kojic acid — mushroom cap (derived from fungi fermentation) */}
        <path d="M5 14 Q5 9 12 9 Q19 9 19 14 Z" />
        <path d="M5 14 Q5 18 7 19 Q9 20 12 20 Q15 20 17 19 Q19 18 19 14" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
        <rect x="10" y="14" width="4" height="7" rx="1" />
        <path d="M8 12 Q10 9 12 10 Q14 9 16 12" fill="none" strokeWidth="1" stroke="white" opacity="0.35" strokeLinecap="round" />
      </>
    ),
  },

  // ─── CLAYS (new) ─────────────────────────────────────────────────────────

  'cambrian': {
    colors: 'text-blue-500 bg-blue-50',
    path: (
      <>
        {/* cambrian blue clay — deep-blue mineral bowl */}
        <ellipse cx="12" cy="10" rx="8" ry="3.5" />
        <path d="M4 10 Q4 20 12 20 Q20 20 20 10" fill="none" strokeWidth="2" strokeLinecap="round" stroke="currentColor" />
        {/* mineral crystalline pattern inside */}
        <path d="M8 13 L12 11 L16 13" fill="none" strokeWidth="1.2" stroke="currentColor" opacity="0.4" strokeLinecap="round" />
        <path d="M9 16 L12 14 L15 16" fill="none" strokeWidth="1" stroke="currentColor" opacity="0.3" strokeLinecap="round" />
        <circle cx="12" cy="10" r="2" fill="white" opacity="0.2" />
      </>
    ),
  },

  // ─── CARRIER OILS (expanded) ──────────────────────────────────────────────

  'abyssinian': {
    colors: 'text-amber-500 bg-amber-50',
    path: (<><ellipse cx="12" cy="12" rx="4" ry="7" transform="rotate(-15 12 12)" /><ellipse cx="12" cy="12" rx="2" ry="5" fill="white" opacity="0.2" transform="rotate(-15 12 12)" /><path d="M10 5 Q12 3 14 5" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" /></>),
  },

  'amaranth oil': {
    colors: 'text-red-500 bg-red-50',
    path: (<><path d="M12 22 L12 8" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />{[8,11,14,17,20].map((y, i) => (<ellipse key={i} cx={i % 2 === 0 ? 9 : 15} cy={y} rx="3" ry="1.5" transform={`rotate(${i % 2 === 0 ? -30 : 30} ${i % 2 === 0 ? 9 : 15} ${y})`} />))}</>),
  },

  'andiroba': {
    colors: 'text-green-800 bg-green-50',
    path: (<><path d="M8 5 Q5 9 5 14 Q5 20 12 21 Q19 20 19 14 Q19 9 16 5 Q14 3 12 3 Q10 3 8 5Z" /><path d="M9 8 L15 8 M8 12 L16 12 M9 16 L15 16" stroke="white" strokeWidth="0.8" fill="none" opacity="0.25" /><path d="M12 3 L12 1" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /></>),
  },

  'black cumin': {
    colors: 'text-slate-700 bg-slate-100',
    path: (<><ellipse cx="9" cy="9" rx="2.5" ry="4" transform="rotate(-20 9 9)" /><ellipse cx="15" cy="8" rx="2.5" ry="4" transform="rotate(20 15 8)" /><ellipse cx="12" cy="13" rx="2.5" ry="4" transform="rotate(-5 12 13)" /><ellipse cx="7" cy="16" rx="2" ry="3.5" transform="rotate(15 7 16)" /><ellipse cx="17" cy="15" rx="2" ry="3.5" transform="rotate(-10 17 15)" /></>),
  },

  'broccoli seed': {
    colors: 'text-green-600 bg-green-50',
    path: (<><path d="M12 22 L12 14" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" /><circle cx="12" cy="10" r="5" /><circle cx="7" cy="13" r="3" opacity="0.8" /><circle cx="17" cy="13" r="3" opacity="0.8" /><circle cx="8" cy="8" r="2.5" opacity="0.7" /><circle cx="16" cy="8" r="2.5" opacity="0.7" /><circle cx="12" cy="6" r="2" fill="white" opacity="0.9" /></>),
  },

  'camelina': {
    colors: 'text-yellow-500 bg-yellow-50',
    path: (<>{[0,72,144,216,288].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 5.5 * Math.sin(r), cy = 11 - 5.5 * Math.cos(r); return <ellipse key={i} cx={cx} cy={cy} rx="2.5" ry="3.5" transform={`rotate(${deg} ${cx} ${cy})`} opacity="0.85" />; })}<circle cx="12" cy="11" r="2.5" fill="white" opacity="0.7" /><circle cx="12" cy="11" r="1.5" /><path d="M12 20 L12 22" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /></>),
  },

  'canola': {
    colors: 'text-yellow-400 bg-yellow-50',
    path: (<>{[0,90,180,270].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 6 * Math.sin(r), cy = 12 - 6 * Math.cos(r); return <ellipse key={i} cx={cx} cy={cy} rx="3" ry="4.5" transform={`rotate(${deg} ${cx} ${cy})`} opacity="0.85" />; })}<circle cx="12" cy="12" r="2.5" /><path d="M12 21 L12 22" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /></>),
  },

  'cape chestnut': {
    colors: 'text-amber-700 bg-amber-50',
    path: (<><circle cx="12" cy="13" r="7" /><path d="M9 9 Q12 7 15 9" fill="none" strokeWidth="1.5" stroke="white" opacity="0.3" strokeLinecap="round" /><circle cx="12" cy="13" r="4.5" fill="none" stroke="white" strokeWidth="0.8" opacity="0.25" /><path d="M11 6 Q12 4 13 6" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" /></>),
  },

  'carrot seed': {
    colors: 'text-orange-500 bg-orange-50',
    path: (<><path d="M12 22 Q10 16 10 10" strokeWidth="3" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M10 10 Q7 7 6 4" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.7" /><path d="M10 10 Q10 6 12 3" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.7" /><path d="M10 10 Q13 7 14 4" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.7" /><circle cx="6" cy="3.5" r="1.5" /><circle cx="12" cy="2.5" r="1.5" /><circle cx="14" cy="3.5" r="1.5" /></>),
  },

  'cherry kernel': {
    colors: 'text-red-600 bg-red-50',
    path: (<><circle cx="9" cy="14" r="4.5" /><circle cx="15" cy="14" r="4.5" /><path d="M9 9 Q9 5 12 4 Q15 5 15 9" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" /><circle cx="8.5" cy="13.5" r="1.5" fill="white" opacity="0.3" /><circle cx="14.5" cy="13.5" r="1.5" fill="white" opacity="0.3" /></>),
  },

  'crambe': {
    colors: 'text-white bg-slate-100',
    path: (<>{[0,90,180,270].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 5 * Math.sin(r), cy = 12 - 5 * Math.cos(r); return <ellipse key={i} cx={cx} cy={cy} rx="2.5" ry="4" transform={`rotate(${deg} ${cx} ${cy})`} />; })}<circle cx="12" cy="12" r="2" fill="white" opacity="0.8" /><circle cx="12" cy="12" r="1" /></>),
  },

  'emu oil': {
    colors: 'text-stone-600 bg-stone-50',
    path: (<><ellipse cx="12" cy="13" rx="6" ry="7" /><path d="M9 8 Q12 6 15 8" fill="none" strokeWidth="1.5" stroke="white" opacity="0.3" strokeLinecap="round" /><path d="M8 12 Q12 10 16 12" fill="none" strokeWidth="1" stroke="white" opacity="0.25" strokeLinecap="round" /><path d="M12 3 Q12 1 11 0" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" opacity="0.6" /></>),
  },

  'guava seed': {
    colors: 'text-green-500 bg-green-50',
    path: (<><path d="M7 7 Q5 10 5 14 Q5 20 12 21 Q19 20 19 14 Q19 10 17 7 Q15 4 12 4 Q9 4 7 7Z" /><ellipse cx="10" cy="14" rx="1.5" ry="2" fill="white" opacity="0.45" /><ellipse cx="14" cy="13" rx="1.5" ry="2" fill="white" opacity="0.45" /><ellipse cx="12" cy="17" rx="1.5" ry="2" fill="white" opacity="0.4" /><path d="M12 4 L12 2" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /></>),
  },

  'kiwi seed': {
    colors: 'text-green-500 bg-green-50',
    path: (<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="5.5" fill="white" opacity="0.15" />{[0,45,90,135,180,225,270,315].map((deg, i) => { const r = deg * Math.PI / 180; const x = 12 + 7 * Math.sin(r), y = 12 - 7 * Math.cos(r); return <path key={i} d={`M12 12 L${x} ${y}`} strokeWidth="1" stroke="currentColor" opacity="0.3" fill="none" />; })}<circle cx="12" cy="12" r="2.5" /></>),
  },

  'mongongo': {
    colors: 'text-amber-700 bg-amber-50',
    path: (<><ellipse cx="12" cy="13" rx="5.5" ry="6.5" /><path d="M9 9 Q12 7 15 9" fill="none" strokeWidth="1.5" stroke="white" opacity="0.35" strokeLinecap="round" /><path d="M8 13 Q12 11 16 13" fill="none" strokeWidth="1" stroke="white" opacity="0.25" strokeLinecap="round" /><path d="M10 6 Q12 4 14 6" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" /></>),
  },

  'passion fruit': {
    colors: 'text-purple-500 bg-purple-50',
    path: (<><circle cx="12" cy="12" r="8" /><ellipse cx="10" cy="11" rx="1.5" ry="2" fill="white" opacity="0.5" /><ellipse cx="14" cy="10" rx="1.5" ry="2" fill="white" opacity="0.5" /><ellipse cx="12" cy="15" rx="1.5" ry="2" fill="white" opacity="0.5" /><ellipse cx="8" cy="14" rx="1.2" ry="1.8" fill="white" opacity="0.4" /><ellipse cx="16" cy="14" rx="1.2" ry="1.8" fill="white" opacity="0.4" /><circle cx="12" cy="12" r="2.5" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" /></>),
  },

  'perilla': {
    colors: 'text-purple-700 bg-purple-50',
    path: (<><path d="M12 21 L12 5" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M5 14 Q8 10 12 12 Q16 10 19 14 Q16 18 12 18 Q8 18 5 14Z" /><path d="M7 12 L17 12 M6 15 L18 15" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" /><path d="M12 5 Q10 2 11 1" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" /></>),
  },

  'plum kernel': {
    colors: 'text-purple-600 bg-purple-50',
    path: (<><circle cx="12" cy="13" r="7.5" /><path d="M12 5.5 Q13 3 12 1.5" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" /><path d="M12 5.5 L12 20" strokeWidth="1" stroke="white" opacity="0.25" fill="none" /><ellipse cx="9" cy="13" rx="2.5" ry="3.5" fill="white" opacity="0.15" /></>),
  },

  // ─── BUTTERS (expanded) ───────────────────────────────────────────────────

  'bacuri': {
    colors: 'text-yellow-600 bg-yellow-50',
    path: (<><path d="M7 8 Q5 12 6 16 Q8 21 12 21 Q16 21 18 16 Q19 12 17 8 Q15 4 12 4 Q9 4 7 8Z" /><path d="M9 7 Q12 5 15 7" fill="none" strokeWidth="1.5" stroke="white" opacity="0.3" strokeLinecap="round" /><path d="M8 12 Q12 10 16 12" fill="none" strokeWidth="1" stroke="white" opacity="0.25" strokeLinecap="round" /><path d="M12 4 L12 2" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /></>),
  },

  'kombo': {
    colors: 'text-amber-700 bg-amber-50',
    path: (<><ellipse cx="12" cy="13" rx="6" ry="7" /><ellipse cx="12" cy="13" rx="3.5" ry="4.5" fill="white" opacity="0.15" /><path d="M9 8 Q12 6 15 8" fill="none" strokeWidth="1.5" stroke="white" opacity="0.35" strokeLinecap="round" /><path d="M12 6 L12 4 Q11 2 12 1" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" /></>),
  },

  // ─── ESSENTIAL OILS (expanded) ────────────────────────────────────────────

  'amyris': {
    colors: 'text-amber-700 bg-amber-50',
    path: (<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="6" fill="none" stroke="white" strokeWidth="1" opacity="0.3" /><circle cx="12" cy="12" r="3.5" fill="none" stroke="white" strokeWidth="1" opacity="0.25" /><circle cx="12" cy="12" r="1.5" fill="none" stroke="white" strokeWidth="1" opacity="0.2" /><path d="M12 3.5 L12 20.5" stroke="white" strokeWidth="0.5" fill="none" opacity="0.2" /></>),
  },

  'anise': {
    colors: 'text-violet-400 bg-violet-50',
    path: (<>{[0,45,90,135,180,225,270,315].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 6 * Math.sin(r), cy = 12 - 6 * Math.cos(r); return <ellipse key={i} cx={cx} cy={cy} rx="1.5" ry="2.5" transform={`rotate(${deg} ${cx} ${cy})`} />; })}<circle cx="12" cy="12" r="2.5" /><circle cx="12" cy="12" r="1.2" fill="white" opacity="0.4" /></>),
  },

  'balsam fir': {
    colors: 'text-green-700 bg-green-50',
    path: (<><path d="M12 22 L12 16" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M4 16 L12 6 L20 16Z" /><path d="M6 13 L12 5 L18 13Z" opacity="0.85" /><path d="M8 10 L12 4 L16 10Z" opacity="0.7" /><path d="M7 16 L17 16 M8 13 L16 13" stroke="white" strokeWidth="0.6" fill="none" opacity="0.25" /></>),
  },

  'basil eo': {
    colors: 'text-green-600 bg-green-50',
    path: (<><path d="M12 21 L12 8" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M12 12 Q7 9 5 11 Q6 15 12 14Z" /><path d="M12 12 Q17 9 19 11 Q18 15 12 14Z" opacity="0.85" /><path d="M12 8 Q7 5 5 7 Q6 11 12 10Z" opacity="0.7" /><path d="M12 8 Q17 5 19 7 Q18 11 12 10Z" opacity="0.7" /><path d="M12 5 Q11 2 12 1" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" /></>),
  },

  'bay laurel': {
    colors: 'text-green-700 bg-green-50',
    path: (<><path d="M12 21 L12 4" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M5 14 Q5 8 12 6 Q19 8 19 14 Q17 20 12 21 Q7 20 5 14Z" /><path d="M7 11 L17 11 M6 14 L18 14 M7 17 L17 17" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" /></>),
  },

  'benzoin': {
    colors: 'text-amber-500 bg-amber-50',
    path: (<><path d="M8 5 C8 5 6 9 6 12 A3.5 3.5 0 0 0 13 12 C13 9 8 5 8 5Z" /><path d="M16 3 C16 3 14 8 14 11 A3 3 0 0 0 20 11 C20 8 16 3 16 3Z" /><path d="M11 16 C11 16 9 19 9 21 A2.5 2.5 0 0 0 14 21 C14 19 11 16 11 16Z" opacity="0.8" /><path d="M6 3 Q9 2 10 4" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" /></>),
  },

  'black spruce': {
    colors: 'text-green-800 bg-green-50',
    path: (<><path d="M12 22 L12 16" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M5 16 L12 7 L19 16Z" /><path d="M7 13 L12 5 L17 13Z" opacity="0.85" /><path d="M9 10 L12 3 L15 10Z" opacity="0.7" /><path d="M10 7 L12 2 L14 7Z" opacity="0.55" /></>),
  },

  'cajeput': {
    colors: 'text-teal-500 bg-teal-50',
    path: (<><path d="M9 20 Q9 13 11 9 Q12 5 11 3" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M11 14 Q7 12 5 8 Q8 7 11 14Z" /><path d="M11 10 Q7 8 6 5 Q9 4 11 10Z" opacity="0.75" /><path d="M11 14 Q15 12 17 8 Q14 7 11 14Z" opacity="0.8" /><path d="M11 10 Q15 8 16 5 Q13 4 11 10Z" opacity="0.65" /></>),
  },

  'camphor': {
    colors: 'text-sky-500 bg-sky-50',
    path: (<><path d="M12 3 L16 7 L20 7 L18 12 L20 17 L16 17 L12 21 L8 17 L4 17 L6 12 L4 7 L8 7Z" /><circle cx="12" cy="12" r="3.5" fill="white" opacity="0.35" /><path d="M9 9 L15 15 M15 9 L9 15" stroke="white" strokeWidth="0.8" fill="none" opacity="0.25" /></>),
  },

  'caraway': {
    colors: 'text-amber-600 bg-amber-50',
    path: (<><ellipse cx="12" cy="7" rx="2" ry="4.5" /><ellipse cx="7" cy="11" rx="2" ry="4.5" transform="rotate(-30 7 11)" /><ellipse cx="17" cy="11" rx="2" ry="4.5" transform="rotate(30 17 11)" /><ellipse cx="9" cy="17" rx="2" ry="4" transform="rotate(-20 9 17)" /><ellipse cx="15" cy="17" rx="2" ry="4" transform="rotate(20 15 17)" /></>),
  },

  'cassia eo': {
    colors: 'text-orange-800 bg-orange-50',
    path: (<><rect x="5" y="9" width="14" height="4" rx="2" transform="rotate(-20 12 12)" /><rect x="5" y="12" width="14" height="4" rx="2" transform="rotate(5 12 12)" opacity="0.75" /><rect x="6" y="14" width="12" height="3.5" rx="1.75" transform="rotate(25 12 12)" opacity="0.55" /></>),
  },

  'cistus': {
    colors: 'text-rose-400 bg-rose-50',
    path: (<>{[0,72,144,216,288].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 6 * Math.sin(r), cy = 11 - 6 * Math.cos(r); return <ellipse key={i} cx={cx} cy={cy} rx="3" ry="4.5" transform={`rotate(${deg} ${cx} ${cy})`} />; })}<circle cx="12" cy="11" r="3" fill="white" opacity="0.7" /><circle cx="12" cy="11" r="1.5" /><path d="M12 20 L12 22" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /></>),
  },

  'citronella': {
    colors: 'text-lime-500 bg-lime-50',
    path: (<><path d="M7 22 Q9 15 8 8 Q8 4 7 2" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M13 22 Q15 14 14 7 Q14 3 13 1" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.85" /><path d="M19 22 Q20 16 19 9 Q19 5 18 3" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.7" /></>),
  },

  'coriander eo': {
    colors: 'text-green-400 bg-green-50',
    path: (<>{[0,60,120,180,240,300].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 5.5 * Math.sin(r), cy = 9 - 5.5 * Math.cos(r); return <circle key={i} cx={cx} cy={cy} r="1.8" />; })}<circle cx="12" cy="9" r="2" /><path d="M12 17 L12 22" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M9 13 L12 17 L15 13" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" /></>),
  },

  'cumin eo': {
    colors: 'text-amber-600 bg-amber-50',
    path: (<><ellipse cx="12" cy="8" rx="2" ry="4.5" /><ellipse cx="7" cy="12" rx="2" ry="4.5" transform="rotate(-25 7 12)" /><ellipse cx="17" cy="12" rx="2" ry="4.5" transform="rotate(25 17 12)" /><ellipse cx="9" cy="18" rx="2" ry="3.5" transform="rotate(-15 9 18)" /><ellipse cx="15" cy="18" rx="2" ry="3.5" transform="rotate(15 15 18)" /></>),
  },

  'dill eo': {
    colors: 'text-green-400 bg-green-50',
    path: (<><path d="M12 22 L12 13" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M12 13 L7 10 M12 13 L17 10 M12 13 L9 8 M12 13 L15 8 M12 13 L12 9" strokeWidth="1.2" stroke="currentColor" fill="none" strokeLinecap="round" />{[0,60,120,180,240,300].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 5 * Math.sin(r), cy = 9 - 5 * Math.cos(r); return <circle key={i} cx={cx} cy={cy} r="1.4" />; })}<circle cx="12" cy="9" r="1.8" /></>),
  },

  'douglas fir': {
    colors: 'text-green-700 bg-green-50',
    path: (<><path d="M12 22 L12 15" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M4 15 L12 5 L20 15Z" /><path d="M6 12 L12 4 L18 12Z" opacity="0.85" /><path d="M8 9 L12 3 L16 9Z" opacity="0.7" /><path d="M15 17 Q17 15 19 17 Q18 19 15 17Z" opacity="0.6" /></>),
  },

  'fir needle': {
    colors: 'text-green-600 bg-green-50',
    path: (<><path d="M12 22 L12 16" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M4 16 L12 4 L20 16Z" /><path d="M7 14 L12 6 L17 14Z" opacity="0.85" /><path d="M8 12 L12 8 L16 12" fill="none" strokeWidth="1.5" stroke="white" opacity="0.3" /></>),
  },

  'galbanum': {
    colors: 'text-green-600 bg-green-50',
    path: (<><path d="M6 8 C6 8 4 13 4 16 A4 4 0 0 0 12 16 C12 13 6 8 6 8Z" /><path d="M14 5 C14 5 12 10 12 14 A3 3 0 0 0 18 14 C18 10 14 5 14 5Z" opacity="0.8" /><path d="M5 4 Q7 2 8 4 M13 2 Q15 1 15 3" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.6" /></>),
  },

  'helichrysum': {
    colors: 'text-yellow-400 bg-yellow-50',
    path: (<>{[0,36,72,108,144,180,216,252,288,324].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 6.5 * Math.sin(r), cy = 11 - 6.5 * Math.cos(r); return <ellipse key={i} cx={cx} cy={cy} rx="1.5" ry="3" transform={`rotate(${deg} ${cx} ${cy})`} />; })}<circle cx="12" cy="11" r="3.5" /><circle cx="12" cy="11" r="2" fill="white" opacity="0.25" /><path d="M12 20 L12 22" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /></>),
  },

  'hyssop': {
    colors: 'text-blue-500 bg-blue-50',
    path: (<><path d="M12 22 L12 6" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />{[8,11,14,17,20].map((y, i) => (<ellipse key={i} cx={i % 2 === 0 ? 9.5 : 14.5} cy={y} rx="2" ry="1.2" transform={`rotate(${i % 2 === 0 ? -15 : 15} ${i % 2 === 0 ? 9.5 : 14.5} ${y})`} />))}<ellipse cx="12" cy="5" rx="1.5" ry="2.5" /></>),
  },

  'laurel leaf': {
    colors: 'text-green-700 bg-green-50',
    path: (<><path d="M12 22 L12 3" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M4 13 Q5 6 12 4 Q19 6 20 13 Q18 19 12 21 Q6 19 4 13Z" /><path d="M6 10 L18 10 M5 13 L19 13 M6 16 L18 16" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" /></>),
  },

  'lemon myrtle': {
    colors: 'text-lime-500 bg-lime-50',
    path: (<><path d="M6 12 C6 7 8.5 3 12 3 C15.5 3 18 7 18 12 C18 17 15.5 21 12 21 C8.5 21 6 17 6 12Z" opacity="0.8" /><path d="M12 3 L12 21 M6 12 L18 12" stroke="white" strokeWidth="0.8" fill="none" opacity="0.3" /><path d="M18 12 Q20 11 21 12 Q20 13 18 12Z" opacity="0.5" /><path d="M6 12 Q4 11 3 12 Q4 13 6 12Z" opacity="0.5" /></>),
  },

  'marjoram': {
    colors: 'text-green-500 bg-green-50',
    path: (<><path d="M12 22 L12 5" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />{[6,9,12,15,18].map((y, i) => (<ellipse key={i} cx={i % 2 === 0 ? 9 : 15} cy={y} rx="3" ry="2" transform={`rotate(${i % 2 === 0 ? -20 : 20} ${i % 2 === 0 ? 9 : 15} ${y})`} />))}</>),
  },

  'may chang': {
    colors: 'text-yellow-500 bg-yellow-50',
    path: (<><circle cx="9" cy="12" r="4" /><circle cx="15" cy="10" r="3.5" /><circle cx="15" cy="16" r="3" opacity="0.8" /><path d="M12 5 Q14 3 12 1" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" /><circle cx="9" cy="12" r="1.5" fill="white" opacity="0.3" /><circle cx="15" cy="10" r="1.2" fill="white" opacity="0.3" /></>),
  },

  'melissa eo': {
    colors: 'text-lime-400 bg-lime-50',
    path: (<><path d="M12 21 L12 5" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M5 13 Q6 9 12 8 Q18 9 19 13 Q18 17 12 18 Q6 17 5 13Z" /><path d="M7 11 L17 11 M6 14 L18 14 M8 17 L16 17" stroke="white" strokeWidth="0.6" fill="none" opacity="0.3" /></>),
  },

  'myrtle eo': {
    colors: 'text-green-500 bg-green-50',
    path: (<>{[0,72,144,216,288].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 5.5 * Math.sin(r), cy = 11 - 5.5 * Math.cos(r); return <ellipse key={i} cx={cx} cy={cy} rx="2.2" ry="3.5" transform={`rotate(${deg} ${cx} ${cy})`} opacity="0.85" />; })}<circle cx="12" cy="11" r="2.5" fill="white" opacity="0.7" /><circle cx="12" cy="11" r="1.5" /><path d="M12 20 L12 22" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /></>),
  },

  'niaouli': {
    colors: 'text-teal-500 bg-teal-50',
    path: (<><path d="M9 21 Q9 13 11 8 Q12 4 10 2" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M11 16 Q7 14 5 10 Q8 9 11 16Z" /><path d="M11 12 Q7 10 6 7 Q9 6 11 12Z" opacity="0.75" /><path d="M11 16 Q15 14 17 10 Q14 9 11 16Z" opacity="0.8" /><path d="M11 12 Q15 10 16 7 Q13 6 11 12Z" opacity="0.65" /></>),
  },

  'nutmeg': {
    colors: 'text-amber-700 bg-amber-50',
    path: (<><ellipse cx="12" cy="13" rx="6" ry="7" /><path d="M7 9 Q12 6 17 9" fill="none" strokeWidth="1.5" stroke="white" opacity="0.3" strokeLinecap="round" /><path d="M6 13 Q12 11 18 13" fill="none" strokeWidth="1" stroke="white" opacity="0.25" strokeLinecap="round" /><path d="M7 17 Q12 15 17 17" fill="none" strokeWidth="1" stroke="white" opacity="0.2" strokeLinecap="round" /><path d="M12 6 L12 4" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /></>),
  },

  'oregano': {
    colors: 'text-green-600 bg-green-50',
    path: (<><path d="M12 22 L12 6" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />{[7,10,13,16,19].map((y, i) => (<ellipse key={i} cx={i % 2 === 0 ? 8.5 : 15.5} cy={y} rx="3.5" ry="2.5" transform={`rotate(${i % 2 === 0 ? -15 : 15} ${i % 2 === 0 ? 8.5 : 15.5} ${y})`} />))}</>),
  },

  'palmarosa': {
    colors: 'text-green-400 bg-green-50',
    path: (<><path d="M12 22 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M12 15 Q8 13 6 10 Q9 9 12 15Z" opacity="0.7" /><path d="M12 15 Q16 13 18 10 Q15 9 12 15Z" opacity="0.7" />{[0,72,144,216,288].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 5.5 * Math.sin(r), cy = 8 - 5.5 * Math.cos(r); return <ellipse key={i} cx={cx} cy={cy} rx="1.8" ry="2.8" transform={`rotate(${deg} ${cx} ${cy})`} opacity="0.85" />; })}<circle cx="12" cy="8" r="2" fill="white" opacity="0.6" /></>),
  },

  'petitgrain': {
    colors: 'text-lime-600 bg-lime-50',
    path: (<><path d="M12 21 L12 4" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M4 14 Q5 7 12 5 Q19 7 20 14 Q18 19 12 21 Q6 19 4 14Z" /><path d="M6 11 L18 11 M5 14 L19 14 M7 17 L17 17" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" /><circle cx="16" cy="19" r="2.5" opacity="0.6" /></>),
  },

  'ravensara': {
    colors: 'text-green-600 bg-green-50',
    path: (<><path d="M12 21 L12 4" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M4 13 Q5 7 12 5 Q19 7 20 13 Q18 20 12 21 Q6 20 4 13Z" /><path d="M6 10 L18 10 M5 13 L19 13 M6 16 L18 16 M8 19 L16 19" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" /></>),
  },

  'rosalina': {
    colors: 'text-pink-400 bg-pink-50',
    path: (<>{[0,72,144,216,288].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 6 * Math.sin(r), cy = 11 - 6 * Math.cos(r); return <ellipse key={i} cx={cx} cy={cy} rx="2.5" ry="4" transform={`rotate(${deg} ${cx} ${cy})`} opacity="0.85" />; })}<circle cx="12" cy="11" r="3" fill="white" opacity="0.7" /><circle cx="12" cy="11" r="1.5" /><path d="M12 20 L12 22" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /></>),
  },

  'spikenard': {
    colors: 'text-stone-600 bg-stone-50',
    path: (<><path d="M12 5 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M12 12 Q8 15 7 21" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M12 12 Q12 17 12 22" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M12 12 Q16 15 17 21" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M12 14 Q9 17 6 18" strokeWidth="1" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.6" /><path d="M10 5 Q12 2 14 5" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" /></>),
  },

  'star anise': {
    colors: 'text-amber-700 bg-amber-50',
    path: (<>{[0,45,90,135,180,225,270,315].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 7 * Math.sin(r), cy = 12 - 7 * Math.cos(r); return (<g key={i}><path d={`M12 12 L${cx} ${cy}`} strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" fill="none" /><circle cx={cx} cy={cy} r="1.8" /></g>); })}<circle cx="12" cy="12" r="2.5" /><circle cx="12" cy="12" r="1.2" fill="white" opacity="0.4" /></>),
  },

  'styrax': {
    colors: 'text-amber-600 bg-amber-50',
    path: (<><path d="M9 7 C9 7 7 11 7 13 A3 3 0 0 0 13 13 C13 11 9 7 9 7Z" /><path d="M16 5 C16 5 14 9 14 12 A2.5 2.5 0 0 0 19 12 C19 9 16 5 16 5Z" /><path d="M11 16 C11 16 9.5 18.5 9.5 20 A2 2 0 0 0 13.5 20 C13.5 18.5 11 16 11 16Z" opacity="0.8" /><path d="M5 3 Q7 2 8 4 M14 2 Q16 1 16 3" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" /></>),
  },

  'tagetes': {
    colors: 'text-orange-500 bg-orange-50',
    path: (<>{[0,36,72,108,144,180,216,252,288,324].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 6 * Math.sin(r), cy = 12 - 6 * Math.cos(r); return <ellipse key={i} cx={cx} cy={cy} rx="2" ry="3.5" transform={`rotate(${deg} ${cx} ${cy})`} opacity="0.9" />; })}<circle cx="12" cy="12" r="3.5" /><circle cx="12" cy="12" r="2" fill="white" opacity="0.3" /></>),
  },

  'violet leaf': {
    colors: 'text-purple-500 bg-purple-50',
    path: (<><path d="M12 21 L12 5" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M4 14 Q5 8 12 6 Q19 8 20 14 Q18 20 12 21 Q6 20 4 14Z" /><path d="M6 11 L18 11 M5 14 L19 14 M7 17 L17 17" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" /><path d="M12 5 Q10 2 12 1" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" /></>),
  },

  'wintergreen': {
    colors: 'text-green-500 bg-green-50',
    path: (<><path d="M12 21 L12 6" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M4 13 Q5 7 12 5 Q19 7 20 13 Q18 20 12 21 Q6 20 4 13Z" /><path d="M7 11 L17 11 M6 14 L18 14" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" /><circle cx="16" cy="18" r="3" /><circle cx="16" cy="18" r="1.2" fill="white" opacity="0.35" /></>),
  },

  // ─── BOTANICALS (expanded) ────────────────────────────────────────────────

  "cat's claw": {
    colors: 'text-amber-700 bg-amber-50',
    path: (<><path d="M5 18 Q5 12 9 10 Q9 8 11 9 Q12 8 13 9 Q15 8 15 10 Q19 12 19 18" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" /><path d="M9 10 Q8 6 10 4" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" /><path d="M12 9 Q11 5 13 3" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" /><path d="M15 10 Q16 6 14 4" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" /><path d="M5 18 Q12 21 19 18" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" /></>),
  },

  'chickweed': {
    colors: 'text-green-400 bg-green-50',
    path: (<><path d="M12 22 L12 10" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M12 16 Q8 14 6 11 Q9 10 12 16Z" /><path d="M12 16 Q16 14 18 11 Q15 10 12 16Z" opacity="0.8" /><path d="M12 12 Q8 10 7 7 Q10 6 12 12Z" opacity="0.7" /><path d="M12 12 Q16 10 17 7 Q14 6 12 12Z" opacity="0.7" /><circle cx="12" cy="8" r="2" /><circle cx="8" cy="6" r="1.5" opacity="0.8" /><circle cx="16" cy="6" r="1.5" opacity="0.8" /></>),
  },

  'cornflower': {
    colors: 'text-blue-500 bg-blue-50',
    path: (<><path d="M12 22 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />{[0,60,120,180,240,300].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 6.5 * Math.sin(r), cy = 9 - 6.5 * Math.cos(r); return <ellipse key={i} cx={cx} cy={cy} rx="2" ry="4" transform={`rotate(${deg} ${cx} ${cy})`} />; })}<circle cx="12" cy="9" r="3" /><circle cx="12" cy="9" r="1.5" fill="white" opacity="0.3" /></>),
  },

  'fenugreek': {
    colors: 'text-amber-500 bg-amber-50',
    path: (<><ellipse cx="12" cy="8" rx="2.5" ry="4" /><ellipse cx="7" cy="13" rx="2.5" ry="4" transform="rotate(-20 7 13)" /><ellipse cx="17" cy="13" rx="2.5" ry="4" transform="rotate(20 17 13)" /><ellipse cx="9" cy="19" rx="2.5" ry="3.5" transform="rotate(-10 9 19)" /><ellipse cx="15" cy="19" rx="2.5" ry="3.5" transform="rotate(10 15 19)" /></>),
  },

  'fennel seeds': {
    colors: 'text-green-500 bg-green-50',
    path: (<><ellipse cx="9" cy="8" rx="2" ry="4" transform="rotate(-15 9 8)" /><ellipse cx="15" cy="8" rx="2" ry="4" transform="rotate(15 15 8)" /><ellipse cx="12" cy="6" rx="2" ry="4" /><ellipse cx="7" cy="14" rx="2" ry="4" transform="rotate(-20 7 14)" /><ellipse cx="17" cy="14" rx="2" ry="4" transform="rotate(20 17 14)" /><path d="M9 3 Q12 1 15 3" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" /></>),
  },

  'horsetail': {
    colors: 'text-green-500 bg-green-50',
    path: (<><path d="M12 22 L12 4" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />{[6,9,12,15,18].map((y, i) => (<path key={i} d={`M12 ${y} L${12 - 4 - i} ${y - 2} M12 ${y} L${12 + 4 + i} ${y - 2}`} strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />))}</>),
  },

  'juniper berries': {
    colors: 'text-blue-700 bg-blue-50',
    path: (<><path d="M12 22 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M12 12 L8 9 M12 15 L7 13 M12 12 L16 9 M12 15 L17 13" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><circle cx="7" cy="8" r="3" /><circle cx="17" cy="8" r="3" /><circle cx="6" cy="12" r="2.5" opacity="0.85" /><circle cx="18" cy="12" r="2.5" opacity="0.85" /><circle cx="7" cy="8" r="1" fill="white" opacity="0.35" /><circle cx="17" cy="8" r="1" fill="white" opacity="0.35" /></>),
  },

  'lemon balm': {
    colors: 'text-lime-500 bg-lime-50',
    path: (<><path d="M12 22 L12 5" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M5 13 Q6 8 12 7 Q18 8 19 13 Q17 19 12 21 Q7 19 5 13Z" /><path d="M7 10 L17 10 M6 13 L18 13 M7 16 L17 16" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" /><path d="M12 5 Q10 2 11 1" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" /></>),
  },

  'linden': {
    colors: 'text-yellow-400 bg-yellow-50',
    path: (<><path d="M12 22 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M5 14 Q5 9 12 7 Q19 9 19 14 Q17 19 12 20 Q7 19 5 14Z" opacity="0.7" />{[0,90,180,270].map((deg, i) => { const r = deg * Math.PI / 180; const x = 16 + 2.5 * Math.sin(r), y = 7 - 2.5 * Math.cos(r); return <path key={i} d={`M16 7 L${x} ${y}`} strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" />; })}<circle cx="16" cy="7" r="1.5" /></>),
  },

  'motherwort': {
    colors: 'text-pink-500 bg-pink-50',
    path: (<><path d="M12 22 L12 6" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />{[8,11,14,17,20].map((y, i) => (<ellipse key={i} cx={i % 2 === 0 ? 8 : 16} cy={y} rx="3.5" ry="2" transform={`rotate(${i % 2 === 0 ? -25 : 25} ${i % 2 === 0 ? 8 : 16} ${y})`} />))}<ellipse cx="12" cy="5" rx="1.5" ry="2" /></>),
  },

  'mullein': {
    colors: 'text-yellow-500 bg-yellow-50',
    path: (<><path d="M12 22 L12 4" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" />{[6,8,10,12,14].map((y, i) => (<circle key={i} cx={i % 2 === 0 ? 11 : 13} cy={y} r="1.5" />))}{[7,9,11,13,15].map((y, i) => (<ellipse key={i} cx={i % 2 === 0 ? 7.5 : 16.5} cy={y} rx="3.5" ry="1.8" transform={`rotate(${i % 2 === 0 ? -15 : 15} ${i % 2 === 0 ? 7.5 : 16.5} ${y})`} opacity="0.6" />))}</>),
  },

  'oregon grape': {
    colors: 'text-purple-600 bg-purple-50',
    path: (<><path d="M12 22 L12 11" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M12 11 L8 7 M12 14 L6 12 M12 11 L16 7 M12 14 L18 12" strokeWidth="1.2" stroke="currentColor" fill="none" strokeLinecap="round" /><circle cx="7" cy="6" r="2.5" /><circle cx="17" cy="6" r="2.5" /><circle cx="5" cy="11" r="2.2" opacity="0.85" /><circle cx="19" cy="11" r="2.2" opacity="0.85" /><circle cx="7" cy="6" r="0.8" fill="white" opacity="0.35" /><circle cx="17" cy="6" r="0.8" fill="white" opacity="0.35" /></>),
  },

  'passionflower': {
    colors: 'text-purple-500 bg-purple-50',
    path: (<>{[0,36,72,108,144,180,216,252,288,324].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 7 * Math.sin(r), cy = 12 - 7 * Math.cos(r); return <ellipse key={i} cx={cx} cy={cy} rx="1.5" ry="3.5" transform={`rotate(${deg} ${cx} ${cy})`} opacity="0.85" />; })}<circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="2.5" fill="white" opacity="0.4" />{[0,72,144,216,288].map((deg, i) => { const r = deg * Math.PI / 180; const x = 12 + 1.8 * Math.sin(r), y = 12 - 1.8 * Math.cos(r); return <circle key={i} cx={x} cy={y} r="0.8" fill="white" />; })}</>),
  },

  "pau d'arco": {
    colors: 'text-amber-800 bg-amber-50',
    path: (<><rect x="4" y="8" width="16" height="10" rx="3" /><path d="M4 11 Q12 8 20 11" fill="none" strokeWidth="1.2" stroke="white" opacity="0.3" strokeLinecap="round" /><path d="M4 14 Q12 11 20 14" fill="none" strokeWidth="1" stroke="white" opacity="0.25" strokeLinecap="round" /><path d="M6 5 Q12 3 18 5" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" /></>),
  },

  'plantain leaf': {
    colors: 'text-green-500 bg-green-50',
    path: (<><path d="M12 22 L12 4" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M3 14 Q5 7 12 5 Q19 7 21 14 Q18 21 12 22 Q6 21 3 14Z" /><path d="M5 12 L19 12 M4 15 L20 15 M6 18 L18 18" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" /></>),
  },

  'red clover': {
    colors: 'text-red-400 bg-red-50',
    path: (<><path d="M12 21 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M7 14 Q5 11 7 8 Q10 6 12 9 Q14 6 17 8 Q19 11 17 14 Q15 17 12 17 Q9 17 7 14Z" /><path d="M12 9 L12 17" stroke="white" strokeWidth="0.8" fill="none" opacity="0.3" /><path d="M7 11 L17 11 M7 14 L17 14" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" /></>),
  },

  'sarsaparilla': {
    colors: 'text-amber-600 bg-amber-50',
    path: (<><path d="M7 22 Q9 15 11 10 Q12 5 10 2" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M11 10 Q14 6 18 5" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" /><path d="M12 14 Q16 12 19 13" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" /><ellipse cx="18" cy="5" rx="2.5" ry="2" /><ellipse cx="19" cy="13" rx="2.5" ry="2" opacity="0.8" /></>),
  },

  'slippery elm': {
    colors: 'text-amber-600 bg-amber-50',
    path: (<><path d="M12 22 L12 5" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M3 14 Q4 7 12 5 Q20 7 21 14 Q18 21 12 22 Q6 21 3 14Z" opacity="0.85" /><path d="M6 11 Q9 10 12 11 Q15 12 18 11" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" /></>),
  },

  'white willow': {
    colors: 'text-green-500 bg-green-50',
    path: (<><path d="M12 22 L12 8" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M12 8 Q7 5 5 2" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M12 11 Q16 7 18 3" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.85" /><path d="M12 14 Q7 12 4 8" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.7" /><path d="M12 14 Q17 12 19 8" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.7" /></>),
  },

  'witch hazel': {
    colors: 'text-yellow-600 bg-yellow-50',
    path: (<><path d="M12 22 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />{[0,72,144,216,288].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 6 * Math.sin(r), cy = 9 - 6 * Math.cos(r); return (<g key={i}><path d={`M12 12 L${cx} ${cy}`} strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d={`M${cx} ${cy} L${cx + 2 * Math.sin(r - 0.5)} ${cy - 2 * Math.cos(r - 0.5)} M${cx} ${cy} L${cx + 2 * Math.sin(r + 0.5)} ${cy - 2 * Math.cos(r + 0.5)}`} strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /></g>); })}</>),
  },

  'yellow dock': {
    colors: 'text-amber-600 bg-amber-50',
    path: (<><path d="M12 22 L12 5" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M5 14 Q6 9 12 7 Q18 9 19 14 Q18 20 12 21 Q6 20 5 14Z" opacity="0.7" /><path d="M7 11 L17 11 M6 14 L18 14 M7 17 L17 17" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" /></>),
  },

  // ─── CLAYS (expanded) ────────────────────────────────────────────────────

  'glacial marine': {
    colors: 'text-sky-400 bg-sky-50',
    path: (<><ellipse cx="12" cy="10" rx="8" ry="3" /><path d="M4 10 Q4 19 12 19 Q20 19 20 10" fill="none" strokeWidth="2" strokeLinecap="round" stroke="currentColor" /><path d="M5 8 Q8 5 12 5 Q16 5 19 8" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.4" /><path d="M7 13 Q10 11 13 13 Q16 15 19 13" fill="none" strokeWidth="1" stroke="white" opacity="0.4" strokeLinecap="round" /></>),
  },

  'illite green': {
    colors: 'text-green-600 bg-green-50',
    path: (<><ellipse cx="12" cy="10" rx="8" ry="3" /><path d="M4 10 Q4 19 12 19 Q20 19 20 10" fill="none" strokeWidth="2" strokeLinecap="round" stroke="currentColor" /><path d="M7 12 Q9 11 12 12 Q15 13 18 12" fill="none" strokeWidth="1.2" stroke="white" opacity="0.35" strokeLinecap="round" /><path d="M7 15 Q9 14 12 15 Q15 16 18 15" fill="none" strokeWidth="1" stroke="white" opacity="0.25" strokeLinecap="round" /></>),
  },

  'moroccan lava': {
    colors: 'text-stone-600 bg-stone-50',
    path: (<><path d="M6 9 Q7 6 12 5 Q17 6 18 9 L20 15 Q20 20 12 20 Q4 20 4 15 Z" /><path d="M8 6 Q12 4 16 6" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.4" /><path d="M7 12 Q12 10 17 12" fill="none" strokeWidth="1" stroke="white" opacity="0.25" strokeLinecap="round" /></>),
  },

  // ─── COLORANTS (expanded) ─────────────────────────────────────────────────

  'brazilian purple': {
    colors: 'text-purple-600 bg-purple-50',
    path: (<><ellipse cx="12" cy="10" rx="8" ry="3" /><path d="M4 10 Q4 19 12 19 Q20 19 20 10" fill="none" strokeWidth="2" strokeLinecap="round" stroke="currentColor" /><path d="M7 13 Q12 11 17 13" fill="none" strokeWidth="1.2" stroke="white" opacity="0.35" strokeLinecap="round" /></>),
  },

  'chromium oxide': {
    colors: 'text-green-600 bg-green-50',
    path: (<><path d="M9 4 L15 4 L18 9 L15 14 L9 14 L6 9Z" /><path d="M9 14 L15 14 L18 19 L15 19 L9 19 L6 19Z" opacity="0.6" /><path d="M9 4 L6 9 L6 19" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.4" /><path d="M15 4 L18 9 L18 19" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.4" /></>),
  },

  'manganese violet': {
    colors: 'text-violet-600 bg-violet-50',
    path: (<><path d="M8 4 L16 4 L20 10 L18 18 L12 20 L6 18 L4 10Z" /><path d="M8 4 L4 10 L6 18" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" /><ellipse cx="13" cy="11" rx="3" ry="2" fill="white" opacity="0.15" /><path d="M12 4 L12 20" stroke="white" strokeWidth="0.5" fill="none" opacity="0.15" /></>),
  },

  // ─── EXFOLIANTS (expanded) ────────────────────────────────────────────────

  'peach pit': {
    colors: 'text-orange-400 bg-orange-50',
    path: (<><path d="M6 12 Q6 6 12 5 Q18 6 18 12 Q18 18 12 19 Q6 18 6 12Z" /><path d="M12 5 L12 19" strokeWidth="1" stroke="white" opacity="0.3" fill="none" /><path d="M7 10 Q12 8 17 10 M7 14 Q12 12 17 14" fill="none" strokeWidth="0.8" stroke="white" opacity="0.25" strokeLinecap="round" /><path d="M12 3 Q14 1 12 0" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" /></>),
  },

  // ─── ADDITIVES (expanded) ─────────────────────────────────────────────────

  'alpha lipoic': {
    colors: 'text-yellow-500 bg-yellow-50',
    path: (<><path d="M12 5 L12 19" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M7 8 Q7 4 10 4 Q14 4 14 8 Q14 12 10 12 Q7 12 7 8Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M14 8 Q14 5 17 5 Q20 5 20 9 Q20 13 16 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" /><circle cx="10" cy="12" r="1.5" /><circle cx="14" cy="8" r="1.5" /></>),
  },

  'aha complex': {
    colors: 'text-orange-400 bg-orange-50',
    path: (<><circle cx="8" cy="9" r="3.5" /><circle cx="16" cy="8" r="3" opacity="0.85" /><circle cx="12" cy="15" r="4" /><circle cx="7" cy="15" r="2.5" opacity="0.7" /><circle cx="17" cy="15" r="2.5" opacity="0.7" /><path d="M8 5 Q9 3 10 5" fill="none" strokeWidth="1" stroke="white" opacity="0.4" strokeLinecap="round" /></>),
  },

  'amino acid': {
    colors: 'text-emerald-500 bg-emerald-50',
    path: (<><circle cx="4" cy="12" r="2.5" /><circle cx="10" cy="7" r="2.5" /><circle cx="16" cy="7" r="2.5" /><circle cx="20" cy="12" r="2.5" /><circle cx="16" cy="17" r="2" opacity="0.8" /><circle cx="10" cy="17" r="2" opacity="0.8" /><path d="M6 12 L8 7 M12 7 L14 7 M18 7 L18 12 M18 12 L16 17 M14 17 L12 17 M10 17 L8 12" fill="none" strokeWidth="1.8" stroke="currentColor" strokeLinecap="round" /></>),
  },

  'beta-glucan': {
    colors: 'text-amber-400 bg-amber-50',
    path: (<><path d="M12 22 L12 10" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><ellipse cx="10" cy="8.5" rx="2.5" ry="4" transform="rotate(-20 10 8.5)" /><ellipse cx="14" cy="8.5" rx="2.5" ry="4" transform="rotate(20 14 8.5)" /><ellipse cx="12" cy="6" rx="2" ry="3.5" /><path d="M8 14 L12 12 L16 14" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" /></>),
  },

  'betaine': {
    colors: 'text-rose-500 bg-rose-50',
    path: (<><path d="M7 14 Q6 9 8 7 Q10 5 12 5 Q14 5 16 7 Q18 9 17 14 Q16 19 12 20 Q8 19 7 14Z" /><path d="M12 5 L14 2 Q15 1 17 1" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.7" /><path d="M12 5 L10 2 Q9 1 7 1" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.7" /><path d="M12 20 L12 23" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.5" /></>),
  },

  'bisabolol': {
    colors: 'text-yellow-300 bg-yellow-50',
    path: (<>{[0,72,144,216,288].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 6 * Math.sin(r), cy = 11 - 6 * Math.cos(r); return <ellipse key={i} cx={cx} cy={cy} rx="2" ry="3.2" transform={`rotate(${deg} ${cx} ${cy})`} opacity="0.85" />; })}<circle cx="12" cy="11" r="3" fill="white" opacity="0.7" /><circle cx="12" cy="11" r="1.5" opacity="0.8" /></>),
  },

  'chia seed': {
    colors: 'text-slate-600 bg-slate-100',
    path: (<><ellipse cx="8" cy="8" rx="2" ry="3.5" transform="rotate(-15 8 8)" /><ellipse cx="14" cy="7" rx="2" ry="3.5" transform="rotate(20 14 7)" /><ellipse cx="11" cy="13" rx="2" ry="3.5" transform="rotate(-5 11 13)" /><ellipse cx="6" cy="15" rx="2" ry="3" transform="rotate(15 6 15)" /><ellipse cx="17" cy="13" rx="2" ry="3" transform="rotate(-10 17 13)" /><ellipse cx="10" cy="19" rx="2" ry="3" transform="rotate(5 10 19)" /></>),
  },

  'cholesterol': {
    colors: 'text-amber-500 bg-amber-50',
    path: (<><path d="M4 14 L6 10 L10 10 L12 14 L10 18 L6 18Z" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10 10 L14 8 L18 10 L18 14 L16 18 L12 14 L10 10Z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.8" /><circle cx="4" cy="14" r="1.5" /><circle cx="18" cy="12" r="1.5" /><path d="M4 10 L4 7 M18 10 L20 7" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" /></>),
  },

  'coq10': {
    colors: 'text-orange-500 bg-orange-50',
    path: (<><path d="M12 4 L18 8 L18 16 L12 20 L6 16 L6 8Z" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="8" r="1.5" /><circle cx="17" cy="11" r="1.5" /><circle cx="17" cy="14" r="1.5" /><circle cx="12" cy="17" r="1.5" /><circle cx="7" cy="14" r="1.5" /><circle cx="7" cy="11" r="1.5" /><circle cx="12" cy="12" r="3.5" /><circle cx="12" cy="12" r="1.5" fill="white" opacity="0.4" /></>),
  },

  'copper peptide': {
    colors: 'text-orange-600 bg-orange-50',
    path: (<><circle cx="4" cy="12" r="2.5" /><circle cx="10" cy="8" r="2.5" /><circle cx="16" cy="8" r="2.5" /><circle cx="20" cy="12" r="2.5" /><circle cx="16" cy="16" r="2" opacity="0.8" /><circle cx="10" cy="16" r="2" opacity="0.8" /><path d="M6 12 L8 8 M12 8 L14 8 M18 8 L18 12 M18 12 L16 16 M14 16 L12 16 M10 16 L8 12" fill="none" strokeWidth="1.8" stroke="currentColor" strokeLinecap="round" /><circle cx="4" cy="12" r="1.2" fill="white" opacity="0.4" /></>),
  },

  'dmae': {
    colors: 'text-blue-500 bg-blue-50',
    path: (<><circle cx="12" cy="8" r="3.5" /><circle cx="5" cy="15" r="3" /><circle cx="19" cy="15" r="3" /><path d="M9 10 L7 14 M15 10 L17 14" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" /><path d="M8 14 L16 14" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.6" /><path d="M12 12 L12 20" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" /></>),
  },

  'egf': {
    colors: 'text-emerald-500 bg-emerald-50',
    path: (<><path d="M12 20 C9 17 6 14 6 11 C6 8 8 6 12 6 C16 6 18 8 18 11 C18 14 15 16 12 16 C10 16 8 15 8 13 C8 11 10 10 12 10" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" /><circle cx="12" cy="10" r="2" /><circle cx="12" cy="6" r="1.5" opacity="0.8" /></>),
  },

  'fulvic acid': {
    colors: 'text-stone-600 bg-stone-50',
    path: (<><rect x="3" y="6" width="18" height="3" rx="1.5" /><rect x="3" y="11" width="18" height="3.5" rx="1.75" opacity="0.8" /><rect x="3" y="17" width="18" height="3.5" rx="1.75" opacity="0.6" /><path d="M7 6 L5 3 M12 6 L12 3 M17 6 L19 3" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" /></>),
  },

  'gluconolactone': {
    colors: 'text-cyan-400 bg-cyan-50',
    path: (<><path d="M12 5 L18 9 L18 17 L12 21 L6 17 L6 9Z" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="5" r="1.5" /><circle cx="18" cy="9" r="1.5" /><circle cx="18" cy="17" r="1.5" /><circle cx="12" cy="21" r="1.5" /><circle cx="6" cy="17" r="1.5" /><circle cx="6" cy="9" r="1.5" /><circle cx="12" cy="13" r="3" /><circle cx="12" cy="13" r="1.5" fill="white" opacity="0.4" /></>),
  },

  'idebenone': {
    colors: 'text-orange-500 bg-orange-50',
    path: (<><path d="M12 4 L18 8 L18 16 L12 20 L6 16 L6 8Z" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="8" r="1.5" /><circle cx="17" cy="11" r="1.5" /><circle cx="17" cy="14" r="1.5" /><circle cx="12" cy="17" r="1.5" /><circle cx="7" cy="14" r="1.5" /><circle cx="7" cy="11" r="1.5" /><circle cx="12" cy="12" r="3" /><path d="M12 12 L18 8 M12 12 L6 16" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4" /></>),
  },

  'l-ascorbic': {
    colors: 'text-orange-400 bg-orange-50',
    path: (<><circle cx="12" cy="12" r="9" />{[0,60,120,180,240,300].map((deg, i) => { const r = deg * Math.PI / 180; return <line key={i} x1="12" y1="12" x2={12 + 9 * Math.sin(r)} y2={12 - 9 * Math.cos(r)} strokeWidth="0.8" stroke="white" opacity="0.4" />; })}<circle cx="12" cy="12" r="3" fill="white" opacity="0.5" /><path d="M10 9 L10 15 M13 9 L13 15 M10 12 L13 12" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" /></>),
  },

  'magnesium ascorbyl': {
    colors: 'text-orange-300 bg-orange-50',
    path: (<><circle cx="12" cy="12" r="8.5" />{[0,60,120,180,240,300].map((deg, i) => { const r = deg * Math.PI / 180; return <line key={i} x1="12" y1="12" x2={12 + 8.5 * Math.sin(r)} y2={12 - 8.5 * Math.cos(r)} strokeWidth="0.8" stroke="white" opacity="0.3" />; })}<circle cx="12" cy="12" r="3.5" fill="white" opacity="0.5" /></>),
  },

  'mandelic acid': {
    colors: 'text-amber-300 bg-amber-50',
    path: (<><path d="M12 3 C16 3 20 7 20 12 C20 17 16 21 12 21 C8 21 4 17 4 12 C4 7 8 3 12 3Z M12 3 C8 3 8 12 12 21" /><path d="M12 6 C14 7 16 10 16 13" fill="none" strokeWidth="1" stroke="white" opacity="0.35" strokeLinecap="round" /><circle cx="16" cy="18" r="1.5" opacity="0.7" /></>),
  },

  'marine collagen': {
    colors: 'text-blue-400 bg-blue-50',
    path: (<><path d="M3 14 C5 12 7 16 9 14 C11 12 13 16 15 14 C17 12 19 16 21 14" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" /><path d="M3 11 C5 9 7 13 9 11 C11 9 13 13 15 11 C17 9 19 13 21 11" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.7" /><circle cx="9" cy="8" r="2" /><circle cx="15" cy="8" r="2" /><path d="M9 8 L9 5 M15 8 L15 5" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" opacity="0.5" /></>),
  },

  'matrixyl': {
    colors: 'text-violet-500 bg-violet-50',
    path: (<><circle cx="4" cy="12" r="2.5" /><circle cx="10" cy="7" r="2.5" /><circle cx="16" cy="7" r="2.5" /><circle cx="20" cy="12" r="2.5" /><circle cx="16" cy="17" r="2" opacity="0.8" /><circle cx="10" cy="17" r="2" opacity="0.8" /><path d="M6 12 L8 7 M12 7 L14 7 M18 7 L18 12 M18 12 L16 17 M14 17 L12 17 M10 17 L8 12" fill="none" strokeWidth="1.8" stroke="currentColor" strokeLinecap="round" /></>),
  },

  'msm': {
    colors: 'text-sky-500 bg-sky-50',
    path: (<><path d="M12 3 L17 7.5 L17 16.5 L12 21 L7 16.5 L7 7.5Z" /><path d="M7 7.5 L12 12 L17 7.5 M12 12 L12 21 M7 16.5 L12 12 L17 16.5" stroke="white" strokeWidth="0.8" fill="none" opacity="0.25" /><circle cx="12" cy="12" r="3" fill="white" opacity="0.2" /></>),
  },

  'oat beta glucan': {
    colors: 'text-amber-500 bg-amber-50',
    path: (<><path d="M12 22 L12 6" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><ellipse cx="12" cy="4" rx="2.5" ry="3" /><path d="M9 8 L6 6 M9 11 L6 9 M9 14 L6 12 M9 17 L6 15" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.7" /><path d="M15 8 L18 6 M15 11 L18 9 M15 14 L18 12 M15 17 L18 15" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.7" /></>),
  },

  'phytic acid': {
    colors: 'text-amber-300 bg-amber-50',
    path: (<><path d="M12 4 L18 8 L18 16 L12 20 L6 16 L6 8Z" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="4" r="1.8" /><circle cx="18" cy="8" r="1.8" /><circle cx="18" cy="16" r="1.8" /><circle cx="12" cy="20" r="1.8" /><circle cx="6" cy="16" r="1.8" /><circle cx="6" cy="8" r="1.8" /><circle cx="12" cy="12" r="2.5" /><path d="M12 4 L12 9.5 M18 8 L14.5 10 M18 16 L14.5 14 M12 20 L12 14.5 M6 16 L9.5 14 M6 8 L9.5 10" fill="none" strokeWidth="1" stroke="currentColor" opacity="0.4" /></>),
  },

  'polyglutamic': {
    colors: 'text-blue-400 bg-blue-50',
    path: (<><path d="M12 3 C12 3 4 10 4 15 A8 8 0 0 0 20 15 C20 10 12 3 12 3Z" /><path d="M7 13 Q9 11 11 13 Q13 15 15 13 Q17 11 18 13" fill="none" strokeWidth="1.5" stroke="white" opacity="0.5" strokeLinecap="round" /><path d="M7 16 Q9 14 11 16 Q13 18 15 16" fill="none" strokeWidth="1.2" stroke="white" opacity="0.35" strokeLinecap="round" /></>),
  },

  'sodium pca': {
    colors: 'text-sky-400 bg-sky-50',
    path: (<><path d="M12 3 C12 3 5 11 5 16 A7 7 0 0 0 19 16 C19 11 12 3 12 3Z" /><path d="M7.5 15 Q9.5 13 11.5 15 Q13.5 17 15.5 15 Q17.5 13 18.5 15" fill="none" strokeWidth="1.5" stroke="white" opacity="0.5" strokeLinecap="round" /><circle cx="9" cy="15" r="1.5" fill="white" opacity="0.4" /></>),
  },

  'zinc pca': {
    colors: 'text-blue-400 bg-blue-50',
    path: (<><path d="M9 4 L15 4 L18 9 L15 14 L9 14 L6 9Z" /><path d="M9 14 L15 14 L18 19 L15 19 L9 19 L6 19Z" opacity="0.6" /><path d="M9 4 L6 9 L6 19" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.4" /></>),
  },

  // ─── WAXES (expanded) ─────────────────────────────────────────────────────

  'microcrystalline': {
    colors: 'text-slate-400 bg-slate-50',
    path: (<><rect x="3" y="6" width="18" height="5" rx="2.5" /><rect x="4" y="13" width="16" height="5" rx="2.5" opacity="0.7" /><rect x="6" y="9" width="12" height="3.5" rx="1.75" opacity="0.5" /><path d="M7 6 L5 3 M12 6 L12 3 M17 6 L19 3" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" opacity="0.5" /></>),
  },

  'myristyl': {
    colors: 'text-stone-400 bg-stone-50',
    path: (<><path d="M4 14 L7 9 L10 14 L13 9 L16 14 L19 9" fill="none" strokeWidth="2.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /><circle cx="4" cy="14" r="2" /><circle cx="10" cy="14" r="2" /><circle cx="16" cy="14" r="2" /><circle cx="7" cy="9" r="1.5" opacity="0.7" /><circle cx="13" cy="9" r="1.5" opacity="0.7" /><circle cx="19" cy="9" r="1.5" opacity="0.7" /></>),
  },

  'ozokerite': {
    colors: 'text-stone-500 bg-stone-100',
    path: (<><path d="M5 9 L5 18 Q5 21 12 21 Q19 21 19 18 L19 9 Q19 6 12 6 Q5 6 5 9Z" /><path d="M5 9 Q12 12 19 9" fill="none" strokeWidth="1.5" stroke="white" opacity="0.3" strokeLinecap="round" /><path d="M8 3 Q12 1 16 3" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" /></>),
  },

  'stearyl alcohol': {
    colors: 'text-sky-300 bg-sky-50',
    path: (<><path d="M5 8 L9 4 L19 4 L19 16 L15 20 L5 20Z" /><path d="M5 8 L5 20 M9 4 L9 16 L5 20" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" /><path d="M9 7 L17 7 M9 11 L17 11 M9 15 L17 15" stroke="white" strokeWidth="0.8" fill="none" opacity="0.3" strokeLinecap="round" /><circle cx="20" cy="18" r="2.5" opacity="0.7" /></>),
  },

  // ─── PRESERVATIVES / OTHER (expanded) ────────────────────────────────────

  'edta': {
    colors: 'text-slate-500 bg-slate-50',
    path: (<><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="6" cy="8" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="6" cy="16" r="2" /><circle cx="18" cy="16" r="2" /><path d="M7.5 9.5 L10.5 10.5 M13.5 10.5 L16.5 9.5 M7.5 14.5 L10.5 13.5 M13.5 13.5 L16.5 14.5" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" /><circle cx="12" cy="12" r="2" /></>),
  },

  'germall': {
    colors: 'text-slate-500 bg-slate-50',
    path: (<><path d="M12 2 L20 6 L20 13 Q20 18 12 22 Q4 18 4 13 L4 6Z" /><path d="M8 12 L11 15 L16 9" fill="none" strokeWidth="2.5" stroke="white" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 2 L12 6" stroke="white" strokeWidth="1" fill="none" opacity="0.4" /></>),
  },

  'leucidal': {
    colors: 'text-emerald-500 bg-emerald-50',
    path: (<><path d="M10 4 L10 10 L5 18 Q4 20 6 20 L18 20 Q20 20 19 18 L14 10 L14 4 Z" /><path d="M9 4 L15 4" strokeWidth="1.5" strokeLinecap="round" stroke="currentColor" fill="none" /><circle cx="9" cy="16" r="1.5" fill="white" opacity="0.5" /><circle cx="12" cy="14" r="1" fill="white" opacity="0.4" /><circle cx="15" cy="17" r="1.5" fill="white" opacity="0.5" /></>),
  },

  'naticide': {
    colors: 'text-green-500 bg-green-50',
    path: (<><path d="M12 2 L20 6 L20 13 Q20 18 12 22 Q4 18 4 13 L4 6Z" /><path d="M12 8 C12 8 8 11 8 14 C8 17 10 19 12 19 C14 19 16 17 16 14 C16 11 12 8 12 8Z" fill="white" opacity="0.6" /><path d="M12 8 L12 19" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3" /></>),
  },

  'optiphen': {
    colors: 'text-slate-500 bg-slate-50',
    path: (<><path d="M12 2 L20 6 L20 13 Q20 18 12 22 Q4 18 4 13 L4 6Z" /><path d="M8 10 L11 13 L16 8" fill="none" strokeWidth="2.5" stroke="white" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" /><circle cx="16" cy="18" r="2.5" fill="white" opacity="0.3" /></>),
  },

  'sodium hydroxypropyl': {
    colors: 'text-stone-400 bg-stone-50',
    path: (<><rect x="3" y="9" width="18" height="3" rx="1.5" /><rect x="4" y="13" width="14" height="2.5" rx="1.25" opacity="0.8" /><rect x="5" y="16" width="10" height="2" rx="1" opacity="0.65" /><path d="M6 9 L6 5 M11 9 L11 5 M16 9 L16 5" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.5" /><circle cx="6" cy="5" r="1.5" opacity="0.7" /><circle cx="11" cy="5" r="1.5" opacity="0.7" /><circle cx="16" cy="5" r="1.5" opacity="0.7" /></>),
  },

  // ─── FRAGRANCE OILS (new v2) ──────────────────────────────────────────────

  'chia fragrance': {
    colors: 'text-emerald-600 bg-emerald-50',
    path: (<><path d="M10 4 L10 7 Q7 9 6 13 L6 20 Q6 22 9 22 L15 22 Q18 22 18 20 L18 13 Q17 9 14 7 L14 4Z" /><rect x="9" y="2" width="6" height="3" rx="1" opacity="0.8" /><path d="M9 14 Q9.5 12 9.5 17" fill="none" strokeWidth="1.5" stroke="white" opacity="0.35" strokeLinecap="round" /></>),
  },

  'raspberry': {
    colors: 'text-rose-500 bg-rose-50',
    path: (<><circle cx="9"  cy="11" r="3.2" /><circle cx="15" cy="11" r="3.2" /><circle cx="12" cy="16" r="3.2" /><circle cx="9"  cy="11" r="1.1" fill="white" opacity="0.3" /><circle cx="15" cy="11" r="1.1" fill="white" opacity="0.3" /><circle cx="12" cy="16" r="1.1" fill="white" opacity="0.3" /><path d="M12 7 L12 4" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M10 6 Q12 4 14 6" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" opacity="0.6" /></>),
  },

  'peach': {
    colors: 'text-orange-300 bg-orange-50',
    path: (<><path d="M6 14 C6 8 9 5 12 5 C15 5 18 8 18 14 C18 18 15 21 12 21 C9 21 6 18 6 14Z" /><path d="M12 5 L12 3" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M12 3 Q14 2 15 4" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" opacity="0.7" /><path d="M12 10 Q13 8 13 12" fill="none" strokeWidth="1.5" stroke="white" opacity="0.35" strokeLinecap="round" /><path d="M12 5 L12 21" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.2" /></>),
  },

  'fig': {
    colors: 'text-purple-600 bg-purple-50',
    path: (<><path d="M7 13 Q7 7 12 5 Q17 7 17 13 Q17 19 12 21 Q7 19 7 13Z" /><path d="M12 5 L12 2" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M9 11 Q12 9 15 11" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" /><circle cx="12" cy="16" r="2" fill="white" opacity="0.15" /><path d="M11 15 L11 18 M13 15 L13 18" stroke="white" strokeWidth="0.7" fill="none" opacity="0.3" strokeLinecap="round" /></>),
  },

  'blackberry': {
    colors: 'text-purple-900 bg-purple-100',
    path: (<><circle cx="9"  cy="12" r="3" /><circle cx="15" cy="12" r="3" /><circle cx="12" cy="7"  r="3" /><circle cx="12" cy="17" r="3" /><circle cx="9"  cy="12" r="1" fill="white" opacity="0.25" /><circle cx="15" cy="12" r="1" fill="white" opacity="0.25" /><circle cx="12" cy="7"  r="1" fill="white" opacity="0.25" /><circle cx="12" cy="17" r="1" fill="white" opacity="0.25" /><path d="M13 4 Q15 2 16 4" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" opacity="0.7" /></>),
  },

  'sweet pea': {
    colors: 'text-pink-400 bg-pink-50',
    path: (<><ellipse cx="9" cy="12" rx="4.5" ry="3" transform="rotate(-20 9 12)" /><ellipse cx="15" cy="12" rx="4.5" ry="3" transform="rotate(20 15 12)" /><circle cx="12" cy="12" r="2.5" fill="white" opacity="0.6" /><path d="M12 15 L12 21" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M9 19 Q12 17 15 19" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" opacity="0.6" /></>),
  },

  'freesia': {
    colors: 'text-yellow-300 bg-yellow-50',
    path: (<><path d="M12 22 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M12 12 Q9 10 7 6 Q10 5 12 8" /><path d="M12 12 Q11 9 12 5 Q14 6 14 9" opacity="0.85" /><path d="M12 12 Q15 10 17 6 Q14 5 12 8" opacity="0.85" /><path d="M12 15 Q9 14 8 18" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.6" /><path d="M12 15 Q15 14 16 18" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.6" /></>),
  },

  'magnolia': {
    colors: 'text-stone-200 bg-stone-50',
    path: (<><ellipse cx="12" cy="11" rx="4" ry="7" /><ellipse cx="7" cy="14" rx="3.5" ry="6" transform="rotate(-40 7 14)" opacity="0.85" /><ellipse cx="17" cy="14" rx="3.5" ry="6" transform="rotate(40 17 14)" opacity="0.85" /><circle cx="12" cy="12" r="2.5" fill="white" opacity="0.5" /><path d="M12 18 L12 22" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /></>),
  },

  'peony': {
    colors: 'text-pink-500 bg-pink-50',
    path: (<><ellipse cx="12" cy="13" rx="7" ry="6" /><ellipse cx="12" cy="11" rx="5" ry="4" opacity="0.75" /><ellipse cx="12" cy="9"  rx="3.5" ry="3" opacity="0.6" /><circle cx="12" cy="8" r="2" fill="white" opacity="0.5" /><path d="M12 19 L12 22" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /></>),
  },

  'lily': {
    colors: 'text-pink-200 bg-pink-50',
    path: (<><path d="M12 22 L12 14" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />{[0,72,144,216,288].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 7 * Math.sin(r), cy = 14 - 7 * Math.cos(r); return <ellipse key={i} cx={cx} cy={cy} rx="2" ry="4.5" transform={`rotate(${deg} ${cx} ${cy})`} opacity={i < 3 ? 1 : 0.85} />; })}<circle cx="12" cy="14" r="2" fill="white" opacity="0.6" /></>),
  },

  'orchid': {
    colors: 'text-fuchsia-500 bg-fuchsia-50',
    path: (<><ellipse cx="12" cy="8" rx="3" ry="5" /><ellipse cx="7"  cy="13" rx="3" ry="5" transform="rotate(-35 7 13)" opacity="0.9" /><ellipse cx="17" cy="13" rx="3" ry="5" transform="rotate(35 17 13)" opacity="0.9" /><ellipse cx="8"  cy="18" rx="2.5" ry="4" transform="rotate(15 8 18)"  opacity="0.8" /><ellipse cx="16" cy="18" rx="2.5" ry="4" transform="rotate(-15 16 18)" opacity="0.8" /><circle cx="12" cy="13" r="2.5" fill="white" opacity="0.7" /><circle cx="12" cy="13" r="1.2" opacity="0.7" /></>),
  },

  'tuberose': {
    colors: 'text-orange-100 bg-orange-50',
    path: (<><path d="M12 22 L12 12" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />{[0,60,120,180,240,300].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 5 * Math.sin(r), cy = 12 - 5 * Math.cos(r); return <ellipse key={i} cx={cx} cy={cy} rx="1.8" ry="3.5" transform={`rotate(${deg} ${cx} ${cy})`} opacity={0.85} />; })}<circle cx="12" cy="12" r="2.5" fill="white" opacity="0.6" /><path d="M12 15 Q9 16 8 20 M12 15 Q15 16 16 20" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" opacity="0.5" /></>),
  },

  'violet fragrance': {
    colors: 'text-violet-600 bg-violet-50',
    path: (<><path d="M12 22 L12 14" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><ellipse cx="8"  cy="10" rx="4" ry="2.5" transform="rotate(-30 8 10)"  /><ellipse cx="16" cy="10" rx="4" ry="2.5" transform="rotate(30 16 10)"  /><ellipse cx="12" cy="7"  rx="4" ry="2.5" transform="rotate(-5 12 7)"   /><ellipse cx="7"  cy="15" rx="4" ry="2.5" transform="rotate(40 7 15)"   opacity="0.85" /><ellipse cx="17" cy="15" rx="4" ry="2.5" transform="rotate(-40 17 15)" opacity="0.85" /><circle cx="12" cy="12" r="2" fill="white" opacity="0.7" /></>),
  },

  'iris': {
    colors: 'text-indigo-500 bg-indigo-50',
    path: (<><path d="M12 22 L12 13" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" /><ellipse cx="12" cy="7" rx="3" ry="5.5" /><ellipse cx="7"  cy="13" rx="3.5" ry="5" transform="rotate(-50 7 13)"  opacity="0.85" /><ellipse cx="17" cy="13" rx="3.5" ry="5" transform="rotate(50 17 13)"  opacity="0.85" /><path d="M12 13 Q10 10 8 11 M12 13 Q14 10 16 11" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" /></>),
  },

  'cherry blossom': {
    colors: 'text-pink-300 bg-pink-50',
    path: (<>{[0,72,144,216,288].map((deg, i) => { const r = deg * Math.PI / 180; const cx = 12 + 6 * Math.sin(r), cy = 11 - 6 * Math.cos(r); return <ellipse key={i} cx={cx} cy={cy} rx="2.2" ry="3.2" transform={`rotate(${deg} ${cx} ${cy})`} />; })}<circle cx="12" cy="11" r="2.5" fill="white" opacity="0.8" /><circle cx="12" cy="11" r="1.2" opacity="0.7" /><path d="M12 18 L12 22" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M10 20 Q12 19 14 20" fill="none" strokeWidth="1" stroke="currentColor" strokeLinecap="round" opacity="0.5" /></>),
  },

  'cherry': {
    colors: 'text-red-600 bg-red-50',
    path: (<><circle cx="9"  cy="16" r="4.5" /><circle cx="15" cy="16" r="4.5" /><circle cx="9"  cy="16" r="1.5" fill="white" opacity="0.3" /><circle cx="15" cy="16" r="1.5" fill="white" opacity="0.3" /><path d="M9 11 Q10 5 12 4 Q14 5 15 11" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" /><path d="M12 4 L12 2" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" /></>),
  },

  'clean cotton': {
    colors: 'text-sky-300 bg-sky-50',
    path: (<><path d="M6 12 Q6 6 12 4 Q18 6 18 12 Q18 16 15 18 Q13 20 12 22 Q11 20 9 18 Q6 16 6 12Z" /><path d="M9 9 Q12 7 15 9" fill="none" strokeWidth="1" stroke="white" opacity="0.35" strokeLinecap="round" /><path d="M8 13 Q12 11 16 13" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" /><path d="M9 17 Q12 15 15 17" fill="none" strokeWidth="1" stroke="white" opacity="0.25" strokeLinecap="round" /></>),
  },

  'caramel': {
    colors: 'text-amber-700 bg-amber-100',
    path: (<><rect x="4" y="7" width="16" height="12" rx="3" /><path d="M4 12 Q12 10 20 12" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" /><path d="M10 4 Q10 1 12 2 Q14 1 14 4" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" /><path d="M10 19 Q10 22 12 21 Q14 22 14 19" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.6" /></>),
  },

  'chocolate': {
    colors: 'text-stone-800 bg-stone-100',
    path: (<><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10 L21 10 M3 14 L21 14" stroke="white" strokeWidth="0.8" fill="none" opacity="0.25" /><path d="M9 6 L9 20 M15 6 L15 20" stroke="white" strokeWidth="0.8" fill="none" opacity="0.25" /><path d="M6 7 Q7 5 8 6" fill="none" strokeWidth="1.2" stroke="currentColor" strokeLinecap="round" opacity="0.5" /></>),
  },

  'pumpkin spice': {
    colors: 'text-orange-600 bg-orange-50',
    path: (<><path d="M8 10 Q6 8 7 6 Q9 5 11 7" /><path d="M16 10 Q18 8 17 6 Q15 5 13 7" opacity="0.85" /><path d="M5 14 Q5 9 9 8 Q12 7 15 8 Q19 9 19 14 Q19 19 12 21 Q5 19 5 14Z" /><path d="M12 7 L12 4 Q13 2 14 3" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" /><path d="M8 13 Q12 11 16 13" fill="none" strokeWidth="1" stroke="white" opacity="0.3" strokeLinecap="round" /></>),
  },

  'buttercream': {
    colors: 'text-yellow-200 bg-yellow-50',
    path: (<><path d="M5 14 Q5 10 7 9 Q8 7 12 7 Q16 7 17 9 Q19 10 19 14 Q19 18 12 19 Q5 18 5 14Z" /><path d="M8 7 Q9 4 12 3 Q15 4 16 7" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" /><path d="M10 5 Q12 3 14 5" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.7" /><path d="M8 12 Q12 10 16 12" fill="none" strokeWidth="1" stroke="white" opacity="0.4" strokeLinecap="round" /></>),
  },

  // ─── COLORANTS (new v2 — paint swatch shapes) ────────────────────────────

  'ultramarine pink': {
    colors: 'text-pink-500 bg-pink-50',
    path: (<><path d="M8 4 L16 4 L20 10 L18 18 L12 20 L6 18 L4 10Z" /><path d="M8 4 L4 10 L6 18" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" /><path d="M10 7 L6 12 L8 17" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2" /><path d="M12 4 L12 20" stroke="white" strokeWidth="0.5" fill="none" opacity="0.15" /></>),
  },

  'ultramarine violet': {
    colors: 'text-violet-600 bg-violet-50',
    path: (<><path d="M8 4 L16 4 L20 10 L18 18 L12 20 L6 18 L4 10Z" /><path d="M8 4 L4 10 L6 18" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" /><path d="M10 7 L6 12 L8 17" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2" /><path d="M12 4 L12 20" stroke="white" strokeWidth="0.5" fill="none" opacity="0.15" /></>),
  },

  'ultramarine green': {
    colors: 'text-green-600 bg-green-50',
    path: (<><path d="M8 4 L16 4 L20 10 L18 18 L12 20 L6 18 L4 10Z" /><path d="M8 4 L4 10 L6 18" fill="none" stroke="white" strokeWidth="0.8" opacity="0.3" /><path d="M10 7 L6 12 L8 17" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2" /><path d="M12 4 L12 20" stroke="white" strokeWidth="0.5" fill="none" opacity="0.15" /></>),
  },

  'iron oxide red': {
    colors: 'text-red-600 bg-red-50',
    path: (<><path d="M12 3 L16 8 L20 7 L18 12 L21 16 L16 15 L12 21 L8 15 L3 16 L6 12 L4 7 L8 8Z" /><path d="M12 8 L12 16 M8 10 L16 14 M16 10 L8 14" stroke="white" strokeWidth="0.7" fill="none" opacity="0.25" /></>),
  },

  'iron oxide yellow': {
    colors: 'text-yellow-600 bg-yellow-50',
    path: (<><path d="M12 3 L16 8 L20 7 L18 12 L21 16 L16 15 L12 21 L8 15 L3 16 L6 12 L4 7 L8 8Z" /><path d="M12 8 L12 16 M8 10 L16 14 M16 10 L8 14" stroke="white" strokeWidth="0.7" fill="none" opacity="0.25" /></>),
  },

  'iron oxide brown': {
    colors: 'text-amber-800 bg-amber-100',
    path: (<><path d="M12 3 L16 8 L20 7 L18 12 L21 16 L16 15 L12 21 L8 15 L3 16 L6 12 L4 7 L8 8Z" /><path d="M12 8 L12 16 M8 10 L16 14 M16 10 L8 14" stroke="white" strokeWidth="0.7" fill="none" opacity="0.25" /></>),
  },

  'iron oxide black': {
    colors: 'text-slate-900 bg-slate-100',
    path: (<><path d="M12 3 L16 8 L20 7 L18 12 L21 16 L16 15 L12 21 L8 15 L3 16 L6 12 L4 7 L8 8Z" /><path d="M12 8 L12 16 M8 10 L16 14 M16 10 L8 14" stroke="white" strokeWidth="0.7" fill="none" opacity="0.2" /></>),
  },

  'copper mica': {
    colors: 'text-orange-600 bg-orange-50',
    path: (<><path d="M6 18 L4 10 L12 4 L20 10 L18 18Z" /><path d="M6 18 L4 10 L12 4" fill="none" stroke="white" strokeWidth="0.8" opacity="0.4" /><path d="M8 16 L6 10 L13 5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" /><path d="M10 14 L8 10 L14 6" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2" /><ellipse cx="13" cy="13" rx="4" ry="2" fill="white" opacity="0.15" /></>),
  },

  'gold mica': {
    colors: 'text-yellow-500 bg-yellow-50',
    path: (<><path d="M6 18 L4 10 L12 4 L20 10 L18 18Z" /><path d="M6 18 L4 10 L12 4" fill="none" stroke="white" strokeWidth="0.8" opacity="0.4" /><path d="M8 16 L6 10 L13 5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" /><path d="M10 14 L8 10 L14 6" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2" /><ellipse cx="13" cy="13" rx="4" ry="2" fill="white" opacity="0.2" /></>),
  },

  'silver mica': {
    colors: 'text-slate-400 bg-slate-50',
    path: (<><path d="M6 18 L4 10 L12 4 L20 10 L18 18Z" /><path d="M6 18 L4 10 L12 4" fill="none" stroke="white" strokeWidth="0.8" opacity="0.4" /><path d="M8 16 L6 10 L13 5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" /><path d="M10 14 L8 10 L14 6" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2" /><ellipse cx="13" cy="13" rx="4" ry="2" fill="white" opacity="0.25" /></>),
  },

  'bronze mica': {
    colors: 'text-amber-700 bg-amber-100',
    path: (<><path d="M6 18 L4 10 L12 4 L20 10 L18 18Z" /><path d="M6 18 L4 10 L12 4" fill="none" stroke="white" strokeWidth="0.8" opacity="0.4" /><path d="M8 16 L6 10 L13 5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" /><path d="M10 14 L8 10 L14 6" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2" /><ellipse cx="13" cy="13" rx="4" ry="2" fill="white" opacity="0.15" /></>),
  },

  'pearl mica': {
    colors: 'text-slate-300 bg-slate-50',
    path: (<><path d="M6 18 L4 10 L12 4 L20 10 L18 18Z" /><path d="M6 18 L4 10 L12 4" fill="none" stroke="white" strokeWidth="0.8" opacity="0.5" /><path d="M8 16 L6 10 L13 5" fill="none" stroke="white" strokeWidth="0.6" opacity="0.4" /><path d="M10 14 L8 10 L14 6" fill="none" stroke="white" strokeWidth="0.6" opacity="0.35" /><ellipse cx="13" cy="13" rx="4" ry="2" fill="white" opacity="0.35" /></>),
  },

  'rose gold mica': {
    colors: 'text-rose-400 bg-rose-50',
    path: (<><path d="M6 18 L4 10 L12 4 L20 10 L18 18Z" /><path d="M6 18 L4 10 L12 4" fill="none" stroke="white" strokeWidth="0.8" opacity="0.4" /><path d="M8 16 L6 10 L13 5" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" /><path d="M10 14 L8 10 L14 6" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2" /><ellipse cx="13" cy="13" rx="4" ry="2" fill="white" opacity="0.2" /></>),
  },

  'glitter': {
    colors: 'text-fuchsia-400 bg-fuchsia-50',
    path: (<><path d="M12 2 L13.5 8 L19 6 L15 11 L21 12 L15 13 L19 18 L13.5 16 L12 22 L10.5 16 L5 18 L9 13 L3 12 L9 11 L5 6 L10.5 8Z" /><circle cx="12" cy="12" r="2" fill="white" opacity="0.5" /></>),
  },

  'alkanet': {
    colors: 'text-purple-700 bg-purple-50',
    path: (<><path d="M12 6 Q10 10 8 15 Q7 19 9 21" strokeWidth="2.5" stroke="currentColor" fill="none" strokeLinecap="round" /><path d="M12 6 Q14 10 16 15 Q17 19 15 21" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.8" /><path d="M12 9 Q8 11 7 14" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.6" /><path d="M12 9 Q16 11 17 14" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" opacity="0.6" /><path d="M10 4 Q12 2 14 4" fill="none" strokeWidth="2" stroke="currentColor" strokeLinecap="round" /></>),
  },

  // ─── SEEDS ───────────────────────────────────────────────────────────────

  'chia': {
    colors: 'text-stone-700 bg-stone-100',
    path: (<><ellipse cx="9" cy="11" rx="2.5" ry="3.5" /><ellipse cx="15" cy="9" rx="2" ry="3" /><ellipse cx="12" cy="16" rx="2.5" ry="3.5" /><ellipse cx="9" cy="11" rx="1" ry="1.5" fill="white" opacity="0.3" /></>),
  },

  // ─── BOTANICALS & POWDERS ────────────────────────────────────────────────

  'beet': {
    colors: 'text-red-800 bg-red-50',
    path: (<><circle cx="12" cy="14" r="7" /><path d="M12 7 L11 4 M12 7 L13 4 M12 7 L10 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8" /><circle cx="12" cy="14" r="3.5" fill="white" opacity="0.15" /></>),
  },

  // ─── FRAGRANCE OILS ──────────────────────────────────────────────────────

  'ocean breeze': {
    colors: 'text-sky-500 bg-sky-50',
    path: (<><path d="M3 14 Q6 10 9 14 Q12 18 15 14 Q18 10 21 14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" /><path d="M3 18 Q6 14 9 18 Q12 22 15 18 Q18 14 21 18" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" /><path d="M5 10 Q8 7 11 10 Q14 13 17 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.3" /></>),
  },

  'watermelon': {
    colors: 'text-green-600 bg-green-50',
    path: (<><path d="M4 18 L12 4 L20 18Z" fill="currentColor" /><path d="M5.5 18 L12 6.5 L18.5 18Z" fill="#f9a8d4" /><circle cx="9" cy="15" r="1" fill="#1e293b" /><circle cx="13" cy="13" r="1" fill="#1e293b" /><circle cx="15" cy="16" r="1" fill="#1e293b" /></>),
  },

  'apple': {
    colors: 'text-red-500 bg-red-50',
    path: (<><path d="M12 6 C7 6 4 9 4 13 C4 18 7 22 12 22 C17 22 20 18 20 13 C20 9 17 6 12 6Z" /><path d="M12 6 C12 4 14 2 16 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M12 6 L12 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /><path d="M8 12 Q12 10 16 12" stroke="white" strokeWidth="0.8" fill="none" opacity="0.4" /></>),
  },

  'strawberry': {
    colors: 'text-red-500 bg-red-50',
    path: (<><path d="M12 20 C8 16 5 12 6 8 C7 5 9 4 12 5 C15 4 17 5 18 8 C19 12 16 16 12 20Z" /><path d="M9 4 C9 3 10 2 12 2 C14 2 15 3 15 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" /><circle cx="10" cy="11" r="0.8" fill="white" opacity="0.6" /><circle cx="13" cy="13" r="0.8" fill="white" opacity="0.6" /><circle cx="11" cy="15" r="0.8" fill="white" opacity="0.6" /></>),
  },

  'citrus burst': {
    colors: 'text-orange-400 bg-orange-50',
    path: (<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="5.5" fill="white" opacity="0.25" /><path d="M12 4 L12 20 M4 12 L20 12 M6.3 6.3 L17.7 17.7 M17.7 6.3 L6.3 17.7" stroke="white" strokeWidth="0.8" fill="none" opacity="0.5" /><circle cx="12" cy="12" r="2" fill="white" opacity="0.35" /></>),
  },

  // ─── YUMCRAFT 20-COLOR SOAP DYE SET — liquid drop icons ─────────────────
  // Consistent droplet shape: teardrop pointing up with highlight dot.
  // Keys are full ingredient name substrings so longer keys win over generic
  // short keys like 'rose', 'orange', 'peach' already in the map.

  'red soap colorant': {
    colors: 'text-red-500 bg-red-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.4" /></>),
  },

  'brick red soap colorant': {
    colors: 'text-red-800 bg-red-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.35" /></>),
  },

  'pink soap colorant': {
    colors: 'text-pink-400 bg-pink-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.45" /></>),
  },

  'rose soap colorant': {
    colors: 'text-rose-600 bg-rose-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.4" /></>),
  },

  'cherry red soap colorant': {
    colors: 'text-red-600 bg-red-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.4" /></>),
  },

  'orange soap colorant': {
    colors: 'text-orange-500 bg-orange-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.4" /></>),
  },

  'peach soap colorant': {
    colors: 'text-orange-300 bg-orange-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.5" /></>),
  },

  'lemon yellow soap colorant': {
    colors: 'text-yellow-400 bg-yellow-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.5" /></>),
  },

  'yellow soap colorant': {
    colors: 'text-yellow-500 bg-yellow-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.45" /></>),
  },

  'matcha green soap colorant': {
    colors: 'text-lime-700 bg-lime-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.4" /></>),
  },

  'grass green soap colorant': {
    colors: 'text-green-500 bg-green-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.4" /></>),
  },

  'teal soap colorant': {
    colors: 'text-teal-600 bg-teal-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.4" /></>),
  },

  'sky blue soap colorant': {
    colors: 'text-sky-400 bg-sky-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.45" /></>),
  },

  'navy blue soap colorant': {
    colors: 'text-blue-900 bg-blue-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.35" /></>),
  },

  'sapphire blue soap colorant': {
    colors: 'text-blue-700 bg-blue-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.4" /></>),
  },

  'purple soap colorant': {
    colors: 'text-purple-700 bg-purple-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.4" /></>),
  },

  'violet soap colorant': {
    colors: 'text-violet-600 bg-violet-50',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.4" /></>),
  },

  'black soap colorant': {
    colors: 'text-slate-900 bg-slate-100',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.3" /></>),
  },

  'white soap colorant': {
    colors: 'text-slate-400 bg-slate-100',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="10.5" cy="12.5" r="1.5" opacity="0.5" /></>),
  },

  'coffee brown soap colorant': {
    colors: 'text-amber-900 bg-amber-100',
    path: (<><path d="M12 4 C12 4 7 10 7 14.5 A5 5 0 0 0 17 14.5 C17 10 12 4 12 4Z" /><circle cx="10.5" cy="12.5" r="1.5" fill="white" opacity="0.35" /></>),
  },

  // ─── SMALLTONGUE 36-COLOR MICA POWDER SET — 4-pointed sparkle icons ──────
  // Keys are full ingredient names (lowercase) so they match before generic 'mica'.

  'pearl white mica': {
    colors: 'text-slate-300 bg-slate-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.6" /></>),
  },

  'champagne gold mica': {
    colors: 'text-yellow-300 bg-yellow-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.5" /></>),
  },

  'antique gold mica': {
    colors: 'text-yellow-700 bg-yellow-100',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.4" /></>),
  },

  'pearl pink mica': {
    colors: 'text-pink-300 bg-pink-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.5" /></>),
  },

  'coral pink mica': {
    colors: 'text-red-400 bg-red-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.4" /></>),
  },

  'hot pink mica': {
    colors: 'text-pink-600 bg-pink-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.4" /></>),
  },

  'ruby red mica': {
    colors: 'text-red-800 bg-red-100',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.3" /></>),
  },

  'brick red mica': {
    colors: 'text-red-700 bg-red-100',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.3" /></>),
  },

  'pearl orange mica': {
    colors: 'text-orange-400 bg-orange-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.5" /></>),
  },

  'peach mica': {
    colors: 'text-orange-200 bg-orange-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.6" /></>),
  },

  'nude mica': {
    colors: 'text-amber-300 bg-amber-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.5" /></>),
  },

  'lemon yellow mica': {
    colors: 'text-yellow-300 bg-yellow-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.55" /></>),
  },

  'bright yellow mica': {
    colors: 'text-yellow-400 bg-yellow-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.5" /></>),
  },

  'lime green mica': {
    colors: 'text-lime-500 bg-lime-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.45" /></>),
  },

  'emerald green mica': {
    colors: 'text-emerald-500 bg-emerald-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.4" /></>),
  },

  'forest green mica': {
    colors: 'text-green-700 bg-green-100',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.35" /></>),
  },

  'teal mica': {
    colors: 'text-teal-600 bg-teal-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.4" /></>),
  },

  'turquoise mica': {
    colors: 'text-cyan-400 bg-cyan-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.5" /></>),
  },

  'ocean blue mica': {
    colors: 'text-blue-700 bg-blue-100',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.35" /></>),
  },

  'sky blue mica': {
    colors: 'text-sky-300 bg-sky-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.6" /></>),
  },

  'sapphire blue mica': {
    colors: 'text-blue-600 bg-blue-100',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.4" /></>),
  },

  'navy blue mica': {
    colors: 'text-blue-900 bg-blue-100',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.3" /></>),
  },

  'lavender mica': {
    colors: 'text-violet-300 bg-violet-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.55" /></>),
  },

  'purple mica': {
    colors: 'text-purple-700 bg-purple-100',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.35" /></>),
  },

  'black pearl mica': {
    colors: 'text-gray-800 bg-gray-100',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.25" /></>),
  },

  'blue-purple mirage mica': {
    colors: 'text-violet-600 bg-violet-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.5" /><path d="M12 5 L12 19 M5 12 L19 12" stroke="white" strokeWidth="0.5" fill="none" opacity="0.2" /></>),
  },

  'green-blue mirage mica': {
    colors: 'text-cyan-500 bg-cyan-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.5" /><path d="M12 5 L12 19 M5 12 L19 12" stroke="white" strokeWidth="0.5" fill="none" opacity="0.2" /></>),
  },

  'red-orange mirage mica': {
    colors: 'text-orange-600 bg-orange-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.45" /><path d="M12 5 L12 19 M5 12 L19 12" stroke="white" strokeWidth="0.5" fill="none" opacity="0.2" /></>),
  },

  'purple-pink mirage mica': {
    colors: 'text-fuchsia-500 bg-fuchsia-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.5" /><path d="M12 5 L12 19 M5 12 L19 12" stroke="white" strokeWidth="0.5" fill="none" opacity="0.2" /></>),
  },

  'gold-green mirage mica': {
    colors: 'text-lime-500 bg-lime-50',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.5" /><path d="M12 5 L12 19 M5 12 L19 12" stroke="white" strokeWidth="0.5" fill="none" opacity="0.2" /></>),
  },

  'black-purple mirage mica': {
    colors: 'text-purple-900 bg-purple-100',
    path: (<><path d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8Z" /><circle cx="12" cy="12" r="1.8" fill="white" opacity="0.3" /><path d="M12 5 L12 19 M5 12 L19 12" stroke="white" strokeWidth="0.5" fill="none" opacity="0.2" /></>),
  },

};

/**
 * Look up a specific icon by ingredient name.
 * Returns undefined if no specific match; fall back to category icon.
 *
 * Matching: normalize to lowercase, then check if any key is contained
 * in the ingredient name. Longer keys take priority.
 */
export function getIngredientSpecificIcon(name: string): SpecificIcon | undefined {
  const lower = name.toLowerCase().trim();
  // Sort keys by descending length so more-specific keys match first
  const keys = Object.keys(INGREDIENT_ICON_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lower.includes(key)) return INGREDIENT_ICON_MAP[key];
  }
  return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLORFUL FLAT-DESIGN SVG ICON LIBRARY
// Full-color 40×40 viewBox icons styled to match recipeHeroIcons.tsx.
// Each helper returns a JSX.Element stored directly (not a component).
// The IngredientIcon component renders these when available, falling back
// to the monochrome currentColor system above.
// ═══════════════════════════════════════════════════════════════════════════════

// ── Shape helpers ─────────────────────────────────────────────────────────────

/** Generic oil teardrop drop in a given main colour */
const _oil = (fill: string, shine = '#fff'): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    <path d="M20 5 C16 12 10 18 10 24 C10 31 14.5 35 20 35 C25.5 35 30 31 30 24 C30 18 24 12 20 5Z" fill={fill}/>
    <ellipse cx="15" cy="22" rx="2.5" ry="7" fill={shine} opacity="0.22" transform="rotate(-15 15 22)"/>
    <ellipse cx="23" cy="16" rx="1.5" ry="3" fill={shine} opacity="0.3"/>
  </svg>
);

/** Butter jar / block */
const _butter = (fill: string, lid: string): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    <rect x="8" y="18" width="24" height="16" rx="3" fill={fill}/>
    <rect x="10" y="12" width="20" height="8" rx="2" fill={lid}/>
    <ellipse cx="20" cy="18" rx="10" ry="3" fill={lid} opacity="0.7"/>
    <rect x="13" y="20" width="5" height="12" rx="2" fill="white" opacity="0.13"/>
  </svg>
);

/** Essential-oil dropper bottle */
const _eo = (body: string, liquid: string, cap = '#4B5563'): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    <rect x="13" y="18" width="14" height="18" rx="4" fill={body}/>
    <rect x="16" y="11" width="8" height="9" rx="2" fill={body} opacity="0.9"/>
    <rect x="17.5" y="6" width="5" height="6" rx="1.5" fill={cap}/>
    <rect x="13" y="26" width="14" height="10" rx="0 0 4 4" fill={liquid} opacity="0.55"/>
    <rect x="15" y="20" width="4" height="10" rx="2" fill="white" opacity="0.18"/>
  </svg>
);

/** Clay bowl viewed from above */
const _clay = (fill: string, rim: string): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    <path d="M8 17 Q8 33 20 33 Q32 33 32 17" fill={fill}/>
    <ellipse cx="20" cy="17" rx="12" ry="4" fill={rim}/>
    <ellipse cx="20" cy="27" rx="7" ry="3" fill="white" opacity="0.15"/>
  </svg>
);

/** Mica 4-pointed sparkle star */
const _mica = (fill: string, bg: string): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    <circle cx="20" cy="20" r="18" fill={bg} opacity="0.28"/>
    <path d="M20 4 L21.5 18.5 L36 20 L21.5 21.5 L20 36 L18.5 21.5 L4 20 L18.5 18.5Z" fill={fill}/>
    <circle cx="20" cy="20" r="3" fill="white" opacity="0.5"/>
  </svg>
);

/** Liquid colorant drop */
const _drop = (fill: string, dark: string): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    <path d="M20 5 C16 13 10 21 10 27 C10 33 14.5 36 20 36 C25.5 36 30 33 30 27 C30 21 24 13 20 5Z" fill={fill}/>
    <ellipse cx="15" cy="25" rx="2.5" ry="5.5" fill="white" opacity="0.22" transform="rotate(-15 15 25)"/>
    <ellipse cx="23" cy="19" rx="1.5" ry="3" fill="white" opacity="0.28"/>
    <ellipse cx="24" cy="29" rx="2" ry="1.2" fill={dark} opacity="0.3"/>
  </svg>
);

/** Melt-and-pour soap bar with bubbles */
const _soap = (fill: string, accent: string): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    <rect x="7" y="12" width="26" height="18" rx="5" fill={fill}/>
    <rect x="12" y="14" width="16" height="5" rx="2" fill={accent} opacity="0.32"/>
    <circle cx="15" cy="25" r="2.5" fill="white" opacity="0.28"/>
    <circle cx="23" cy="24" r="1.8" fill="white" opacity="0.22"/>
    <circle cx="19" cy="22" r="1.2" fill="white" opacity="0.30"/>
  </svg>
);

/** Perfume / fragrance bottle */
const _perfume = (body: string, liquid: string): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    <rect x="11" y="15" width="18" height="22" rx="5" fill={body}/>
    <path d="M15 15 L15 10 Q15 7 18 7 Q21 7 21 10 L21 15" fill={body} opacity="0.85" stroke={body} strokeWidth="1"/>
    <rect x="17" y="5" width="4" height="4" rx="1" fill="#9CA3AF"/>
    <rect x="11" y="27" width="18" height="10" rx="0 0 5 5" fill={liquid} opacity="0.50"/>
    <rect x="13" y="17" width="5" height="13" rx="2.5" fill="white" opacity="0.16"/>
  </svg>
);

/** Simple herb sprig */
const _herb = (stem: string, leaf: string): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    <line x1="20" y1="36" x2="20" y2="12" stroke={stem} strokeWidth="2" strokeLinecap="round"/>
    <path d="M20 24 C20 24 10 16 6 18 C9 24 20 24 20 24Z" fill={leaf}/>
    <path d="M20 18 C20 18 30 10 34 12 C31 18 20 18 20 18Z" fill={leaf} opacity="0.85"/>
    <path d="M20 30 C20 30 12 22 9 24" fill="none" stroke={stem} strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
  </svg>
);

/** Wax hexagon cell */
const _wax = (fill: string, inner: string): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    <polygon points="20,5 32,12 32,28 20,35 8,28 8,12" fill={fill}/>
    <polygon points="20,11 29,16 29,25 20,29 11,25 11,16" fill={inner} opacity="0.65"/>
    <circle cx="20" cy="20" r="3" fill="white" opacity="0.25"/>
  </svg>
);

/** Multi-petal flower */
const _flower = (petals: string, center: string, petalCount = 8): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    {Array.from({length: petalCount}, (_, i) => {
      const deg = (360 / petalCount) * i;
      const r = deg * Math.PI / 180;
      const cx = 20 + 11 * Math.sin(r);
      const cy = 20 - 11 * Math.cos(r);
      return <ellipse key={i} cx={cx} cy={cy} rx="3.2" ry="6" fill={petals} transform={`rotate(${deg} ${cx} ${cy})`}/>;
    })}
    <circle cx="20" cy="20" r="6" fill={center}/>
    <circle cx="20" cy="20" r="3.5" fill={center} opacity="0.6"/>
  </svg>
);

/** Citrus half-slice */
const _citrus = (rind: string, flesh: string): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    <circle cx="20" cy="20" r="14" fill={rind}/>
    <circle cx="20" cy="20" r="11" fill={flesh}/>
    <path d="M20 9 L20 31 M9 20 L31 20 M11.5 11.5 L28.5 28.5 M28.5 11.5 L11.5 28.5" stroke={rind} strokeWidth="1.2" fill="none" opacity="0.55"/>
    <circle cx="20" cy="20" r="4" fill={rind} opacity="0.35"/>
  </svg>
);

/** Milk / cream bottle */
const _milk = (body: string, shadow: string): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    <path d="M17 5 L23 5 L23 11 Q28 14 28 19 L28 33 Q28 36 25 36 L15 36 Q12 36 12 33 L12 19 Q12 14 17 11Z" fill={body}/>
    <path d="M17 5 L23 5" stroke={shadow} strokeWidth="2" strokeLinecap="round"/>
    <ellipse cx="20" cy="20" rx="6" ry="3.5" fill="white" opacity="0.3"/>
    <rect x="12" y="27" width="16" height="9" rx="0" fill={shadow} opacity="0.18"/>
  </svg>
);

/** Cosmetic active — central molecule with three satellite atoms */
const _molecule = (main: string, accent: string): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    <line x1="20" y1="20" x2="10" y2="12" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
    <line x1="20" y1="20" x2="30" y2="12" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
    <line x1="20" y1="20" x2="20" y2="32" stroke={accent} strokeWidth="2" strokeLinecap="round"/>
    <circle cx="10" cy="12" r="4.5" fill={accent}/>
    <circle cx="30" cy="12" r="4.5" fill={accent}/>
    <circle cx="20" cy="32" r="4.5" fill={accent}/>
    <circle cx="20" cy="20" r="7" fill={main}/>
    <circle cx="18" cy="18" r="2" fill="white" opacity="0.35"/>
  </svg>
);

/** Granular cluster — sugar, salt, oats, coffee grounds, small berries */
const _grain = (fill: string, shine = '#fff'): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    <circle cx="14" cy="26" r="6" fill={fill}/>
    <circle cx="25" cy="20" r="7" fill={fill} opacity="0.85"/>
    <circle cx="29" cy="29" r="5" fill={fill} opacity="0.7"/>
    <circle cx="16" cy="14" r="4.5" fill={fill} opacity="0.6"/>
    <circle cx="12" cy="23" r="1.5" fill={shine} opacity="0.5"/>
    <circle cx="23" cy="17" r="1.5" fill={shine} opacity="0.45"/>
  </svg>
);

/** Powder mound — roots, powders and dried extracts scooped into a pile */
const _powder = (fill: string, shine = '#fff'): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    <path d="M8 30 Q8 20 20 20 Q32 20 32 30 Q32 34 28 34 L12 34 Q8 34 8 30Z" fill={fill}/>
    <ellipse cx="20" cy="20" rx="10" ry="3" fill={fill} opacity="0.7"/>
    <ellipse cx="16" cy="27" rx="3" ry="1.5" fill={shine} opacity="0.35"/>
    <ellipse cx="24" cy="30" rx="2.5" ry="1.2" fill={shine} opacity="0.25"/>
  </svg>
);

/** Lab flask — preservatives and clinical-grade chemical additives */
const _flask = (liquid: string, glass = '#E5E7EB'): JSX.Element => (
  <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
    <path d="M17 6 L17 16 L9 30 Q7 34 11 34 L29 34 Q33 34 31 30 L23 16 L23 6Z" fill={glass} opacity="0.4"/>
    <path d="M15 6 L25 6" stroke={glass} strokeWidth="2" strokeLinecap="round"/>
    <path d="M12.5 27 L27.5 27 L31 30 Q33 34 29 34 L11 34 Q7 34 9 30Z" fill={liquid}/>
    <ellipse cx="22" cy="30" rx="3.5" ry="2" fill="white" opacity="0.3"/>
  </svg>
);

// ── COLORFUL INGREDIENT ICON MAP ──────────────────────────────────────────────
// Keys are lowercase substrings; longer keys win over shorter ones.
// Values are JSX elements rendered directly in the IngredientIcon container.

export const COLORFUL_INGREDIENT_ICON_MAP: Record<string, JSX.Element> = {

  // ── CARRIER OILS ───────────────────────────────────────────────────────────
  'sweet almond oil':   _oil('#F4A460'),
  'sweet almond':       _oil('#F4A460'),
  'argan oil':          _oil('#C8922A'),
  'argan':              _oil('#C8922A'),
  'jojoba oil':         _oil('#DAA520'),
  'jojoba':             _oil('#DAA520'),
  'coconut oil':        _oil('#F0EAD6', '#DDD9C4'),
  'olive oil':          _oil('#7CB342'),
  'avocado oil':        _oil('#4CAF50'),
  'castor oil':         _oil('#CD853F'),
  'hemp seed oil':      _oil('#558B2F', '#ACEA71'),
  'hemp seed':          _oil('#558B2F', '#ACEA71'),
  'rosehip seed oil':   _oil('#E91E63', '#F48FB1'),
  'rosehip':            _oil('#E91E63', '#F48FB1'),
  'grapeseed oil':      _oil('#7B1FA2', '#CE93D8'),
  'grapeseed':          _oil('#7B1FA2', '#CE93D8'),
  'sunflower oil':      _oil('#FDD835'),
  'apricot kernel oil': _oil('#FF7043', '#FFAB91'),
  'apricot kernel':     _oil('#FF7043', '#FFAB91'),
  'neem oil':           _oil('#2E7D32', '#81C784'),
  'tamanu oil':         _oil('#4E342E', '#8D6E63'),
  'tamanu':             _oil('#4E342E', '#8D6E63'),
  'sea buckthorn oil':  _oil('#E65100', '#FF8F00'),
  'sea buckthorn':      _oil('#E65100', '#FF8F00'),
  'moringa oil':        _oil('#388E3C', '#A5D6A7'),
  'borage oil':         _oil('#5E35B1', '#B39DDB'),
  'borage':             _oil('#5E35B1', '#B39DDB'),
  'pomegranate seed oil': _oil('#C62828', '#EF9A9A'),
  'meadowfoam seed oil':  _oil('#FFF9C4', '#FFF176'),
  'meadowfoam':         _oil('#FFF9C4', '#FFF176'),
  'safflower oil':      _oil('#FFB300', '#FFECB3'),
  'safflower':          _oil('#FFB300', '#FFECB3'),
  'rice bran oil':      _oil('#A1887F', '#D7CCC8'),
  'black seed oil':     _oil('#212121', '#757575'),
  'black cumin seed oil': _oil('#37474F', '#90A4AE'),
  'black cumin':        _oil('#37474F', '#90A4AE'),
  'evening primrose oil': _oil('#FFB74D', '#FFF3E0'),
  'evening primrose':   _oil('#FFB74D', '#FFF3E0'),
  'marula oil':         _oil('#F9A825'),
  'marula':             _oil('#F9A825'),
  'baobab oil':         _oil('#8D6E63', '#D7CCC8'),
  'baobab':             _oil('#8D6E63', '#D7CCC8'),
  'kukui nut oil':      _oil('#9CCC65', '#DCEDC8'),
  'kukui':              _oil('#9CCC65', '#DCEDC8'),
  'macadamia oil':      _oil('#FFD600'),
  'macadamia':          _oil('#FFD600'),
  'walnut oil':         _oil('#5D4037', '#A1887F'),
  'flaxseed oil':       _oil('#F57F17', '#FFF8E1'),
  'flaxseed':           _oil('#F57F17', '#FFF8E1'),
  'prickly pear oil':   _oil('#AD1457', '#F48FB1'),
  'prickly pear':       _oil('#AD1457', '#F48FB1'),
  'passion fruit oil':  _oil('#7B1FA2', '#CE93D8'),
  'red raspberry seed oil': _oil('#D32F2F', '#FFCDD2'),
  'mango seed oil':     _oil('#FF6F00', '#FFCC02'),
  'plum kernel oil':    _oil('#6A1B9A', '#CE93D8'),
  'plum kernel':        _oil('#6A1B9A', '#CE93D8'),
  'wheat germ oil':     _oil('#F9A825', '#FFF9C4'),
  'wheat germ':         _oil('#F9A825', '#FFF9C4'),
  'palm oil':           _oil('#E65100', '#FF8F00'),
  'blueberry seed oil': _oil('#283593', '#7986CB'),
  'blueberry seed':     _oil('#283593', '#7986CB'),
  'canola oil':         _oil('#F9A825'),
  'carrot seed oil':    _oil('#E64A19', '#FFAB91'),
  'pumpkin seed oil':   _oil('#E65100', '#FFAB91'),
  'pumpkin seed':       _oil('#E65100', '#FFAB91'),
  'coffee oil':         _oil('#4E342E', '#A1887F'),
  'guava seed oil':     _oil('#E91E63', '#F48FB1'),
  'kiwi seed oil':      _oil('#558B2F', '#ACEA71'),
  'kiwi seed':          _oil('#558B2F', '#ACEA71'),
  'blackberry seed oil':_oil('#4A148C', '#B39DDB'),
  'crambe oil':         _oil('#F9A825', '#FFF9C4'),
  'perilla oil':        _oil('#558B2F', '#ACEA71'),
  'squalane':           _oil('#E3F2FD', '#BBDEFB'),
  'lard':               _oil('#FFFDE7', '#FFF9C4'),
  'tallow':             _oil('#FFF8E1', '#FFECB3'),
  'emu oil':            _oil('#FFFDE7', '#FFF3E0'),

  // ── BUTTERS ────────────────────────────────────────────────────────────────
  'shea butter (refined)':   _butter('#FAFAFA', '#E0E0E0'),
  'shea butter (unrefined)': _butter('#FFF9C4', '#FFD54F'),
  'shea butter':             _butter('#FFFDE7', '#F9A825'),
  'cocoa butter (raw)':      _butter('#5D4037', '#3E2723'),
  'cocoa butter':            _butter('#795548', '#5D4037'),
  'mango butter (refined)':  _butter('#FF8F00', '#F57F17'),
  'mango butter':            _butter('#FF8F00', '#F57F17'),
  'kokum butter':            _butter('#F3E5F5', '#CE93D8'),
  'kokum':                   _butter('#F3E5F5', '#CE93D8'),
  'murumuru butter':         _butter('#FFF8E1', '#FFD54F'),
  'murumuru':                _butter('#FFF8E1', '#FFD54F'),
  'illipe butter':           _butter('#FFECB3', '#FFD54F'),
  'illipe':                  _butter('#FFECB3', '#FFD54F'),
  'cupuacu butter':          _butter('#EFEBE9', '#A1887F'),
  'cupuacu':                 _butter('#EFEBE9', '#A1887F'),
  'hemp seed butter':        _butter('#DCEDC8', '#8BC34A'),
  'avocado butter':          _butter('#C8E6C9', '#66BB6A'),
  'coffee butter':           _butter('#4E342E', '#3E2723'),
  'coconut butter':          _butter('#F1F8E9', '#DCEDC8'),
  'lemon butter':            _butter('#FFF9C4', '#FDD835'),
  'macadamia butter':        _butter('#FFF9C4', '#F9A825'),
  'neem butter':             _butter('#C8E6C9', '#388E3C'),
  'olive butter':            _butter('#DCEDC8', '#558B2F'),
  'bacuri butter':           _butter('#FFF3E0', '#FF8F00'),
  'baobab butter':           _butter('#EFEBE9', '#8D6E63'),
  'brazil nut butter':       _butter('#FFF9C4', '#F9A825'),
  'kombo butter':            _butter('#DCEDC8', '#558B2F'),
  'mowrah butter':           _butter('#FFF8E1', '#F9A825'),
  'sal butter':              _butter('#FFF9C4', '#F5DEB3'),
  'tucuma butter':           _butter('#FFF3E0', '#FF8F00'),

  // ── ESSENTIAL OILS ─────────────────────────────────────────────────────────
  'lavender eo':             _eo('#7C3AED', '#5B21B6'),
  'peppermint eo':           _eo('#10B981', '#059669'),
  'tea tree eo':             _eo('#059669', '#047857'),
  'eucalyptus globulus eo':  _eo('#0288D1', '#01579B'),
  'eucalyptus radiata eo':   _eo('#0891B2', '#0E7490'),
  'eucalyptus eo':           _eo('#0891B2', '#0E7490'),
  'bergamot eo':             _eo('#84CC16', '#65A30D'),
  'cedarwood atlas eo':      _eo('#92400E', '#78350F'),
  'cedarwood eo':            _eo('#92400E', '#78350F'),
  'frankincense carterii eo':_eo('#D97706', '#B45309'),
  'frankincense eo':         _eo('#D97706', '#B45309'),
  'patchouli eo':            _eo('#78350F', '#451A03'),
  'geranium bourbon eo':     _eo('#DB2777', '#BE185D'),
  'geranium eo':             _eo('#DB2777', '#BE185D'),
  'clary sage eo':           _eo('#4D7C0F', '#3F6212'),
  'sandalwood eo':           _eo('#A16207', '#713F12'),
  'ylang ylang eo':          _eo('#FBBF24', '#F59E0B'),
  'rosemary eo':             _eo('#16A34A', '#15803D'),
  'spearmint eo':            _eo('#34D399', '#10B981'),
  'neroli eo':               _eo('#FDBA74', '#FB923C'),
  'rose absolute':           _eo('#E11D48', '#BE123C'),
  'rose otto eo':            _eo('#FB7185', '#F43F5E'),
  'vetiver eo':              _eo('#57534E', '#44403C'),
  'clove bud eo':            _eo('#7C2D12', '#431407'),
  'ginger eo':               _eo('#CA8A04', '#A16207'),
  'black pepper eo':         _eo('#374151', '#1F2937'),
  'lemon eo':                _eo('#FDE047', '#EAB308'),
  'lemon myrtle eo':         _eo('#FEF08A', '#EAB308'),
  'lime eo':                 _eo('#86EFAC', '#22C55E'),
  'grapefruit eo':           _eo('#FB923C', '#F97316'),
  'orange sweet eo':         _eo('#F97316', '#EA580C'),
  'mandarin eo':             _eo('#FCA5A5', '#F87171'),
  'tangerine eo':            _eo('#FDE68A', '#F97316'),
  'jasmine absolute':        _eo('#FEF9C3', '#FDE047'),
  'helichrysum eo':          _eo('#FBBF24', '#D97706'),
  'chamomile german eo':     _eo('#1E40AF', '#1D4ED8'),
  'chamomile roman eo':      _eo('#FBBF24', '#F59E0B'),
  'cardamom eo':             _eo('#16A34A', '#15803D'),
  'juniper berry eo':        _eo('#4338CA', '#3730A3'),
  'myrrh eo':                _eo('#92400E', '#78350F'),
  'cypress eo':              _eo('#064E3B', '#065F46'),
  'pine eo':                 _eo('#166534', '#14532D'),
  'basil eo':                _eo('#2E7D32', '#1B5E20'),
  'bay laurel eo':           _eo('#6D4C41', '#5D4037'),
  'benzoin eo':              _eo('#A16207', '#713F12'),
  'camphor eo':              _eo('#E0F2FE', '#0288D1'),
  'caraway eo':              _eo('#B45309', '#92400E'),
  'cinnamon bark eo':        _eo('#7C2D12', '#431407'),
  'cinnamon leaf eo':        _eo('#92400E', '#78350F'),
  'citronella eo':           _eo('#84CC16', '#65A30D'),
  'coriander eo':            _eo('#A16207', '#713F12'),
  'dill eo':                 _eo('#4D7C0F', '#3F6212'),
  'elemi eo':                _eo('#D97706', '#B45309'),
  'fennel eo':               _eo('#65A30D', '#4D7C0F'),
  'galbanum eo':             _eo('#4D7C0F', '#3F6212'),
  'hyssop eo':               _eo('#7C3AED', '#6D28D9'),
  'laurel leaf eo':          _eo('#6D4C41', '#5D4037'),
  'marjoram eo':             _eo('#4D7C0F', '#3F6212'),
  'may chang eo':            _eo('#FDE047', '#CA8A04'),
  'melissa eo':              _eo('#84CC16', '#65A30D'),
  'myrtle eo':               _eo('#2E7D32', '#1B5E20'),
  'niaouli eo':              _eo('#059669', '#047857'),
  'nutmeg eo':               _eo('#92400E', '#78350F'),
  'oregano eo':              _eo('#4D7C0F', '#3F6212'),
  'palmarosa eo':            _eo('#DB2777', '#BE185D'),
  'petitgrain eo':           _eo('#65A30D', '#4D7C0F'),
  'ravensara eo':            _eo('#2E7D32', '#1B5E20'),
  'rosalina eo':             _eo('#6D28D9', '#5B21B6'),
  'spikenard eo':            _eo('#78350F', '#451A03'),
  'star anise eo':           _eo('#4E342E', '#3E2723'),
  'styrax eo':               _eo('#92400E', '#78350F'),
  'tagetes eo':              _eo('#F59E0B', '#D97706'),
  'thyme eo':                _eo('#4D7C0F', '#3F6212'),
  'turmeric eo':             _eo('#F59E0B', '#D97706'),
  'violet leaf absolute':    _eo('#7C3AED', '#6D28D9'),
  'wintergreen eo':          _eo('#10B981', '#059669'),
  'yarrow eo':               _eo('#1E40AF', '#1D4ED8'),
  'allspice eo':             _eo('#7C2D12', '#431407'),
  'amyris eo':               _eo('#A16207', '#713F12'),
  'anise eo':                _eo('#4D7C0F', '#3F6212'),
  'balsam fir eo':           _eo('#166534', '#14532D'),
  'black spruce eo':         _eo('#064E3B', '#065F46'),
  'cajeput eo':              _eo('#059669', '#047857'),
  'cassia eo':               _eo('#7C2D12', '#431407'),
  'cistus eo':               _eo('#DB2777', '#BE185D'),
  'cumin eo':                _eo('#B45309', '#92400E'),
  'douglas fir eo':          _eo('#166534', '#14532D'),
  'fir needle eo':           _eo('#166534', '#14532D'),
  'manuka eo':               _eo('#65A30D', '#4D7C0F'),
  'patchouli dark':          _eo('#78350F', '#451A03'),

  // ── BOTANICALS / HERBS ─────────────────────────────────────────────────────
  'calendula':     _flower('#FF8F00', '#E65100', 8),
  'chamomile':     _flower('#FFFFFF', '#FDE047', 12),
  'lavender herb': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <line x1="20" y1="38" x2="20" y2="12" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="20" y1="24" x2="15" y2="20" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="20" y1="24" x2="25" y2="20" stroke="#6B7280" strokeWidth="1.2" strokeLinecap="round"/>
      <ellipse cx="20" cy="10" rx="3" ry="5" fill="#A78BFA"/>
      <ellipse cx="15" cy="18" rx="2.5" ry="4.5" fill="#8B5CF6" transform="rotate(-25 15 18)"/>
      <ellipse cx="25" cy="18" rx="2.5" ry="4.5" fill="#8B5CF6" transform="rotate(25 25 18)"/>
      <ellipse cx="12" cy="23" rx="2" ry="3.5" fill="#7C3AED" transform="rotate(-35 12 23)"/>
      <ellipse cx="28" cy="23" rx="2" ry="3.5" fill="#7C3AED" transform="rotate(35 28 23)"/>
    </svg>
  ),
  'lavender buds': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <line x1="20" y1="38" x2="20" y2="14" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
      <ellipse cx="20" cy="12" rx="3" ry="5" fill="#A78BFA"/>
      <ellipse cx="15" cy="20" rx="2.5" ry="4.5" fill="#8B5CF6" transform="rotate(-25 15 20)"/>
      <ellipse cx="25" cy="20" rx="2.5" ry="4.5" fill="#8B5CF6" transform="rotate(25 25 20)"/>
    </svg>
  ),
  'aloe vera': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M20 36 C20 36 8 26 8 17 C8 11 13 7 20 7 C27 7 32 11 32 17 C32 26 20 36 20 36Z" fill="#4CAF50"/>
      <path d="M20 7 C20 7 14 15 16 23 C17 28 20 32 20 36" fill="none" stroke="#A5D6A7" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M20 7 C20 7 26 15 24 23 C23 28 20 32 20 36" fill="none" stroke="#C8E6C9" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  ),
  'rosemary extract': _herb('#6B7280', '#2E7D32'),
  'rosemary herb':    _herb('#6B7280', '#2E7D32'),
  'green tea extract': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M20 35 C20 35 8 24 8 16 C8 10 13.5 6 20 6 C26.5 6 32 10 32 16 C32 24 20 35 20 35Z" fill="#4CAF50"/>
      <path d="M20 6 C20 6 15 14 17 22 C18 26 20 30 20 35" fill="none" stroke="#A5D6A7" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M20 6 C20 6 25 14 23 22 C22 26 20 30 20 35" fill="none" stroke="#C8E6C9" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  ),
  'turmeric powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M10 22 C10 22 8 18 10 14 C12 10 18 8 20 10 C22 8 28 10 30 14 C32 18 30 22 30 24 C30 28 26 32 20 32 C14 32 10 28 10 24Z" fill="#F59E0B"/>
      <path d="M20 10 C18 12 16 16 16 20 C16 24 18 28 20 32" stroke="#FDE68A" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <ellipse cx="25" cy="15" rx="3" ry="5" fill="#D97706" transform="rotate(30 25 15)"/>
    </svg>
  ),
  'turmeric root': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M10 22 C10 22 8 18 10 14 C12 10 18 8 20 10 C22 8 28 10 30 14 C32 18 30 22 30 24 C30 28 26 32 20 32 C14 32 10 28 10 24Z" fill="#F59E0B"/>
      <ellipse cx="15" cy="16" rx="3" ry="5" fill="#D97706" transform="rotate(-20 15 16)"/>
    </svg>
  ),
  'neem powder': _herb('#6B7280', '#1B5E20'),
  'arnica montana': _flower('#FDE047', '#F97316', 7),
  'hibiscus flowers': _flower('#E91E63', '#C2185B', 5),
  'hibiscus powder':  _flower('#F43F5E', '#BE123C', 5),
  'hibiscus':         _flower('#E91E63', '#C2185B', 5),
  'rose petals': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      {[0,72,144,216,288].map((d) => {
        const r = d*Math.PI/180;
        return <ellipse key={d} cx={20+8*Math.sin(r)} cy={20-8*Math.cos(r)} rx="5" ry="7" fill="#FCA5A5" transform={`rotate(${d} ${20+8*Math.sin(r)} ${20-8*Math.cos(r)})`}/>;
      })}
      <circle cx="20" cy="20" r="5" fill="#F87171"/>
      <circle cx="20" cy="20" r="3" fill="#EF4444"/>
    </svg>
  ),
  'elder flower': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      {[0,72,144,216,288].map((d) => {
        const r = d*Math.PI/180;
        return <ellipse key={d} cx={20+9*Math.sin(r)} cy={20-9*Math.cos(r)} rx="4" ry="6" fill="#FFFDE7" stroke="#FDD835" strokeWidth="0.5" transform={`rotate(${d} ${20+9*Math.sin(r)} ${20-9*Math.cos(r)})`}/>;
      })}
      <circle cx="20" cy="20" r="4" fill="#FDD835"/>
    </svg>
  ),
  'ylang ylang extract': _flower('#FDE68A', '#F59E0B', 5),
  'jasmine flowers': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      {[0,60,120,180,240,300].map((d) => {
        const r = d*Math.PI/180;
        return <ellipse key={d} cx={20+9*Math.sin(r)} cy={20-9*Math.cos(r)} rx="3.5" ry="6" fill="#FFFDE7" transform={`rotate(${d} ${20+9*Math.sin(r)} ${20-9*Math.cos(r)})`}/>;
      })}
      <circle cx="20" cy="20" r="4" fill="#FDD835"/>
    </svg>
  ),
  'jasmine extract': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      {[0,60,120,180,240,300].map((d) => {
        const r = d*Math.PI/180;
        return <ellipse key={d} cx={20+9*Math.sin(r)} cy={20-9*Math.cos(r)} rx="3.5" ry="6" fill="#FFFDE7" transform={`rotate(${d} ${20+9*Math.sin(r)} ${20-9*Math.cos(r)})`}/>;
      })}
      <circle cx="20" cy="20" r="4" fill="#FDD835"/>
    </svg>
  ),
  'nettle extract':    _herb('#4B5563', '#16A34A'),
  'comfrey root':      _herb('#78350F', '#15803D'),
  'plantain herb':     _herb('#4B5563', '#15803D'),
  'plantain leaf':     _herb('#4B5563', '#15803D'),
  "st. john's wort":   _flower('#FDE047', '#F97316', 5),
  'dandelion extract': _flower('#FDE047', '#EAB308', 12),
  'arnica':            _flower('#FDE047', '#F97316', 7),
  'moringa leaf':      _herb('#4B5563', '#166534'),
  'kelp powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M12 36 C10 30 14 22 10 14 C14 12 16 18 16 24 C20 18 22 10 26 8 C28 12 24 20 28 26 C30 22 32 16 34 14" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round"/>
      <path d="M16 24 C18 20 22 18 24 22" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'irish moss': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M10 32 C12 24 8 18 12 12" fill="none" stroke="#0D9488" strokeWidth="3" strokeLinecap="round"/>
      <path d="M20 34 C22 26 18 18 22 12" fill="none" stroke="#14B8A6" strokeWidth="3" strokeLinecap="round"/>
      <path d="M30 32 C28 24 32 18 28 12" fill="none" stroke="#0D9488" strokeWidth="3" strokeLinecap="round"/>
      <path d="M10 20 C14 22 18 20 22 22 C26 20 30 22 34 20" fill="none" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  'ashwagandha powder': _herb('#78350F', '#4D7C0F'),
  'burdock root':      _herb('#78350F', '#15803D'),
  'chickweed':         _herb('#4B5563', '#16A34A'),
  'cornflower petals': _flower('#1D4ED8', '#1E40AF', 6),
  'echinacea': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      {[0,45,90,135,180,225,270,315].map((d) => {
        const r = d*Math.PI/180;
        return <ellipse key={d} cx={20+11*Math.sin(r)} cy={20-11*Math.cos(r)} rx="2.5" ry="5" fill="#DB2777" transform={`rotate(${d} ${20+11*Math.sin(r)} ${20-11*Math.cos(r)})`}/>;
      })}
      <circle cx="20" cy="20" r="5.5" fill="#7C2D12"/>
    </svg>
  ),
  'elder berries': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="14" cy="20" r="5" fill="#3730A3"/>
      <circle cx="24" cy="16" r="5" fill="#4338CA"/>
      <circle cx="26" cy="26" r="5" fill="#3730A3"/>
      <circle cx="16" cy="28" r="4" fill="#4F46E5"/>
      <line x1="20" y1="8" x2="20" y2="14" stroke="#4B5563" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  'fennel seeds': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <ellipse cx="14" cy="22" rx="4" ry="6" fill="#84CC16" transform="rotate(-10 14 22)"/>
      <ellipse cx="24" cy="18" rx="4" ry="6" fill="#65A30D" transform="rotate(15 24 18)"/>
      <ellipse cx="22" cy="28" rx="4" ry="6" fill="#4D7C0F" transform="rotate(-5 22 28)"/>
    </svg>
  ),
  'lemon balm':        _herb('#4B5563', '#84CC16'),
  'linden flowers':    _flower('#FFFDE7', '#FDD835', 5),
  'licorice root':     _herb('#78350F', '#4D7C0F'),
  'marshmallow root':  _herb('#78350F', '#E2E8F0'),
  'milk thistle': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      {[0,45,90,135,180,225,270,315].map((d) => {
        const r = d*Math.PI/180;
        return <ellipse key={d} cx={20+10*Math.sin(r)} cy={20-10*Math.cos(r)} rx="2" ry="4.5" fill="#C026D3" transform={`rotate(${d} ${20+10*Math.sin(r)} ${20-10*Math.cos(r)})`}/>;
      })}
      <circle cx="20" cy="20" r="5" fill="#86198F"/>
    </svg>
  ),
  'mugwort':           _herb('#4B5563', '#166534'),
  'mullein':           _flower('#FDE047', '#EAB308', 5),
  'myrrh powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M14 24 Q12 18 16 14 Q20 10 24 14 Q28 18 26 24 Q24 30 20 32 Q16 30 14 24Z" fill="#D97706"/>
      <path d="M20 32 L20 36" stroke="#92400E" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="16" cy="18" r="2" fill="#FDE68A" opacity="0.5"/>
    </svg>
  ),
  'passionflower':     _flower('#A855F7', '#7C3AED', 5),
  'red clover':        _flower('#E11D48', '#BE123C', 5),
  'slippery elm':      _herb('#78350F', '#A1887F'),
  'white willow bark': _herb('#78350F', '#F1F5F9'),
  'witch hazel powder': _flower('#FDE047', '#92400E', 5),

  // ── CLAYS / MINERALS ──────────────────────────────────────────────────────
  'kaolin clay':        _clay('#FAFAFA', '#F5F5F5'),
  'white kaolin clay':  _clay('#FAFAFA', '#F0F0F0'),
  'bentonite clay':     _clay('#9E9E9E', '#757575'),
  'french green clay':  _clay('#4CAF50', '#388E3C'),
  'rose kaolin clay':   _clay('#F48FB1', '#E91E63'),
  'rhassoul clay':      _clay('#8D6E63', '#6D4C41'),
  "fuller's earth":     _clay('#A1887F', '#795548'),
  'dead sea mud':       _clay('#546E7A', '#455A64'),
  'australian red clay':_clay('#BF360C', '#E64A19'),
  'cambrian blue clay': _clay('#0288D1', '#0277BD'),
  'glacial marine clay':_clay('#B2EBF2', '#4DD0E1'),
  'illite green clay':  _clay('#388E3C', '#2E7D32'),
  'moroccan lava clay': _clay('#4E342E', '#3E2723'),
  'montmorillonite clay': _clay('#78909C', '#607D8B'),
  'sea clay':           _clay('#00ACC1', '#00838F'),
  'zeolite powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <polygon points="20,6 34,14 34,26 20,34 6,26 6,14" fill="#B2EBF2"/>
      <polygon points="20,11 30,17 30,24 20,29 10,24 10,17" fill="#80DEEA" opacity="0.7"/>
      <circle cx="20" cy="20" r="4" fill="#4DD0E1" opacity="0.5"/>
    </svg>
  ),
  'pumice powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M10 28 C10 22 12 14 20 10 C28 14 30 22 30 28 C28 33 24 35 20 35 C16 35 12 33 10 28Z" fill="#9E9E9E"/>
      <circle cx="15" cy="22" r="2" fill="#E0E0E0"/>
      <circle cx="22" cy="18" r="1.5" fill="#BDBDBD"/>
      <circle cx="25" cy="25" r="2" fill="#E0E0E0"/>
      <circle cx="18" cy="28" r="1.5" fill="#BDBDBD"/>
    </svg>
  ),

  // ── COLORANTS ──────────────────────────────────────────────────────────────
  'spirulina powder':    _drop('#0288D1', '#01579B'),
  'activated charcoal': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M10 28 C10 22 14 14 20 10 C26 14 30 22 30 28 C28 33 24 35 20 35 C16 35 12 33 10 28Z" fill="#212121"/>
      <path d="M14 24 C14 20 17 16 20 14" stroke="#424242" strokeWidth="1.5" strokeLinecap="round"/>
      <ellipse cx="16" cy="26" rx="2" ry="3" fill="#424242"/>
      <ellipse cx="24" cy="24" rx="2" ry="3" fill="#424242"/>
    </svg>
  ),
  'paprika powder':      _drop('#E64A19', '#BF360C'),
  'indigo powder':       _drop('#1A237E', '#283593'),
  'madder root powder':  _drop('#B71C1C', '#C62828'),
  'annatto powder':      _drop('#FF6F00', '#E65100'),
  'cocoa powder':        _drop('#3E2723', '#4E342E'),
  'zinc oxide': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="#FAFAFA" stroke="#E0E0E0" strokeWidth="1"/>
      <circle cx="20" cy="20" r="9" fill="#F5F5F5"/>
      <circle cx="20" cy="20" r="4" fill="#EEEEEE"/>
    </svg>
  ),
  'titanium dioxide': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="1.5"/>
      <circle cx="20" cy="20" r="8" fill="#F5F5F5"/>
    </svg>
  ),
  'beet root powder':   _drop('#E91E63', '#C2185B'),
  'black walnut hull':  _drop('#3E2723', '#1A1A1A'),
  'blue tansy':         _drop('#0D47A1', '#1565C0'),
  'butterfly pea flower': _drop('#3F51B5', '#303F9F'),
  'chlorella powder':   _drop('#388E3C', '#2E7D32'),
  'chromium oxide green': _drop('#388E3C', '#2E7D32'),
  'manganese violet':   _drop('#7B1FA2', '#6A1B9A'),
  'saffron powder':     _drop('#FF8F00', '#E65100'),
  'spinach powder':     _drop('#2E7D32', '#1B5E20'),
  'woad powder':        _drop('#1565C0', '#0D47A1'),
  'mica powder':        _mica('#B0BEC5', '#ECEFF1'),
  'iron oxides':        _drop('#BF360C', '#E64A19'),
  'ultramarine blue':   _drop('#1565C0', '#0D47A1'),
  'brazilian purple clay': _drop('#7B1FA2', '#6A1B9A'),

  // ── SOAP BASES ─────────────────────────────────────────────────────────────
  'glycerin base (clear)':       _soap('#BAE6FD', '#7DD3FC'),
  'glycerin base (white)':       _soap('#F8FAFC', '#E2E8F0'),
  'glycerin base (goat milk)':   _soap('#FFFDE7', '#FFF176'),
  'glycerin base (shea)':        _soap('#FFF9C4', '#FFD54F'),
  'glycerin base (hemp)':        _soap('#DCEDC8', '#A5D6A7'),
  'glycerin base (honey)':       _soap('#FFF8E1', '#FFD54F'),
  'glycerin base (aloe)':        _soap('#ECFDF5', '#A7F3D0'),
  'glycerin base (charcoal)':    _soap('#374151', '#1F2937'),
  'glycerin base (cocoa butter)':_soap('#EFEBE9', '#BCAAA4'),
  'glycerin base (oatmeal)':     _soap('#FFF8E1', '#D7CCC8'),
  'melt & pour base (clear)':    _soap('#DBEAFE', '#93C5FD'),
  'melt & pour base (white)':    _soap('#F8FAFC', '#E2E8F0'),
  'sodium cocoyl isethionate':   _soap('#E0F2FE', '#BAE6FD'),
  'sodium hydroxide': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M10 8 L10 18 L6 28 Q5 32 8 32 L32 32 Q35 32 34 28 L30 18 L30 8 Z" fill="#ECFDF5"/>
      <line x1="9" y1="8" x2="31" y2="8" stroke="#6EE7B7" strokeWidth="2" strokeLinecap="round"/>
      <ellipse cx="20" cy="22" rx="6" ry="3" fill="#34D399" opacity="0.4"/>
    </svg>
  ),
  'potassium hydroxide': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M10 8 L10 18 L6 28 Q5 32 8 32 L32 32 Q35 32 34 28 L30 18 L30 8 Z" fill="#FEF3C7"/>
      <line x1="9" y1="8" x2="31" y2="8" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round"/>
      <ellipse cx="20" cy="22" rx="6" ry="3" fill="#FBBF24" opacity="0.4"/>
    </svg>
  ),

  // ── WAXES ──────────────────────────────────────────────────────────────────
  'beeswax':           _wax('#FFD54F', '#FFCA28'),
  'carnauba wax':      _wax('#FFF9C4', '#FFF176'),
  'candelilla wax':    _wax('#FFFDE7', '#FFF176'),
  'rice bran wax':     _wax('#D7CCC8', '#BCAAA4'),
  'soy wax':           _wax('#FFFDE7', '#FFF9C4'),
  'japan wax':         _wax('#FFF9C4', '#FFF176'),
  'jojoba wax':        _wax('#FFF8E1', '#FFD54F'),
  'lanolin': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <rect x="8" y="14" width="24" height="18" rx="4" fill="#FFF9C4"/>
      <path d="M8 20 C12 18 16 22 20 20 C24 18 28 22 32 20 L32 32 Q32 34 30 34 L10 34 Q8 34 8 32Z" fill="#FFF176" opacity="0.5"/>
    </svg>
  ),
  'cetyl alcohol': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <rect x="8" y="14" width="24" height="18" rx="4" fill="#F8FAFC"/>
      <rect x="12" y="18" width="16" height="8" rx="2" fill="#E2E8F0" opacity="0.6"/>
    </svg>
  ),
  'stearic acid':      _wax('#F1F5F9', '#E2E8F0'),
  'paraffin wax':      _wax('#F8FAFC', '#F1F5F9'),
  'sunflower wax':     _wax('#FFFDE7', '#FDE047'),

  // ── MILKS & CREAMS ─────────────────────────────────────────────────────────
  'goat milk powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M14 8 L13 14 Q9 16 9 20 L9 33 Q9 35 11 35 L29 35 Q31 35 31 33 L31 20 Q31 16 27 14 L26 8 Z" fill="#FAFAFA" stroke="#E0E0E0" strokeWidth="0.5"/>
      <path d="M14 8 L26 8" stroke="#E0E0E0" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <ellipse cx="20" cy="28" rx="7" ry="3" fill="#F5F5F5" opacity="0.6"/>
      <circle cx="16" cy="23" r="2" fill="white" opacity="0.7"/>
      <circle cx="24" cy="24" r="1.5" fill="white" opacity="0.6"/>
    </svg>
  ),
  'coconut milk powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M14 8 L13 14 Q9 16 9 20 L9 33 Q9 35 11 35 L29 35 Q31 35 31 33 L31 20 Q31 16 27 14 L26 8 Z" fill="#FFFFFF" stroke="#E8F5E9" strokeWidth="0.5"/>
      <path d="M9 24 L31 24" stroke="#C8E6C9" strokeWidth="1" fill="none" opacity="0.8"/>
    </svg>
  ),
  'whole milk powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M14 8 L13 14 Q9 16 9 20 L9 33 Q9 35 11 35 L29 35 Q31 35 31 33 L31 20 Q31 16 27 14 L26 8 Z" fill="#FAFAFA" stroke="#E0E0E0" strokeWidth="0.5"/>
      <ellipse cx="20" cy="26" rx="7" ry="3" fill="#F5F5F5"/>
    </svg>
  ),
  'oat milk powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M14 8 L13 14 Q9 16 9 20 L9 33 Q9 35 11 35 L29 35 Q31 35 31 33 L31 20 Q31 16 27 14 L26 8 Z" fill="#EFEBE9" stroke="#D7CCC8" strokeWidth="0.5"/>
      <ellipse cx="20" cy="27" rx="6" ry="2.5" fill="#D7CCC8" opacity="0.5"/>
    </svg>
  ),
  'almond milk powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M14 8 L13 14 Q9 16 9 20 L9 33 Q9 35 11 35 L29 35 Q31 35 31 33 L31 20 Q31 16 27 14 L26 8 Z" fill="#FFF9C4" stroke="#FFF176" strokeWidth="0.5"/>
      <ellipse cx="20" cy="27" rx="6" ry="2.5" fill="#FFF176" opacity="0.4"/>
    </svg>
  ),
  'honey powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <polygon points="20,5 30,11 30,23 20,29 10,23 10,11" fill="#FFD54F"/>
      <polygon points="20,11 27,15 27,22 20,25 13,22 13,15" fill="#FFCA28" opacity="0.8"/>
      <path d="M20 16 C18 18 18 22 20 24 C22 22 22 18 20 16Z" fill="#F9A825" opacity="0.5"/>
    </svg>
  ),
  'buttermilk powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M14 8 L13 14 Q9 16 9 20 L9 33 Q9 35 11 35 L29 35 Q31 35 31 33 L31 20 Q31 16 27 14 L26 8 Z" fill="#FFF9C4" stroke="#FFF176" strokeWidth="0.5"/>
    </svg>
  ),
  'raw honey': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <polygon points="20,5 30,11 30,23 20,29 10,23 10,11" fill="#FFD54F"/>
      <polygon points="20,11 27,15 27,22 20,25 13,22 13,15" fill="#FFCA28" opacity="0.8"/>
      <ellipse cx="20" cy="22" rx="4" ry="3" fill="#F9A825" opacity="0.4"/>
    </svg>
  ),
  'aloe vera juice': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M20 36 C20 36 8 26 8 17 C8 11 13 7 20 7 C27 7 32 11 32 17 C32 26 20 36 20 36Z" fill="#4CAF50"/>
      <path d="M20 7 L20 36" stroke="#A5D6A7" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  'coconut cream': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M14 8 L13 14 Q9 16 9 20 L9 33 Q9 35 11 35 L29 35 Q31 35 31 33 L31 20 Q31 16 27 14 L26 8 Z" fill="#FFFFFF" stroke="#DCEDC8" strokeWidth="0.5"/>
      <path d="M9 22 L31 22" stroke="#C8E6C9" strokeWidth="1" fill="none"/>
      <ellipse cx="20" cy="28" rx="6" ry="2" fill="#E8F5E9" opacity="0.7"/>
    </svg>
  ),
  'rice milk': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M14 8 L13 14 Q9 16 9 20 L9 33 Q9 35 11 35 L29 35 Q31 35 31 33 L31 20 Q31 16 27 14 L26 8 Z" fill="#FFFDE7" stroke="#FFF9C4" strokeWidth="0.5"/>
      <ellipse cx="20" cy="27" rx="6" ry="2.5" fill="#FFF9C4" opacity="0.6"/>
    </svg>
  ),
  'goat milk (fresh)': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M14 8 L13 14 Q9 16 9 20 L9 33 Q9 35 11 35 L29 35 Q31 35 31 33 L31 20 Q31 16 27 14 L26 8 Z" fill="#FAFAFA" stroke="#E0E0E0" strokeWidth="0.5"/>
      <circle cx="16" cy="23" r="2.5" fill="white" opacity="0.7"/>
      <circle cx="24" cy="25" r="2" fill="white" opacity="0.6"/>
    </svg>
  ),

  // ── SPICES ─────────────────────────────────────────────────────────────────
  'vanilla powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M15 5 C13 5 12 7 12 9 L12 33 C12 35 13 36 15 36 C17 36 18 35 18 33 L18 9 C18 7 17 5 15 5Z" fill="#6D4C41"/>
      <path d="M15 8 C15 8 17 13 17 21 C17 29 15 33 15 33" stroke="#BCAAA4" strokeWidth="1" strokeLinecap="round" fill="none"/>
      <path d="M23 8 C21 8 20 10 20 12 L20 30 C20 32 21 33 23 33 C25 33 26 32 26 30 L26 12 C26 10 25 8 23 8Z" fill="#795548" opacity="0.7"/>
    </svg>
  ),
  'cinnamon powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <rect x="7" y="12" width="22" height="7" rx="3.5" fill="#8D6E63" transform="rotate(-20 18 15)"/>
      <rect x="9" y="19" width="22" height="7" rx="3.5" fill="#795548" transform="rotate(-5 20 22)"/>
      <rect x="8" y="26" width="22" height="7" rx="3.5" fill="#6D4C41" transform="rotate(-35 19 29)" opacity="0.8"/>
    </svg>
  ),
  'ginger root powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M10 22 C10 22 8 18 10 14 C12 10 18 8 20 10 C22 8 28 10 30 14 C32 18 30 22 30 24 C30 28 26 32 20 32 C14 32 10 28 10 24Z" fill="#CA8A04"/>
      <ellipse cx="15" cy="16" rx="3" ry="5" fill="#B45309" transform="rotate(-20 15 16)"/>
    </svg>
  ),
  'clove powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="17" cy="13" r="5.5" fill="#5D4037"/>
      <path d="M17 18 L17 34" stroke="#6D4C41" strokeWidth="3.5" strokeLinecap="round"/>
      <circle cx="24" cy="17" r="4.5" fill="#4E342E"/>
      <path d="M24 22 L24 34" stroke="#5D4037" strokeWidth="3" strokeLinecap="round" opacity="0.8"/>
    </svg>
  ),
  'rosehip powder':  _oil('#E91E63', '#F48FB1'),

  // ── EXFOLIANTS ─────────────────────────────────────────────────────────────
  'colloidal oatmeal': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <ellipse cx="14" cy="22" rx="6" ry="9" fill="#D7CCC8" transform="rotate(-15 14 22)"/>
      <ellipse cx="27" cy="20" rx="5" ry="8" fill="#BCAAA4" transform="rotate(10 27 20)"/>
      <ellipse cx="20" cy="25" rx="5" ry="8" fill="#A1887F" transform="rotate(5 20 25)"/>
    </svg>
  ),
  'ground coffee': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="14" cy="22" r="6" fill="#4E342E"/>
      <circle cx="26" cy="20" r="5.5" fill="#3E2723"/>
      <circle cx="20" cy="27" r="6" fill="#5D4037"/>
      <circle cx="20" cy="14" r="4.5" fill="#6D4C41"/>
    </svg>
  ),
  'coffee grounds': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="14" cy="22" r="6" fill="#4E342E"/>
      <circle cx="26" cy="20" r="5.5" fill="#3E2723"/>
      <circle cx="20" cy="27" r="6" fill="#5D4037"/>
    </svg>
  ),
  'dead sea salt': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <polygon points="20,6 27,18 21,14 15,18" fill="#E0E0E0"/>
      <polygon points="20,6 27,18 21,22 15,18" fill="#F5F5F5"/>
      <polygon points="21,22 27,18 33,30 21,34" fill="#BDBDBD"/>
      <polygon points="21,22 15,18 9,30 21,34" fill="#E0E0E0"/>
    </svg>
  ),
  'pink himalayan salt': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <polygon points="20,6 27,18 21,14 15,18" fill="#F8BBD0"/>
      <polygon points="20,6 27,18 21,22 15,18" fill="#FCE4EC"/>
      <polygon points="21,22 27,18 33,30 21,34" fill="#F48FB1"/>
      <polygon points="21,22 15,18 9,30 21,34" fill="#F8BBD0"/>
    </svg>
  ),
  'sea salt (fine)': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <polygon points="20,6 27,18 21,14 15,18" fill="#E3F2FD"/>
      <polygon points="20,6 27,18 21,22 15,18" fill="#BBDEFB"/>
      <polygon points="21,22 27,18 33,30 21,34" fill="#90CAF9"/>
      <polygon points="21,22 15,18 9,30 21,34" fill="#BBDEFB"/>
    </svg>
  ),
  'poppy seed': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      {[[12,14],[20,12],[28,14],[10,22],[18,20],[26,20],[14,28],[22,28]].map(([cx,cy],i) => (
        <ellipse key={i} cx={cx} cy={cy} rx="3" ry="4.5" fill="#1A237E" transform={`rotate(${i*22} ${cx} ${cy})`}/>
      ))}
    </svg>
  ),
  'walnut shell powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="14" cy="23" r="6" fill="#5D4037"/>
      <circle cx="26" cy="21" r="5.5" fill="#4E342E"/>
      <circle cx="20" cy="27" r="6" fill="#6D4C41"/>
      <circle cx="20" cy="14" r="4.5" fill="#795548"/>
    </svg>
  ),
  'sugar (white)': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <polygon points="20,6 26,17 20,14 14,17" fill="#F5F5F5"/>
      <polygon points="20,6 26,17 20,21 14,17" fill="#FAFAFA"/>
      <polygon points="20,21 26,17 32,28 20,32" fill="#EEEEEE"/>
      <polygon points="20,21 14,17 8,28 20,32" fill="#F5F5F5"/>
    </svg>
  ),
  'sugar (raw)': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <polygon points="20,6 26,17 20,14 14,17" fill="#D7CCC8"/>
      <polygon points="20,6 26,17 20,21 14,17" fill="#EFEBE9"/>
      <polygon points="20,21 26,17 32,28 20,32" fill="#BCAAA4"/>
      <polygon points="20,21 14,17 8,28 20,32" fill="#D7CCC8"/>
    </svg>
  ),
  'brown sugar': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <polygon points="20,6 26,17 20,14 14,17" fill="#D7CCC8"/>
      <polygon points="20,6 26,17 20,21 14,17" fill="#EFEBE9"/>
      <polygon points="20,21 26,17 32,28 20,32" fill="#A1887F"/>
      <polygon points="20,21 14,17 8,28 20,32" fill="#BCAAA4"/>
    </svg>
  ),
  'jojoba beads': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="13" cy="21" r="5.5" fill="#DAA520"/>
      <circle cx="23" cy="14" r="5" fill="#F5DEB3"/>
      <circle cx="27" cy="25" r="5.5" fill="#DAA520" opacity="0.9"/>
      <circle cx="18" cy="29" r="4.5" fill="#F5DEB3" opacity="0.9"/>
    </svg>
  ),
  'bamboo powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <rect x="10" y="6" width="8" height="30" rx="4" fill="#8BC34A"/>
      <rect x="22" y="9" width="8" height="26" rx="4" fill="#7CB342"/>
      <line x1="10" y1="14" x2="18" y2="14" stroke="#558B2F" strokeWidth="1.5"/>
      <line x1="22" y1="18" x2="30" y2="18" stroke="#558B2F" strokeWidth="1.5"/>
      <line x1="10" y1="22" x2="18" y2="22" stroke="#558B2F" strokeWidth="1.5"/>
      <line x1="22" y1="26" x2="30" y2="26" stroke="#558B2F" strokeWidth="1.5"/>
    </svg>
  ),
  'rice bran powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <ellipse cx="14" cy="22" rx="5" ry="8" fill="#FFFDE7" transform="rotate(-15 14 22)"/>
      <ellipse cx="26" cy="19" rx="5" ry="8" fill="#FFF9C4" transform="rotate(10 26 19)"/>
      <ellipse cx="21" cy="27" rx="5" ry="7" fill="#FFF8E1" transform="rotate(5 21 27)"/>
    </svg>
  ),
  'loofah powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <ellipse cx="20" cy="22" rx="12" ry="10" fill="#D4A017"/>
      <path d="M10 18 C14 16 18 20 22 18 C26 16 30 20 30 20" fill="none" stroke="#A1887F" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 22 C14 20 18 24 22 22 C26 20 30 24 30 22" fill="none" stroke="#A1887F" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 26 C14 24 18 28 22 26 C26 24 30 28 30 26" fill="none" stroke="#A1887F" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
    </svg>
  ),
  'chia seed': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      {[[12,15],[20,12],[28,15],[10,23],[18,21],[26,21],[14,29],[22,29]].map(([cx,cy],i) => (
        <ellipse key={i} cx={cx} cy={cy} rx="3" ry="4" fill="#4A148C" opacity={0.8 + (i%3)*0.07}/>
      ))}
    </svg>
  ),
  'rice flour': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <ellipse cx="14" cy="22" rx="5" ry="8" fill="#FAFAFA" transform="rotate(-15 14 22)"/>
      <ellipse cx="27" cy="19" rx="5" ry="8" fill="#F5F5F5" transform="rotate(10 27 19)"/>
      <ellipse cx="21" cy="27" rx="5" ry="7" fill="#EEEEEE" transform="rotate(5 21 27)"/>
    </svg>
  ),
  'volcanic ash': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M10 28 C10 22 14 14 20 10 C26 14 30 22 30 28 C28 33 24 35 20 35 C16 35 12 33 10 28Z" fill="#616161"/>
      <circle cx="15" cy="22" r="2.5" fill="#757575"/>
      <circle cx="25" cy="18" r="2" fill="#9E9E9E"/>
      <circle cx="22" cy="27" r="2.5" fill="#757575"/>
    </svg>
  ),
  'apricot shell powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="14" cy="22" r="6" fill="#FF8F00"/>
      <circle cx="26" cy="20" r="5.5" fill="#F57F17"/>
      <circle cx="20" cy="28" r="6" fill="#E65100"/>
      <circle cx="20" cy="14" r="4.5" fill="#FF8F00" opacity="0.8"/>
    </svg>
  ),
  'ground almond': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <ellipse cx="14" cy="22" rx="5" ry="8" fill="#F5DEB3" transform="rotate(-15 14 22)"/>
      <ellipse cx="27" cy="19" rx="5" ry="8" fill="#F4A460" transform="rotate(10 27 19)"/>
      <ellipse cx="21" cy="27" rx="5" ry="7" fill="#DEB887" transform="rotate(5 21 27)"/>
    </svg>
  ),
  'ground flaxseed': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <ellipse cx="14" cy="22" rx="5" ry="8" fill="#D4A017" transform="rotate(-15 14 22)"/>
      <ellipse cx="27" cy="19" rx="5" ry="8" fill="#B8860B" transform="rotate(10 27 19)"/>
      <ellipse cx="21" cy="27" rx="5" ry="7" fill="#DAA520" transform="rotate(5 21 27)"/>
    </svg>
  ),
  'mango seed powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <ellipse cx="14" cy="22" rx="5" ry="8" fill="#FF8F00" transform="rotate(-15 14 22)"/>
      <ellipse cx="27" cy="19" rx="5" ry="8" fill="#F57F17" transform="rotate(10 27 19)"/>
      <ellipse cx="21" cy="27" rx="5" ry="7" fill="#E65100" transform="rotate(5 21 27)"/>
    </svg>
  ),
  'peach pit powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <ellipse cx="14" cy="22" rx="5" ry="8" fill="#FFAB91" transform="rotate(-15 14 22)"/>
      <ellipse cx="27" cy="19" rx="5" ry="8" fill="#FF8A65" transform="rotate(10 27 19)"/>
      <ellipse cx="21" cy="27" rx="5" ry="7" fill="#FF7043" transform="rotate(5 21 27)"/>
    </svg>
  ),
  'konjac powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="#E8F5E9"/>
      <circle cx="20" cy="20" r="9" fill="#C8E6C9"/>
      <circle cx="20" cy="20" r="4" fill="#A5D6A7"/>
    </svg>
  ),

  // ── FRAGRANCE OILS ──────────────────────────────────────────────────────────
  'lavender fragrance oil':         _perfume('#A78BFA', '#7C3AED'),
  'vanilla bean fragrance oil':     _perfume('#F5DEB3', '#D4A017'),
  'rose petal fragrance oil':       _perfume('#FDA4AF', '#E11D48'),
  'eucalyptus spearmint fo':        _perfume('#6EE7B7', '#059669'),
  'citrus burst fragrance oil':     _perfume('#FCD34D', '#D97706'),
  'coconut fragrance oil':          _perfume('#ECFDF5', '#34D399'),
  'oatmeal milk & honey fo':        _perfume('#FFF8E1', '#D97706'),
  'black raspberry vanilla fo':     _perfume('#A78BFA', '#7C3AED'),
  'cucumber melon fragrance oil':   _perfume('#86EFAC', '#16A34A'),
  'plumeria fragrance oil':         _perfume('#FBCFE8', '#EC4899'),
  'gardenia fragrance oil':         _perfume('#FEFCE8', '#CA8A04'),
  'sandalwood rose fo':             _perfume('#FDBA74', '#DB2777'),
  'fresh linen fragrance oil':      _perfume('#DBEAFE', '#3B82F6'),
  'ocean breeze fragrance oil':     _perfume('#BAE6FD', '#0284C7'),
  'patchouli dark fragrance oil':   _perfume('#7C2D12', '#451A03'),
  'grapefruit mango fo':            _perfume('#FDE68A', '#F97316'),
  'cherry almond fragrance oil':    _perfume('#FECACA', '#E11D48'),
  'baby powder fragrance oil':      _perfume('#FAE8FF', '#A855F7'),
  'green tea & lemongrass fo':      _perfume('#DCFCE7', '#15803D'),
  'honeysuckle fragrance oil':      _perfume('#FEF9C3', '#D97706'),
  'peppermint fragrance oil':       _perfume('#CCFBF1', '#0D9488'),
  'sugar cookie fragrance oil':     _perfume('#FEF3C7', '#D97706'),
  'rain fragrance oil':             _perfume('#DBEAFE', '#1D4ED8'),
  'shea butter fragrance oil':      _perfume('#FFFDE7', '#F59E0B'),
  'aloe & green tea fo':            _perfume('#D1FAE5', '#059669'),
  'amber fo':                       _perfume('#FEF3C7', '#B45309'),
  'apple fo':                       _perfume('#DCFCE7', '#16A34A'),
  'balsam & cedar fo':              _perfume('#D1FAE5', '#065F46'),
  'bamboo fo':                      _perfume('#ECFDF5', '#15803D'),
  'black cherry fo':                _perfume('#FFE4E6', '#9F1239'),
  'blackberry fo':                  _perfume('#EDE9FE', '#7C3AED'),
  'blueberry fo':                   _perfume('#DBEAFE', '#1E40AF'),
  'brown sugar & fig fo':           _perfume('#FEF3C7', '#92400E'),
  'buttercream fo':                 _perfume('#FEF9C3', '#D97706'),
  'caramel fo':                     _perfume('#FEF3C7', '#92400E'),
  'chai tea fo':                    _perfume('#FEF3C7', '#B45309'),
  'cherry blossom fo':              _perfume('#FCE7F3', '#EC4899'),
  'chocolate fo':                   _perfume('#292524', '#78350F'),
  'cinnamon roll fo':               _perfume('#FEF3C7', '#92400E'),
  'clean cotton fo':                _perfume('#F0F9FF', '#0284C7'),
  'coconut lime fo':                _perfume('#ECFDF5', '#15803D'),
  'coffee house fo':                _perfume('#1C1917', '#92400E'),
  'cranberry fo':                   _perfume('#FFE4E6', '#9F1239'),
  "dragon's blood fo":              _perfume('#3B0764', '#7C3AED'),
  'egyptian musk fo':               _perfume('#FEF9C3', '#B45309'),
  'espresso fo':                    _perfume('#1C1917', '#78350F'),
  'gingerbread fo':                 _perfume('#FEF3C7', '#92400E'),
  'grapefruit mint fo':             _perfume('#ECFDF5', '#16A34A'),
  'green tea & cucumber fo':        _perfume('#ECFDF5', '#15803D'),
  'island coconut fo':              _perfume('#FFFDE7', '#F59E0B'),
  'jasmine fo':                     _perfume('#FEF9C3', '#CA8A04'),
  'key lime fo':                    _perfume('#ECFDF5', '#15803D'),
  'lavender & cedar fo':            _perfume('#EDE9FE', '#7C3AED'),
  'lemon drop fo':                  _perfume('#FEFCE8', '#CA8A04'),
  'lemon verbena fo':               _perfume('#ECFDF5', '#65A30D'),
  'lilac fo':                       _perfume('#EDE9FE', '#7C3AED'),
  'lime basil & mandarin fo':       _perfume('#ECFDF5', '#15803D'),
  'magnolia fo':                    _perfume('#FEFCE8', '#CA8A04'),
  'melon fo':                       _perfume('#DCFCE7', '#16A34A'),
  'moroccan rose fo':               _perfume('#FCE7F3', '#BE185D'),
  'night blooming jasmine fo':      _perfume('#1E1B4B', '#4338CA'),
  'oakmoss fo':                     _perfume('#D1FAE5', '#065F46'),
  'orange blossom fo':              _perfume('#FEF9C3', '#CA8A04'),
  'passion fruit fo':               _perfume('#EDE9FE', '#7C3AED'),
  'peach fo':                       _perfume('#FFE4E6', '#E11D48'),
  'peony fo':                       _perfume('#FCE7F3', '#EC4899'),
  'pine forest fo':                 _perfume('#D1FAE5', '#065F46'),
  'pink sugar fo':                  _perfume('#FCE7F3', '#DB2777'),
  'pomegranate fo':                 _perfume('#FFE4E6', '#DC2626'),
  'red currant fo':                 _perfume('#FFE4E6', '#B91C1C'),
  'rose water fo':                  _perfume('#FCE7F3', '#EC4899'),
  'sea breeze fo':                  _perfume('#DBEAFE', '#0284C7'),
  'shea butter & vanilla fo':       _perfume('#FEF9C3', '#D97706'),
  'spearmint fo':                   _perfume('#CCFBF1', '#0D9488'),
  'strawberry fo':                  _perfume('#FFE4E6', '#E11D48'),
  'sweet pea fo':                   _perfume('#FDF4FF', '#C026D3'),
  'tangerine fo':                   _perfume('#FEF3C7', '#D97706'),
  'teak & mahogany fo':             _perfume('#1C1917', '#78350F'),
  'tropical mango fo':              _perfume('#FEF9C3', '#D97706'),
  'tuberose fo':                    _perfume('#FDF4FF', '#C026D3'),
  'watermelon fo':                  _perfume('#FFE4E6', '#DC2626'),
  'white musk fo':                  _perfume('#F8FAFC', '#64748B'),
  'white tea & ginger fo':          _perfume('#ECFDF5', '#15803D'),

  // ── MICAS ─────────────────────────────────────────────────────────────────
  'red mica':                _mica('#EF4444', '#FEE2E2'),
  'orange mica':             _mica('#F97316', '#FFEDD5'),
  'yellow mica':             _mica('#EAB308', '#FEFCE8'),
  'gold mica':               _mica('#F59E0B', '#FEF3C7'),
  'antique gold mica':       _mica('#B45309', '#FEF3C7'),
  'champagne mica':          _mica('#D97706', '#FEF3C7'),
  'green mica':              _mica('#22C55E', '#DCFCE7'),
  'lime green mica':         _mica('#84CC16', '#ECFCCB'),
  'emerald green mica':      _mica('#10B981', '#D1FAE5'),
  'forest green mica':       _mica('#15803D', '#DCFCE7'),
  'blue mica':               _mica('#3B82F6', '#DBEAFE'),
  'sky blue mica':           _mica('#38BDF8', '#E0F2FE'),
  'ocean blue mica':         _mica('#1D4ED8', '#DBEAFE'),
  'sapphire blue mica':      _mica('#2563EB', '#DBEAFE'),
  'navy blue mica':          _mica('#1E40AF', '#DBEAFE'),
  'midnight blue mica':      _mica('#1E3A8A', '#DBEAFE'),
  'teal mica':               _mica('#0D9488', '#CCFBF1'),
  'turquoise mica':          _mica('#06B6D4', '#E0F2FE'),
  'purple mica':             _mica('#A855F7', '#FAF5FF'),
  'lavender mica':           _mica('#C084FC', '#FAF5FF'),
  'violet mica':             _mica('#7C3AED', '#EDE9FE'),
  'pink mica':               _mica('#EC4899', '#FDF2F8'),
  'coral mica':              _mica('#F87171', '#FEE2E2'),
  'rose gold mica':          _mica('#E879A0', '#FCE7F3'),
  'peach mica':              _mica('#FB923C', '#FFEDD5'),
  'magenta mica':            _mica('#E11D48', '#FFE4E6'),
  'bronze mica':             _mica('#92400E', '#FEF3C7'),
  'copper mica':             _mica('#B45309', '#FEF3C7'),
  'silver mica':             _mica('#94A3B8', '#F1F5F9'),
  'white mica':              _mica('#E2E8F0', '#F8FAFC'),
  'ivory mica':              _mica('#FFFBEB', '#FEF3C7'),
  'black pearl mica':        _mica('#1F2937', '#F3F4F6'),
  'holographic mica':        _mica('#A855F7', '#EDE9FE'),
  'blue-purple mirage mica': _mica('#6D28D9', '#EDE9FE'),
  'green-blue mirage mica':  _mica('#0891B2', '#CFFAFE'),
  'red-orange mirage mica':  _mica('#DC2626', '#FEE2E2'),
  'purple-pink mirage mica': _mica('#DB2777', '#FCE7F3'),
  'gold-green mirage mica':  _mica('#84CC16', '#ECFCCB'),
  'black-purple mirage mica':_mica('#4C1D95', '#EDE9FE'),

  // ── ADDITIVES ──────────────────────────────────────────────────────────────
  'vitamin e oil': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <ellipse cx="20" cy="23" rx="11" ry="13" fill="#FDE047"/>
      <ellipse cx="20" cy="23" rx="6.5" ry="9" fill="#EAB308"/>
      <line x1="20" y1="10" x2="20" y2="6" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  'vitamin e acetate': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <ellipse cx="20" cy="23" rx="11" ry="13" fill="#FDE047"/>
      <ellipse cx="20" cy="23" rx="6.5" ry="9" fill="#EAB308" opacity="0.7"/>
      <line x1="20" y1="10" x2="20" y2="6" stroke="#EAB308" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  'vitamin c powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <ellipse cx="20" cy="23" rx="11" ry="13" fill="#FB923C"/>
      <ellipse cx="20" cy="23" rx="6.5" ry="9" fill="#F97316"/>
      <line x1="20" y1="10" x2="20" y2="6" stroke="#FB923C" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  'hyaluronic acid': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="#BFDBFE"/>
      <circle cx="20" cy="20" r="9" fill="#93C5FD" opacity="0.7"/>
      <circle cx="20" cy="20" r="4.5" fill="#60A5FA" opacity="0.5"/>
      <ellipse cx="15" cy="15" rx="3" ry="2" fill="white" opacity="0.3"/>
    </svg>
  ),
  'niacinamide': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="#FDE68A"/>
      <circle cx="20" cy="20" r="9" fill="#FCD34D" opacity="0.7"/>
      <circle cx="20" cy="20" r="4.5" fill="#FBBF24" opacity="0.5"/>
    </svg>
  ),
  'retinol': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <ellipse cx="20" cy="23" rx="11" ry="13" fill="#FECACA"/>
      <ellipse cx="20" cy="23" rx="6.5" ry="9" fill="#F87171"/>
      <line x1="20" y1="10" x2="20" y2="6" stroke="#FECACA" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  'glycerin': _drop('#BAE6FD', '#38BDF8'),
  'citric acid': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <polygon points="20,5 27,17 21,14 15,17" fill="#FDE047"/>
      <polygon points="20,5 27,17 21,22 15,17" fill="#FEFCE8"/>
      <polygon points="21,22 27,17 33,29 21,33" fill="#EAB308"/>
      <polygon points="21,22 15,17 9,29 21,33" fill="#FDE047"/>
    </svg>
  ),
  'baking soda': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <rect x="9" y="13" width="22" height="20" rx="4" fill="#F1F5F9"/>
      <rect x="12" y="9" width="16" height="6" rx="2" fill="#E2E8F0"/>
    </svg>
  ),
  'silk amino acids': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M8 18 C12 12 18 26 20 20 C22 14 28 26 32 18" stroke="#E9D5FF" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M8 23 C12 17 18 31 20 25 C22 19 28 31 32 23" stroke="#C4B5FD" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M8 28 C12 22 18 36 20 30 C22 24 28 36 32 28" stroke="#A78BFA" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7"/>
    </svg>
  ),
  'kojic acid': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="#FEF9C3"/>
      <circle cx="20" cy="20" r="9" fill="#FDE047"/>
      <circle cx="20" cy="20" r="4" fill="#EAB308"/>
    </svg>
  ),
  'salicylic acid': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="#FFE4E6"/>
      <circle cx="20" cy="20" r="9" fill="#FECACA"/>
      <circle cx="20" cy="20" r="4" fill="#FCA5A5"/>
    </svg>
  ),
  'lactic acid': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="#FFFDE7"/>
      <circle cx="20" cy="20" r="9" fill="#FFF9C4"/>
      <circle cx="20" cy="20" r="4" fill="#FFF176"/>
    </svg>
  ),
  'collagen': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M8 17 C12 11 18 25 20 19 C22 13 28 25 32 17" stroke="#FBCFE8" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M8 22 C12 16 18 30 20 24 C22 18 28 30 32 22" stroke="#F9A8D4" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M8 27 C12 21 18 35 20 29 C22 23 28 35 32 27" stroke="#F472B6" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8"/>
    </svg>
  ),
  'arrowroot powder': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="#FAFAFA"/>
      <circle cx="20" cy="20" r="9" fill="#F5F5F5"/>
      <circle cx="20" cy="20" r="4" fill="#EEEEEE"/>
    </svg>
  ),
  'allantoin': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="#DCFCE7"/>
      <circle cx="20" cy="20" r="9" fill="#A7F3D0"/>
      <circle cx="20" cy="20" r="4" fill="#6EE7B7"/>
    </svg>
  ),
  'bakuchiol': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <ellipse cx="20" cy="23" rx="11" ry="13" fill="#FDE68A"/>
      <ellipse cx="20" cy="23" rx="6.5" ry="9" fill="#FCD34D"/>
      <path d="M15 10 C15 7 20 5 20 5 C20 5 25 7 25 10" fill="#84CC16"/>
    </svg>
  ),
  'caffeine (cosmetic)': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="#4E342E"/>
      <circle cx="20" cy="20" r="9" fill="#3E2723"/>
      <circle cx="20" cy="20" r="4" fill="#5D4037"/>
      <ellipse cx="15" cy="16" rx="2" ry="1.5" fill="#BCAAA4" opacity="0.4"/>
    </svg>
  ),
  'sodium lactate': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="#E0F2FE"/>
      <circle cx="20" cy="20" r="9" fill="#BAE6FD"/>
      <circle cx="20" cy="20" r="4" fill="#7DD3FC"/>
    </svg>
  ),
  'polysorbate 80': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="#F3E8FF"/>
      <circle cx="20" cy="20" r="9" fill="#E9D5FF"/>
      <circle cx="20" cy="20" r="4" fill="#D8B4FE"/>
    </svg>
  ),
  'decyl glucoside': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="#D1FAE5"/>
      <circle cx="20" cy="20" r="9" fill="#A7F3D0"/>
      <circle cx="20" cy="20" r="4" fill="#6EE7B7"/>
    </svg>
  ),

  // ── CITRUS ─────────────────────────────────────────────────────────────────
  'lemon peel powder':   _citrus('#FDE047', '#FEF08A'),
  'orange peel powder':  _citrus('#F97316', '#FED7AA'),
  'grapefruit extract':  _citrus('#FB923C', '#FFEDD5'),
  'lime powder':         _citrus('#22C55E', '#DCFCE7'),

  // ── SEED / POD CATEGORY ────────────────────────────────────────────────────
  'papaya enzyme': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M20 35 C20 35 8 26 8 17 C8 11 13.5 7 20 7 C26.5 7 32 11 32 17 C32 26 20 35 20 35Z" fill="#FBBF24"/>
      <path d="M20 7 L20 35" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/>
      <ellipse cx="20" cy="20" rx="4" ry="8" fill="#F97316" opacity="0.4"/>
    </svg>
  ),
  'pineapple enzyme': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      <path d="M13 34 C11 34 10 32 11 30 L15 18 C16 16 17 15 20 15 C23 15 24 16 25 18 L29 30 C30 32 29 34 27 34Z" fill="#FDE047"/>
      <path d="M14 24 L26 24 M13 28 L27 28" stroke="#EAB308" strokeWidth="1" fill="none" opacity="0.5"/>
      <path d="M15 15 C15 15 12 8 20 5 C28 8 25 15 25 15" fill="#4CAF50"/>
      <line x1="18" y1="7" x2="20" y2="14" stroke="#388E3C" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="22" y1="7" x2="20" y2="14" stroke="#388E3C" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),

  // ═══════════════════════════════════════════════════════════════════════
  // FULL-COVERAGE PASS — every remaining ingredient in the seed database
  // gets its own colourful icon so nothing falls back to a generic
  // category glyph. Grouped below by category for readability.
  // ═══════════════════════════════════════════════════════════════════════

  // ── OILS ──────────────────────────────────────────────────────────────────────
  'babassu oil': _oil('#F5EFD9', '#FFFFFF'),
  'abyssinian oil': _oil('#D8B36A'),
  'amaranth oil': _oil('#8C3B4A', '#F3B6C4'),
  'andiroba oil': _oil('#9C5A2E'),
  'broccoli seed oil': _oil('#4C7A2E', '#B7D98C'),
  'camelina oil': _oil('#B7A233', '#E9DA8C'),
  'cape chestnut oil': _oil('#8B5A2B'),
  'cherry kernel oil': _oil('#B0304F', '#F8BBD0'),
  'mongongo oil': _oil('#C9A66B'),
  'grape seed oil': _oil('#7B1FA2', '#CE93D8'),
  'rose hip oil': _oil('#E91E63', '#F48FB1'),

  // ── BUTTERS ───────────────────────────────────────────────────────────────────
  'cupuaçu butter': _butter('#EDE0C8', '#D8C6A3'),

  // ── BOTANICALS & HERBS / FOOD-DERIVED ─────────────────────────────────────────
  'fenugreek': _herb('#7C6A3E', '#C2A45B'),
  'horsetail': _herb('#4B6B4E', '#6B9B6E'),
  'juniper berries': _grain('#5B7A9A', '#AFC4D6'),
  'motherwort': _herb('#5C7A4E', '#8FAE6E'),
  'oregon grape root': _herb('#6B5B3E', '#D4A017'),
  'sarsaparilla': _herb('#6B4A2E', '#8B6A3E'),
  'yellow dock': _herb('#6B7A3E', '#C9A227'),
  'honey': _drop('#E8A317', '#B8790A'),
  'rice': _grain('#F5F0E1', '#FFFFFF'),
  'oatmeal': _grain('#D9C7A0', '#FFF8E7'),
  'coffee': _grain('#4B3221', '#8B5E3C'),
  'turmeric': _powder('#E8A317', '#FFD983'),
  'geranium': _flower('#E85D9E', '#C2255C', 6),
  'rose petal': (
    <svg viewBox="0 0 40 40" width="100%" height="100%" fill="none" aria-hidden="true">
      {[0,72,144,216,288].map((d) => {
        const r = d*Math.PI/180;
        return <ellipse key={d} cx={20+8*Math.sin(r)} cy={20-8*Math.cos(r)} rx="5" ry="7" fill="#FCA5A5" transform={`rotate(${d} ${20+8*Math.sin(r)} ${20-8*Math.cos(r)})`}/>;
      })}
      <circle cx="20" cy="20" r="5" fill="#F87171"/>
      <circle cx="20" cy="20" r="3" fill="#EF4444"/>
    </svg>
  ),
  'rose powder': _powder('#F2A6C1', '#FCE4EC'),
  'shredded coconut': _grain('#FDFBF5', '#FFFFFF'),

  // ── EXFOLIANTS ────────────────────────────────────────────────────────────────
  'pumice': _grain('#A9A29A', '#D8D2C8'),

  // ── ESSENTIAL OILS ────────────────────────────────────────────────────────────
  'lemongrass eo': _eo('#A8C24A', '#D9ED92'),
  'carrot seed eo': _eo('#C2703D', '#E8B27D'),
  'lavender essential oil': _eo('#7C3AED', '#5B21B6'),
  'tea tree oil': _eo('#059669', '#047857'),
  'eucalyptus oil': _eo('#0891B2', '#0E7490'),
  'peppermint oil': _eo('#10B981', '#059669'),
  'sweet orange oil': _eo('#F97316', '#EA580C'),

  // ── ACTIVES / ADDITIVES ───────────────────────────────────────────────────────
  'panthenol (b5)': _molecule('#14B8A6', '#5EEAD4'),
  'preservative blend (optiphen)': _molecule('#94A3B8', '#CBD5E1'),
  'rosemary antioxidant (roe)': _molecule('#65A30D', '#A3E635'),
  'alpha lipoic acid': _molecule('#F59E0B', '#FCD34D'),
  'aha complex': _molecule('#84CC16', '#D9F99D'),
  'amino acids (complex)': _molecule('#A78BFA', '#DDD6FE'),
  'azelaic acid': _molecule('#FB7185', '#FECDD3'),
  'beta-glucan': _molecule('#5EEAD4', '#CCFBF1'),
  'betaine': _molecule('#38BDF8', '#BAE6FD'),
  'bisabolol': _molecule('#FDE68A', '#FEF3C7'),
  'ceramide complex': _molecule('#FDE9C8', '#FFF3E0'),
  'cholesterol (cosmetic)': _molecule('#FEF3C7', '#FFFBEB'),
  'coq10': _molecule('#F97316', '#FED7AA'),
  'copper peptide': _molecule('#C2703D', '#F3D2B0'),
  'd-panthenol (b5)': _molecule('#14B8A6', '#5EEAD4'),
  'dmae': _molecule('#60A5FA', '#BFDBFE'),
  'egf (cosmetic)': _molecule('#6366F1', '#C7D2FE'),
  'ferulic acid': _molecule('#F59E0B', '#FDE68A'),
  'fulvic acid': _molecule('#92400E', '#D9B382'),
  'gluconolactone': _molecule('#FDE047', '#FEF9C3'),
  'glutathione': _molecule('#A7F3D0', '#D1FAE5'),
  'idebenone': _molecule('#EA580C', '#FDBA74'),
  'l-ascorbic acid': _molecule('#FB923C', '#FED7AA'),
  'magnesium ascorbyl phosphate': _molecule('#FDBA74', '#FED7AA'),
  'mandelic acid': _molecule('#D9B382', '#F0E4CC'),
  'matrixyl 3000': _molecule('#7C3AED', '#DDD6FE'),
  'msm (cosmetic)': _molecule('#DBEAFE', '#EFF6FF'),
  'oat beta glucan': _molecule('#A7C4A0', '#DCEFDA'),
  'peptide complex': _molecule('#8B5CF6', '#DDD6FE'),
  'phytic acid': _molecule('#FDE68A', '#FEF3C7'),
  'polyglutamic acid': _molecule('#3B82F6', '#BFDBFE'),
  'resveratrol': _molecule('#9333EA', '#E9D5FF'),
  'sea kelp bioferment': _molecule('#0D9488', '#99F6E4'),
  'sodium pca': _molecule('#22D3EE', '#A5F3FC'),
  'tranexamic acid': _molecule('#60A5FA', '#DBEAFE'),
  'tremella mushroom extract': _molecule('#F8FAFC', '#E2E8F0'),
  'zinc pca': _molecule('#E5E7EB', '#F1F5F9'),
  'aloe butter': _butter('#DCEFDA', '#BFE3C0'),
  'vitamin e': _molecule('#FB923C', '#FED7AA'),

  // ── MILK & CREAM POWDERS ──────────────────────────────────────────────────────
  'camel milk powder': _milk('#F5F0E6', '#E8DFC8'),
  'donkey milk powder': _milk('#FAFAF9', '#F1F0EA'),
  'hemp milk': _milk('#E8F0D8', '#C8DBA0'),
  'kefir powder': _milk('#F0EDE5', '#DCD6C4'),
  'oat milk (fresh)': _milk('#EDE4D3', '#D9C7A0'),
  'sheep milk powder': _milk('#F5F0E6', '#E5DDC5'),
  'soy milk powder': _milk('#F0EAD6', '#E0D5B8'),

  // ── WAXES ─────────────────────────────────────────────────────────────────────
  'emulsifying wax nf': _wax('#F5F0E6', '#FFFFFF'),
  'microcrystalline wax': _wax('#E8E2D0', '#F5F0E6'),
  'myristyl myristate': _wax('#F0E8D8', '#FFF8EE'),
  'ozokerite': _wax('#8B6F47', '#C9A66B'),
  'stearyl alcohol': _wax('#F5F5F0', '#FFFFFF'),

  // ── PRESERVATIVES / LAB CHEMICALS ─────────────────────────────────────────────
  'edta (tetrasodium)': _flask('#93C5FD', '#E5E7EB'),
  'germaben ii': _flask('#A5B4FC', '#E5E7EB'),
  'germall plus': _flask('#A5B4FC', '#E5E7EB'),
  'leucidal liquid': _flask('#86EFAC', '#E5E7EB'),
  'naticide': _flask('#86EFAC', '#E5E7EB'),
  'optiphen plus': _flask('#93C5FD', '#E5E7EB'),
  'phenoxyethanol': _flask('#93C5FD', '#E5E7EB'),
  'potassium sorbate': _flask('#FDE68A', '#E5E7EB'),
  'sodium benzoate': _flask('#FDE68A', '#E5E7EB'),
  'sodium hydroxypropyl starch phosphate': _flask('#E5E7EB', '#F1F5F9'),
  'vitamin e (preservative)': _flask('#FDBA74', '#E5E7EB'),

  // ── FRAGRANCE OILS ────────────────────────────────────────────────────────────
  'vanilla essence': _perfume('#F3E1C2', '#E8C39E'),
  'rose fragrance oil': _perfume('#F48FB1', '#EC407A'),
  'ocean dreams fragrance oil': _perfume('#93C5FD', '#60A5FA'),
  'watermelon fragrance oil': _perfume('#FB7185', '#86EFAC'),
  'mango peach fragrance oil': _perfume('#FDBA74', '#FBBF24'),
  'pineapple fragrance oil': _perfume('#FDE047', '#FACC15'),
  'cherry fragrance oil': _perfume('#EF4444', '#DC2626'),
  'strawberry fragrance oil': _perfume('#F87171', '#EF4444'),
  'apple fragrance oil': _perfume('#84CC16', '#4D7C0F'),
  'passion fruit fragrance oil': _perfume('#F59E0B', '#EA580C'),
  'chia fragrance oil': _perfume('#78716C', '#57534E'),
  'mango fragrance oil': _perfume('#FBBF24', '#F59E0B'),
  'peach fragrance oil': _perfume('#FDBA74', '#FB923C'),
  'blueberry fragrance oil': _perfume('#3B82F6', '#2563EB'),
  'raspberry fragrance oil': _perfume('#E11D48', '#BE123C'),
  'coconut lime fragrance oil': _perfume('#BEF264', '#F5F5DC'),
  'grapefruit fragrance oil': _perfume('#FB7185', '#FCA5A5'),
  'pomegranate fragrance oil': _perfume('#9F1239', '#BE123C'),
  'fig fragrance oil': _perfume('#6D3B6D', '#8B4B8B'),
  'blackberry fragrance oil': _perfume('#5B21B6', '#6D28D9'),
  'peach bellini fragrance oil': _perfume('#FBCFE8', '#FDBA74'),
  'tropical mango fragrance oil': _perfume('#FBBF24', '#FB923C'),
  'sweet pea fragrance oil': _perfume('#F9A8D4', '#F472B6'),
  'freesia fragrance oil': _perfume('#FDE68A', '#FEF3C7'),
  'magnolia fragrance oil': _perfume('#FBCFE8', '#F9FAFB'),
  'peony fragrance oil': _perfume('#F9A8D4', '#EC4899'),
  'lily fragrance oil': _perfume('#F8FAFC', '#E2E8F0'),
  'orchid fragrance oil': _perfume('#D946EF', '#C026D3'),
  'tuberose fragrance oil': _perfume('#FEF9E7', '#FDE68A'),
  'violet fragrance oil': _perfume('#8B5CF6', '#7C3AED'),
  'iris fragrance oil': _perfume('#818CF8', '#6366F1'),
  'cherry blossom fragrance oil': _perfume('#FBCFE8', '#F9A8D4'),
  'clean cotton fragrance oil': _perfume('#F1F5F9', '#E2E8F0'),
  'sandalwood rose fragrance oil': _perfume('#C08552', '#E8A0BF'),
  'amber vanilla fragrance oil': _perfume('#B45309', '#D97706'),
  'caramel fragrance oil': _perfume('#B4700A', '#D2914A'),
  'chocolate fragrance oil': _perfume('#5C3A21', '#7B4B28'),
  'coffee cake fragrance oil': _perfume('#6B4A31', '#C9A66B'),
  'pumpkin spice fragrance oil': _perfume('#D97706', '#92400E'),
  'cinnamon roll fragrance oil': _perfume('#A0522D', '#E8C39E'),
  'buttercream fragrance oil': _perfume('#FFF3D6', '#FDE9C8'),
  'vanilla cupcake fragrance oil': _perfume('#F3E1C2', '#FBCFE8'),
  'almond biscotti fragrance oil': _perfume('#D9B382', '#EFE0C0'),
  'oatmeal milk honey fragrance oil': _perfume('#E8C39E', '#F3E1C2'),
  'goat milk fragrance oil': _perfume('#F8FAFC', '#E2E8F0'),
  'honey almond fragrance oil': _perfume('#E3A857', '#F3D6A0'),
  'lemon drop fragrance oil': _perfume('#FDE047', '#FEF08A'),
  'eucalyptus mint fragrance oil': _perfume('#34D399', '#6EE7B7'),
  'lavender mint fragrance oil': _perfume('#A78BFA', '#6EE7B7'),
  'peppermint vanilla fragrance oil': _perfume('#34D399', '#F3E1C2'),
  'spearmint fragrance oil': _perfume('#4ADE80', '#86EFAC'),
  'rosemary mint fragrance oil': _perfume('#4D7C0F', '#84CC16'),
  'tea tree mint fragrance oil': _perfume('#16A34A', '#4ADE80'),
  'cedarwood sage fragrance oil': _perfume('#8B5E3C', '#87A96B'),
  'patchouli sandalwood fragrance oil': _perfume('#5C4033', '#B08968'),
  'frankincense myrrh fragrance oil': _perfume('#C9A66B', '#7B5E3B'),
  'bamboo fragrance oil': _perfume('#8BC34A', '#A5D66B'),
  'green tea cucumber fragrance oil': _perfume('#84CC16', '#A7F3D0'),
  'charcoal fragrance oil': _perfume('#374151', '#4B5563'),

  // ── COLORANTS & PIGMENTS ──────────────────────────────────────────────────────
  'aqua green colorant': _drop('#2DD4BF', '#0F766E'),
  'purple colorant': _drop('#A855F7', '#7E22CE'),
  'pink colorant': _drop('#EC4899', '#BE185D'),
  'yellow colorant': _drop('#FACC15', '#CA8A04'),
  'green colorant': _drop('#22C55E', '#15803D'),
  'orange colorant': _drop('#F97316', '#C2410C'),
  'red colorant': _drop('#EF4444', '#B91C1C'),
  'ultramarine pink': _mica('#EC4899', '#FCE7F3'),
  'ultramarine violet': _mica('#8B5CF6', '#EDE9FE'),
  'ultramarine green': _mica('#22C55E', '#DCFCE7'),
  'iron oxide red': _mica('#B91C1C', '#FEE2E2'),
  'iron oxide yellow': _mica('#CA8A04', '#FEF9C3'),
  'iron oxide brown': _mica('#78350F', '#FDE9C8'),
  'iron oxide black': _mica('#27272A', '#E5E7EB'),
  'pearl mica': _mica('#F8FAFC', '#E2E8F0'),
  'holographic glitter': _mica('#A78BFA', '#E0E7FF'),
  'biodegradable glitter': _mica('#5EEAD4', '#CCFBF1'),
  'alkanet root powder': _mica('#6B2545', '#FBE7F0'),
  'red soap colorant': _drop('#EF4444', '#B91C1C'),
  'brick red soap colorant': _drop('#B91C1C', '#7F1D1D'),
  'pink soap colorant': _drop('#EC4899', '#BE185D'),
  'rose soap colorant': _drop('#F43F5E', '#BE123C'),
  'cherry red soap colorant': _drop('#DC2626', '#991B1B'),
  'orange soap colorant': _drop('#F97316', '#C2410C'),
  'peach soap colorant': _drop('#FDBA74', '#FB923C'),
  'lemon yellow soap colorant': _drop('#FDE047', '#EAB308'),
  'yellow soap colorant': _drop('#FACC15', '#CA8A04'),
  'matcha green soap colorant': _drop('#84CC16', '#4D7C0F'),
  'grass green soap colorant': _drop('#4ADE80', '#16A34A'),
  'teal soap colorant': _drop('#14B8A6', '#0F766E'),
  'sky blue soap colorant': _drop('#38BDF8', '#0284C7'),
  'navy blue soap colorant': _drop('#1E3A8A', '#172554'),
  'sapphire blue soap colorant': _drop('#1D4ED8', '#1E40AF'),
  'purple soap colorant': _drop('#A855F7', '#7E22CE'),
  'violet soap colorant': _drop('#8B5CF6', '#6D28D9'),
  'black soap colorant': _drop('#27272A', '#000000'),
  'white soap colorant': _drop('#F8FAFC', '#E2E8F0'),
  'coffee brown soap colorant': _drop('#6F4E37', '#4B3221'),
  'nude mica': _mica('#D9B896', '#FBEEDC'),

  // ── CLAY ──────────────────────────────────────────────────────────────────────
  'white clay': _clay('#FAFAF9', '#F1F0EA'),
};

/**
 * Look up a full-color 40×40 SVG icon by ingredient name.
 * Returns undefined if no colorful icon is available — IngredientIcon will
 * fall back to the monochrome currentColor system.
 *
 * Matching: normalize to lowercase, check if any map key is contained
 * in the ingredient name. Longer (more specific) keys take priority.
 */
export function getIngredientColorfulIcon(name: string): JSX.Element | undefined {
  const lower = name.toLowerCase().trim();
  const keys = Object.keys(COLORFUL_INGREDIENT_ICON_MAP).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (lower.includes(key)) return COLORFUL_INGREDIENT_ICON_MAP[key];
  }
  return undefined;
}
