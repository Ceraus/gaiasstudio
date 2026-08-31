import type { Ingredient, IngredientCategory, Recipe } from '@/types';

export interface RecipeColorTheme {
  bg: string;
  border: string;
  text: string;
  dot: string;
  activeBg: string;
  activeBorder: string;
  key: string;
}

export const COLOR_THEMES: Record<string, RecipeColorTheme> = {
  fragrance:      { key: 'fragrance',     bg: 'bg-pink-100',    border: 'border-pink-300',    text: 'text-pink-900',    dot: 'bg-pink-500',    activeBg: 'bg-pink-200',    activeBorder: 'border-pink-400' },
  'essential-oil':{ key: 'essential-oil', bg: 'bg-purple-100',  border: 'border-purple-300',  text: 'text-purple-900',  dot: 'bg-purple-500',  activeBg: 'bg-purple-200',  activeBorder: 'border-purple-400' },
  botanical:      { key: 'botanical',     bg: 'bg-green-100',   border: 'border-green-300',   text: 'text-green-900',   dot: 'bg-green-500',   activeBg: 'bg-green-200',   activeBorder: 'border-green-400' },
  butter:         { key: 'butter',        bg: 'bg-amber-100',   border: 'border-amber-300',   text: 'text-amber-900',   dot: 'bg-amber-500',   activeBg: 'bg-amber-200',   activeBorder: 'border-amber-400' },
  'carrier-oil':  { key: 'carrier-oil',   bg: 'bg-yellow-100',  border: 'border-yellow-300',  text: 'text-yellow-900',  dot: 'bg-yellow-500',  activeBg: 'bg-yellow-200',  activeBorder: 'border-yellow-400' },
  oil:            { key: 'oil',           bg: 'bg-yellow-100',  border: 'border-yellow-300',  text: 'text-yellow-900',  dot: 'bg-yellow-500',  activeBg: 'bg-yellow-200',  activeBorder: 'border-yellow-400' },
  clay:           { key: 'clay',          bg: 'bg-slate-100',   border: 'border-slate-300',   text: 'text-slate-900',   dot: 'bg-slate-500',   activeBg: 'bg-slate-200',   activeBorder: 'border-slate-400' },
  colorant:       { key: 'colorant',      bg: 'bg-violet-100',  border: 'border-violet-300',  text: 'text-violet-900',  dot: 'bg-violet-500',  activeBg: 'bg-violet-200',  activeBorder: 'border-violet-400' },
  base:           { key: 'base',          bg: 'bg-teal-100',    border: 'border-teal-300',    text: 'text-teal-900',    dot: 'bg-teal-500',    activeBg: 'bg-teal-200',    activeBorder: 'border-teal-400' },
  default:        { key: 'default',       bg: 'bg-gaia-100',    border: 'border-gaia-300',    text: 'text-gaia-900',    dot: 'bg-gaia-500',    activeBg: 'bg-gaia-200',    activeBorder: 'border-gaia-400' },
  // Name-based palettes for Rosa's soap line
  'chia-apple':       { key: 'chia-apple',       bg: 'bg-lime-100',    border: 'border-lime-300',    text: 'text-lime-900',    dot: 'bg-lime-500',    activeBg: 'bg-lime-200',    activeBorder: 'border-lime-400' },
  'chia-cherry':      { key: 'chia-cherry',      bg: 'bg-red-100',     border: 'border-red-300',     text: 'text-red-900',     dot: 'bg-red-500',     activeBg: 'bg-red-200',     activeBorder: 'border-red-400' },
  'chia-mango':       { key: 'chia-mango',       bg: 'bg-orange-100',  border: 'border-orange-300',  text: 'text-orange-900',  dot: 'bg-orange-500',  activeBg: 'bg-orange-200',  activeBorder: 'border-orange-400' },
  'chia-passion':     { key: 'chia-passion',     bg: 'bg-fuchsia-100', border: 'border-fuchsia-300', text: 'text-fuchsia-900', dot: 'bg-fuchsia-500', activeBg: 'bg-fuchsia-200', activeBorder: 'border-fuchsia-400' },
  'chia-pineapple':   { key: 'chia-pineapple',   bg: 'bg-yellow-100',  border: 'border-yellow-400',  text: 'text-yellow-900',  dot: 'bg-yellow-400',  activeBg: 'bg-yellow-200',  activeBorder: 'border-yellow-500' },
  'chia-strawberry':  { key: 'chia-strawberry',  bg: 'bg-rose-100',    border: 'border-rose-300',    text: 'text-rose-900',    dot: 'bg-rose-500',    activeBg: 'bg-rose-200',    activeBorder: 'border-rose-400' },
  'chia-watermelon':  { key: 'chia-watermelon',  bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-900', dot: 'bg-emerald-500', activeBg: 'bg-emerald-200', activeBorder: 'border-emerald-400' },
  coffee:             { key: 'coffee',           bg: 'bg-amber-200',  border: 'border-amber-400',   text: 'text-amber-950',   dot: 'bg-amber-700',   activeBg: 'bg-amber-300',   activeBorder: 'border-amber-500' },
  charcoal:           { key: 'charcoal',         bg: 'bg-zinc-200',   border: 'border-zinc-400',    text: 'text-zinc-900',    dot: 'bg-zinc-600',    activeBg: 'bg-zinc-300',    activeBorder: 'border-zinc-500' },
  ocean:              { key: 'ocean',            bg: 'bg-sky-100',     border: 'border-sky-300',     text: 'text-sky-900',     dot: 'bg-sky-500',     activeBg: 'bg-sky-200',     activeBorder: 'border-sky-400' },
  lavender:           { key: 'lavender',         bg: 'bg-indigo-100',  border: 'border-indigo-300',  text: 'text-indigo-900',  dot: 'bg-indigo-400',  activeBg: 'bg-indigo-200',  activeBorder: 'border-indigo-400' },
  rose:               { key: 'rose',             bg: 'bg-pink-100',    border: 'border-pink-300',    text: 'text-pink-900',    dot: 'bg-pink-400',    activeBg: 'bg-pink-200',    activeBorder: 'border-pink-400' },
  oatmeal:            { key: 'oatmeal',          bg: 'bg-stone-100',   border: 'border-stone-300',   text: 'text-stone-900',   dot: 'bg-stone-400',   activeBg: 'bg-stone-200',   activeBorder: 'border-stone-400' },
  turmeric:           { key: 'turmeric',         bg: 'bg-yellow-200',  border: 'border-yellow-400',  text: 'text-yellow-950',  dot: 'bg-yellow-600',  activeBg: 'bg-yellow-300',  activeBorder: 'border-yellow-500' },
  'mango-peach':      { key: 'mango-peach',      bg: 'bg-orange-100',  border: 'border-orange-300',  text: 'text-orange-900',  dot: 'bg-orange-400',  activeBg: 'bg-orange-200',  activeBorder: 'border-orange-400' },
  coconut:            { key: 'coconut',          bg: 'bg-cyan-100',    border: 'border-cyan-300',    text: 'text-cyan-900',    dot: 'bg-cyan-500',    activeBg: 'bg-cyan-200',    activeBorder: 'border-cyan-400' },
  aloe:               { key: 'aloe',             bg: 'bg-green-100',   border: 'border-green-300',   text: 'text-green-900',   dot: 'bg-green-400',   activeBg: 'bg-green-200',   activeBorder: 'border-green-400' },
  sandalwood:         { key: 'sandalwood',       bg: 'bg-amber-100',   border: 'border-amber-300',   text: 'text-amber-950',   dot: 'bg-amber-600',   activeBg: 'bg-amber-200',   activeBorder: 'border-amber-400' },
  calendula:          { key: 'calendula',        bg: 'bg-yellow-100',  border: 'border-yellow-300',  text: 'text-yellow-900',  dot: 'bg-yellow-500',  activeBg: 'bg-yellow-200',  activeBorder: 'border-yellow-400' },
  chamomile:          { key: 'chamomile',        bg: 'bg-amber-100',   border: 'border-amber-200',   text: 'text-amber-900',   dot: 'bg-amber-300',   activeBg: 'bg-amber-200',   activeBorder: 'border-amber-300' },
  rice:               { key: 'rice',             bg: 'bg-neutral-100', border: 'border-neutral-300', text: 'text-neutral-900', dot: 'bg-neutral-400', activeBg: 'bg-neutral-200', activeBorder: 'border-neutral-400' },
  watermelon:         { key: 'watermelon',       bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-900', dot: 'bg-emerald-400', activeBg: 'bg-emerald-200', activeBorder: 'border-emerald-400' },
};

const CATEGORY_PRIORITY: IngredientCategory[] = ['fragrance', 'essential-oil', 'botanical', 'butter', 'oil', 'clay', 'colorant', 'base'];

const CHIA_FRUIT_KEYS: Record<string, string> = {
  apple: 'chia-apple',
  cherry: 'chia-cherry',
  'mango peach': 'chia-mango',
  'passion fruit': 'chia-passion',
  pineapple: 'chia-pineapple',
  strawberry: 'chia-strawberry',
  watermelon: 'chia-watermelon',
};

/** Match recipe name to a distinct palette (Chia fruits, florals, scrubs, etc.). */
function getRecipeNameTheme(name: string): RecipeColorTheme | null {
  const n = name.toLowerCase().trim();

  if (n.startsWith('chia ')) {
    const fruit = n.slice(5);
    const key = CHIA_FRUIT_KEYS[fruit];
    if (key && COLOR_THEMES[key]) return COLOR_THEMES[key];
  }

  if (n.includes('coffee')) return COLOR_THEMES.coffee;
  if (n.includes('charcoal') || n.includes('detox')) return COLOR_THEMES.charcoal;
  if (n.includes('ocean')) return COLOR_THEMES.ocean;
  if (n.includes('watermelon')) return COLOR_THEMES.watermelon;
  if (n.includes('lavender')) return COLOR_THEMES.lavender;
  if (n.includes('rose')) return COLOR_THEMES.rose;
  if (n.includes('oatmeal')) return COLOR_THEMES.oatmeal;
  if (n.includes('turmeric')) return COLOR_THEMES.turmeric;
  if (n.includes('mango') || n.includes('peach')) return COLOR_THEMES['mango-peach'];
  if (n.includes('coconut')) return COLOR_THEMES.coconut;
  if (n.includes('aloe')) return COLOR_THEMES.aloe;
  if (n.includes('sandalwood')) return COLOR_THEMES.sandalwood;
  if (n.includes('calendula')) return COLOR_THEMES.calendula;
  if (n.includes('chamomile')) return COLOR_THEMES.chamomile;
  if (n.includes('rice')) return COLOR_THEMES.rice;
  if (n.includes('lemon') || n.includes('citrus')) return COLOR_THEMES['chia-pineapple'];
  if (n.includes('orange') || n.includes('tangerine') || n.includes('clementine')) return COLOR_THEMES['mango-peach'];
  if (n.includes('lime')) return COLOR_THEMES['chia-apple'];
  if (n.includes('honey')) return COLOR_THEMES.turmeric;
  if (n.includes('cocoa') || n.includes('chocolate')) return COLOR_THEMES.coffee;
  if (n.includes('mint') || n.includes('eucalyptus') || n.includes('tea tree')) return COLOR_THEMES.aloe;
  if (n.includes('blueberry') || n.includes('grape')) return COLOR_THEMES.lavender;
  if (n.includes('avocado')) return COLOR_THEMES.aloe;
  if (n.includes('shea') || n.includes('vanilla')) return COLOR_THEMES.chamomile;
  if (n.includes('cinnamon')) return COLOR_THEMES.coffee;

  return null;
}

/** Natural color for an ingredient name (mango → ripe orange, watermelon → rind green). */
export function getIngredientLookTheme(name: string, category?: IngredientCategory): RecipeColorTheme {
  return getRecipeNameTheme(name)
    ?? (category ? COLOR_THEMES[category] ?? COLOR_THEMES.default : COLOR_THEMES.default);
}

/** Opposite-hue outline so the pill stroke reads against the fill. */
const COMPLEMENT_STROKE: Record<string, string> = {
  fragrance: 'border-emerald-500',
  'essential-oil': 'border-amber-500',
  botanical: 'border-rose-400',
  butter: 'border-sky-500',
  'carrier-oil': 'border-indigo-400',
  oil: 'border-indigo-400',
  clay: 'border-amber-500',
  colorant: 'border-yellow-400',
  base: 'border-orange-400',
  default: 'border-rose-400',
  'chia-apple': 'border-fuchsia-400',
  'chia-cherry': 'border-teal-500',
  'chia-mango': 'border-teal-500',
  'chia-passion': 'border-lime-500',
  'chia-pineapple': 'border-indigo-400',
  'chia-strawberry': 'border-emerald-500',
  'chia-watermelon': 'border-rose-400',
  coffee: 'border-sky-500',
  charcoal: 'border-amber-400',
  ocean: 'border-orange-400',
  lavender: 'border-amber-400',
  rose: 'border-emerald-500',
  oatmeal: 'border-teal-500',
  turmeric: 'border-indigo-500',
  'mango-peach': 'border-teal-500',
  coconut: 'border-orange-400',
  aloe: 'border-rose-400',
  sandalwood: 'border-sky-500',
  calendula: 'border-indigo-400',
  chamomile: 'border-violet-400',
  rice: 'border-teal-500',
  watermelon: 'border-rose-400',
};

export function getIngredientPillStroke(theme: RecipeColorTheme): string {
  return COMPLEMENT_STROKE[theme.key] ?? 'border-gaia-500';
}

function getRecipeColorByIngredients(recipe: Recipe, ingredients: Ingredient[]): RecipeColorTheme {
  const recipeIngredients = ingredients.filter((i) => recipe.ingredientIds.includes(i.id));
  const counts: Partial<Record<IngredientCategory, number>> = {};
  for (const ing of recipeIngredients) {
    if (!ing.category || ing.category === 'base') continue;
    counts[ing.category] = (counts[ing.category] ?? 0) + 1;
  }

  if (Object.keys(counts).length === 0) return COLOR_THEMES.default;

  const maxCount = Math.max(...Object.values(counts) as number[]);
  const tied = (Object.keys(counts) as IngredientCategory[]).filter((k) => counts[k] === maxCount);

  for (const priority of CATEGORY_PRIORITY) {
    if (tied.includes(priority)) {
      return COLOR_THEMES[priority] ?? COLOR_THEMES.default;
    }
  }

  return COLOR_THEMES.default;
}

/** Returns a color theme from the recipe name, then the dominant ingredient category. */
export function getRecipeColor(recipe: Recipe, ingredients: Ingredient[]): RecipeColorTheme {
  const byName = getRecipeNameTheme(recipe.name);
  if (byName) return byName;

  return getRecipeColorByIngredients(recipe, ingredients);
}
