import { canonicalizeIngredientName } from '@/lib/ingredientResolution';

export interface CatalogSearchRankable {
  name: string;
  nameEs?: string;
  aliases?: string[];
  inci?: string;
}

const BLEND_FORM_TOKENS = new Set([
  'oil', 'oils', 'eo', 'fo', 'butter', 'wax', 'clay', 'fragrance', 'essential',
  'base', 'powder', 'extract', 'herb', 'herbs', 'buds', 'mica', 'flower', 'flowers',
  'leaf', 'leaves', 'root', 'seed', 'seeds', 'fruit', 'water', 'milk', 'flakes',
  'absolute', 'hydrosol', 'infusion', 'scent', 'perfume', 'color', 'colour',
  'colorant', 'pigment', 'acid', 'salt', 'beads', 'crystals', 'glycol', 'alcohol',
  'glycerin', 'glycerine', 'soap', 'liquid', 'solid', 'dried', 'dry', 'fresh',
  'organic', 'pure', 'distilled', 'refined', 'unrefined', 'virgin', 'extra',
  'sweet', 'bitter', 'wild', 'raw', 'ground', 'whole', 'cut', 'pieces', 'tea',
  'juice', 'puree', 'pulp', 'peel', 'zest', 'bark', 'wood', 'resin', 'gum',
  'chips', 'grated', 'and', 'y',
]);

/**
 * Higher = more of a blend / multi-material. Used only for sort order among
 * remaining catalog hits — CosIng composites stay hidden separately.
 */
export function ingredientBlendComplexity(name: string): number {
  const raw = name.trim();
  if (!raw) return 0;
  let score = 0;
  if (/&/.test(raw)) score += 6;
  if (/\+/.test(raw)) score += 6;
  const slashes = (raw.match(/\//g) ?? []).length;
  if (slashes) score += 4 + (slashes - 1) * 2;
  if (/\band\b/i.test(raw) || /(^|\s)y(\s|$)/i.test(raw)) score += 6;
  const materials = canonicalizeIngredientName(raw)
    .split(' ')
    .filter((token) => token && !BLEND_FORM_TOKENS.has(token));
  if (materials.length >= 3) score += 5;
  else if (materials.length >= 2) score += 3;
  return score;
}

function foldLetters(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function displayFold(value: string): string {
  return collapseSpaces(foldLetters(value));
}

/** Tokenize without expanding `eo` → `essential oil` so word counts stay honest. */
function rankFold(value: string): string {
  return collapseSpaces(
    foldLetters(value)
      .replace(/&/g, ' and ')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/[^a-z0-9]+/g, ' '),
  );
}

function tokensOf(value: string): string[] {
  return rankFold(value).split(' ').filter(Boolean);
}

function stripTrailingParentheticals(value: string): string {
  let current = value.trim();
  let next = current.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  while (next !== current) {
    current = next;
    next = current.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  }
  return current;
}

function isWholeWordPrefix(nameTokens: string[], queryTokens: string[]): boolean {
  return queryTokens.length > 0
    && nameTokens.length >= queryTokens.length
    && queryTokens.every((token, index) => nameTokens[index] === token);
}

function sequenceIndex(haystack: string[], needle: string[]): number {
  if (!needle.length || haystack.length < needle.length) return -1;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    if (needle.every((token, offset) => haystack[i + offset] === token)) return i;
  }
  return -1;
}

interface NameRank {
  tier: number;
  extraWords: number;
  length: number;
}

const NO_MATCH: NameRank = { tier: 99, extraWords: 99, length: 0 };

function scoreName(name: string, query: string): NameRank {
  const queryDisplay = displayFold(query);
  const nameDisplay = displayFold(name);
  if (!queryDisplay || !nameDisplay) return NO_MATCH;

  const length = name.trim().length;
  const queryTokens = tokensOf(query);
  const nameTokens = tokensOf(name);
  const extraWords = Math.max(0, nameTokens.length - queryTokens.length);

  if (nameDisplay === queryDisplay) {
    return { tier: 0, extraWords: 0, length };
  }

  const withoutParens = displayFold(stripTrailingParentheticals(name));
  if (withoutParens === queryDisplay) {
    return { tier: 1, extraWords: 0, length };
  }

  if (isWholeWordPrefix(nameTokens, queryTokens)) {
    return { tier: 2, extraWords, length };
  }

  // peppermint / spearmint for query "mint" — treat as a simple leading form
  const queryKey = queryTokens[0] ?? '';
  if (
    queryTokens.length === 1
    && queryKey.length >= 3
    && nameTokens[0]
    && nameTokens[0] !== queryKey
    && nameTokens[0].endsWith(queryKey)
  ) {
    return { tier: 2, extraWords, length };
  }

  const seq = sequenceIndex(nameTokens, queryTokens);
  if (seq > 0) {
    return { tier: 3, extraWords, length };
  }

  if (
    queryTokens.length === 1
    && queryKey.length >= 3
    && nameTokens.some((token) => token !== queryKey && token.endsWith(queryKey))
  ) {
    return { tier: 4, extraWords, length };
  }

  const folded = rankFold(name);
  const queryFolded = rankFold(query);
  if (folded.startsWith(queryFolded) || nameTokens.some((token) => token.startsWith(queryFolded))) {
    return { tier: 5, extraWords: nameTokens.length, length };
  }
  if (folded.includes(queryFolded)) {
    return { tier: 6, extraWords: nameTokens.length, length };
  }
  return NO_MATCH;
}

function betterRank(left: NameRank, right: NameRank): NameRank {
  if (left.tier !== right.tier) return left.tier < right.tier ? left : right;
  if (left.extraWords !== right.extraWords) return left.extraWords < right.extraWords ? left : right;
  if (left.length !== right.length) return left.length < right.length ? left : right;
  return left;
}

function commonNames(row: CatalogSearchRankable): string[] {
  return [row.name, row.nameEs ?? ''].filter(Boolean);
}

function otherNames(row: CatalogSearchRankable): string[] {
  return [row.inci ?? '', ...(row.aliases ?? [])].filter(Boolean);
}

function rowRank(row: CatalogSearchRankable, query: string): NameRank & { blend: number; nameKey: string } {
  let best = NO_MATCH;
  for (const name of commonNames(row)) best = betterRank(best, scoreName(name, query));
  if (best.tier >= 3) {
    for (const name of otherNames(row)) best = betterRank(best, scoreName(name, query));
  }
  return {
    ...best,
    blend: ingredientBlendComplexity(row.name),
    nameKey: canonicalizeIngredientName(row.name),
  };
}

/**
 * Catalog / library search order:
 * 1. Exact EN or ES common name
 * 2. Common name equals the query plus a trailing parenthetical (INCI) only
 * 3. Name starts with the query as whole word(s), fewest extra words first
 * 4. Other contains-query matches, shorter / fewer modifiers first
 */
export function rankByQuery<T extends CatalogSearchRankable>(rows: T[], query: string): T[] {
  const q = query.trim();
  if (!q) return [...rows];
  return [...rows].sort((a, b) => {
    const left = rowRank(a, q);
    const right = rowRank(b, q);
    return left.tier - right.tier
      || left.extraWords - right.extraWords
      || left.blend - right.blend
      || left.length - right.length
      || left.nameKey.localeCompare(right.nameKey);
  });
}
