import type { TFunction } from 'i18next';
import { MODULAR_BENEFITS, type BenefitEntry } from '@/data/benefits';
import i18n from '@/i18n';

/** Stable i18n key slug for a benefit category label. */
export function benefitCategoryKey(category: string): string {
  return category
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function getBenefitLabel(b: BenefitEntry, t: TFunction): string {
  return t(`benefits.${b.id}`, b.label);
}

export function getBenefitCategoryLabel(category: string, t: TFunction): string {
  return t(`benefitCategories.${benefitCategoryKey(category)}`, category);
}

/** All known label variants (EN + ES + current locale) for matching stored values. */
export function allBenefitLabelVariants(b: BenefitEntry): string[] {
  const labels = new Set<string>([b.label]);
  for (const lng of ['en', 'es'] as const) {
    labels.add(i18n.getFixedT(lng)(`benefits.${b.id}`, b.label));
  }
  return [...labels];
}

export function isBenefitSelected(b: BenefitEntry, selected: string[]): boolean {
  const variants = new Set(allBenefitLabelVariants(b));
  return selected.some((s) => variants.has(s));
}

export function findBenefitByStoredLabel(stored: string): BenefitEntry | undefined {
  return MODULAR_BENEFITS.find((b) => allBenefitLabelVariants(b).includes(stored));
}

export function displayStoredBenefitLabel(stored: string, t: TFunction): string {
  const found = findBenefitByStoredLabel(stored);
  return found ? getBenefitLabel(found, t) : stored;
}
