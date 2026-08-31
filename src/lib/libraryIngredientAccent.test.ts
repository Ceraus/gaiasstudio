import { describe, expect, it } from 'vitest';
import {
  LIBRARY_ACCENT_COUNT,
  LIBRARY_NEW_WINDOW_MS,
  isNewlyAddedLibraryIngredient,
  libraryIngredientRowClass,
  nextLibraryAccentIndex,
  newlyAddedLibraryAccent,
  sortLibraryIngredientsForPreview,
} from './libraryIngredientAccent';

const now = 1_700_000_000_000;

describe('library ingredient accents', () => {
  it('rotates through the palette in add order', () => {
    expect(nextLibraryAccentIndex([])).toBe(0);
    expect(nextLibraryAccentIndex([{ createdAt: now, libraryAccent: 0 }])).toBe(1);
    expect(nextLibraryAccentIndex([
      { createdAt: now - 10, libraryAccent: 0 },
      { createdAt: now, libraryAccent: LIBRARY_ACCENT_COUNT - 1 },
    ])).toBe(0);
  });

  it('does not treat seed-style rows (no accent) as new, even if createdAt is now', () => {
    expect(isNewlyAddedLibraryIngredient({ createdAt: now, libraryAccent: undefined }, now)).toBe(false);
    expect(newlyAddedLibraryAccent({ createdAt: now }, now)).toBeNull();
  });

  it('keeps a stored accent only inside the newness window', () => {
    expect(isNewlyAddedLibraryIngredient({ createdAt: now - 3_600_000, libraryAccent: 2 }, now)).toBe(true);
    expect(isNewlyAddedLibraryIngredient({
      createdAt: now - LIBRARY_NEW_WINDOW_MS - 1,
      libraryAccent: 2,
    }, now)).toBe(false);
    expect(newlyAddedLibraryAccent({ createdAt: now, libraryAccent: 2 }, now)?.key).toBe('sky');
  });

  it('uses a stronger tint than the pale-green selected style', () => {
    const longStanding = libraryIngredientRowClass({ createdAt: now }, { selected: true }, now);
    const added = libraryIngredientRowClass({ createdAt: now, libraryAccent: 0 }, { selected: true }, now);
    expect(longStanding).toContain('bg-gaia-50');
    expect(added).toContain('bg-teal-100');
    expect(added).toContain('ring-2');
    expect(added).not.toContain('bg-gaia-50');
  });

  it('sorts newly added rows ahead of long-standing library rows', () => {
    const glycerin = { id: 'g', createdAt: now - 10_000 };
    const mint = { id: 'm', createdAt: now - 9_000 };
    const rose = { id: 'r', createdAt: now, libraryAccent: 0 };
    const sorted = sortLibraryIngredientsForPreview([glycerin, mint, rose], now);
    expect(sorted.map((item) => item.id)).toEqual(['r', 'g', 'm']);
  });
});
