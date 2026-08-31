import { resources } from '@/i18n';
import { preserveTranslationCase } from '@/lib/preserveTranslationCase';

export interface BilingualPair {
  en: string;
  es: string;
}

export type OfflineTranslateConfidence = 'exact' | 'rewrite' | 'passthrough' | 'unknown';

export interface OfflineTranslateResult {
  text: string;
  confidence: OfflineTranslateConfidence;
}

const MIN_REWRITE_LEN = 4;

/** Section headers, regulatory lines, and other label-scale phrases. */
const LABEL_PHRASES: BilingualPair[] = [
  { en: 'INGREDIENTS', es: 'INGREDIENTES' },
  { en: 'Ingredients', es: 'Ingredientes' },
  { en: 'DIRECTIONS', es: 'MODO DE USO' },
  { en: 'Directions', es: 'Instrucciones' },
  { en: 'WARNING', es: 'ADVERTENCIA' },
  { en: 'Warning', es: 'Advertencia' },
  { en: 'NET WT', es: 'PESO NETO' },
  { en: 'Net Wt', es: 'Peso Neto' },
  { en: 'Net wt', es: 'Peso neto' },
  { en: 'Net weight', es: 'Peso neto' },
  { en: 'Benefits', es: 'Beneficios' },
  { en: 'Handmade by', es: 'Hecho a mano por' },
  { en: 'Handcrafted in', es: 'Artesanal en' },
  { en: 'Handcrafted', es: 'Hecho a mano' },
  { en: 'Handmade', es: 'Hecho a mano' },
  { en: 'Contact', es: 'Contacto' },
  { en: 'Product Name', es: 'Nombre del producto' },
  { en: 'Product', es: 'Producto' },
  { en: 'Drop your\nlogo here', es: 'Pon tu\nlogotipo aquí' },
  { en: 'Drop your logo here', es: 'Pon tu logotipo aquí' },
  { en: 'Add ingredients & directions to your recipe.', es: 'Agrega ingredientes e instrucciones a tu receta.' },
  { en: 'Lather with water and apply to skin. Rinse thoroughly.', es: 'Enjabona con agua y aplica sobre la piel. Enjuaga bien.' },
  { en: 'Lather with water, rinse, and enjoy.', es: 'Enjabona con agua, enjuaga y disfruta.' },
  { en: 'For external use only. Avoid contact with eyes.', es: 'Solo para uso externo. Evite el contacto con los ojos.' },
  { en: 'For external use only', es: 'Solo para uso externo' },
  { en: 'Avoid contact with eyes', es: 'Evite el contacto con los ojos' },
  { en: 'Rinse thoroughly', es: 'Enjuaga bien' },
  { en: 'Apply to skin', es: 'Aplica sobre la piel' },
  { en: 'Lather with water', es: 'Enjabona con agua' },
  { en: 'Handmade soap', es: 'Jabón artesanal' },
  { en: 'Bar soap', es: 'Jabón en barra' },
  { en: 'Soap', es: 'Jabón' },
  { en: 'Skin', es: 'Piel' },
  { en: 'Face', es: 'Rostro' },
  { en: 'Body', es: 'Cuerpo' },
  { en: 'Moisturizing', es: 'Hidratante' },
  { en: 'Moisturizes', es: 'Hidrata' },
  { en: 'Hydrating', es: 'Hidratante' },
  { en: 'Hydrates', es: 'Hidrata' },
  { en: 'Soothing', es: 'Calmante' },
  { en: 'Soothes', es: 'Calma' },
  { en: 'Calming', es: 'Calmante' },
  { en: 'Calms', es: 'Calma' },
  { en: 'Nourishing', es: 'Nutritivo' },
  { en: 'Nourishes', es: 'Nutre' },
  { en: 'Cleansing', es: 'Limpiador' },
  { en: 'Cleanses', es: 'Limpia' },
  { en: 'Gentle', es: 'Suave' },
  { en: 'Brightening', es: 'Iluminador' },
  { en: 'Exfoliating', es: 'Exfoliante' },
  { en: 'Exfoliates', es: 'Exfolia' },
  { en: 'Invigorating', es: 'Energizante' },
  { en: 'Refreshing', es: 'Refrescante' },
  { en: 'Romantic', es: 'Romántico' },
  { en: 'Luxurious', es: 'Lujoso' },
  { en: 'Aromatic', es: 'Aromático' },
  { en: 'Purifying', es: 'Purificante' },
  { en: 'Balancing', es: 'Equilibrante' },
  { en: 'Clarifying', es: 'Clarificante' },
  { en: 'Comforting', es: 'Reconfortante' },
  { en: 'Energizing', es: 'Energizante' },
  { en: 'Tropical', es: 'Tropical' },
  { en: 'Fresh', es: 'Fresco' },
  { en: 'Light', es: 'Ligero' },
  { en: 'Rich', es: 'Rico' },
  { en: 'Sweet', es: 'Dulce' },
  { en: 'Crisp', es: 'Crujiente' },
  { en: 'Exotic', es: 'Exótico' },
  { en: 'Deep Cleansing', es: 'Limpieza profunda' },
  { en: 'Anti-Aging', es: 'Antienvejecimiento' },
  { en: 'Anti-Inflammatory', es: 'Antiinflamatorio' },
  { en: 'Antioxidant-Rich', es: 'Rico en antioxidantes' },
  { en: 'Antioxidant', es: 'Antioxidante' },
  { en: 'Omega-Rich', es: 'Rico en omega' },
  { en: 'Ultra-Gentle', es: 'Extra suave' },
  { en: 'Deeply Moisturizing', es: 'Profundamente hidratante' },
  { en: 'Natural', es: 'Natural' },
  { en: 'Organic', es: 'Orgánico' },
  { en: 'with water', es: 'con agua' },
  { en: 'and apply', es: 'y aplica' },
];

function normalizeKey(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyCase(translated: string, source: string, locale?: string): string {
  return preserveTranslationCase(translated, source, locale);
}

function looksLikeInciOrCode(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/@/.test(trimmed) || /^https?:\/\//i.test(trimmed)) return true;
  if (/\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/.test(trimmed)) return true;
  if (/^[A-Z]{0,3}\d{5,}$/.test(trimmed.replace(/[\s-]/g, ''))) return true;
  if (/[A-Z][a-z]+ [A-Z][a-z]+ \([^)]+\)/.test(trimmed)) return true;
  if (
    /^[A-Z0-9][A-Z0-9\s/,\-().]+$/.test(trimmed)
    && trimmed.length > 10
    && /[A-Z]{3,}/.test(trimmed)
    && /[A-Z]{2,}\s+[A-Z]{2,}/.test(trimmed)
  ) {
    return true;
  }
  return false;
}

function looksLikeProperNoun(text: string): boolean {
  const words = text.trim().split(/\s+/);
  if (words.length === 0) return false;
  return words.every((word) => {
    if (/^[\d.,%°]+$/.test(word)) return true;
    if (/^(oz|fl\.?oz|g|kg|ml|lbs?)$/i.test(word)) return true;
    return /^[A-ZÁÉÍÓÚÑÜ][A-Za-zÁÉÍÓÚÑÜáéíóúñü''.-]+$/.test(word);
  }) && /[A-ZÁÉÍÓÚÑÜ]/.test(text);
}

type PhraseEntry = { en: string; es: string; key: string };

let cachedPhrases: PhraseEntry[] | null = null;
let cachedByKey: Map<string, PhraseEntry> | null = null;

function addPair(bucket: PhraseEntry[], seen: Set<string>, en: string, es: string) {
  const enTrim = en.trim();
  const esTrim = es.trim();
  if (!enTrim || !esTrim) return;
  const key = normalizeKey(enTrim);
  const esKey = normalizeKey(esTrim);
  if (!key || key === esKey) return;
  if (seen.has(`en:${key}`)) return;
  seen.add(`en:${key}`);
  bucket.push({ en: enTrim, es: esTrim, key });
}

function i18nSectionPairs(section: 'recipeBenefits' | 'benefits' | 'ingredientNames'): BilingualPair[] {
  const enRoot = resources.en.translation as unknown as Record<string, Record<string, string>>;
  const esRoot = resources.es.translation as unknown as Record<string, Record<string, string>>;
  const enMap = enRoot[section] ?? {};
  const esMap = esRoot[section] ?? {};
  const pairs: BilingualPair[] = [];
  for (const id of Object.keys(enMap)) {
    const en = enMap[id];
    const es = esMap[id];
    if (typeof en === 'string' && typeof es === 'string') {
      pairs.push({ en, es });
    }
  }
  return pairs;
}

function builtPhrases(): { list: PhraseEntry[]; byKey: Map<string, PhraseEntry> } {
  if (cachedPhrases && cachedByKey) return { list: cachedPhrases, byKey: cachedByKey };
  const list: PhraseEntry[] = [];
  const seen = new Set<string>();
  for (const pair of LABEL_PHRASES) addPair(list, seen, pair.en, pair.es);
  for (const pair of i18nSectionPairs('recipeBenefits')) addPair(list, seen, pair.en, pair.es);
  for (const pair of i18nSectionPairs('benefits')) addPair(list, seen, pair.en, pair.es);
  for (const pair of i18nSectionPairs('ingredientNames')) addPair(list, seen, pair.en, pair.es);
  list.sort((a, b) => b.key.length - a.key.length);
  const byKey = new Map<string, PhraseEntry>();
  for (const entry of list) {
    byKey.set(entry.key, entry);
    byKey.set(normalizeKey(entry.es), entry);
  }
  cachedPhrases = list;
  cachedByKey = byKey;
  return { list, byKey };
}

function matchStoredPair(text: string, toLang: 'en' | 'es', pairs: BilingualPair[]): string | undefined {
  const key = normalizeKey(text);
  if (!key) return undefined;
  for (const pair of pairs) {
    const enKey = normalizeKey(pair.en);
    const esKey = normalizeKey(pair.es);
    if (key === enKey || key === esKey) {
      const chosen = toLang === 'es' ? pair.es : pair.en;
      return chosen.trim() ? applyCase(chosen, text, toLang) : undefined;
    }
  }
  return undefined;
}

function phraseForKey(key: string, toLang: 'en' | 'es', extra: Map<string, PhraseEntry>): string | undefined {
  const entry = extra.get(key) ?? builtPhrases().byKey.get(key);
  if (!entry) return undefined;
  return toLang === 'es' ? entry.es : entry.en;
}

function extraEntries(pairs: BilingualPair[]): { list: PhraseEntry[]; byKey: Map<string, PhraseEntry> } {
  const list: PhraseEntry[] = [];
  const seen = new Set<string>();
  for (const pair of pairs) addPair(list, seen, pair.en, pair.es);
  list.sort((a, b) => b.key.length - a.key.length);
  const byKey = new Map<string, PhraseEntry>();
  for (const entry of list) {
    byKey.set(entry.key, entry);
    byKey.set(normalizeKey(entry.es), entry);
  }
  return { list, byKey };
}

function replacePhrases(
  text: string,
  toLang: 'en' | 'es',
  extras: PhraseEntry[],
): { text: string; hits: number } {
  const phrases = [...extras, ...builtPhrases().list].sort((a, b) => b.key.length - a.key.length);
  let out = text;
  let hits = 0;
  for (const phrase of phrases) {
    const source = toLang === 'es' ? phrase.en : phrase.es;
    if (source.length < MIN_REWRITE_LEN && !/[A-Z]{2,}/.test(source)) continue;
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(source)}(?![\\p{L}\\p{N}])`, 'giu');
    const next = out.replace(pattern, (match) => {
      hits += 1;
      return applyCase(toLang === 'es' ? phrase.es : phrase.en, match, toLang);
    });
    out = next;
  }
  out = out.replace(/\s+&\s+/g, toLang === 'es' ? ' y ' : ' & ');
  if (toLang === 'es') out = out.replace(/(\p{L})\s+and\s+(\p{L})/giu, '$1 y $2');
  else out = out.replace(/(\p{L})\s+y\s+(\p{L})/giu, '$1 and $2');
  return { text: out, hits };
}

/** Pull EN/ES recipe copy so stored Spanish wins over machine translate. */
export function recipeBilingualPairs(recipe?: {
  benefit?: string;
  benefitEn?: string;
  benefitEs?: string;
  directions?: string;
  directionsEn?: string;
  directionsEs?: string;
  warnings?: string;
  warningsEn?: string;
  warningsEs?: string;
} | null): BilingualPair[] {
  if (!recipe) return [];
  const pairs: BilingualPair[] = [];
  const add = (en?: string, es?: string) => {
    const enTrim = en?.trim() ?? '';
    const esTrim = es?.trim() ?? '';
    if (enTrim && esTrim && normalizeKey(enTrim) !== normalizeKey(esTrim)) {
      pairs.push({ en: enTrim, es: esTrim });
    }
  };
  add(recipe.benefitEn || recipe.benefit, recipe.benefitEs);
  add(recipe.benefitEn, recipe.benefitEs || recipe.benefit);
  add(recipe.directionsEn || recipe.directions, recipe.directionsEs);
  add(recipe.directionsEn, recipe.directionsEs || recipe.directions);
  add(recipe.warningsEn || recipe.warnings, recipe.warningsEs);
  add(recipe.warningsEn, recipe.warningsEs || recipe.warnings);
  return pairs;
}

export function translateLabelTextOffline(
  text: string,
  toLang: 'en' | 'es',
  pairs: BilingualPair[] = [],
): OfflineTranslateResult {
  const original = text;
  if (!original.trim()) return { text: original, confidence: 'passthrough' };

  const stored = matchStoredPair(original, toLang, pairs);
  if (stored != null) return { text: stored, confidence: 'exact' };

  if (looksLikeInciOrCode(original)) return { text: original, confidence: 'passthrough' };

  const extra = extraEntries(pairs);
  const exact = phraseForKey(normalizeKey(original), toLang, extra.byKey);
  if (exact) return { text: applyCase(exact, original, toLang), confidence: 'exact' };

  if (original.includes('\n')) {
    const lines = original.split('\n');
    const translated = lines.map((line) => translateLabelTextOffline(line, toLang, pairs));
    const joined = translated.map((line) => line.text).join('\n');
    if (joined === original) {
      return { text: original, confidence: looksLikeProperNoun(original) ? 'passthrough' : 'unknown' };
    }
    if (translated.every((line) => line.confidence === 'exact' || line.confidence === 'passthrough')) {
      return { text: joined, confidence: translated.some((line) => line.confidence === 'exact') ? 'exact' : 'passthrough' };
    }
    return { text: joined, confidence: 'rewrite' };
  }

  const replaced = replacePhrases(original, toLang, extra.list);
  if (replaced.hits > 0 && replaced.text !== original && rewriteCoverageOk(original, replaced.text)) {
    return { text: replaced.text, confidence: 'rewrite' };
  }
  if (looksLikeProperNoun(original)) return { text: original, confidence: 'passthrough' };
  return { text: original, confidence: 'unknown' };
}

/** Drop one-word swaps in otherwise-untranslated sentences (keep those for Google Translate). */
function rewriteCoverageOk(original: string, rewritten: string): boolean {
  const words = original.match(/\p{L}[\p{L}'’.-]*/gu) ?? [];
  if (words.length <= 3) return true;
  const leftover = words.filter((word) =>
    new RegExp(`(?<![\\p{L}])${escapeRegExp(word)}(?![\\p{L}])`, 'iu').test(rewritten),
  ).length;
  const changed = words.length - leftover;
  return changed / words.length >= 0.5;
}

export function translateLabelTextsOffline(
  texts: string[],
  toLang: 'en' | 'es',
  pairs: BilingualPair[] = [],
): OfflineTranslateResult[] {
  return texts.map((text) => translateLabelTextOffline(text, toLang, pairs));
}
