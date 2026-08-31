import {
  parseTextObjectsFromJson,
  readCanvasLabelLanguage,
  type CanvasLabelLanguage,
} from '@/lib/fabric/canvasTextJson';
import { translateLabelTextOffline } from '@/lib/offlineLabelTranslate';

const ES_MARKS = /[ñáéíóúü¿¡]/gi;
const EN_STOP = new Set([
  'the',
  'and',
  'of',
  'with',
  'for',
  'from',
  'only',
  'rinse',
  'apply',
  'water',
  'skin',
  'handmade',
  'directions',
  'ingredients',
  'warning',
  'thoroughly',
  'lather',
  'avoid',
  'contact',
  'eyes',
  'soap',
]);
const ES_STOP = new Set([
  'los',
  'las',
  'una',
  'para',
  'con',
  'por',
  'del',
  'sobre',
  'piel',
  'jabon',
  'modo',
  'enjuaga',
  'aplica',
  'hecho',
  'ingredientes',
  'advertencia',
  'instrucciones',
  'evite',
  'contacto',
  'ojos',
  'enjabona',
]);

function fold(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function sameFolded(a: string, b: string): boolean {
  return fold(a) === fold(b);
}

function scoreText(text: string): { en: number; es: number } {
  let en = 0;
  let es = 0;
  es += (text.match(ES_MARKS) ?? []).length * 3;

  const toEs = translateLabelTextOffline(text, 'es');
  const toEn = translateLabelTextOffline(text, 'en');
  const sameEs = sameFolded(toEs.text, text);
  const sameEn = sameFolded(toEn.text, text);

  if (toEs.confidence === 'passthrough' && toEn.confidence === 'passthrough') {
    return { en, es };
  }

  if (toEs.confidence === 'exact') {
    if (sameEs) es += 5;
    else en += 5;
  } else if (toEs.confidence === 'rewrite' && !sameEs) {
    en += 3;
  }

  if (toEn.confidence === 'exact') {
    if (sameEn) en += 5;
    else es += 5;
  } else if (toEn.confidence === 'rewrite' && !sameEn) {
    es += 3;
  }

  const tokens = fold(text).match(/[a-z]+/g) ?? [];
  for (const token of tokens) {
    if (EN_STOP.has(token)) en += 1;
    if (ES_STOP.has(token)) es += 1;
  }

  return { en, es };
}

/** Lightweight EN/ES detector for label canvas copy. No paid/local AI. */
export function detectLabelLanguageFromTexts(
  texts: string[],
  hint?: CanvasLabelLanguage | null,
): CanvasLabelLanguage | null {
  let en = 0;
  let es = 0;
  for (const raw of texts) {
    const text = raw.trim();
    if (!text) continue;
    const scored = scoreText(text);
    en += scored.en;
    es += scored.es;
  }
  if (en === 0 && es === 0) return hint ?? null;
  if (hint && Math.abs(en - es) <= 2) return hint;
  if (en === es) return hint ?? null;
  return en > es ? 'en' : 'es';
}

/** Detect EN/ES from serialized canvas text, using a stored stamp as a tie-breaker. */
export function detectCanvasLabelLanguage(
  canvasJson: string | null | undefined,
  hint?: CanvasLabelLanguage | null,
): CanvasLabelLanguage | null {
  const stamped = readCanvasLabelLanguage(canvasJson);
  const texts = canvasJson ? parseTextObjectsFromJson(canvasJson).map((entry) => entry.text) : [];
  return detectLabelLanguageFromTexts(texts, stamped ?? hint ?? null);
}
