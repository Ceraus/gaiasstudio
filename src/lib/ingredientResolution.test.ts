import { describe, expect, it } from 'vitest';
import type { Ingredient } from '@/types';
import {
  canonicalIngredientKey,
  canonicalizeIngredientName,
  mergeSourceRefs,
  resolveIngredientCandidate,
} from '@/lib/ingredientResolution';

function ingredient(patch: Partial<Ingredient>): Ingredient {
  return {
    id: patch.id ?? 'ingredient-1',
    name: patch.name ?? 'Lavender Essential Oil',
    benefit: patch.benefit ?? '',
    inci: patch.inci,
    isSoapBase: patch.isSoapBase ?? false,
    active: patch.active ?? true,
    category: patch.category,
    canonicalKey: patch.canonicalKey,
    aliases: patch.aliases,
    sourceRefs: patch.sourceRefs,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe('ingredient canonicalization', () => {
  it('normalizes punctuation, accents, and common abbreviations', () => {
    expect(canonicalizeIngredientName('  Lávender EO (Organic) ')).toBe('lavender essential oil');
    expect(canonicalizeIngredientName('Glycerine')).toBe('glycerin');
  });

  it('prefers INCI for a stable canonical key', () => {
    expect(canonicalIngredientKey({
      name: 'Sweet Almond Oil',
      inci: 'Prunus Amygdalus Dulcis Oil',
    })).toBe('prunus amygdalus dulcis oil');
  });
});

describe('ingredient resolution', () => {
  it('reuses the exact same source record', () => {
    const existing = ingredient({
      sourceRefs: [{ provider: 'cosing', id: '123' }],
    });
    const result = resolveIngredientCandidate({
      name: 'Lavandula Angustifolia Oil',
      sourceRefs: [{ provider: 'cosing', id: '123' }],
    }, [existing]);
    expect(result.decision).toBe('reuse');
    expect(result.match?.id).toBe(existing.id);
  });

  it('reuses an alias despite spelling differences', () => {
    const existing = ingredient({
      inci: undefined,
      aliases: ['Lavender EO'],
      canonicalKey: canonicalizeIngredientName('Lavender Essential Oil'),
    });
    const result = resolveIngredientCandidate({ name: 'Lavender EO' }, [existing]);
    expect(result.decision).toBe('reuse');
  });

  it('does not collapse different physical forms', () => {
    const existing = ingredient({ name: 'Lavender Essential Oil', inci: undefined });
    const result = resolveIngredientCandidate({ name: 'Lavender Powder' }, [existing]);
    expect(result.decision).toBe('new');
  });

  it('routes strong fuzzy matches to review instead of silently merging', () => {
    const existing = ingredient({ name: 'Organic Shea Butter', inci: undefined });
    const result = resolveIngredientCandidate({ name: 'Shea Butter Raw Organic' }, [existing]);
    expect(result.decision).toBe('review');
    expect(result.match?.id).toBe(existing.id);
  });
});

describe('source metadata', () => {
  it('deduplicates source references by provider and id', () => {
    const merged = mergeSourceRefs(
      [{ provider: 'cosing', id: '1' }],
      [{ provider: 'cosing', id: '1' }, { provider: 'openfoodfacts', id: 'shea' }],
    );
    expect(merged).toHaveLength(2);
  });
});
