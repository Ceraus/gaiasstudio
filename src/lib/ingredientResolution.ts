import type { Ingredient, IngredientCategory, IngredientSourceRef } from '@/types';

export type IngredientResolutionDecision = 'reuse' | 'review' | 'new';

export interface IngredientCandidate {
  name: string;
  inci?: string;
  aliases?: string[];
  category?: IngredientCategory;
  sourceRefs?: IngredientSourceRef[];
}

export interface IngredientResolution {
  decision: IngredientResolutionDecision;
  confidence: number;
  match?: Ingredient;
  reasons: string[];
}

const TOKEN_ALIASES: Record<string, string> = {
  eo: 'essential oil',
  'essential oils': 'essential oil',
  glycerine: 'glycerin',
  colour: 'color',
  'vitamin e oil': 'tocopherol',
};

const FORM_WORDS = new Set([
  'powder',
  'extract',
  'oil',
  'butter',
  'wax',
  'clay',
  'fragrance',
  'essential',
  'base',
]);

export function canonicalizeIngredientName(value: string): string {
  let normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  for (const [from, to] of Object.entries(TOKEN_ALIASES)) {
    const pattern = new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    normalized = normalized.replace(pattern, to);
  }
  return normalized.replace(/\s+/g, ' ').trim();
}

export function canonicalIngredientKey(candidate: Pick<IngredientCandidate, 'name' | 'inci'>): string {
  return canonicalizeIngredientName(candidate.inci?.trim() || candidate.name);
}

function sourceKey(ref: IngredientSourceRef): string {
  return `${ref.provider}:${ref.id}`.toLowerCase();
}

function tokenSet(value: string): Set<string> {
  return new Set(canonicalizeIngredientName(value).split(' ').filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / (a.size + b.size - overlap);
}

function hasFormContradiction(a: string, b: string): boolean {
  const formsA = new Set([...tokenSet(a)].filter((token) => FORM_WORDS.has(token)));
  const formsB = new Set([...tokenSet(b)].filter((token) => FORM_WORDS.has(token)));
  if (!formsA.size || !formsB.size) return false;
  return ![...formsA].some((token) => formsB.has(token));
}

function allNames(candidate: IngredientCandidate): string[] {
  return [candidate.name, candidate.inci ?? '', ...(candidate.aliases ?? [])].filter(Boolean);
}

function ingredientNames(ingredient: Ingredient): string[] {
  return [ingredient.name, ingredient.inci ?? '', ...(ingredient.aliases ?? [])].filter(Boolean);
}

export function resolveIngredientCandidate(
  candidate: IngredientCandidate,
  existing: Ingredient[],
): IngredientResolution {
  const incomingSources = new Set((candidate.sourceRefs ?? []).map(sourceKey));
  for (const ingredient of existing) {
    if ((ingredient.sourceRefs ?? []).some((ref) => incomingSources.has(sourceKey(ref)))) {
      return { decision: 'reuse', confidence: 1, match: ingredient, reasons: ['same-source-id'] };
    }
  }

  const candidateKey = canonicalIngredientKey(candidate);
  const exact = existing.find((ingredient) => {
    if (ingredient.canonicalKey && ingredient.canonicalKey === candidateKey) return true;
    return ingredientNames(ingredient).some(
      (name) => canonicalizeIngredientName(name) === candidateKey,
    );
  });
  if (exact) {
    return { decision: 'reuse', confidence: 0.99, match: exact, reasons: ['canonical-exact'] };
  }

  let best: { ingredient: Ingredient; score: number; reason: string } | undefined;
  for (const ingredient of existing) {
    let score = 0;
    let reason = 'name-similarity';
    for (const incomingName of allNames(candidate)) {
      for (const localName of ingredientNames(ingredient)) {
        const incomingKey = canonicalizeIngredientName(incomingName);
        const localKey = canonicalizeIngredientName(localName);
        if (!incomingKey || !localKey || hasFormContradiction(incomingKey, localKey)) continue;
        const current = jaccard(tokenSet(incomingKey), tokenSet(localKey));
        if (current > score) {
          score = current;
          reason = incomingName === candidate.inci || localName === ingredient.inci
            ? 'inci-similarity'
            : 'name-similarity';
        }
      }
    }
    if (!best || score > best.score) best = { ingredient, score, reason };
  }

  if (best && best.score >= 0.72) {
    return {
      decision: 'review',
      confidence: best.score,
      match: best.ingredient,
      reasons: [best.reason],
    };
  }
  return { decision: 'new', confidence: best?.score ?? 0, reasons: ['no-close-match'] };
}

export function mergeSourceRefs(
  current: IngredientSourceRef[] | undefined,
  incoming: IngredientSourceRef[] | undefined,
): IngredientSourceRef[] | undefined {
  const merged = new Map<string, IngredientSourceRef>();
  for (const ref of [...(current ?? []), ...(incoming ?? [])]) merged.set(sourceKey(ref), ref);
  return merged.size ? [...merged.values()] : undefined;
}
