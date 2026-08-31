/**
 * IngredientIcon — flat vector icons per ingredient (name-specific) or
 * per category as fallback. All icons share the same 24×24 viewBox and
 * fill="currentColor" so they inherit text colour from their container.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import type { IngredientCategory } from '@/types';
import { getIngredientSpecificIcon, getIngredientColorfulIcon } from '@/data/ingredientIconPaths';
import { getCategoryLabel, getIngredientDisplayName } from '@/lib/ingredientI18n';
import { ingredientIconFileSlug } from '@/lib/ingredientCatalog';
import { assetsRepo } from '@/db/repositories';

function bundledIngredientPngSrc(name?: string, iconKey?: string): string | null {
  const slug = ingredientIconFileSlug(name, iconKey);
  if (!slug) return null;
  const base = import.meta.env.BASE_URL || './';
  return `${base}assets/icons/ingredients/${slug}.png`;
}

interface Props {
  category?: IngredientCategory;
  /** When provided, looks up an ingredient-specific icon before falling back to the category. */
  name?: string;
  iconKey?: string;
  className?: string;
  /** 'md' = 32×32 (default), 'sm' = 26×26 (library/autocomplete rows), 'lg' = 48×48 (recipe card hero) */
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

/* ── Each path is a standalone mini-illustration optimised for 20-28 px ── */
const PATHS: Record<IngredientCategory, ReactNode> = {
  // Oil drop — classic teardrop
  oil: (
    <path d="M12 3 C12 3 6 10 6 14 A6 6 0 0 0 18 14 C18 10 12 3 12 3Z
             M10 14 A2 2 0 0 1 12 12" />
  ),

  // Butter — rounded rectangle "jar" with a small lid
  butter: (
    <>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <rect x="7" y="7"  width="10" height="4"  rx="1.5" />
      <line x1="8"  y1="14" x2="16" y2="14" strokeWidth="1.5" strokeLinecap="round" stroke="currentColor" fill="none" />
    </>
  ),

  // Clay — open bowl viewed from slight angle
  clay: (
    <>
      <ellipse cx="12" cy="11" rx="8" ry="3" />
      <path d="M4 11 Q4 19 12 19 Q20 19 20 11" fill="none" strokeWidth="2" strokeLinecap="round" stroke="currentColor" />
    </>
  ),

  // Botanical / herb — simple three-leaf sprig
  botanical: (
    <>
      <path d="M12 20 L12 8" strokeWidth="2" strokeLinecap="round" stroke="currentColor" fill="none" />
      <path d="M12 14 C12 14 8 10 5 11 C7 14 12 14 12 14Z" />
      <path d="M12 11 C12 11 16 7 19 8 C17 11 12 11 12 11Z" />
    </>
  ),

  // Floral — five-petal daisy
  floral: (
    <>
      <circle cx="12" cy="12" r="2.5" />
      {[0,72,144,216,288].map((deg) => {
        const r = deg * Math.PI / 180;
        const cx = 12 + 5.5 * Math.sin(r);
        const cy = 12 - 5.5 * Math.cos(r);
        return <ellipse key={deg} cx={cx} cy={cy} rx="2.2" ry="3.5"
                 transform={`rotate(${deg} ${cx} ${cy})`} />;
      })}
    </>
  ),

  // Citrus — half-orange slice with segments
  citrus: (
    <>
      <path d="M12 4 A8 8 0 0 1 20 12 L12 12 Z" opacity="0.6" />
      <path d="M12 4 A8 8 0 0 0 4  12 L12 12 Z" opacity="0.8" />
      <path d="M12 12 A8 8 0 0 0 20 20 L12 20 Z" opacity="0.8" />
      <path d="M12 12 A8 8 0 0 1 4  20 L12 20 Z" opacity="0.6" />
      <circle cx="12" cy="12" r="8" fill="none" strokeWidth="1.5" stroke="currentColor" />
      <line x1="12" y1="4" x2="12" y2="20" strokeWidth="1.2" stroke="currentColor" />
      <line x1="4"  y1="12" x2="20" y2="12" strokeWidth="1.2" stroke="currentColor" />
    </>
  ),

  // Exfoliant — sugar grain / crystal cluster
  exfoliant: (
    <>
      <circle cx="7"  cy="14" r="3" />
      <circle cx="13" cy="11" r="3.5" />
      <circle cx="17" cy="15" r="2.5" />
      <circle cx="9"  cy="8"  r="2" />
    </>
  ),

  // Essential oil — small dropper bottle
  'essential-oil': (
    <>
      <rect x="9" y="10" width="6" height="10" rx="2" />
      <rect x="10" y="7" width="4" height="4" rx="1" />
      <rect x="11" y="4" width="2" height="3" rx="0.5" />
      <path d="M14 17 A2 2 0 0 1 10 17" fill="none" strokeWidth="1.2" stroke="currentColor" opacity="0.5" />
    </>
  ),

  // Colorant — paint palette with dots
  colorant: (
    <>
      <path d="M12 3 C7 3 3 7 3 12 C3 14.5 4.5 15.5 6 15 C7.5 14.5 7 13 8.5 13.5 C10 14 10 16 12 16 C16.4 16 21 14 21 10 C21 6.1 17 3 12 3Z" />
      <circle cx="8"  cy="9"  r="1.5" fill="white" />
      <circle cx="12" cy="7"  r="1.5" fill="white" />
      <circle cx="16" cy="9"  r="1.5" fill="white" />
      <circle cx="15" cy="13" r="1.5" fill="white" />
    </>
  ),

  // Base / lye — Erlenmeyer flask
  base: (
    <>
      <path d="M10 4 L10 10 L5 18 Q4 20 6 20 L18 20 Q20 20 19 18 L14 10 L14 4 Z" />
      <line x1="9" y1="4" x2="15" y2="4" strokeWidth="1.5" strokeLinecap="round" stroke="currentColor" />
      <ellipse cx="13" cy="16" rx="2.5" ry="1.5" fill="white" opacity="0.4" />
    </>
  ),

  // Wax — honeycomb hexagon cell
  wax: (
    <>
      <polygon points="12,3 19,7 19,15 12,19 5,15 5,7" />
      <polygon points="12,7 16,9 16,14 12,16 8,14 8,9" fill="white" opacity="0.3" />
    </>
  ),

  // Additive — rounded plus in a circle
  additive: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="7.5" x2="12" y2="16.5" strokeWidth="2.5" strokeLinecap="round" stroke="white" fill="none" />
      <line x1="7.5" y1="12" x2="16.5" y2="12" strokeWidth="2.5" strokeLinecap="round" stroke="white" fill="none" />
    </>
  ),

  // Milk — milk bottle silhouette
  milk: (
    <>
      <path d="M9 4 L8 8 Q5 10 5 14 L5 18 Q5 20 7 20 L17 20 Q19 20 19 18 L19 14 Q19 10 16 8 L15 4 Z" />
      <path d="M9 4 L15 4" strokeWidth="1.5" strokeLinecap="round" stroke="currentColor" fill="none" />
      <ellipse cx="12" cy="14" rx="4" ry="2.5" fill="white" opacity="0.3" />
    </>
  ),

  // Seed — berry with leaf
  seed: (
    <>
      <ellipse cx="12" cy="15" rx="5.5" ry="5" />
      <path d="M12 10 C12 10 10 6 7 5 C8 8 12 10 12 10Z" />
      <path d="M12 10 C12 10 14 6 17 5 C16 8 12 10 12 10Z" />
      <circle cx="10" cy="14" r="0.8" fill="white" opacity="0.5" />
      <circle cx="13" cy="13" r="0.6" fill="white" opacity="0.4" />
    </>
  ),

  // Spice — cinnamon sticks / spice quill
  spice: (
    <>
      <rect x="5" y="10" width="14" height="4" rx="2" transform="rotate(-30 12 12)" />
      <rect x="7" y="10" width="14" height="4" rx="2" transform="rotate(-10 12 12)" opacity="0.65" />
      <rect x="3" y="10" width="14" height="4" rx="2" transform="rotate(-50 12 12)" opacity="0.45" />
    </>
  ),

  // Fragrance oil — perfume bottle with scent waves
  fragrance: (
    <>
      <rect x="9" y="10" width="9" height="11" rx="2" />
      <path d="M11 10 L11 7 Q11 5 13 5 Q15 5 15 7 L15 10" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" />
      <rect x="12" y="4" width="2" height="2" rx="0.5" />
      {/* scent waves */}
      <path d="M6 8 Q5 6 6 4" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.7" />
      <path d="M4 9 Q2 7 4 4" fill="none" strokeWidth="1.5" stroke="currentColor" strokeLinecap="round" opacity="0.45" />
      <ellipse cx="13.5" cy="16" rx="2.5" ry="1.5" fill="white" opacity="0.25" />
    </>
  ),

  // Other — question mark circle
  other: (
    <>
      <circle cx="12" cy="12" r="9" fill="none" strokeWidth="1.5" stroke="currentColor" />
      <path d="M9.5 9.5 A2.5 2.5 0 0 1 14.5 9.5 C14.5 11 13 11.5 12 12.5" fill="none" strokeWidth="2" strokeLinecap="round" stroke="currentColor" />
      <circle cx="12" cy="16" r="1" />
    </>
  ),
};

/** Color tints per category — Tailwind-compatible utility classes */
export const CATEGORY_COLORS: Record<IngredientCategory, string> = {
  oil:            'text-amber-500 bg-amber-50',
  butter:         'text-yellow-600 bg-yellow-50',
  clay:           'text-rose-400  bg-rose-50',
  botanical:      'text-green-600 bg-green-50',
  floral:         'text-pink-500  bg-pink-50',
  citrus:         'text-orange-500 bg-orange-50',
  exfoliant:      'text-stone-500 bg-stone-50',
  'essential-oil':'text-violet-500 bg-violet-50',
  fragrance:      'text-fuchsia-500 bg-fuchsia-50',
  colorant:       'text-sky-500   bg-sky-50',
  base:           'text-slate-600 bg-slate-100',
  wax:            'text-amber-700 bg-amber-50',
  additive:       'text-teal-600  bg-teal-50',
  milk:           'text-blue-300  bg-blue-50',
  seed:           'text-lime-600  bg-lime-50',
  spice:          'text-red-700   bg-red-50',
  other:          'text-slate-400 bg-slate-50',
};

export const CATEGORY_LABELS: Record<IngredientCategory, string> = {
  oil:            'Carrier Oil',
  butter:         'Butter',
  clay:           'Clay',
  botanical:      'Botanical / Herb',
  floral:         'Floral',
  citrus:         'Citrus',
  exfoliant:      'Exfoliant',
  'essential-oil':'Essential Oil',
  fragrance:      'Fragrance Oil',
  colorant:       'Colorant',
  base:           'Soap Base',
  wax:            'Wax',
  additive:       'Additive',
  milk:           'Milk / Cream',
seed:           'Seed / Pod',
  spice:          'Spice / Wood',
  other:          'Other',
};

export default function IngredientIcon({ category = 'other', name, iconKey, className = '', size = 'md', loading = false }: Props) {
  const { t } = useTranslation();
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  const regenerated = !!iconKey?.startsWith('asset_');
  const pngSrc = bundledIngredientPngSrc(name, regenerated ? undefined : iconKey);
  const [pngFailed, setPngFailed] = useState(false);

  useEffect(() => {
    setPngFailed(false);
  }, [pngSrc]);

  useEffect(() => {
    setAssetUrl(null);
    if (iconKey?.startsWith('asset_')) {
      const id = iconKey.replace('asset_', '');
      assetsRepo.get(id).then(a => {
        if (a && !a.archived) setAssetUrl(a.dataUrl);
      });
    }
  }, [iconKey]);

  const sizeCls = size === 'sm'
    ? 'box-border h-[26px] w-[26px] min-h-[26px] min-w-[26px] overflow-hidden rounded-md'
    : size === 'lg'
      ? 'box-border h-12 w-12 min-h-12 min-w-12 overflow-hidden rounded-lg'
      : 'box-border h-8 w-8 min-h-8 min-w-8 overflow-hidden rounded-lg';
  const spinnerCls = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
  const titleText = name
    ? getIngredientDisplayName(name, t)
    : getCategoryLabel(category, t);

  if (loading) {
    return (
      <div className={`flex shrink-0 items-center justify-center bg-slate-100 text-slate-400 ${sizeCls} ${className}`} title={titleText}>
        <Loader2 className={`animate-spin ${spinnerCls}`} />
      </div>
    );
  }

  if (assetUrl) {
    return (
      <img
        src={assetUrl}
        alt={titleText}
        title={titleText}
        className={`object-cover bg-white ring-1 ring-slate-200 shrink-0 ${sizeCls} ${className}`}
      />
    );
  }

  if (pngSrc && !pngFailed) {
    return (
      <img
        key={pngSrc}
        src={pngSrc}
        alt={titleText}
        title={titleText}
        onError={() => setPngFailed(true)}
        className={`object-cover bg-white ring-1 ring-slate-200 shrink-0 ${sizeCls} ${className}`}
      />
    );
  }

  // ✨ Colorful full-SVG override (new flat-design 40×40 icons) ──────────────
  const colorfulSvg = name || iconKey ? getIngredientColorfulIcon(name ?? '', iconKey) : undefined;
  if (colorfulSvg) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full ${sizeCls} ${className}`}
        title={titleText}
        aria-hidden="true"
      >
        {colorfulSvg}
      </span>
    );
  }

  // ✨ Monochrome currentColor fallback (legacy icons + category shapes) ─────
  const specific = name || iconKey ? getIngredientSpecificIcon(name ?? '', iconKey) : undefined;
  const colorClasses = specific?.colors ?? (CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other);
  const svgContent  = specific?.path    ?? (PATHS[category] ?? PATHS.other);
  const svgSz   = size === 'lg' ? 28 : 16;
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${sizeCls} ${colorClasses} ${className}`}
      title={titleText}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        width={svgSz}
        height={svgSz}
        fill="currentColor"
        aria-hidden="true"
      >
        {svgContent}
      </svg>
    </span>
  );
}
