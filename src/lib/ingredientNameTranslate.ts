import { getIngredientBilingualNames, namesAreDistinct } from '@/lib/ingredientI18n';
import { translateTextsWithGoogle } from '@/lib/googleTranslate';
import { translateIngredientNameWithOllama, type LocalAiSettingsSlice } from '@/lib/localAi';
import {
  translateLabelTextOffline,
  type BilingualPair,
} from '@/lib/offlineLabelTranslate';
import { preserveTranslationCase } from '@/lib/preserveTranslationCase';

export type IngredientNameTranslateSource = 'stored' | 'glossary' | 'google' | 'ollama';

export interface IngredientSpanishNameResult {
  text?: string;
  source?: IngredientNameTranslateSource;
}

const BACKFILL_BATCH = 6;
const attemptedBackfillIds = new Set<string>();

/** True when `es` is a real Spanish common name, not EN / INCI repeated. */
export function isRealSpanishIngredientName(
  es: string | undefined,
  en: string,
  inci?: string,
): boolean {
  const trimmed = es?.trim() ?? '';
  if (!trimmed) return false;
  if (!namesAreDistinct(trimmed, en)) return false;
  if (inci?.trim() && !namesAreDistinct(trimmed, inci)) return false;
  return true;
}

export function ingredientNeedsSpanishName(ing: {
  name: string;
  nameEs?: string;
  inci?: string;
}): boolean {
  return !isRealSpanishIngredientName(ing.nameEs, ing.name, ing.inci);
}

export function ingredientNeedsSpanishBackfill(ing: {
  id: string;
  name: string;
  nameEs?: string;
  inci?: string;
}): boolean {
  if (attemptedBackfillIds.has(ing.id)) return false;
  return ingredientNeedsSpanishName(ing);
}

export function markIngredientSpanishBackfillAttempted(id: string): void {
  attemptedBackfillIds.add(id);
}

export function clearIngredientSpanishBackfillAttempts(): void {
  attemptedBackfillIds.clear();
}

/** i18n / label glossary only — no network. */
export function lookupGlossarySpanishName(englishName: string, pairs?: BilingualPair[]): string | undefined {
  const en = englishName.trim();
  if (!en) return undefined;

  const bilingual = getIngredientBilingualNames({ name: en });
  if (isRealSpanishIngredientName(bilingual.es, bilingual.en)) {
    return preserveTranslationCase(bilingual.es, en, 'es');
  }

  const offline = translateLabelTextOffline(en, 'es', pairs ?? []);
  if (offline.confidence === 'exact' && isRealSpanishIngredientName(offline.text, en)) {
    return offline.text;
  }
  return undefined;
}

/** Keep a stored distinct ES name, otherwise the glossary hit. Sync only. */
export function applyGlossarySpanishName(input: {
  name: string;
  nameEs?: string;
  inci?: string;
}): string | undefined {
  if (isRealSpanishIngredientName(input.nameEs, input.name, input.inci)) {
    return input.nameEs!.trim();
  }
  return lookupGlossarySpanishName(input.name);
}

function applyTranslatedCase(translated: string, source: string): string {
  return preserveTranslationCase(translated.trim(), source, 'es');
}

export async function resolveIngredientSpanishName(
  englishName: string,
  settings: LocalAiSettingsSlice,
  options?: { nameEs?: string; inci?: string; pairs?: BilingualPair[] },
): Promise<IngredientSpanishNameResult> {
  const en = englishName.trim();
  if (!en) return {};

  if (isRealSpanishIngredientName(options?.nameEs, en, options?.inci)) {
    return { text: options!.nameEs!.trim(), source: 'stored' };
  }

  const glossary = lookupGlossarySpanishName(en, options?.pairs);
  if (glossary) return { text: glossary, source: 'glossary' };

  const google = await translateTextsWithGoogle([en], 'en', 'es', {
    apiKey: settings.googleTranslateApiKey,
  });
  const googleText = google.ok ? google.texts?.[0]?.trim() : '';
  if (googleText) {
    return { text: applyTranslatedCase(googleText, en), source: 'google' };
  }

  const ollama = await translateIngredientNameWithOllama(en, settings);
  if (ollama.ok && ollama.text?.trim()) {
    return { text: applyTranslatedCase(ollama.text, en), source: 'ollama' };
  }

  return {};
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** Non-blocking one-shot fill for library rows whose ES is empty or identical to EN. */
export async function backfillMissingIngredientSpanishNames(
  items: Array<{ id: string; name: string; nameEs?: string; inci?: string }>,
  settings: LocalAiSettingsSlice,
  persist: (id: string, nameEs: string) => Promise<void>,
  onProgress?: (id: string, nameEs: string) => void,
): Promise<number> {
  const pending = items.filter(ingredientNeedsSpanishBackfill);
  let filled = 0;

  const needNetwork: typeof pending = [];
  for (const ing of pending) {
    markIngredientSpanishBackfillAttempted(ing.id);
    if (isRealSpanishIngredientName(ing.nameEs, ing.name, ing.inci)) continue;
    const glossary = lookupGlossarySpanishName(ing.name);
    if (glossary) {
      await persist(ing.id, glossary);
      onProgress?.(ing.id, glossary);
      filled += 1;
      await yieldToUi();
    } else {
      needNetwork.push(ing);
    }
  }

  for (let start = 0; start < needNetwork.length; start += BACKFILL_BATCH) {
    const batch = needNetwork.slice(start, start + BACKFILL_BATCH);
    const google = await translateTextsWithGoogle(
      batch.map((row) => row.name),
      'en',
      'es',
      { apiKey: settings.googleTranslateApiKey },
    );

    for (let i = 0; i < batch.length; i++) {
      const ing = batch[i];
      const googleText = google.ok ? google.texts?.[i]?.trim() : '';
      if (googleText) {
        const text = applyTranslatedCase(googleText, ing.name);
        await persist(ing.id, text);
        onProgress?.(ing.id, text);
        filled += 1;
        continue;
      }
      const ollama = await translateIngredientNameWithOllama(ing.name, settings);
      if (ollama.ok && ollama.text?.trim()) {
        const text = applyTranslatedCase(ollama.text, ing.name);
        await persist(ing.id, text);
        onProgress?.(ing.id, text);
        filled += 1;
      }
    }
    await yieldToUi();
  }

  return filled;
}
