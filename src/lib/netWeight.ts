import { OZ_TO_GRAMS } from '@/lib/inventoryMath';

const G_TO_OZ = 1 / OZ_TO_GRAMS;

export interface ParsedNetWeight {
  grams: number;
  ounces: number;
}

/** Read grams and ounces from a free-text weight (`100g`, `3.5 oz`, `3.5 oz (100 g)`). */
export function parseNetWeight(raw?: string | null): ParsedNetWeight | null {
  const value = raw?.trim();
  if (!value) return null;

  const gramsMatch = value.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  const ouncesMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:fl\.?\s*)?oz\b/i);

  if (gramsMatch) {
    const grams = parseFloat(gramsMatch[1]);
    if (!Number.isFinite(grams) || grams <= 0) return null;
    return { grams, ounces: grams * G_TO_OZ };
  }

  if (ouncesMatch) {
    const ounces = parseFloat(ouncesMatch[1]);
    if (!Number.isFinite(ounces) || ounces <= 0) return null;
    return { grams: ounces * OZ_TO_GRAMS, ounces };
  }

  return null;
}

function formatGrams(grams: number): string {
  const rounded = Math.round(grams * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatOunces(ounces: number): string {
  const rounded = Math.round(ounces * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/** `3.53 oz (100 g)` — US dual declaration without a prefix. */
export function formatNetWeightAmount(raw?: string | null, fallback = '100g'): string {
  const parsed = parseNetWeight(raw) ?? parseNetWeight(fallback);
  if (!parsed) return (raw?.trim() || fallback).trim();
  return `${formatOunces(parsed.ounces)} oz (${formatGrams(parsed.grams)} g)`;
}

/** `Net Wt 3.53 oz (100 g)` — FDA-style line for labels and previews. */
export function formatNetWeightLine(
  raw?: string | null,
  prefix = 'Net Wt',
  fallback?: string,
): string {
  const amount = fallback === undefined
    ? (parseNetWeight(raw) ? formatNetWeightAmount(raw, '') : raw?.trim() || '')
    : formatNetWeightAmount(raw, fallback);
  if (!amount) return '';
  return `${prefix} ${amount}`;
}
