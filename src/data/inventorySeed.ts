import { ingredientsRepo } from '@/db/repositories';
import { calculateFractionalCost } from '@/lib/inventoryMath';
import type { Ingredient } from '@/types';

export interface InventoryPriceSeed {
  /** Primary display name from the spec. */
  name: string;
  /** Alternate catalog names to match against existing ingredients. */
  matchNames?: string[];
  measurementType: 'weight' | 'volume';
  purchaseSize: number;
  purchaseUnit: 'oz' | 'lbs' | 'ml' | 'g';
  purchasePrice: number;
}

/** Baseline pantry prices from the product spec — matched to catalog entries by name. */
export const INVENTORY_PRICE_SEED: InventoryPriceSeed[] = [
  // Oils & butters (weight, oz unless noted)
  { name: 'Sweet Almond Oil', matchNames: ['Sweet Almond Oil'], measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz', purchasePrice: 12 },
  { name: 'Rosehip Oil', matchNames: ['Rosehip Oil', 'Rose Hip Oil'], measurementType: 'weight', purchaseSize: 4, purchaseUnit: 'oz', purchasePrice: 18 },
  { name: 'Jojoba Oil', measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz', purchasePrice: 22 },
  { name: 'Fractionated Coconut Oil', matchNames: ['Fractionated Coconut Oil', 'Coconut Oil'], measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz', purchasePrice: 10 },
  { name: 'Olive Oil', measurementType: 'weight', purchaseSize: 32, purchaseUnit: 'oz', purchasePrice: 14 },
  { name: 'Castor Oil', measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz', purchasePrice: 11 },
  { name: 'Coconut Oil', measurementType: 'weight', purchaseSize: 32, purchaseUnit: 'oz', purchasePrice: 15 },
  { name: 'Grape Seed Oil', matchNames: ['Grape Seed Oil', 'Grapeseed Oil'], measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz', purchasePrice: 9 },
  { name: 'Argan Oil', measurementType: 'weight', purchaseSize: 4, purchaseUnit: 'oz', purchasePrice: 20 },
  { name: 'Cocoa Butter', measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz', purchasePrice: 14 },
  { name: 'Mango Butter', measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz', purchasePrice: 16 },
  { name: 'Babassu Butter', matchNames: ['Babassu Butter', 'Babassu Oil'], measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz', purchasePrice: 15 },
  { name: 'Shea Butter', measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz', purchasePrice: 12 },

  // Essential oils (volume, ml)
  { name: 'Lavender', matchNames: ['Lavender EO', 'Lavender Essential Oil'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 14 },
  { name: 'Vanilla', matchNames: ['Vanilla Essence', 'Vanilla EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 28 },
  { name: 'Jasmine', matchNames: ['Jasmine Absolute', 'Jasmine EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 35 },
  { name: 'Palmarosa', matchNames: ['Palmarosa EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 12 },
  { name: 'Cedarwood', matchNames: ['Cedarwood EO', 'Cedarwood Atlas EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 10 },
  { name: 'Neroli', matchNames: ['Neroli EO'], measurementType: 'volume', purchaseSize: 5, purchaseUnit: 'ml', purchasePrice: 45 },
  { name: 'Sweet Orange', matchNames: ['Sweet Orange Oil', 'Sweet Orange EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 8 },
  { name: 'Peppermint', matchNames: ['Peppermint EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 10 },
  { name: 'Geranium', matchNames: ['Geranium EO', 'Geranium Bourbon EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 18 },
  { name: 'Bergamot', matchNames: ['Bergamot EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 16 },
  { name: 'Cinnamon', matchNames: ['Cinnamon Bark EO', 'Cinnamon Leaf EO', 'Cinnamon EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 12 },
  { name: 'Tea Tree', matchNames: ['Tea Tree EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 11 },
  { name: 'Rosemary', matchNames: ['Rosemary EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 12 },
  { name: 'Ylang-Ylang', matchNames: ['Ylang Ylang EO', 'Ylang-Ylang EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 19 },
  { name: 'Clary Sage', matchNames: ['Clary Sage EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 15 },
  { name: 'Eucalyptus', matchNames: ['Eucalyptus EO', 'Eucalyptus Globulus EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 9 },
  { name: 'Lemongrass', matchNames: ['Lemongrass EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 8 },
  { name: 'Myrrh', matchNames: ['Myrrh EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 25 },
  { name: 'Rose', matchNames: ['Rose Otto EO', 'Rose Absolute'], measurementType: 'volume', purchaseSize: 5, purchaseUnit: 'ml', purchasePrice: 60 },
  { name: 'Lemon', matchNames: ['Lemon EO'], measurementType: 'volume', purchaseSize: 15, purchaseUnit: 'ml', purchasePrice: 10 },
  { name: 'Chamomile', matchNames: ['Chamomile German EO', 'Chamomile Roman EO', 'Chamomile EO'], measurementType: 'volume', purchaseSize: 5, purchaseUnit: 'ml', purchasePrice: 35 },

  // Botanicals & additives (weight, oz)
  { name: 'Glycerin Soap Base', matchNames: ['Glycerin Base (Clear)', 'Glycerin Base (White)', 'Melt & Pour Base (Clear)'], measurementType: 'weight', purchaseSize: 160, purchaseUnit: 'oz', purchasePrice: 25 },
  { name: 'Oat Flour', matchNames: ['Oat Flour', 'Colloidal Oatmeal'], measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz', purchasePrice: 6 },
  { name: 'Pure Cocoa Powder', matchNames: ['Cocoa Powder', 'Pure Cocoa Powder'], measurementType: 'weight', purchaseSize: 8, purchaseUnit: 'oz', purchasePrice: 8 },
  { name: 'Lavender Powder', matchNames: ['Lavender Powder', 'Lavender Buds'], measurementType: 'weight', purchaseSize: 4, purchaseUnit: 'oz', purchasePrice: 10 },
  { name: 'Honey', matchNames: ['Honey', 'Raw Honey'], measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz', purchasePrice: 12 },
  { name: 'Calendula Petals', matchNames: ['Calendula Petals', 'Calendula', 'Calendula Leaf'], measurementType: 'weight', purchaseSize: 4, purchaseUnit: 'oz', purchasePrice: 12 },
  { name: "Cow's Milk Powder", matchNames: ["Cow's Milk Powder", 'Goat Milk Powder'], measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz', purchasePrice: 14 },
  { name: 'Almond Milk Powder', measurementType: 'weight', purchaseSize: 8, purchaseUnit: 'oz', purchasePrice: 15 },
  { name: 'Coconut Milk Powder', measurementType: 'weight', purchaseSize: 8, purchaseUnit: 'oz', purchasePrice: 12 },
  { name: 'Rose Powder', measurementType: 'weight', purchaseSize: 4, purchaseUnit: 'oz', purchasePrice: 14 },
  { name: 'Green Spirulina', matchNames: ['Green Spirulina', 'Spirulina Powder'], measurementType: 'weight', purchaseSize: 4, purchaseUnit: 'oz', purchasePrice: 15 },
  { name: 'Green Tea Powder', matchNames: ['Green Tea Powder', 'Green Tea Extract'], measurementType: 'weight', purchaseSize: 4, purchaseUnit: 'oz', purchasePrice: 12 },
  { name: 'Activated Charcoal', measurementType: 'weight', purchaseSize: 8, purchaseUnit: 'oz', purchasePrice: 10 },
  { name: 'Green Clay', matchNames: ['Green Clay', 'French Green Clay', 'Illite Green Clay'], measurementType: 'weight', purchaseSize: 8, purchaseUnit: 'oz', purchasePrice: 9 },
  { name: 'Red Clay', matchNames: ['Red Clay', 'Australian Red Clay', 'Rose Kaolin Clay'], measurementType: 'weight', purchaseSize: 8, purchaseUnit: 'oz', purchasePrice: 9 },
  { name: 'White Clay', matchNames: ['White Clay', 'White Kaolin Clay', 'Kaolin Clay'], measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz', purchasePrice: 12 },
  { name: 'Blue Clay', matchNames: ['Blue Clay', 'Cambrian Blue Clay'], measurementType: 'weight', purchaseSize: 8, purchaseUnit: 'oz', purchasePrice: 11 },
  { name: 'Yellow Clay', matchNames: ['Yellow Clay', 'Fullers Earth Clay'], measurementType: 'weight', purchaseSize: 8, purchaseUnit: 'oz', purchasePrice: 10 },
  { name: 'Bentonite Clay', measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz', purchasePrice: 10 },
  { name: 'Pink Clay', matchNames: ['Pink Clay', 'Rose Kaolin Clay'], measurementType: 'weight', purchaseSize: 8, purchaseUnit: 'oz', purchasePrice: 11 },
  { name: 'Ground Coffee', measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz', purchasePrice: 14 },
  { name: 'Poppy Seeds', measurementType: 'weight', purchaseSize: 8, purchaseUnit: 'oz', purchasePrice: 8 },
  { name: 'Passion Fruit Seeds', matchNames: ['Passion Fruit Seeds', 'Passion Fruit Powder'], measurementType: 'weight', purchaseSize: 4, purchaseUnit: 'oz', purchasePrice: 12 },
  { name: 'Rice Powder', matchNames: ['Rice Powder', 'Rice Bran Powder'], measurementType: 'weight', purchaseSize: 8, purchaseUnit: 'oz', purchasePrice: 9 },
  { name: 'Tussah Silk', matchNames: ['Tussah Silk', 'Silk Peptide Powder'], measurementType: 'weight', purchaseSize: 1, purchaseUnit: 'oz', purchasePrice: 15 },
  { name: 'Beeswax', measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz', purchasePrice: 15 },
  { name: 'Aloe Vera Powder', measurementType: 'weight', purchaseSize: 8, purchaseUnit: 'oz', purchasePrice: 14 },
  { name: 'Neem Powder', measurementType: 'weight', purchaseSize: 8, purchaseUnit: 'oz', purchasePrice: 12 },
];

function findIngredientByNames(ingredients: Ingredient[], names: string[]): Ingredient | undefined {
  const normalized = names.map((n) => n.toLowerCase().trim());
  for (const name of normalized) {
    const exact = ingredients.find((i) => i.name.toLowerCase().trim() === name);
    if (exact) return exact;
  }
  return undefined;
}

/** Apply baseline inventory prices to matching catalog ingredients (by name). */
export async function seedInventoryPrices(): Promise<{ updated: number; skipped: number }> {
  const ingredients = await ingredientsRepo.all();
  let updated = 0;
  let skipped = 0;

  for (const seed of INVENTORY_PRICE_SEED) {
    const names = [seed.name, ...(seed.matchNames ?? [])];
    const ing = findIngredientByNames(ingredients, names);
    if (!ing) {
      skipped++;
      continue;
    }

    const patch = {
      measurementType: seed.measurementType,
      purchaseSize: seed.purchaseSize,
      purchaseUnit: seed.purchaseUnit,
      purchasePrice: seed.purchasePrice,
      fractionalCost: calculateFractionalCost({
        measurementType: seed.measurementType,
        purchaseSize: seed.purchaseSize,
        purchaseUnit: seed.purchaseUnit,
        purchasePrice: seed.purchasePrice,
      }),
    };

    await ingredientsRepo.update(ing.id, patch);
    updated++;
  }

  return { updated, skipped };
}
