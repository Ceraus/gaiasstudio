/**
 * recipeSeed.ts
 * ─────────────
 * Real-world maker recipes used as starter templates. Each recipe is defined
 * by ingredient *names* so the seeding function can resolve IDs at runtime.
 *
 * seedRecipes() is idempotent — it exits immediately if any recipe already
 * exists in the database. Call it once at app startup.
 */

import { db } from '@/db/db';
import { INGREDIENT_SEED } from './ingredientSeed';
import type { Ingredient } from '@/types';

// ---------------------------------------------------------------------------
// Recipe definitions (names only — IDs are resolved at runtime)
// ---------------------------------------------------------------------------

interface RecipeDef {
  name: string;
  ingredientNames: string[];
  benefit: string;
  directions?: string;
  netWeight?: string;
}

const GLYCERIN_BASE = 'Glycerin Base (Clear)';

const RECIPE_SEED: RecipeDef[] = [
  {
    name: 'Sandalwood Bliss',
    ingredientNames: ['Shea Butter', 'Coconut Oil', 'Honey Powder', 'Rose Petal Fragrance Oil'],
    benefit: 'Aromático y suave',
    directions: 'Inspirado en sándalo',
  },
  {
    name: 'Rose Petal',
    ingredientNames: ['Rose Petals', 'Mango Butter', 'Coconut Oil', 'Rose Petal Fragrance Oil', 'Beet Root Powder'],
    benefit: 'Romántico y cremoso',
  },
  {
    name: 'Ocean Dreams',
    ingredientNames: ['Ocean Breeze Fragrance Oil', 'Cocoa Butter', 'Argan Oil', 'Spirulina Powder'],
    benefit: 'Fresco y ligero',
  },
  {
    name: 'Watermelon Fresh',
    ingredientNames: ['Watermelon FO', 'Mango Butter', 'Grapeseed Oil'],
    benefit: 'Ligero y refrescante',
  },
  {
    name: 'Rice & Geranium',
    ingredientNames: ['Sweet Almond Oil', 'Rice Bran Powder', 'Honey Powder', 'Geranium EO'],
    benefit: 'Floral y equilibrado',
  },
  {
    name: 'Coffee Scrub',
    ingredientNames: ['Ground Coffee', 'Shea Butter', 'Sweet Almond Oil'],
    benefit: 'Exfoliante aromático',
  },
  {
    name: 'Rose Garden',
    ingredientNames: ['Mango Butter', 'Rose Petals', 'Rosehip Oil', 'Rose Petal Fragrance Oil'],
    benefit: 'Lujoso y delicado',
  },
  {
    name: 'Aloe Fresh',
    ingredientNames: ['Aloe Vera', 'Vitamin E Oil', 'Coconut Oil'],
    benefit: 'Suave y reconfortante',
  },
  {
    name: 'Golden Turmeric',
    ingredientNames: ['Turmeric Powder', 'Coconut Oil', 'Lavender EO', 'Vitamin E Oil'],
    benefit: 'Cálido y especiado',
  },
  {
    name: 'Detox Charcoal',
    ingredientNames: ['Activated Charcoal', 'Tea Tree EO', 'Eucalyptus EO'],
    benefit: 'Fresco y herbal',
  },
  {
    name: 'Lavender Dreams',
    ingredientNames: ['Lavender Fragrance Oil', 'Shea Butter', 'Coconut Oil', 'Butterfly Pea Flower', 'White Kaolin Clay'],
    benefit: 'Calmante y floral',
  },
  {
    name: 'Mango Peach',
    ingredientNames: ['Grapefruit Mango FO', 'Mango Butter', 'Jojoba Oil', 'Annatto Powder'],
    benefit: 'Tropical y cremoso',
  },
  {
    name: 'Chia Pineapple',
    ingredientNames: ['Chia Seed', 'Vitamin E Oil', 'Turmeric Powder', 'Citrus Burst Fragrance Oil'],
    benefit: 'Cítrico y vibrante',
  },
  {
    name: 'Chia Watermelon',
    ingredientNames: ['Chia Seed', 'Vitamin E Oil', 'Spirulina Powder', 'Watermelon FO'],
    benefit: 'Refrescante y ligero',
  },
  {
    name: 'Chia Cherry',
    ingredientNames: ['Chia Seed', 'Vitamin E Oil', 'Butterfly Pea Flower', 'Cherry Almond Fragrance Oil'],
    benefit: 'Dulce y afrutado',
  },
  {
    name: 'Chia Mango Peach',
    ingredientNames: ['Chia Seed', 'Vitamin E Oil', 'Annatto Powder', 'Grapefruit Mango FO'],
    benefit: 'Tropical y suave',
  },
  {
    name: 'Chia Strawberry',
    ingredientNames: ['Chia Seed', 'Vitamin E Oil', 'Beet Root Powder', 'Strawberry FO'],
    benefit: 'Dulce y cremoso',
  },
  {
    name: 'Chia Apple',
    ingredientNames: ['Chia Seed', 'Vitamin E Oil', 'Madder Root Powder', 'Apple FO'],
    benefit: 'Fresco y frutal',
  },
  {
    name: 'Chia Passion Fruit',
    ingredientNames: ['Chia Seed', 'Vitamin E Oil', 'Butterfly Pea Flower', 'Passion Fruit FO'],
    benefit: 'Exótico y floral',
  },
  {
    name: 'Coconut Scrub',
    ingredientNames: ['Coconut Oil', 'Colloidal Oatmeal'],
    benefit: 'Exfoliante tropical',
  },
  {
    name: 'Rice & Honey',
    ingredientNames: ['Rice Bran Powder', 'Honey Powder', 'Vitamin E Oil', 'White Kaolin Clay'],
    benefit: 'Suave y miel',
  },
  {
    name: 'Oatmeal Honey',
    ingredientNames: ['Colloidal Oatmeal', 'Shea Butter', 'Honey Powder', 'Vitamin E Oil'],
    benefit: 'Reconfortante y nutritivo',
  },
  {
    name: 'Coffee Turmeric',
    ingredientNames: ['Ground Coffee', 'Turmeric Powder', 'Vitamin E Oil'],
    benefit: 'Energizante y especiado',
  },
  {
    name: 'Argan Mango Peach',
    ingredientNames: ['Mango Butter', 'Argan Oil', 'Grapefruit Mango FO'],
    benefit: 'Lujoso y tropical',
  },
  {
    name: 'Shea Rose',
    ingredientNames: ['Shea Butter', 'Sweet Almond Oil', 'Rose Petal Fragrance Oil'],
    benefit: 'Rico y romántico',
  },
  {
    name: 'Calendula Gentle',
    ingredientNames: ['Calendula', 'Sweet Almond Oil', 'Lavender Herb'],
    benefit: 'Extra suave y delicado',
  },
  {
    name: 'Oatmeal Vanilla',
    ingredientNames: ['Colloidal Oatmeal', 'Honey Powder', 'Sweet Almond Oil', 'Vanilla Powder', 'Vitamin E Oil'],
    benefit: 'Acogedor y cremoso',
  },
  {
    name: 'Chamomile Calm',
    ingredientNames: ['Chamomile', 'Sweet Almond Oil', 'Lavender EO', 'Vitamin E Oil'],
    benefit: 'Calmante y suave',
  },
];

// ---------------------------------------------------------------------------
// Runtime helper
// ---------------------------------------------------------------------------

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `recipe-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Shared seeding logic — optionally replaces the entire recipe table first. */
async function populateSeedRecipes(replaceExisting: boolean): Promise<number> {
  if (replaceExisting) await db.recipes.clear();

  // ── Step 1: Ensure every ingredient referenced by a recipe exists ─────────
  const existing: Ingredient[] = await db.ingredients.toArray();
  const existingNames = new Set(existing.map((i) => i.name.toLowerCase().trim()));

  // Collect every ingredient name referenced across all recipes.
  const needed = new Set<string>();
  for (const recipe of RECIPE_SEED) {
    needed.add(GLYCERIN_BASE.toLowerCase().trim());
    for (const name of recipe.ingredientNames) {
      needed.add(name.toLowerCase().trim());
    }
  }

  // Find missing ingredient names and look them up in the static seed list.
  const now = Date.now();
  const missing = INGREDIENT_SEED.filter(
    (s) => needed.has(s.name.toLowerCase().trim()) && !existingNames.has(s.name.toLowerCase().trim()),
  );

  if (missing.length > 0) {
    const toAdd: Ingredient[] = missing.map((s) => ({
      id: uid(),
      name: s.name,
      inci: s.inci,
      benefit: s.benefit,
      isSoapBase: s.isSoapBase,
      category: s.category,
      active: s.active ?? true,
      measurementType: s.measurementType,
      createdAt: now,
      updatedAt: now,
    }));
    await db.ingredients.bulkAdd(toAdd);
  }

  // ── Step 2: Build name → id map from the full (now-complete) ingredient set ─
  const allIngredients: Ingredient[] = await db.ingredients.toArray();
  const nameToId = new Map<string, string>();
  for (const ing of allIngredients) {
    nameToId.set(ing.name.toLowerCase().trim(), ing.id);
  }

  // ── Step 3: Create recipe records ─────────────────────────────────────────
  const recipeNow = Date.now();
  const recipes = RECIPE_SEED.map((r) => {
    const names = [GLYCERIN_BASE, ...r.ingredientNames.filter((n) => n !== GLYCERIN_BASE)];
    const ingredientIds = names
      .map((n) => nameToId.get(n.toLowerCase().trim()))
      .filter((id): id is string => id !== undefined);
    return {
      id: uid(),
      name: r.name,
      ingredientIds,
      benefit: r.benefit,
      directions: r.directions,
      netWeight: r.netWeight ?? '100g',
      createdAt: recipeNow,
      updatedAt: recipeNow,
    };
  });

  await db.recipes.bulkAdd(recipes);
  return recipes.length;
}

/**
 * Ensures the active recipe-ingredient seeds exist in the DB, then creates
 * the starter recipe library. Safe to call at every app startup — exits
 * immediately once any recipe is already present.
 */
export async function seedRecipes(): Promise<void> {
  const recipeCount = await db.recipes.count();
  if (recipeCount > 0) return;
  await populateSeedRecipes(false);
}

/** Clears recipes and re-seeds Rosa's 28 starter recipes from RECIPE_SEED. */
export async function forceRestoreSeedRecipes(): Promise<number> {
  return populateSeedRecipes(true);
}

export const ROSA_RECIPE_COUNT = RECIPE_SEED.length;
