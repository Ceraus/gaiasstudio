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
  fragrance:      { key: 'fragrance',     bg: 'bg-pink-50',    border: 'border-pink-200',    text: 'text-pink-900',    dot: 'bg-pink-500',    activeBg: 'bg-pink-100',    activeBorder: 'border-pink-400' },
  'essential-oil':{ key: 'essential-oil', bg: 'bg-purple-50',  border: 'border-purple-200',  text: 'text-purple-900',  dot: 'bg-purple-500',  activeBg: 'bg-purple-100',  activeBorder: 'border-purple-400' },
  botanical:      { key: 'botanical',     bg: 'bg-green-50',   border: 'border-green-200',   text: 'text-green-900',   dot: 'bg-green-500',   activeBg: 'bg-green-100',   activeBorder: 'border-green-400' },
  butter:         { key: 'butter',        bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-900',   dot: 'bg-amber-500',   activeBg: 'bg-amber-100',   activeBorder: 'border-amber-400' },
  'carrier-oil':  { key: 'carrier-oil',   bg: 'bg-yellow-50',  border: 'border-yellow-200',  text: 'text-yellow-900',  dot: 'bg-yellow-500',  activeBg: 'bg-yellow-100',  activeBorder: 'border-yellow-400' },
  oil:            { key: 'oil',           bg: 'bg-yellow-50',  border: 'border-yellow-200',  text: 'text-yellow-900',  dot: 'bg-yellow-500',  activeBg: 'bg-yellow-100',  activeBorder: 'border-yellow-400' },
  clay:           { key: 'clay',          bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-900',   dot: 'bg-slate-500',   activeBg: 'bg-slate-100',   activeBorder: 'border-slate-400' },
  colorant:       { key: 'colorant',      bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-900',  dot: 'bg-violet-500',  activeBg: 'bg-violet-100',  activeBorder: 'border-violet-400' },
  base:           { key: 'base',          bg: 'bg-teal-50',    border: 'border-teal-200',    text: 'text-teal-900',    dot: 'bg-teal-500',    activeBg: 'bg-teal-100',    activeBorder: 'border-teal-400' },
  default:        { key: 'default',       bg: 'bg-gaia-50',    border: 'border-gaia-200',    text: 'text-gaia-900',    dot: 'bg-gaia-500',    activeBg: 'bg-gaia-100',    activeBorder: 'border-gaia-400' },
  // Name-based palettes for Rosa's soap line
  'chia-apple':       { key: 'chia-apple',       bg: 'bg-lime-50',    border: 'border-lime-200',    text: 'text-lime-900',    dot: 'bg-lime-500',    activeBg: 'bg-lime-100',    activeBorder: 'border-lime-400' },
  'chia-cherry':      { key: 'chia-cherry',      bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-900',     dot: 'bg-red-500',     activeBg: 'bg-red-100',     activeBorder: 'border-red-400' },
  'chia-mango':       { key: 'chia-mango',       bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-900',  dot: 'bg-orange-500',  activeBg: 'bg-orange-100',  activeBorder: 'border-orange-400' },
  'chia-passion':     { key: 'chia-passion',     bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', text: 'text-fuchsia-900', dot: 'bg-fuchsia-500', activeBg: 'bg-fuchsia-100', activeBorder: 'border-fuchsia-400' },
  'chia-pineapple':   { key: 'chia-pineapple',   bg: 'bg-yellow-50',  border: 'border-yellow-300',  text: 'text-yellow-900',  dot: 'bg-yellow-400',  activeBg: 'bg-yellow-100',  activeBorder: 'border-yellow-500' },
  'chia-strawberry':  { key: 'chia-strawberry',  bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-900',    dot: 'bg-rose-500',    activeBg: 'bg-rose-100',    activeBorder: 'border-rose-400' },
  'chia-watermelon':  { key: 'chia-watermelon',  bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', dot: 'bg-emerald-500', activeBg: 'bg-emerald-100', activeBorder: 'border-emerald-400' },
  coffee:             { key: 'coffee',           bg: 'bg-amber-100',  border: 'border-amber-300',   text: 'text-amber-950',   dot: 'bg-amber-700',   activeBg: 'bg-amber-200',   activeBorder: 'border-amber-500' },
  charcoal:           { key: 'charcoal',         bg: 'bg-zinc-100',   border: 'border-zinc-300',    text: 'text-zinc-900',    dot: 'bg-zinc-600',    activeBg: 'bg-zinc-200',    activeBorder: 'border-zinc-500' },
  ocean:              { key: 'ocean',            bg: 'bg-sky-50',     border: 'border-sky-200',     text: 'text-sky-900',     dot: 'bg-sky-500',     activeBg: 'bg-sky-100',     activeBorder: 'border-sky-400' },
  lavender:           { key: 'lavender',         bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-900',  dot: 'bg-indigo-400',  activeBg: 'bg-indigo-100',  activeBorder: 'border-indigo-400' },
  rose:               { key: 'rose',             bg: 'bg-pink-50',    border: 'border-pink-200',    text: 'text-pink-900',    dot: 'bg-pink-400',    activeBg: 'bg-pink-100',    activeBorder: 'border-pink-400' },
  oatmeal:            { key: 'oatmeal',          bg: 'bg-stone-50',   border: 'border-stone-200',   text: 'text-stone-900',   dot: 'bg-stone-400',   activeBg: 'bg-stone-100',   activeBorder: 'border-stone-400' },
  turmeric:           { key: 'turmeric',         bg: 'bg-yellow-100', border: 'border-yellow-300',  text: 'text-yellow-950',  dot: 'bg-yellow-600',  activeBg: 'bg-yellow-200',  activeBorder: 'border-yellow-500' },
  'mango-peach':      { key: 'mango-peach',      bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-900',  dot: 'bg-orange-400',  activeBg: 'bg-orange-100',  activeBorder: 'border-orange-400' },
  coconut:            { key: 'coconut',          bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-900',    dot: 'bg-cyan-500',    activeBg: 'bg-cyan-100',    activeBorder: 'border-cyan-400' },
  aloe:               { key: 'aloe',             bg: 'bg-green-50',   border: 'border-green-200',   text: 'text-green-900',   dot: 'bg-green-400',   activeBg: 'bg-green-100',   activeBorder: 'border-green-400' },
  sandalwood:         { key: 'sandalwood',       bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-950',   dot: 'bg-amber-600',   activeBg: 'bg-amber-100',   activeBorder: 'border-amber-400' },
  calendula:          { key: 'calendula',        bg: 'bg-yellow-50',  border: 'border-yellow-200',  text: 'text-yellow-900',  dot: 'bg-yellow-500',  activeBg: 'bg-yellow-100',  activeBorder: 'border-yellow-400' },
  chamomile:          { key: 'chamomile',        bg: 'bg-amber-50',   border: 'border-amber-100',   text: 'text-amber-900',   dot: 'bg-amber-300',   activeBg: 'bg-amber-100',   activeBorder: 'border-amber-300' },
  rice:               { key: 'rice',             bg: 'bg-neutral-50', border: 'border-neutral-200', text: 'text-neutral-900', dot: 'bg-neutral-400', activeBg: 'bg-neutral-100', activeBorder: 'border-neutral-400' },
  watermelon:         { key: 'watermelon',       bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', dot: 'bg-emerald-400', activeBg: 'bg-emerald-100', activeBorder: 'border-emerald-400' },
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

  return null;
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

/** Returns a color theme: manual override → recipe name → dominant ingredient category. */
export function getRecipeColor(recipe: Recipe, ingredients: Ingredient[]): RecipeColorTheme {
  if (recipe.color && COLOR_THEMES[recipe.color]) return COLOR_THEMES[recipe.color];

  const byName = getRecipeNameTheme(recipe.name);
  if (byName) return byName;

  return getRecipeColorByIngredients(recipe, ingredients);
}

export const COLOR_SWATCHES: Array<{ key: string; dot: string; label: string }> = [
  { key: 'default',       dot: 'bg-gaia-400',   label: 'Gaia' },
  { key: 'fragrance',     dot: 'bg-pink-400',   label: 'Pink' },
  { key: 'essential-oil', dot: 'bg-purple-400', label: 'Purple' },
  { key: 'botanical',     dot: 'bg-green-400',  label: 'Green' },
  { key: 'butter',        dot: 'bg-amber-400',  label: 'Amber' },
  { key: 'oil',           dot: 'bg-yellow-400', label: 'Yellow' },
  { key: 'clay',          dot: 'bg-slate-400',  label: 'Slate' },
  { key: 'colorant',      dot: 'bg-violet-400', label: 'Violet' },
  { key: 'base',          dot: 'bg-teal-400',   label: 'Teal' },
];
