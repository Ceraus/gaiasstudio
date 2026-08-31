/**
 * PromptBuilderScreen — Dual-panel AI prompt builder.
 *
 * LEFT  : recipe banner, visual style preset cards, ingredient checklist.
 * RIGHT : generated prompt (read-only textarea + copy button) + embedded
 *         Gemini webview panel for direct paste.
 *
 * The embedded browser uses Electron's <webview> tag (requires
 * webviewTag: true in the main-process webPreferences, which is set in
 * electron/main.cjs).  In a plain browser build the panel falls back to a
 * Gemini companion window.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookmarkPlus,
  Check,
  ClipboardCopy,
  ExternalLink,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { assetsRepo, ingredientsRepo, recipesRepo } from '@/db/repositories';
import { db } from '@/db/db';
import IngredientIcon from '@/components/common/IngredientIcon';
import HsvColorPicker from '@/components/common/HsvColorPicker';
import RecipePicker from '@/components/common/RecipePicker';
import { getIngredientDisplayName } from '@/lib/ingredientI18n';
import { isGeminiLibraryAsset } from '@/lib/assetFilters';
import { generateIngredientIcon } from '@/lib/comfyUiApi';
import { suggestBackgroundStyleName } from '@/lib/localAi';
import { nameStyleFromHex } from '@/lib/styleNames';
import { harvestGeminiImage, injectGeminiPrompt, waitForWebviewReady } from '@/lib/geminiWebview';
import { useLibraryStore } from '@/store/useLibraryStore';
import { uid } from '@/lib/id';
import type { AssetRecord, Ingredient, IngredientCategory, Recipe } from '@/types';

// ── Style presets ─────────────────────────────────────────────────────────────

type StylePreset = {
  id: string;
  colorName: string;
  hexCode: string;
  textureName: string;
  icon: string;
  iconKey?: string;
};

const STYLE_PRESETS: StylePreset[] = [
  { id: 'warm-cream-linen',  colorName: 'Cream',       hexCode: '#E8E1D6', textureName: 'Linen Weave',        icon: '🧵' },
  { id: 'sage-cotton',       colorName: 'Sage',        hexCode: '#B5C4B1', textureName: 'Cotton Fiber',       icon: '☁️' },
  { id: 'dusty-rose-silk',   colorName: 'Rose',        hexCode: '#D4A5A5', textureName: 'Smooth Silk',        icon: '🌸' },
  { id: 'terracotta-clay',   colorName: 'Terracotta',  hexCode: '#C17F5A', textureName: 'Raw Clay',           icon: '🪨' },
  { id: 'forest-moss',       colorName: 'Forest',      hexCode: '#4A7C59', textureName: 'Pressed Moss',       icon: '🌿' },
  { id: 'midnight-charcoal', colorName: 'Charcoal',    hexCode: '#2C2C2C', textureName: 'Activated Charcoal', icon: '🖤' },
  { id: 'lavender-mist',     colorName: 'Lavender',    hexCode: '#C5B8D4', textureName: 'Soft Velvet',        icon: '💜' },
  { id: 'golden-honey',      colorName: 'Amber',       hexCode: '#D4A017', textureName: 'Raw Beeswax',        icon: '🍯' },
  { id: 'ocean-blue',        colorName: 'Ocean',       hexCode: '#5B8FA8', textureName: 'Sea Glass',          icon: '🌊' },
  { id: 'espresso-wood',     colorName: 'Espresso',    hexCode: '#3E1F0A', textureName: 'Dark Wood Grain',    icon: '🪵' },
  { id: 'burgundy-velvet',   colorName: 'Burgundy',    hexCode: '#722F37', textureName: 'Crushed Velvet',     icon: '🍷' },
  { id: 'sand-dune',         colorName: 'Sand',        hexCode: '#C2A87D', textureName: 'Fine Sand',          icon: '🏖️' },
  { id: 'midnight-blue',     colorName: 'Navy',        hexCode: '#1B2A4A', textureName: 'Matte Canvas',       icon: '🌙' },
  { id: 'copper-rust',       colorName: 'Copper',      hexCode: '#A0522D', textureName: 'Patinated Copper',   icon: '🔶' },
  { id: 'dusty-plum',        colorName: 'Plum',        hexCode: '#7B6F8A', textureName: 'Brushed Suede',      icon: '💜' },
  { id: 'caramel',           colorName: 'Caramel',     hexCode: '#C9A96E', textureName: 'Spun Silk',          icon: '🍯' },
  { id: 'slate-mineral',     colorName: 'Slate',       hexCode: '#708090', textureName: 'Polished Stone',     icon: '🪨' },
  { id: 'olive-leaf',        colorName: 'Olive',       hexCode: '#7A8450', textureName: 'Pressed Leaf',       icon: '🫒' },
];

const HIDDEN_STYLE_PRESETS_KEY = 'gaia:hidden-style-presets';

function loadHiddenStyleIds(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_STYLE_PRESETS_KEY);
    const ids = raw ? JSON.parse(raw) as unknown : [];
    return new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : []);
  } catch (err) {
    console.error('[gaia] promptBuilder.loadHiddenStyleIds failed', err);
    return new Set();
  }
}

function saveHiddenStyleIds(ids: Set<string>) {
  localStorage.setItem(HIDDEN_STYLE_PRESETS_KEY, JSON.stringify([...ids]));
}

const SAVED_STYLE_PRESETS_KEY = 'gaia:saved-style-presets';

function isStylePreset(value: unknown): value is StylePreset {
  if (!value || typeof value !== 'object') return false;
  const p = value as StylePreset;
  return typeof p.id === 'string'
    && typeof p.colorName === 'string'
    && typeof p.hexCode === 'string'
    && typeof p.textureName === 'string'
    && typeof p.icon === 'string';
}

function loadSavedStyles(): StylePreset[] {
  try {
    const raw = localStorage.getItem(SAVED_STYLE_PRESETS_KEY);
    const list = raw ? JSON.parse(raw) as unknown : [];
    return Array.isArray(list) ? list.filter(isStylePreset) : [];
  } catch (err) {
    console.error('[gaia] promptBuilder.loadSavedStyles failed', err);
    return [];
  }
}

function saveSavedStyles(presets: StylePreset[]) {
  localStorage.setItem(SAVED_STYLE_PRESETS_KEY, JSON.stringify(presets));
}

function StylePresetIcon({ preset }: { preset: StylePreset }) {
  const [assetUrl, setAssetUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!preset.iconKey?.startsWith('asset_')) {
      setAssetUrl(null);
      return;
    }
    const id = preset.iconKey.replace('asset_', '');
    void assetsRepo.get(id).then((asset) => {
      setAssetUrl(asset && !asset.archived ? asset.dataUrl : null);
    });
  }, [preset.iconKey]);

  if (assetUrl) {
    return <img src={assetUrl} alt="" className="h-5 w-5 shrink-0 rounded object-cover" />;
  }
  return <span className="shrink-0 text-sm leading-none">{preset.icon}</span>;
}

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
  'seed', 'seeds', 'flour', 'meal', 'juice', 'milk', 'cream', 'clear',
  'white', 'custom', 'glycerin', 'melt', 'pour', 'sodium', 'cocoate',
]);

/** Catalog-name patterns → visual prompt tokens (first match wins per name variant). */
const VISUAL_ALIAS_RULES: Array<{ pattern: RegExp; tokens: string[] }> = [
  { pattern: /sweet almond/, tokens: ['sweet almond branches'] },
  { pattern: /\balmond\b/, tokens: ['almond branches'] },
  { pattern: /lavender/, tokens: ['lavender sprigs'] },
  { pattern: /activated charcoal|\bcharcoal\b/, tokens: ['charcoal chunks'] },
  { pattern: /kaolin|white kaolin/, tokens: ['white clay bowls'] },
  { pattern: /bentonite/, tokens: ['bentonite clay bowls'] },
  { pattern: /french green|green clay/, tokens: ['green clay bowls'] },
  { pattern: /rose kaolin|pink clay/, tokens: ['pink clay bowls'] },
  { pattern: /australian red|red clay/, tokens: ['red clay bowls'] },
  { pattern: /yellow clay/, tokens: ['yellow clay bowls'] },
  { pattern: /blue clay/, tokens: ['blue clay bowls'] },
  { pattern: /shea/, tokens: ['shea nuts'] },
  { pattern: /cocoa/, tokens: ['cocoa pods'] },
  { pattern: /mango/, tokens: ['mango halves'] },
  { pattern: /watermelon/, tokens: ['watermelon slices'] },
  { pattern: /coconut/, tokens: ['cracked coconuts'] },
  { pattern: /olive/, tokens: ['olive branches'] },
  { pattern: /jojoba/, tokens: ['jojoba branches'] },
  { pattern: /argan/, tokens: ['argan nuts'] },
  { pattern: /avocado/, tokens: ['avocado halves'] },
  { pattern: /grapeseed|grape seed/, tokens: ['grape clusters'] },
  { pattern: /\bgrape\b/, tokens: ['grape clusters'] },
  { pattern: /babassu/, tokens: ['babassu palm fruits'] },
  { pattern: /castor/, tokens: ['castor bean pods'] },
  { pattern: /rosehip|rose hip/, tokens: ['rosehip berries'] },
  { pattern: /calendula/, tokens: ['calendula blossoms'] },
  { pattern: /chamomile/, tokens: ['chamomile flowers'] },
  { pattern: /rosemary/, tokens: ['rosemary sprigs'] },
  { pattern: /eucalyptus/, tokens: ['eucalyptus leaves'] },
  { pattern: /peppermint/, tokens: ['peppermint leaves'] },
  { pattern: /patchouli/, tokens: ['patchouli leaves'] },
  { pattern: /lemongrass/, tokens: ['lemongrass stalks'] },
  { pattern: /tea tree/, tokens: ['tea tree leaves'] },
  { pattern: /green tea/, tokens: ['green tea leaves'] },
  { pattern: /\btea\b/, tokens: ['tea leaves'] },
  { pattern: /vanilla/, tokens: ['vanilla pods'] },
  { pattern: /honey/, tokens: ['honeycomb'] },
  { pattern: /goat milk|milk powder|\bmilk\b/, tokens: ['small milk bottles'] },
  { pattern: /oatmeal|colloidal oat|\boat\b/, tokens: ['oat ears'] },
  { pattern: /rice/, tokens: ['rice stalks'] },
  { pattern: /coffee/, tokens: ['coffee beans'] },
  { pattern: /cinnamon/, tokens: ['cinnamon sticks'] },
  { pattern: /spirulina/, tokens: ['spirulina swirls'] },
  { pattern: /beeswax/, tokens: ['beeswax'] },
  { pattern: /aloe/, tokens: ['aloe leaves'] },
  { pattern: /geranium/, tokens: ['geranium blooms'] },
  { pattern: /ylang/, tokens: ['ylang-ylang flowers'] },
  { pattern: /jasmine/, tokens: ['jasmine blossoms'] },
  { pattern: /rose petal|\brose\b/, tokens: ['rose blooms'] },
  { pattern: /orange blossom/, tokens: ['orange blossoms'] },
  { pattern: /bergamot/, tokens: ['bergamot fruits'] },
  { pattern: /lemon/, tokens: ['lemon slices'] },
  { pattern: /\borange\b/, tokens: ['orange slices'] },
  { pattern: /cedar/, tokens: ['cedar sprigs'] },
  { pattern: /clary sage/, tokens: ['clary sage blooms'] },
  { pattern: /myrrh/, tokens: ['myrrh resin tears'] },
  { pattern: /palmarosa/, tokens: ['palmarosa grass'] },
  { pattern: /neem/, tokens: ['neem seeds'] },
  { pattern: /poppy/, tokens: ['poppy pods'] },
  { pattern: /silk/, tokens: ['silk cocoons'] },
];

/** Expand a catalog name into variants (parenthetical content, stripped base prefix). */
function expandCatalogNames(name: string): string[] {
  const results = new Set<string>([name]);
  const paren = name.match(/\(([^)]+)\)/);
  if (paren?.[1]) results.add(paren[1]);
  const stripped = name
    .replace(/^(glycerin base|melt & pour base)\s*/i, '')
    .replace(/[()]/g, ' ')
    .trim();
  if (stripped) results.add(stripped);
  return [...results];
}

function matchSingleCatalogName(name: string): string[] {
  const norm = name.toLowerCase();
  for (const rule of VISUAL_ALIAS_RULES) {
    if (rule.pattern.test(norm)) return rule.tokens;
  }

  const keywords = norm
    .split(/[\s\-/]+/)
    .filter((w) => (w.length >= 4 && !MATCH_SKIP.has(w)) || (w.length >= 3 && ['aloe', 'tea', 'oat', 'neem', 'rose', 'clay'].includes(w)));

  const tokens: string[] = [];
  for (const token of INGREDIENTS) {
    const lowerToken = token.toLowerCase();
    if (keywords.some((kw) => lowerToken.includes(kw))) {
      tokens.push(token);
      break;
    }
  }
  return tokens;
}

function isPromptExcludedName(name: string): boolean {
  return /glycerin\s*base|melt\s*&\s*pour\s*base|melt-and-pour\s*base/i.test(name);
}

function isPromptExcludedIngredient(ing: Pick<Ingredient, 'name' | 'isSoapBase'>): boolean {
  return ing.isSoapBase || isPromptExcludedName(ing.name);
}

function promptPhraseForName(name: string): string {
  for (const variant of expandCatalogNames(name)) {
    const token = matchSingleCatalogName(variant)[0];
    if (token) return token;
  }
  return name;
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
): string {
  const ingList = joinWithAnd(selected);
  const color   = colorName.trim() || 'a warm neutral';
  const hex     = hexCode.trim()   || '#E8E1D6';
  const texture = textureName      || 'linen weave';
  return `4K horizontal ribbon background (21:9 aspect ratio) for soap packaging. Full-bleed edge-to-edge design completely filling the canvas. ${color} ${hex} background with ${texture} texture. Highly decorative, continuous and elaborate botanical pattern covering 100% of the space featuring ${ingList}. Dense, intricate, and seamless composition with no empty space anywhere. Dimensional organic vector style, deep espresso brown tapered linework, layered tonal shading, rich earthy palette. NO text, NO words, NO mockups, NO 3D objects, NO borders, NO white space.`;
}

const GEMINI_URL = 'https://gemini.google.com/app';
/** Named popup so reopening focuses the same companion window beside Studio. */
const AI_COMPANION_WINDOW = 'gaia-ai-companion';
const AI_WINDOW_FEATURES =
  'popup=yes,width=1280,height=900,menubar=no,toolbar=yes,location=yes,status=no,resizable=yes,scrollbars=yes';

/** Open Gemini in a reusable companion window (browser/PWA). */
function openAiCompanionWindow(existing: Window | null): Window | null {
  const url = GEMINI_URL;
  if (existing && !existing.closed) {
    try {
      existing.location.href = url;
    } catch {
      return window.open(url, AI_COMPANION_WINDOW, AI_WINDOW_FEATURES);
    }
    existing.focus();
    return existing;
  }
  const win = window.open(url, AI_COMPANION_WINDOW, AI_WINDOW_FEATURES);
  win?.focus();
  return win;
}

/** Open in the OS default browser (Electron) or a new tab (web). */
function openInDefaultBrowser(url: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const api = (window as any).electronAPI;
  if (api?.openExternalUrl) {
    void api.openExternalUrl(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface PromptBuilderScreenProps {
  /** When true, renders inside Background step (no separate navigation). */
  embedded?: boolean;
  /** Called when user picks or auto-imports a background image. */
  onBackgroundSelect?: (url: string) => void;
}

export default function PromptBuilderScreen({
  embedded = false,
  onBackgroundSelect,
}: PromptBuilderScreenProps = {}) {
  const { t } = useTranslation();

  // ── Store ──────────────────────────────────────────────────────────────────
  const activeRecipeId         = useAppStore((s) => s.activeRecipeId);
  const setActiveRecipeId      = useAppStore((s) => s.setActiveRecipeId);
  const goto                   = useAppStore((s) => s.goto);
  const setPromptBuilderOutput = useAppStore((s) => s.setPromptBuilderOutput);
  const setBackgroundImageUrl  = useAppStore((s) => s.setBackgroundImageUrl);

  // ── Local UI state ─────────────────────────────────────────────────────────
  const settings = useAppStore((s) => s.settings);
  const [hiddenStyleIds, setHiddenStyleIds] = useState<Set<string>>(loadHiddenStyleIds);
  const [savedStyles, setSavedStyles] = useState<StylePreset[]>(loadSavedStyles);
  const [savingStyle, setSavingStyle] = useState(false);
  const [saveStyleMsg, setSaveStyleMsg] = useState<string | null>(null);
  const visiblePresets = useMemo(
    () => [
      ...savedStyles,
      ...STYLE_PRESETS.filter((preset) => !hiddenStyleIds.has(preset.id)),
    ],
    [hiddenStyleIds, savedStyles],
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(STYLE_PRESETS[0].id);
  const [colorName,   setColorName]   = useState<string>(STYLE_PRESETS[0].colorName);
  const [hexCode,     setHexCode]     = useState<string>(STYLE_PRESETS[0].hexCode);
  const [texture,     setTexture]     = useState<string>(STYLE_PRESETS[0].textureName);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [copied,      setCopied]      = useState(false);
  const [injectStatus, setInjectStatus] = useState<string | null>(null);
  const [recentAiAssets, setRecentAiAssets] = useState<AssetRecord[]>([]);

  // ── Recipe state ───────────────────────────────────────────────────────────
  const [recipes,               setRecipes]               = useState<Recipe[]>([]);
  const [activeRecipe,          setActiveRecipe]          = useState<Recipe | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<Ingredient[]>([]);

  // ── DB ingredient state ────────────────────────────────────────────────────
  const [allDbIngredients,    setAllDbIngredients]    = useState<Ingredient[]>([]);

  // ── Embedded AI webview ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webviewRef = useRef<any>(null);
  const harvestTimerRef = useRef<number | null>(null);
  const [urlBarValue, setUrlBarValue] = useState(GEMINI_URL);
  const [companionOpen, setCompanionOpen] = useState(false);
  const aiCompanionRef = useRef<Window | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

  const openCompanion = () => {
    setUrlBarValue(GEMINI_URL);
    if (isElectron) {
      webviewRef.current?.loadURL(GEMINI_URL);
      return;
    }
    aiCompanionRef.current = openAiCompanionWindow(aiCompanionRef.current);
    setCompanionOpen(!!aiCompanionRef.current && !aiCompanionRef.current.closed);
  };

  // Track whether the companion popup is still open
  useEffect(() => {
    if (isElectron) return;
    const tick = () => {
      const open = !!aiCompanionRef.current && !aiCompanionRef.current.closed;
      setCompanionOpen(open);
    };
    tick();
    const id = window.setInterval(tick, 800);
    return () => window.clearInterval(id);
  }, [isElectron]);

  // ── Load all recipes for the switcher dropdown ────────────────────────────
  useEffect(() => {
    recipesRepo.all().then(setRecipes).catch((err) => {
      console.error('[gaia] promptBuilder.loadRecipes failed', err);
    });
  }, []);

  // ── Load DB ingredients on mount, pre-select from active ──────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const all = await ingredientsRepo.all();
      if (cancelled) return;
      setAllDbIngredients(all);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-load recipe & pre-select matching tokens ──────────────────────────
  useEffect(() => {
    if (!activeRecipeId) {
      setActiveRecipe(null);
      setRecipeIngredients([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const recipe = await recipesRepo.get(activeRecipeId);
      if (cancelled || !recipe) return;

      setActiveRecipe(recipe);

      const ingRecords = await Promise.all(
        recipe.ingredientIds.map((id) => db.ingredients.get(id)),
      );
      if (cancelled) return;

      const loaded = ingRecords.filter((rec): rec is Ingredient => rec != null);
      setRecipeIngredients(loaded);
      setSelected(new Set(loaded.filter((ing) => !isPromptExcludedIngredient(ing)).map((ing) => ing.name)));
    })();

    return () => { cancelled = true; };
  }, [activeRecipeId]);

  // Keep checklist in sync when recipe ingredient list updates
  useEffect(() => {
    if (!activeRecipe || recipeIngredients.length === 0) return;
    setSelected((prev) => {
      const next = new Set(prev);
      for (const ing of recipeIngredients) {
        if (isPromptExcludedIngredient(ing)) next.delete(ing.name);
        else next.add(ing.name);
      }
      return next;
    });
  }, [activeRecipe, recipeIngredients]);

  const loadRecentAiAssets = () => {
    db.assets.orderBy('createdAt').reverse()
      .filter((a) => isGeminiLibraryAsset(a))
      .limit(6)
      .toArray()
      .then(setRecentAiAssets)
      .catch((err) => {
        console.error('[gaia] promptBuilder.loadRecentAiAssets failed', err);
      });
  };

  const applyRecentAsset = (dataUrl: string) => {
    if (embedded && onBackgroundSelect) {
      onBackgroundSelect(dataUrl);
      return;
    }
    setBackgroundImageUrl(dataUrl);
    goto('background');
  };

  useEffect(() => {
    loadRecentAiAssets();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = (window as any).electronAPI;
    if (!api?.onImageDownloaded) return;
    const unsub = api.onImageDownloaded(({ dataUrl }: { dataUrl: string; filename: string }) => {
      loadRecentAiAssets();
      if (embedded && onBackgroundSelect && dataUrl) {
        onBackgroundSelect(dataUrl);
      }
    });
    return () => {
      unsub?.();
      if (harvestTimerRef.current) window.clearInterval(harvestTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Wire up webview navigation events ─────────────────────────────────────
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;
    const onNavigate = (e: { url: string }) => {
      setUrlBarValue(e.url);
    };
    wv.addEventListener('did-navigate', onNavigate);
    wv.addEventListener('did-navigate-in-page', onNavigate);
    return () => {
      wv.removeEventListener('did-navigate', onNavigate);
      wv.removeEventListener('did-navigate-in-page', onNavigate);
    };
  });

  // ── Style preset selection ─────────────────────────────────────────────────
  const selectPreset = (preset: StylePreset) => {
    setSelectedPresetId(preset.id);
    setColorName(preset.colorName);
    setHexCode(preset.hexCode);
    setTexture(preset.textureName);
  };

  const deletePreset = (preset: StylePreset) => {
    if (!window.confirm(
      t('promptBuilder.confirmDeleteStyle', 'Remove "{{name}}" from your styles? You can still pick a color above.', { name: preset.colorName }),
    )) return;
    const remainingSaved = savedStyles.filter((p) => p.id !== preset.id);
    if (savedStyles.some((p) => p.id === preset.id)) {
      setSavedStyles(remainingSaved);
      saveSavedStyles(remainingSaved);
    } else {
      const next = new Set(hiddenStyleIds);
      next.add(preset.id);
      setHiddenStyleIds(next);
      saveHiddenStyleIds(next);
    }
    if (selectedPresetId === preset.id) {
      const fallback = remainingSaved[0]
        ?? STYLE_PRESETS.find((p) => p.id !== preset.id && !hiddenStyleIds.has(p.id) && p.id !== preset.id);
      if (fallback) selectPreset(fallback);
      else setSelectedPresetId('');
    }
  };

  const saveCurrentColor = async () => {
    if (savingStyle) return;
    setSavingStyle(true);
    setSaveStyleMsg(t('promptBuilder.savingStyleName', 'Naming this color…'));
    try {
      const existingNames = visiblePresets.map((p) => p.colorName);
      const named = await suggestBackgroundStyleName(hexCode, existingNames, settings);
      const fallback = nameStyleFromHex(hexCode, existingNames);
      const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));
      const color = named?.name && !taken.has(named.name.toLowerCase())
        ? named.name
        : fallback.name;
      const textureName = named?.subtitle && color === named.name
        ? named.subtitle
        : fallback.subtitle;
      setSaveStyleMsg(t('promptBuilder.savingStyleIcon', 'Generating an icon…'));
      const iconKey = await generateIngredientIcon(settings, color) ?? undefined;
      const preset: StylePreset = {
        id: `saved-${uid()}`,
        colorName: color,
        hexCode,
        textureName,
        icon: '✨',
        iconKey,
      };
      const next = [preset, ...savedStyles];
      setSavedStyles(next);
      saveSavedStyles(next);
      selectPreset(preset);
      setSaveStyleMsg(t('promptBuilder.styleSaved', 'Saved {{name}}', { name: color }));
      window.setTimeout(() => setSaveStyleMsg(null), 2500);
    } catch {
      setSaveStyleMsg(t('promptBuilder.styleSaveFailed', 'Could not save this color.'));
    } finally {
      setSavingStyle(false);
    }
  };

  // ── Ingredient checklist helpers ───────────────────────────────────────────
  const toggle = (ing: string) => {
    if (isPromptExcludedName(ing)) return;
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(ing) ? n.delete(ing) : n.add(ing);
      return n;
    });
  };

  // ── Prompt ─────────────────────────────────────────────────────────────────
  const prompt = useMemo(
    () => buildPrompt(
      colorName,
      hexCode,
      texture,
      [...selected].filter((name) => !isPromptExcludedName(name)).map(promptPhraseForName),
    ),
    [colorName, hexCode, texture, selected],
  );

  // ── Sync prompt to store so the in-editor AI tab can display it ───────────
  useEffect(() => {
    setPromptBuilderOutput(prompt);
  }, [prompt, setPromptBuilderOutput]);

  // ── Clipboard helpers ──────────────────────────────────────────────────────
  const copy = async () => {
    const ok = await copyTextToClipboard(prompt);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const harvestAfterSend = () => {
    const wv = webviewRef.current;
    if (!wv) return;
    if (harvestTimerRef.current) window.clearInterval(harvestTimerRef.current);
    let seenSrc = '';
    let tries = 0;
    harvestTimerRef.current = window.setInterval(() => {
      tries += 1;
      if (tries > 45) {
        if (harvestTimerRef.current) window.clearInterval(harvestTimerRef.current);
        harvestTimerRef.current = null;
        return;
      }
      void harvestGeminiImage(wv, seenSrc).then(async (got) => {
        if (got.dataUrl) {
          if (harvestTimerRef.current) window.clearInterval(harvestTimerRef.current);
          harvestTimerRef.current = null;
          try {
            await useLibraryStore.getState().addFromDataUrl(got.dataUrl, 'ai', `gemini-${Date.now()}.png`);
            loadRecentAiAssets();
            if (embedded && onBackgroundSelect) onBackgroundSelect(got.dataUrl);
            setInjectStatus(t('promptBuilder.autoImported', 'Image saved to My Photos.'));
          } catch (err) {
            console.error('[Gaia] Gemini harvest import failed:', err);
          }
        } else if (got.clickedDownload) {
          if (harvestTimerRef.current) window.clearInterval(harvestTimerRef.current);
          harvestTimerRef.current = null;
        } else if (got.src) {
          seenSrc = got.src;
        }
      });
    }, 2000);
  };

  const sendToGemini = async () => {
    const ok = await copyTextToClipboard(prompt);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    if (!isElectron) {
      openCompanion();
      return;
    }
    const wv = webviewRef.current;
    if (!wv) {
      openInDefaultBrowser(GEMINI_URL);
      return;
    }
    setInjectStatus(t('promptBuilder.injecting', 'Sending prompt to Gemini…'));
    setUrlBarValue(GEMINI_URL);
    try {
      wv.loadURL?.(GEMINI_URL);
    } catch { /* already on Gemini */ }
    await waitForWebviewReady(wv, 12000);
    await new Promise((r) => setTimeout(r, 600));
    const result = await injectGeminiPrompt(wv, prompt);
    if (result.ok) {
      setInjectStatus(
        result.sent
          ? t('promptBuilder.injectedSent', 'Prompt sent. When the image appears it is saved to My Photos.')
          : t('promptBuilder.injected', 'Prompt pasted. Press Send in Gemini if it did not start.'),
      );
      harvestAfterSend();
    } else {
      setInjectStatus(t('promptBuilder.injectFailed', 'Could not paste into Gemini. Sign in in the panel, then try again.'));
    }
  };

  const copyAndOpen = () => {
    void sendToGemini();
  };

  // ── Token lists for checklist sections ─────────────────────────────────────
  const featuredIngredients = useMemo(
    () => [...recipeIngredients].sort((a, b) => a.name.localeCompare(b.name)),
    [recipeIngredients],
  );

  const featuredSet = useMemo(
    () => new Set(featuredIngredients.map((ing) => ing.name)),
    [featuredIngredients],
  );

  const extraSelected = useMemo(
    () => [...selected].filter((token) => !featuredSet.has(token) && !isPromptExcludedName(token)).sort(),
    [selected, featuredSet],
  );

  const promptSelectedCount = useMemo(
    () => [...selected].filter((name) => !isPromptExcludedName(name)).length,
    [selected],
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-hidden xl:flex-row">

      {/* ── LEFT: Controls (scrollable) ──────────────────────────────────── */}
      <div className={`prompt-builder-controls flex min-h-0 w-full shrink-0 flex-col overflow-y-auto border-slate-200 bg-gaia-50 p-5 xl:w-[34.3rem] xl:border-r ${embedded ? 'max-h-[46%] xl:max-h-none' : ''}`}>

        {!embedded && (
          <h1 className="flex items-center justify-center gap-2 text-lg font-semibold text-gaia-900">
            <Sparkles className="h-5 w-5 text-gaia-600" />
            {t('promptBuilder.title', 'AI Prompt Builder')}
          </h1>
        )}

        {/* ── Recipe switcher ─────────────────────────────────────────────── */}
        <div className={`flex items-start gap-2 ${embedded ? '' : 'mt-4'}`}>
          <span className="mt-2 whitespace-nowrap text-xs font-medium text-gray-500">{t('promptBuilder.recipeLabel', 'Recipe:')}</span>
          <div className="min-w-0 flex-1">
          {recipes.length === 0 ? (
            <p className="text-xs italic text-slate-400">
              {t('promptBuilder.noRecipesHint', 'No recipes yet — create one in Recipes')}
            </p>
          ) : (
            <RecipePicker
              className="w-full"
              recipes={recipes}
              ingredients={allDbIngredients}
              value={activeRecipeId}
              onChange={setActiveRecipeId}
              placeholder={t('promptBuilder.chooseRecipe', '— Choose A Recipe —')}
            />
          )}
          </div>
        </div>

        <div className="mt-4 card space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">
              {t('promptBuilder.ingredientsSection', 'Ingredients in this prompt')}
              {promptSelectedCount > 0 && (
                <span className="ml-2 inline-flex h-5 items-center rounded-full bg-gaia-100 px-2 text-xs font-medium text-gaia-700">
                  {promptSelectedCount}
                </span>
              )}
            </h2>

            {featuredIngredients.length === 0 && extraSelected.length === 0 && (
              <p className="text-xs text-slate-500">
                {t('promptBuilder.noFeaturedYet', 'Nothing selected yet. Pick a recipe to load its ingredients.')}
              </p>
            )}

            {featuredIngredients.length > 0 && (
              <div className="space-y-1.5">
                <p className="ui-label font-semibold uppercase tracking-wide text-emerald-700">
                  {t('promptBuilder.recipeIngredients', 'Recipe Ingredients')}
                </p>
                <div className="space-y-0.5">
                  {featuredIngredients.map((ing) => {
                    const excluded = isPromptExcludedIngredient(ing);
                    return (
                    <label
                      key={ing.id}
                      className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition ${
                        excluded
                          ? 'cursor-not-allowed bg-slate-100 text-slate-400 opacity-60'
                          : selected.has(ing.name)
                            ? 'cursor-pointer bg-emerald-50 text-emerald-800'
                            : 'cursor-pointer text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 shrink-0 accent-emerald-600 disabled:cursor-not-allowed"
                        checked={!excluded && selected.has(ing.name)}
                        disabled={excluded}
                        onChange={() => toggle(ing.name)}
                      />
                      <IngredientIcon category={ing.category} name={ing.name} iconKey={ing.iconKey} size="sm" />
                      <span className="min-w-0 leading-snug">{getIngredientDisplayName(ing.name, t)}</span>
                      <span className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                        excluded
                          ? 'bg-slate-200 text-slate-500'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {excluded
                          ? t('promptBuilder.soapBaseExcluded', 'Not in prompt')
                          : t('promptBuilder.fromRecipe', 'In recipe')}
                      </span>
                    </label>
                    );
                  })}
                </div>
              </div>
            )}

            {extraSelected.length > 0 && (
              <div className="space-y-1.5">
                <p className="ui-label font-semibold uppercase tracking-wide text-slate-500">
                  {t('promptBuilder.addedIngredients', 'Added')}
                </p>
                <div className="space-y-0.5">
                  {extraSelected.map((ing) => (
                    <label
                      key={ing}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-gaia-50 px-2 py-1 text-xs text-gaia-800"
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 shrink-0 accent-gaia-600"
                        checked
                        onChange={() => toggle(ing)}
                      />
                      <IngredientIcon category={INGREDIENT_ICON_CATEGORY[ing] ?? 'other'} name={ing} size="sm" />
                      <span className="leading-snug">{ing}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
        </div>

        <div className="mt-5 space-y-4">

          {/* ── Color picker (custom HSV — not the OS dialog) ─────────────── */}
          <div className="card space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-700">
                {t('promptBuilder.colorSection', 'Background color')}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {t('promptBuilder.colorPickerHint', 'Drag in the square or along the hue bar to choose a color.')}
              </p>
            </div>
            <HsvColorPicker
              value={hexCode}
              onChange={(hex) => { setHexCode(hex); setSelectedPresetId(''); }}
            />
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gaia-600 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-gaia-700 disabled:opacity-60"
              disabled={savingStyle}
              onClick={() => void saveCurrentColor()}
            >
              {savingStyle
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <BookmarkPlus className="h-4 w-4" />}
              {savingStyle
                ? t('promptBuilder.savingStyle', 'Saving…')
                : t('promptBuilder.saveStyle', 'Save This Color')}
            </button>
            {saveStyleMsg && (
              <p className="text-center text-xs text-slate-500">{saveStyleMsg}</p>
            )}
          </div>

          {/* ── Visual Style Preset Cards ─────────────────────────────────── */}
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">
              {t('promptBuilder.styleSection', 'Background Style')}
            </h2>

            {visiblePresets.length === 0 ? (
              <p className="text-xs text-slate-500">
                {t('promptBuilder.noStylesLeft', 'All styles removed. Use the color picker above.')}
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {visiblePresets.map((preset) => (
                  <div
                    key={preset.id}
                    className={`relative overflow-hidden rounded-xl transition-all ${
                      selectedPresetId === preset.id
                        ? 'ring-2 ring-gaia-500 shadow-sm'
                        : 'ring-1 ring-slate-100 hover:ring-gaia-300 hover:shadow-sm'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectPreset(preset)}
                      className="w-full text-left"
                    >
                      <div className="h-10 w-full" style={{ backgroundColor: preset.hexCode }} />
                      <div className="bg-white px-1.5 py-1.5">
                        <div className="flex items-center justify-center gap-1">
                          <StylePresetIcon preset={preset} />
                          <span className="text-xs font-semibold leading-snug text-slate-700">
                            {preset.colorName}
                          </span>
                        </div>
                        <p className="mt-0.5 text-center text-xs leading-snug text-slate-400">
                          {preset.textureName}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-slate-400 shadow-sm ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-600"
                      title={t('common.delete', 'Delete')}
                      aria-label={t('promptBuilder.deleteStyle', 'Remove {{name}}', { name: preset.colorName })}
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePreset(preset);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── RIGHT: Prompt output + AI launch ──────────────────────────────── */}
      <div className="prompt-builder-controls flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">

        {/* Prompt output panel */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-white p-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div />
            <h2 className="text-center text-sm font-semibold text-slate-700">
              {t('promptBuilder.outputSection', 'Generated Prompt')}
            </h2>
            <div className="flex flex-wrap items-center justify-end gap-2">
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
                  ? <><Check className="h-3.5 w-3.5" /> {t('promptBuilder.copied', 'Copied! ✓')}</>
                  : <><ClipboardCopy className="h-3.5 w-3.5" /> {t('promptBuilder.copy', 'Copy')}</>
                }
              </button>

              <button
                type="button"
                onClick={copyAndOpen}
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
        </div>

        {/* AI browser panel — webview in Electron, iframe in browser/PWA */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {isElectron && (
          <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
                <button
                  type="button"
                  onClick={() => webviewRef.current?.goBack()}
                  className="shrink-0 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                  title={t('promptBuilder.webviewBack')}
                >
                  {t('promptBuilder.webviewBack')}
                </button>
                <button
                  type="button"
                  onClick={() => webviewRef.current?.reload()}
                  className="shrink-0 rounded px-2 py-1 text-xs text-slate-600 hover:bg-slate-200"
                  title={t('promptBuilder.webviewReload', 'Reload')}
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
          </div>
          )}

          {isElectron ? (
            <>
              {injectStatus && (
                <p className="border-b border-gaia-100 bg-gaia-50 px-3 py-1.5 text-xs font-medium text-gaia-800">
                  {injectStatus}
                </p>
              )}
              <webview
                ref={webviewRef}
                src={GEMINI_URL}
                partition="persist:aistudio"
                useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                allowpopups
                webpreferences="contextIsolation=yes, nodeIntegration=no, javascript=yes"
                style={{ flex: 1, width: '100%', minHeight: 0 }}
              />
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-6">
              <div className="w-full max-w-lg text-center">
                <Sparkles className="mx-auto mb-3 h-10 w-10 text-gaia-500" />
                <h3 className="text-lg font-semibold text-slate-800">
                  {t('promptBuilder.companionGeminiTitle', 'Gemini companion window')}
                </h3>
                {companionOpen && (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {t('promptBuilder.companionOpen', 'Companion window is open')}
                  </p>
                )}
              </div>

              <div className="flex w-full max-w-md flex-col gap-3">
                <button
                  type="button"
                  onClick={() => openCompanion()}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-gaia-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-gaia-700 active:scale-[0.98]"
                >
                  <ExternalLink className="h-5 w-5 shrink-0" />
                  {companionOpen
                    ? t('promptBuilder.focusGemini', 'Focus Gemini window')
                    : t('promptBuilder.openGemini', 'Open Gemini')}
                </button>
              </div>

              <ol className="w-full max-w-md space-y-2 text-left text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gaia-100 text-xs font-bold text-gaia-700">1</span>
                  {t('promptBuilder.companionStep1', 'Click Copy & Open — your prompt is copied automatically.')}
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gaia-100 text-xs font-bold text-gaia-700">2</span>
                  {t('promptBuilder.companionStep2', 'Paste into the companion window and generate your background.')}
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gaia-100 text-xs font-bold text-gaia-700">3</span>
                  {t('promptBuilder.companionStep3', 'Download the image, then upload it under My Photos in this step.')}
                </li>
              </ol>
            </div>
          )}

          {recentAiAssets.length > 0 && (
            <div className="border-t border-slate-200 bg-white px-3 py-3">
              <p className="mb-2 ui-label font-semibold uppercase tracking-wide text-slate-400">
                {t('promptBuilder.recentImports', 'Recently Imported')}
              </p>
              <div className="grid max-w-xl grid-cols-3 gap-2 sm:grid-cols-4">
                {recentAiAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className="aspect-video overflow-hidden rounded-lg ring-1 ring-slate-200 transition hover:ring-gaia-400"
                    title={asset.name}
                    onClick={() => applyRecentAsset(asset.dataUrl)}
                  >
                    <img
                      src={asset.dataUrl}
                      alt={asset.name}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
