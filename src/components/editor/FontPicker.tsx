/**
 * FontPicker — a searchable, categorised font selector styled like Canva's.
 * Each font name is rendered in its own typeface so users can preview before
 * picking. Uses a click-outside-to-close pattern to match Canva's behaviour.
 *
 * Features:
 * - 200+ Google Fonts organised by category with offline badge
 * - Real-time search filter
 * - Recently used fonts (last 5, persisted in localStorage)
 * - On-demand font loading via FontManager when the dropdown opens
 * - Keyboard navigation: ↑ ↓ Enter Escape
 * - Category badges
 */

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Search, X } from 'lucide-react';
import { ALL_FONTS, SYSTEM_FONTS, findFont, type FontCategory, type FontDef } from '@/data/googleFonts';
import { isFontLoaded, loadFont, preloadFont } from '@/lib/fontManager';

// ── Constants ──────────────────────────────────────────────────────────────
const RECENTS_KEY = 'gaia_font_recents';
const MAX_RECENTS = 5;

const CATEGORY_LABEL: Record<string, string> = {
  system: 'System',
  serif: 'Serif',
  sans: 'Sans-serif',
  script: 'Script',
  display: 'Display',
  mono: 'Monospace',
};

// Fixed render order for categories
const CATEGORY_ORDER = ['serif', 'sans', 'script', 'display', 'mono', 'system'];

function quoteFontFamily(family: string): string {
  const trimmed = family.trim();
  if (!trimmed) return 'sans-serif';
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed;
  }
  return `"${trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function genericFallback(category?: FontCategory): string {
  if (category === 'serif' || category === 'display') return 'serif';
  if (category === 'mono') return 'monospace';
  if (category === 'script') return 'cursive';
  return 'sans-serif';
}

/** Preview stack: the real face first, then a matching generic (never UI Poppins). */
function previewFontStack(family: string, category?: FontCategory): string {
  return `${quoteFontFamily(family)}, ${genericFallback(category)}`;
}

function resolveFontDef(family: string): FontDef {
  return (
    findFont(family) ??
    ALL_FONTS.find((f) => f.family.toLowerCase() === family.toLowerCase()) ?? {
      family,
      category: /\bserif\b/i.test(family) ? 'serif' : 'sans',
      bundled: false,
    }
  );
}

function FontPreviewName({
  family,
  category,
  eager,
  rootRef,
}: {
  family: string;
  category: FontCategory;
  eager?: boolean;
  rootRef?: RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(() => isFontLoaded(family));

  useEffect(() => {
    let cancelled = false;
    const markReady = () => {
      if (cancelled) return;
      if (!document.fonts || document.fonts.check(`16px "${family}"`) || isFontLoaded(family)) {
        setReady(true);
      }
    };
    const start = () => {
      preloadFont(family);
      void loadFont(family).then((ok) => {
        if (ok || (document.fonts && document.fonts.check(`16px "${family}"`))) markReady();
      });
    };

    if (eager) {
      start();
    } else {
      const el = ref.current;
      if (!el || typeof IntersectionObserver === 'undefined') {
        start();
      } else {
        const io = new IntersectionObserver(
          ([entry]) => {
            if (entry?.isIntersecting) {
              start();
              io.disconnect();
            }
          },
          { root: rootRef?.current ?? null, rootMargin: '160px 0px', threshold: 0 }
        );
        io.observe(el);
        return () => {
          cancelled = true;
          io.disconnect();
        };
      }
    }
    return () => {
      cancelled = true;
    };
  }, [family, eager, rootRef]);

  return (
    <span
      ref={ref}
      className="min-w-0 flex-1 truncate"
      data-font={family}
      data-font-ready={ready ? '1' : '0'}
      style={{
        fontFamily: ready ? previewFontStack(family, category) : genericFallback(category),
        fontSize: '16.2px',
        lineHeight: 1.3,
        fontWeight: 400,
      }}
    >
      {family}
    </span>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function loadRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]');
  } catch (err) {
    console.error('[gaia] fontPicker.loadRecents failed', err);
    return [];
  }
}

function saveRecents(families: string[]): void {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(families));
  } catch (err) {
    console.error('[gaia] fontPicker.saveRecents failed', err);
  }
}

function addRecent(family: string, current: string[]): string[] {
  const next = [family, ...current.filter((f) => f !== family)].slice(0, MAX_RECENTS);
  saveRecents(next);
  return next;
}

// ── Types ──────────────────────────────────────────────────────────────────
interface Props {
  value: string;
  onChange: (family: string) => void;
  loading?: boolean;
}

interface Group {
  category: string;
  items: FontDef[];
}

// ── Component ──────────────────────────────────────────────────────────────
export default function FontPicker({ value, onChange, loading }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>(loadRecents);
  const [activeIdx, setActiveIdx] = useState(-1);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef     = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);
  const listRef    = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  // ── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        !popRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) setOpen(false);
    };
    window.addEventListener('mousedown', handler, true);
    return () => window.removeEventListener('mousedown', handler, true);
  }, [open]);

  // ── Focus search & reset when opening/closing ────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    } else {
      setQuery('');
      setActiveIdx(-1);
    }
  }, [open]);

  // ── Grouped filtered font list ────────────────────────────────────────────
  const grouped = useMemo<Group[]>(() => {
    const q = query.toLowerCase().trim();
    const filtered = q
      ? ALL_FONTS.filter((f) => f.family.toLowerCase().includes(q))
      : ALL_FONTS;

    const map = new Map<string, FontDef[]>();
    for (const f of filtered) {
      if (!map.has(f.category)) map.set(f.category, []);
      map.get(f.category)!.push(f);
    }
    return CATEGORY_ORDER.flatMap((cat) => {
      const items = map.get(cat);
      if (!items?.length) return [];
      return [{ category: cat, items }];
    });
  }, [query]);

  // Flat list used for keyboard navigation
  const flatFonts = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  // Include recents row only when no search is active
  const showRecents = !query.trim() && recents.length > 0;
  // Offset to account for the recents section in the keyboard nav flat list
  const recentFontDefs = useMemo<FontDef[]>(
    () => recents.filter(Boolean).map(resolveFontDef),
    [recents]
  );
  const navFonts = useMemo<FontDef[]>(
    () => (showRecents ? [...recentFontDefs, ...flatFonts.filter((f) => !recents.includes(f.family))] : flatFonts),
    [showRecents, recentFontDefs, flatFonts, recents]
  );

  // Keep the closed trigger in the selected face, and load Recents first when
  // the list opens so they never stay on the UI sans fallback.
  useEffect(() => {
    if (!value) return;
    preloadFont(value);
    void loadFont(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    for (const f of recentFontDefs) {
      preloadFont(f.family);
      void loadFont(f.family);
    }
  }, [open, recentFontDefs]);

  // ── Scroll active item into view ─────────────────────────────────────────
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  // ── Reset keyboard focus when query changes ───────────────────────────────
  useEffect(() => {
    setActiveIdx(-1);
  }, [query]);

  // ── Font selection ────────────────────────────────────────────────────────
  const select = (family: string) => {
    onChange(family);
    setRecents((prev) => addRecent(family, prev));
    setOpen(false);
  };

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, navFonts.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIdx >= 0 && navFonts[activeIdx]) {
          select(navFonts[activeIdx].family);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        break;
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const isActive = (family: string, navIdx: number) =>
    activeIdx === navIdx || value === family;

  const renderFontButton = (f: FontDef, navIdx: number, isSelectedValue: boolean, eager = false) => (
    <button
      key={eager ? `recent-${f.family}` : f.family}
      type="button"
      data-font-section={eager ? 'recent' : 'list'}
      data-font-preview={f.family}
      ref={activeIdx === navIdx ? activeItemRef : undefined}
      onClick={() => select(f.family)}
      className={`flex w-full items-center justify-between px-[0.81rem] py-[0.54rem] text-left text-[0.945rem] transition ${
        isActive(f.family, navIdx)
          ? 'bg-gaia-50 text-gaia-700'
          : 'text-slate-700 hover:bg-gaia-50'
      }`}
      style={{ fontFamily: previewFontStack(f.family, f.category) }}
    >
      <FontPreviewName
        family={f.family}
        category={f.category}
        eager={eager}
        rootRef={listRef}
      />
      <span className="ml-1 flex shrink-0 items-center gap-1">
        {f.bundled && (
          <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">
            offline
          </span>
        )}
        {isSelectedValue && (
          <span className="rounded-full bg-gaia-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            ✓
          </span>
        )}
      </span>
    </button>
  );

  return (
    <div className="relative w-full">
      {/* ── Trigger button ──────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-[2.16rem] w-full items-center gap-[0.27rem] rounded-lg border border-slate-200 bg-white px-[0.54rem] text-[0.945rem] transition hover:border-gaia-400 hover:bg-gaia-50 ${open ? 'border-gaia-500 ring-1 ring-gaia-400' : ''}`}
        style={{ fontFamily: previewFontStack(value, findFont(value)?.category) }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className="flex-1 truncate text-left text-[0.945rem] font-medium text-slate-800"
          style={{ fontFamily: previewFontStack(value, findFont(value)?.category) }}
        >
          {loading ? <span className="text-slate-400 text-[0.81rem]">{t('common.loading', 'Loading…')}</span> : value}
        </span>
        <ChevronDown
          className={`h-[0.945rem] w-[0.945rem] shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Dropdown ────────────────────────────────────────────────────── */}
      {open && (
        <div
          ref={popRef}
          role="listbox"
          aria-label={t('common.fontPicker')}
          className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
          style={{ maxHeight: '400px', display: 'flex', flexDirection: 'column' }}
        >
          {/* Search bar */}
          <div className="relative flex-shrink-0 border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder={t('editor.searchFonts', 'Search fonts…')}
              className="w-full rounded-lg bg-slate-50 py-1.5 pl-8 pr-6 text-sm text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-gaia-400"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-autocomplete="list"
              aria-controls="font-picker-list"
            />
            {query && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setQuery('')}
                tabIndex={-1}
                aria-label={t('common.clearSearch')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Font list */}
          <div id="font-picker-list" ref={listRef} className="overflow-y-auto flex-1">
            {/* Recently used section (hidden when searching) */}
            {showRecents && (
              <div>
                <p className="sticky top-0 z-10 bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                  {t('editor.recentFonts', 'Recent')}
                </p>
                {recentFontDefs.map((f, i) =>
                  renderFontButton(f, i, value === f.family, true)
                )}
              </div>
            )}

            {/* Categorised font groups */}
            {grouped.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">
                No fonts match &ldquo;{query}&rdquo;
              </p>
            ) : (
              grouped.map(({ category, items }) => {
                const isSystemCat = SYSTEM_FONTS.some((f) => f.category === category);
                return (
                  <div key={category}>
                    <p className="sticky top-0 z-10 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {t(`editor.fontCat.${category}`, CATEGORY_LABEL[category] ?? category)}
                      {!isSystemCat && (
                        <span className="ml-1 normal-case font-normal text-slate-300">
                          · {items[0].bundled ? 'offline' : 'google'}
                        </span>
                      )}
                    </p>
                    {items.map((f) => {
                      // Determine this font's index in the navFonts array
                      const navIdx = navFonts.indexOf(f);
                      return renderFontButton(f, navIdx, value === f.family);
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
