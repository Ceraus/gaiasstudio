/**
 * PromptBuilderScreen — Dual-panel AI prompt builder.
 *
 * LEFT  : recipe banner, visual style preset cards, ingredient checklist.
 * RIGHT : generated prompt (read-only textarea + copy button) + embedded
 *         AI Studio webview panel for direct paste.
 *
 * The embedded browser uses Electron's <webview> tag (requires
 * webviewTag: true in the main-process webPreferences, which is set in
 * electron/main.cjs).  In a plain browser build the panel falls back to a
 * prominent "Open in AI Studio" button instead.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  ExternalLink,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ingredientsRepo, recipesRepo } from '@/db/repositories';
import { db } from '@/db/db';
import IngredientIcon, { CATEGORY_LABELS } from '@/components/common/IngredientIcon';
import type { AssetRecord, Ingredient, IngredientCategory, Recipe } from '@/types';

// ── Style presets ─────────────────────────────────────────────────────────────

const STYLE_PRESETS = [
  { id: 'warm-cream-linen',    colorName: 'Warm off-white cream', hexCode: '#E8E1D6', textureName: 'linen weave',        icon: '🧵' },
  { id: 'sage-cotton',         colorName: 'Soft sage green',      hexCode: '#B5C4B1', textureName: 'cotton fiber',       icon: '☁️' },
  { id: 'dusty-rose-silk',     colorName: 'Dusty rose blush',     hexCode: '#D4A5A5', textureName: 'smooth silk',        icon: '🌸' },
  { id: 'ivory-paper',         colorName: 'Antique ivory',        hexCode: '#F5F0E8', textureName: 'handmade paper',     icon: '📜' },
  { id: 'terracotta-clay',     colorName: 'Warm terracotta',      hexCode: '#C17F5A', textureName: 'raw clay',           icon: '🪨' },
  { id: 'forest-moss',         colorName: 'Deep forest green',    hexCode: '#4A7C59', textureName: 'pressed moss',       icon: '🌿' },
  { id: 'midnight-charcoal',   colorName: 'Charcoal black',       hexCode: '#2C2C2C', textureName: 'activated charcoal', icon: '🖤' },
  { id: 'lavender-mist',       colorName: 'Lavender mist',        hexCode: '#C5B8D4', textureName: 'soft velvet',        icon: '💜' },
  { id: 'golden-honey',        colorName: 'Golden amber',         hexCode: '#D4A017', textureName: 'raw beeswax',        icon: '🍯' },
  { id: 'ocean-blue',          colorName: 'Ocean teal',           hexCode: '#5B8FA8', textureName: 'sea glass',          icon: '🌊' },
  { id: 'espresso-wood',       colorName: 'Espresso brown',       hexCode: '#3E1F0A', textureName: 'dark wood grain',    icon: '🪵' },
  { id: 'petal-pink',          colorName: 'Petal pink',           hexCode: '#F2C6C2', textureName: 'rose petal',         icon: '🌹' },
  { id: 'muted-gold',          colorName: 'Muted gold',           hexCode: '#B8A06A', textureName: 'raw jute',           icon: '🌾' },
  { id: 'slate-mineral',       colorName: 'Slate gray',           hexCode: '#708090', textureName: 'polished stone',     icon: '🪨' },
  { id: 'cream-marble',        colorName: 'Cream marble',         hexCode: '#F0EDE4', textureName: 'veined marble',      icon: '✨' },
  { id: 'soft-mint',           colorName: 'Soft mint',            hexCode: '#B5D5C5', textureName: 'smooth linen',       icon: '🍃' },
  { id: 'warm-peach',          colorName: 'Warm peach',           hexCode: '#FFCBA4', textureName: 'hammered copper',    icon: '🍑' },
  { id: 'burgundy-velvet',     colorName: 'Deep burgundy',        hexCode: '#722F37', textureName: 'crushed velvet',     icon: '🍷' },
  { id: 'sand-dune',           colorName: 'Warm sand',            hexCode: '#C2A87D', textureName: 'fine sand',          icon: '🏖️' },
  { id: 'olive-linen',         colorName: 'Olive green',          hexCode: '#8A9A5B', textureName: 'rustic linen',       icon: '🌿' },
  { id: 'vanilla-cream',       colorName: 'Vanilla cream',        hexCode: '#F3E5C3', textureName: 'whipped cream',      icon: '🍦' },
  { id: 'midnight-blue',       colorName: 'Midnight navy',        hexCode: '#1B2A4A', textureName: 'matte canvas',       icon: '🌙' },
  { id: 'copper-rust',         colorName: 'Copper rust',          hexCode: '#A0522D', textureName: 'patinated copper',   icon: '🔶' },
  { id: 'pearl-white',         colorName: 'Pearl white',          hexCode: '#F8F4EF', textureName: 'woven gauze',        icon: '🤍' },
  { id: 'deep-forest-green',   colorName: 'Deep Forest Green',    hexCode: '#2D4A3E', textureName: 'moss velvet',        icon: '🌿' },
  { id: 'saddle-brown',        colorName: 'Saddle Brown',         hexCode: '#8B4513', textureName: 'worn leather',       icon: '🪵' },
  { id: 'wheat',               colorName: 'Wheat',                hexCode: '#E8D5B7', textureName: 'raw linen',          icon: '🌾' },
  { id: 'cornflower-blue',     colorName: 'Cornflower Blue',      hexCode: '#4A90D9', textureName: 'washed denim',       icon: '💧' },
  { id: 'caramel',             colorName: 'Caramel',              hexCode: '#C9A96E', textureName: 'spun silk',          icon: '🍯' },
  { id: 'dusty-plum',          colorName: 'Dusty Plum',           hexCode: '#7B6F8A', textureName: 'brushed suede',      icon: '💜' },
  { id: 'linen-white',         colorName: 'Linen White',          hexCode: '#F5E6D3', textureName: 'bleached cotton',    icon: '🤍' },
  { id: 'hunter-green',        colorName: 'Hunter Green',         hexCode: '#3D5A4C', textureName: 'aged patina',        icon: '🍃' },
  { id: 'terracotta-peach',    colorName: 'Terracotta Peach',     hexCode: '#D4956A', textureName: 'sun-baked clay',     icon: '🏺' },
  { id: 'sage-mist',           colorName: 'Sage Mist',            hexCode: '#B8C4BB', textureName: 'frosted glass',      icon: '🌫️' },
  { id: 'toasted-almond',      colorName: 'Toasted Almond',       hexCode: '#C8A878', textureName: 'raw almond shell',   icon: '🌰' },
  { id: 'walnut-shell',        colorName: 'Walnut Shell',         hexCode: '#5A3E2B', textureName: 'cracked walnut wood', icon: '🟤' },
] as const;

type StylePreset = typeof STYLE_PRESETS[number];

// ── Ingredient seed ───────────────────────────────────────────────────────────

const INGREDIENTS = [
  'almond branches', 'aloe leaves', 'argan nuts', 'avocado halves',
  'babassu palm fruits', 'beeswax', 'bentonite clay bowls', 'bergamot fruits',
  'blue clay bowls', 'calendula blossoms', 'castor bean pods', 'cedar sprigs',
  'chamomile flowers', 'charcoal chunks', 'cinnamon sticks', 'clary sage blooms',
  'cocoa pods', 'coffee beans', 'cracked coconuts', 'dried calendula leaves',
  'eucalyptus leaves', 'geranium blooms', 'grape clusters', 'green clay bowls',
  'green tea leaves', 'honeycomb', 'jasmine blossoms', 'jojoba branches',
  'lavender sprigs', 'lemon slices', 'lemongrass stalks', 'mango halves',
  'myrrh resin tears', 'neem seeds', 'oat ears', 'olive branches',
  'orange blossoms', 'orange slices', 'palmarosa grass', 'patchouli leaves',
  'peppermint leaves', 'pink clay bowls', 'poppy pods', 'red clay bowls',
  'rice stalks', 'rose blooms', 'rosehip berries', 'rosemary sprigs',
  'shea nuts', 'silk cocoons', 'small milk bottles', 'spirulina swirls',
  'sweet almond branches', 'tea leaves', 'tea tree leaves', 'vanilla pods',
  'white clay bowls', 'yellow clay bowls', 'ylang-ylang flowers',
].sort();

/** Maps each visual-prompt token to the icon category that best represents it,
 *  so the checklist shows a meaningful icon instead of a generic placeholder. */
const INGREDIENT_ICON_CATEGORY: Record<string, IngredientCategory> = {
  'almond branches': 'oil',
  'aloe leaves': 'botanical',
  'argan nuts': 'oil',
  'avocado halves': 'oil',
  'babassu palm fruits': 'oil',
  'beeswax': 'wax',
  'bentonite clay bowls': 'clay',
  'bergamot fruits': 'citrus',
  'blue clay bowls': 'clay',
  'calendula blossoms': 'floral',
  'castor bean pods': 'oil',
  'cedar sprigs': 'spice',
  'chamomile flowers': 'floral',
  'charcoal chunks': 'additive',
  'cinnamon sticks': 'spice',
  'clary sage blooms': 'floral',
  'cocoa pods': 'butter',
  'coffee beans': 'exfoliant',
  'cracked coconuts': 'oil',
  'dried calendula leaves': 'botanical',
  'eucalyptus leaves': 'botanical',
  'geranium blooms': 'floral',
  'grape clusters': 'oil',
  'green clay bowls': 'clay',
  'green tea leaves': 'botanical',
  'honeycomb': 'wax',
  'jasmine blossoms': 'floral',
  'jojoba branches': 'oil',
  'lavender sprigs': 'floral',
  'lemon slices': 'citrus',
  'lemongrass stalks': 'botanical',
  'mango halves': 'butter',
  'myrrh resin tears': 'essential-oil',
  'neem seeds': 'seed',
  'oat ears': 'exfoliant',
  'olive branches': 'oil',
  'orange blossoms': 'floral',
  'orange slices': 'citrus',
  'palmarosa grass': 'essential-oil',
  'patchouli leaves': 'botanical',
  'peppermint leaves': 'botanical',
  'pink clay bowls': 'clay',
  'poppy pods': 'seed',
  'red clay bowls': 'clay',
  'rice stalks': 'exfoliant',
  'rose blooms': 'floral',
  'rosehip berries': 'oil',
  'rosemary sprigs': 'botanical',
  'shea nuts': 'butter',
  'silk cocoons': 'additive',
  'small milk bottles': 'milk',
  'spirulina swirls': 'colorant',
  'sweet almond branches': 'oil',
  'tea leaves': 'botanical',
  'tea tree leaves': 'essential-oil',
  'vanilla pods': 'spice',
  'white clay bowls': 'clay',
  'yellow clay bowls': 'clay',
  'ylang-ylang flowers': 'floral',
};

// ── Ingredient token matching ─────────────────────────────────────────────────

const MATCH_SKIP = new Set([
  'butter', 'oil', 'essential', 'extract', 'gel', 'powder', 'base',
  'fragrance', 'acid', 'hydrolyzed', 'water', 'bark', 'root', 'wax',
  'seed', 'seeds', 'flour', 'meal', 'juice', 'milk', 'cream',
]);

function matchRecipeIngredientsToTokens(names: string[]): Set<string> {
  const matched = new Set<string>();
  for (const name of names) {
    const keywords = name
      .toLowerCase()
      .split(/[\s\-/]+/)
      .filter((w) => w.length >= 4 && !MATCH_SKIP.has(w));
    for (const token of INGREDIENTS) {
      const lowerToken = token.toLowerCase();
      if (keywords.some((kw) => lowerToken.includes(kw))) {
        matched.add(token);
        break;
      }
    }
  }
  return matched;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return '[select at least one ingredient]';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function buildPrompt(
  colorName: string,
  hexCode: string,
  textureName: string,
  selected: string[],
  productName?: string,
): string {
  const ingList = joinWithAnd(selected);
  const color   = colorName.trim() || 'a warm neutral';
  const hex     = hexCode.trim()   || '#E8E1D6';
  const texture = textureName      || 'linen weave';
  const product = productName?.trim() ? `${productName.trim()} ` : '';
  return `4K horizontal ribbon background (21:9 aspect ratio) for ${product}soap packaging. Full-bleed edge-to-edge design completely filling the canvas. ${color} ${hex} background with ${texture} texture. Highly decorative, continuous and elaborate botanical pattern covering 100% of the space featuring ${ingList}. Dense, intricate, and seamless composition with no empty space anywhere. Dimensional organic vector style, deep espresso brown tapered linework, layered tonal shading, rich earthy palette. NO text, NO words, NO mockups, NO 3D objects, NO borders, NO white space.`;
}

const AI_STUDIO_URL = 'https://aistudio.google.com/app/prompts/new_chat';
const GEMINI_URL    = 'https://gemini.google.com/app';

/** Open a URL in the dedicated Electron AI window, or fall back to system browser. */
function openAiBrowser(url: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (window as any).electronAPI;
  if (api?.openAiBrowser) {
    api.openAiBrowser(url);
  } else {
    window.open(url, '_blank');
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PromptBuilderScreen() {
  const { t } = useTranslation();

  // ── Store ──────────────────────────────────────────────────────────────────
  const activeRecipeId         = useAppStore((s) => s.activeRecipeId);
  const setActiveRecipeId      = useAppStore((s) => s.setActiveRecipeId);
  const goto                   = useAppStore((s) => s.goto);
  const setPromptBuilderOutput = useAppStore((s) => s.setPromptBuilderOutput);

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [selectedPresetId, setSelectedPresetId] = useState<string>(STYLE_PRESETS[0].id);
  const [colorName,   setColorName]   = useState<string>(STYLE_PRESETS[0].colorName);
  const [hexCode,     setHexCode]     = useState<string>(STYLE_PRESETS[0].hexCode);
  const [texture,     setTexture]     = useState<string>(STYLE_PRESETS[0].textureName);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [productName, setProductName] = useState('');
  const [copied,      setCopied]      = useState(false);
  const [recentAiAssets, setRecentAiAssets] = useState<AssetRecord[]>([]);

  // ── Recipe state ───────────────────────────────────────────────────────────
  const [recipes,               setRecipes]               = useState<Recipe[]>([]);
  const [activeRecipe,          setActiveRecipe]          = useState<Recipe | null>(null);
  const [recipeIngredientNames, setRecipeIngredientNames] = useState<string[]>([]);

  // ── DB ingredient state ────────────────────────────────────────────────────
  const [activeDbIngredients, setActiveDbIngredients] = useState<Ingredient[]>([]);
  const [allDbIngredients,    setAllDbIngredients]    = useState<Ingredient[]>([]);

  // ── Catalog UI state ───────────────────────────────────────────────────────
  const [catalogOpen,    setCatalogOpen]    = useState(false);
  const [catalogQuery,   setCatalogQuery]   = useState('');

  // ── Embedded AI webview ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webviewRef = useRef<any>(null);
  const [urlBarValue, setUrlBarValue] = useState(AI_STUDIO_URL);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

  // ── Add ingredient form ────────────────────────────────────────────────────
  const [newIngName,     setNewIngName]     = useState('');
  const [newIngCategory, setNewIngCategory] = useState<IngredientCategory>('botanical');
  const [addingIng,      setAddingIng]      = useState(false);
  const [ingAddedMsg,    setIngAddedMsg]    = useState(false);

  const activeRecipeIdRef = useRef(activeRecipeId);

  useEffect(() => {
    activeRecipeIdRef.current = activeRecipeId;
  }, [activeRecipeId]);

  // ── Load all recipes for the switcher dropdown ────────────────────────────
  useEffect(() => {
    recipesRepo.all().then(setRecipes).catch(() => {});
  }, []);

  // ── Load DB ingredients on mount, pre-select from active ──────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [active, all] = await Promise.all([
        ingredientsRepo.active(),
        ingredientsRepo.all(),
      ]);
      if (cancelled) return;
      setActiveDbIngredients(active);
      setAllDbIngredients(all);

      // Only pre-select from active DB ingredients if no recipe is loaded
      // (the recipe effect handles pre-selection when a recipe is active)
      if (!activeRecipeIdRef.current) {
        const names = active.map((i) => i.name);
        const matched = matchRecipeIngredientsToTokens(names);
        setSelected(matched);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-load recipe & pre-select matching tokens ──────────────────────────
  useEffect(() => {
    if (!activeRecipeId) {
      setActiveRecipe(null);
      setRecipeIngredientNames([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const recipe = await recipesRepo.get(activeRecipeId);
      if (cancelled || !recipe) return;

      setActiveRecipe(recipe);
      setProductName(recipe.name);

      const ingRecords = await Promise.all(
        recipe.ingredientIds.map((id) => db.ingredients.get(id)),
      );
      if (cancelled) return;

      const names = ingRecords
        .filter((rec): rec is NonNullable<typeof rec> => rec != null)
        .map((rec) => rec.name);

      setRecipeIngredientNames(names);

      const matched = matchRecipeIngredientsToTokens(names);
      setSelected(matched);
    })();

    return () => { cancelled = true; };
  }, [activeRecipeId]);

  // ── Load + refresh recently auto-imported AI images ───────────────────────
  const loadRecentAiAssets = () => {
    db.assets.orderBy('createdAt').reverse()
      .filter((a) => a.kind === 'ai')
      .limit(6)
      .toArray()
      .then(setRecentAiAssets)
      .catch(() => {});
  };

  useEffect(() => {
    loadRecentAiAssets();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI;
    if (!api?.onImageDownloaded) return;
    const unsub = api.onImageDownloaded(() => loadRecentAiAssets());
    return () => unsub?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Wire up webview navigation events ─────────────────────────────────────
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    const onNavigate = (e: { url: string }) => setUrlBarValue(e.url);
    wv.addEventListener('did-navigate', onNavigate);
    wv.addEventListener('did-navigate-in-page', onNavigate);
    return () => {
      wv.removeEventListener('did-navigate', onNavigate);
      wv.removeEventListener('did-navigate-in-page', onNavigate);
    };
  });

  // ── Add new ingredient to DB ───────────────────────────────────────────────
  const addIngredient = async () => {
    if (!newIngName.trim() || addingIng) return;
    setAddingIng(true);
    try {
      const created = await ingredientsRepo.create({
        name: newIngName.trim(),
        category: newIngCategory,
        active: false,
        benefit: '',
        inci: '',
        isSoapBase: false,
      });
      setAllDbIngredients((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewIngName('');
      setIngAddedMsg(true);
      setTimeout(() => setIngAddedMsg(false), 2500);
    } finally {
      setAddingIng(false);
    }
  };

  // ── Style preset selection ─────────────────────────────────────────────────
  const selectPreset = (preset: StylePreset) => {
    setSelectedPresetId(preset.id);
    setColorName(preset.colorName);
    setHexCode(preset.hexCode);
    setTexture(preset.textureName);
  };

  // ── Ingredient checklist helpers ───────────────────────────────────────────
  const toggle    = (ing: string) => setSelected((prev) => { const n = new Set(prev); n.has(ing) ? n.delete(ing) : n.add(ing); return n; });
  const selectAll = () => setSelected(new Set(INGREDIENTS));
  const clearAll  = () => setSelected(new Set());

  // ── Prompt ─────────────────────────────────────────────────────────────────
  const prompt = useMemo(
    () => buildPrompt(colorName, hexCode, texture, [...selected], productName),
    [colorName, hexCode, texture, selected, productName],
  );

  // ── Sync prompt to store so the in-editor AI tab can display it ───────────
  useEffect(() => {
    setPromptBuilderOutput(prompt);
  }, [prompt, setPromptBuilderOutput]);

  // ── Clipboard helpers ──────────────────────────────────────────────────────
  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAndOpen = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    openAiBrowser(AI_STUDIO_URL);
  };

  // ── Active-token matching ──────────────────────────────────────────────────
  const activelyMatchedTokens = useMemo(
    () => matchRecipeIngredientsToTokens(activeDbIngredients.map((i) => i.name)),
    [activeDbIngredients],
  );

  // Tokens NOT matched by any active DB ingredient
  const nonActiveTokens = useMemo(
    () => INGREDIENTS.filter((t) => !activelyMatchedTokens.has(t)),
    [activelyMatchedTokens],
  );

  // Columns for the "All Botanicals" portion (4 logical columns, 2-col CSS grid)
  const cols   = 4;
  const perCol = Math.ceil(nonActiveTokens.length / cols);
  const nonActiveColumns: string[][] = Array.from({ length: cols }, (_, ci) =>
    nonActiveTokens.slice(ci * perCol, ci * perCol + perCol),
  );

  // Columns for matched active tokens (2-col)
  const activeTokenList = [...activelyMatchedTokens].sort();
  const activePerCol = Math.ceil(activeTokenList.length / 2);
  const activeColumns: string[][] = Array.from({ length: 2 }, (_, ci) =>
    activeTokenList.slice(ci * activePerCol, ci * activePerCol + activePerCol),
  );

  // ── Catalog filtered & grouped ─────────────────────────────────────────────
  const catalogGrouped = useMemo(() => {
    const q = catalogQuery.toLowerCase().trim();
    const filtered = q
      ? allDbIngredients.filter((i) => i.name.toLowerCase().includes(q) || (i.benefit ?? '').toLowerCase().includes(q))
      : allDbIngredients;
    const grouped = new Map<IngredientCategory | 'other', Ingredient[]>();
    for (const ing of filtered) {
      const cat = (ing.category ?? 'other') as IngredientCategory;
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(ing);
    }
    return grouped;
  }, [allDbIngredients, catalogQuery]);

  return (
    <div className="flex h-full min-w-0 overflow-x-hidden overflow-y-hidden">

      {/* ── LEFT: Controls (scrollable) ──────────────────────────────────── */}
      <div className="flex w-[28.75rem] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-gaia-50 p-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gaia-600 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-gaia-900">
              {t('promptBuilder.title', 'AI Prompt Builder')}
            </h1>
            <p className="text-xs text-slate-500">
              {t('promptBuilder.subtitle', 'Build a background prompt and paste it into your AI generator.')}
            </p>
          </div>
        </div>

        {/* ── Recipe switcher dropdown ───────────────────────────────────── */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Recipe:</span>
          {recipes.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              {t('promptBuilder.noRecipesHint', 'No recipes yet — create one in Recipes')}
            </p>
          ) : (
            <select
              value={activeRecipeId ?? ''}
              onChange={(e) => setActiveRecipeId(e.target.value || null)}
              className="flex-1 text-sm rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">— Choose a recipe —</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* ── Recipe banner ──────────────────────────────────────────────── */}
        <div className={`mt-3 rounded-xl p-3 ring-1 ${activeRecipe ? 'bg-gaia-50 ring-gaia-200' : 'bg-amber-50 ring-amber-200'}`}>
          {activeRecipe ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-gaia-800">
                  🌿 {t('promptBuilder.recipeLoaded', 'Using recipe:')} {activeRecipe.name}
                </p>
                <button onClick={() => goto('recipes')} className="shrink-0 text-xs text-gaia-600 hover:underline">
                  {t('promptBuilder.changeRecipe', 'Change Recipe')}
                </button>
              </div>
              {recipeIngredientNames.length > 0 && (
                <p className="mt-1 text-xs text-gaia-700">
                  <span className="font-medium">{t('promptBuilder.recipeKeyIngredients', 'Key ingredients:')}</span>{' '}
                  {recipeIngredientNames.slice(0, 5).join(', ')}
                  {recipeIngredientNames.length > 5 && (
                    <span className="text-gaia-500"> +{recipeIngredientNames.length - 5} {t('promptBuilder.moreIngredients', 'more')}</span>
                  )}
                </p>
              )}
              {activeRecipe.benefit && (
                <p className="mt-1 text-xs italic text-gaia-600">{activeRecipe.benefit}</p>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-amber-700">
                {t('promptBuilder.noRecipe', 'No recipe selected — go to Build Recipe first.')}
              </p>
              <button onClick={() => goto('recipes')} className="shrink-0 text-xs font-medium text-amber-700 hover:underline">
                {t('promptBuilder.goToRecipes', 'Recipes →')}
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 space-y-4">

          {/* ── Visual Style Preset Cards ─────────────────────────────────── */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                {t('promptBuilder.styleSection', 'Background Style')}
              </h2>
              {/* Active swatch preview */}
              <div className="flex items-center gap-1.5">
                <div
                  className="h-4 w-4 rounded-full ring-1 ring-slate-200"
                  style={{ backgroundColor: hexCode }}
                />
                <span className="font-mono text-xs text-slate-400">{hexCode}</span>
              </div>
            </div>

            {/* 4-column preset grid */}
            <div className="grid grid-cols-4 gap-1.5">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => selectPreset(preset)}
                  className={`overflow-hidden rounded-xl text-left transition-all ${
                    selectedPresetId === preset.id
                      ? 'ring-2 ring-gaia-500 shadow-sm'
                      : 'ring-1 ring-slate-100 hover:ring-gaia-300 hover:shadow-sm'
                  }`}
                  title={`${preset.colorName} – ${preset.textureName}`}
                >
                  {/* Color swatch */}
                  <div className="h-10 w-full" style={{ backgroundColor: preset.hexCode }} />
                  {/* Card info */}
                  <div className="bg-white px-1.5 py-1">
                    <div className="flex items-center gap-0.5">
                      <span className="shrink-0 text-xs leading-none">{preset.icon}</span>
                      <span className="truncate text-[9px] font-semibold leading-snug text-slate-700">
                        {preset.colorName}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[8px] leading-snug text-slate-400">
                      {preset.textureName}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Manual override row */}
            <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
              <label
                htmlFor="colorPicker"
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md ring-1 ring-slate-200 hover:ring-gaia-400"
                title="Pick custom colour"
              >
                <span className="block h-full w-full" style={{ backgroundColor: hexCode }} />
              </label>
              <input
                id="colorPicker"
                type="color"
                className="sr-only"
                value={hexCode}
                onChange={(e) => { setHexCode(e.target.value); setSelectedPresetId(''); }}
              />
              <input
                type="text"
                className="input h-7 w-24 font-mono text-xs"
                placeholder="#E8E1D6"
                value={hexCode}
                onChange={(e) => { setHexCode(e.target.value); setSelectedPresetId(''); }}
              />
              <input
                type="text"
                className="input h-7 min-w-0 flex-1 text-xs"
                placeholder={t('promptBuilder.colorNamePlaceholder', 'Color name')}
                value={colorName}
                onChange={(e) => { setColorName(e.target.value); setSelectedPresetId(''); }}
              />
            </div>
          </div>

          {/* ── Product Name ──────────────────────────────────────────────── */}
          <div className="card space-y-2">
            <h2 className="text-sm font-semibold text-slate-700">
              {t('promptBuilder.productName', 'Product Name')}
            </h2>
            <input
              type="text"
              className="input"
              placeholder={t('promptBuilder.productNamePlaceholder', 'e.g. Lavender Oatmeal Bar')}
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
            <p className="text-xs text-slate-400">
              {t('promptBuilder.productNameHint', 'Optional — personalises the prompt for your product.')}
            </p>
          </div>

          {/* ── Ingredient Checklist ──────────────────────────────────────── */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                {t('promptBuilder.ingredientsSection', 'Botanical Ingredients')}
                {selected.size > 0 && (
                  <span className="ml-2 inline-flex h-5 items-center rounded-full bg-gaia-100 px-2 text-xs font-medium text-gaia-700">
                    {selected.size}
                  </span>
                )}
              </h2>
              <div className="flex gap-2">
                <button className="text-xs text-gaia-600 hover:underline" onClick={selectAll}>
                  {t('common.selectAll', 'Select all')}
                </button>
                <span className="text-slate-300">|</span>
                <button className="text-xs text-slate-500 hover:underline" onClick={clearAll}>
                  {t('common.clearAll', 'Clear')}
                </button>
              </div>
            </div>

            {activeRecipe && selected.size > 0 && (
              <p className="rounded-lg bg-gaia-100 px-2 py-1.5 text-xs text-gaia-700">
                ✓ {t('promptBuilder.recipeAutoFilled', 'Ingredients auto-selected from recipe — you can adjust below.')}
              </p>
            )}

            {/* ── Your Active Ingredients ──────────────────────────────── */}
            {activeTokenList.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                    {t('promptBuilder.yourActiveIngredients', 'Your Active Ingredients')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-3">
                  {activeColumns.map((col, ci) => (
                    <div key={ci} className="space-y-0.5">
                      {col.map((ing) => (
                        <label
                          key={ing}
                          className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition ${
                            selected.has(ing) ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 shrink-0 accent-emerald-600"
                            checked={selected.has(ing)}
                            onChange={() => toggle(ing)}
                          />
                          <IngredientIcon category={INGREDIENT_ICON_CATEGORY[ing] ?? 'other'} name={ing} size="sm" />
                          <span className="leading-snug">{ing}</span>
                          <span className="ml-auto shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                            Active
                          </span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── All Botanicals ────────────────────────────────────────── */}
            <div className="space-y-1.5">
              {activeTokenList.length > 0 && (
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {t('promptBuilder.allBotanicals', 'All Botanicals')}
                </p>
              )}
              <div className="grid grid-cols-2 gap-x-3">
                {nonActiveColumns.map((col, ci) => (
                  <div key={ci} className="space-y-0.5">
                    {col.map((ing) => (
                      <label
                        key={ing}
                        className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition ${
                          selected.has(ing) ? 'bg-gaia-50 text-gaia-800' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 shrink-0 accent-gaia-600"
                          checked={selected.has(ing)}
                          onChange={() => toggle(ing)}
                        />
                        <IngredientIcon category={INGREDIENT_ICON_CATEGORY[ing] ?? 'other'} name={ing} size="sm" />
                        <span className="leading-snug">{ing}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Browse Full Catalog ────────────────────────────────────────── */}
          <div className="card space-y-3">
            <button
              onClick={() => setCatalogOpen((v) => !v)}
              className="flex w-full items-center justify-between"
            >
              <h2 className="text-sm font-semibold text-slate-700">
                {t('promptBuilder.browseCatalog', 'Browse Full Catalog')}
              </h2>
              {catalogOpen
                ? <ChevronDown className="h-4 w-4 text-slate-400" />
                : <ChevronRight className="h-4 w-4 text-slate-400" />
              }
            </button>

            {catalogOpen && (
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input h-8 pl-8 text-xs"
                    placeholder={t('common.search', 'Search…')}
                    value={catalogQuery}
                    onChange={(e) => setCatalogQuery(e.target.value)}
                  />
                </div>

                {/* Ingredient list + Add form in a single scrollable container so the
                    form is never clipped below the viewport */}
                <div className="max-h-80 overflow-y-auto pr-1 space-y-3">
                  {/* Grouped ingredient list */}
                  {catalogGrouped.size === 0 ? (
                    <p className="py-3 text-center text-xs text-slate-400">
                      {t('ingredients.noResults', 'No results')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {[...catalogGrouped.entries()].map(([cat, ings]) => (
                        <div key={cat}>
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            {CATEGORY_LABELS[cat as IngredientCategory] ?? cat}
                          </p>
                          <div className="grid grid-cols-2 gap-x-3">
                            {ings.map((ing) => (
                              <label
                                key={ing.id}
                                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition ${
                                  selected.has(ing.name) ? 'bg-gaia-50 text-gaia-800' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="h-3.5 w-3.5 shrink-0 accent-gaia-600"
                                  checked={selected.has(ing.name)}
                                  onChange={() => toggle(ing.name)}
                                />
                                <IngredientIcon category={ing.category} name={ing.name} size="sm" />
                                <span className="truncate leading-snug">{ing.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new ingredient — inside the scroll container so it's always reachable */}
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-600">
                      {t('promptBuilder.addIngredient', 'Add New Ingredient')}
                    </p>
                    <div className="flex gap-2">
                      <input
                        className="input h-8 min-w-0 flex-1 text-xs"
                        placeholder={t('ingredients.namePlaceholder', 'e.g. Lavender EO')}
                        value={newIngName}
                        onChange={(e) => setNewIngName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && void addIngredient()}
                      />
                      <select
                        className="input h-8 shrink-0 py-0 text-xs"
                        value={newIngCategory}
                        onChange={(e) => setNewIngCategory(e.target.value as IngredientCategory)}
                      >
                        {(Object.entries(CATEGORY_LABELS) as [IngredientCategory, string][]).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                      <button
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-gaia-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-gaia-700 disabled:opacity-50"
                        disabled={addingIng || !newIngName.trim()}
                        onClick={() => void addIngredient()}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t('common.add', 'Add')}
                      </button>
                    </div>
                    {ingAddedMsg && (
                      <p className="flex items-center gap-1 text-xs text-emerald-600">
                        <Check className="h-3.5 w-3.5" />
                        {t('promptBuilder.ingredientAdded', 'Ingredient added!')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Prompt output + AI launch ──────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Prompt output panel */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-700">
              {t('promptBuilder.outputSection', 'Generated Prompt')}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {/* Copy */}
              <button
                onClick={() => void copy()}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  copied
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {copied
                  ? <><Check className="h-3.5 w-3.5" /> Copied! ✓</>
                  : <><ClipboardCopy className="h-3.5 w-3.5" /> Copy</>
                }
              </button>

              {/* Copy & Open */}
              <button
                onClick={() => void copyAndOpen()}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-gaia-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gaia-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t('promptBuilder.copyAndOpen', 'Copy & Open')}
              </button>
            </div>
          </div>

          <textarea
            readOnly
            rows={4}
            className="input mt-3 resize-none font-mono text-xs leading-relaxed text-slate-700"
            value={prompt}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />

          <p className="mt-1.5 text-[11px] text-slate-400">
            {t('promptBuilder.outputHint', 'Click the text area to select all. Use "Copy & Open" to copy the prompt and launch your AI generator.')}
          </p>
        </div>

        {/* AI browser panel (webview in Electron, fallback buttons otherwise) */}
        {isElectron ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
              <button
                onClick={() => webviewRef.current?.goBack()}
                className="shrink-0 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                title="Go back"
              >
                ← Back
              </button>
              <button
                onClick={() => webviewRef.current?.reload()}
                className="shrink-0 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                title="Reload"
              >
                ⟳
              </button>
              <input
                className="input h-7 min-w-0 flex-1 font-mono text-xs"
                value={urlBarValue}
                onChange={(e) => setUrlBarValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') webviewRef.current?.loadURL(urlBarValue);
                }}
              />
              <button
                onClick={() => webviewRef.current?.loadURL(AI_STUDIO_URL)}
                className="shrink-0 rounded px-2 py-1 text-xs font-medium text-gaia-600 hover:bg-gaia-50"
              >
                AI Studio
              </button>
              <button
                onClick={() => webviewRef.current?.loadURL(GEMINI_URL)}
                className="shrink-0 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Gemini
              </button>
            </div>
            {/* Embedded webview */}
            <webview
              ref={webviewRef}
              src={AI_STUDIO_URL}
              partition="persist:aistudio"
              useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              allowpopups
              webpreferences="contextIsolation=yes, nodeIntegration=no, javascript=yes"
              style={{ flex: 1, width: '100%', minHeight: '500px' }}
            />
          </div>
        ) : (
          /* Fallback: launch buttons + recent imports for non-Electron */
          <div className="flex flex-1 flex-col items-center justify-start gap-8 overflow-y-auto p-8">

            {/* Launch buttons */}
            <div className="w-full max-w-md space-y-4">
              <div className="text-center">
                <Sparkles className="mx-auto mb-2 h-8 w-8 text-gaia-400" />
                <p className="text-sm text-slate-500">
                  {t('promptBuilder.browserNote', 'Opens in a full browser with Google sign-in support')}
                </p>
              </div>

              <button
                onClick={() => openAiBrowser(AI_STUDIO_URL)}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-gaia-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-gaia-700 active:scale-[0.98]"
              >
                <ExternalLink className="h-5 w-5 shrink-0" />
                {t('promptBuilder.openAiStudio', 'Open AI Studio')}
              </button>

              <button
                onClick={() => openAiBrowser(GEMINI_URL)}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
              >
                <ExternalLink className="h-5 w-5 shrink-0 text-gaia-500" />
                {t('promptBuilder.openGemini', 'Open Gemini')}
              </button>

              <div className="rounded-xl bg-gaia-50 p-4 ring-1 ring-gaia-100">
                <p className="text-xs font-semibold text-gaia-700">{t('promptBuilder.tipsTitle', 'Tips')}</p>
                <ul className="mt-2 space-y-1 text-xs text-gaia-800">
                  <li>• {t('promptBuilder.tip1', 'Select 4–8 ingredients for the most balanced composition.')}</li>
                  <li>• {t('promptBuilder.tip2', 'Try "linen weave" or "veined marble" for a clean, elegant look.')}</li>
                  <li>• {t('promptBuilder.tip3', 'Use "Copy & Open" to launch AI Studio with the prompt ready to paste.')}</li>
                </ul>
              </div>
            </div>

            {/* Recently auto-imported AI images */}
            {recentAiAssets.length > 0 && (
              <div className="w-full max-w-md">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t('promptBuilder.recentImports', 'Recently Imported')}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {recentAiAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="aspect-video overflow-hidden rounded-lg ring-1 ring-slate-200"
                      title={asset.name}
                    >
                      <img
                        src={asset.dataUrl}
                        alt={asset.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
