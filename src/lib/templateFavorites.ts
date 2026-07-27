import type { AppSettings, AveryTemplate } from '@/types';

/** Soft target for Rosa's everyday roster — not a hard cap. */
export const RECOMMENDED_FAVORITE_COUNT = 10;
export const MAX_FAVORITES = 24;

/** Quick-add chips in first-run setup (soap / beauty makers). */
export const SUGGESTED_FAVORITE_IDS = [
  'round-2',
  'round-1-5',
  'round-3',
  '22807',
  '8293',
  '5160',
  '6871',
  '22806',
  '5395',
  'ribbon-9x1-2',
] as const;

export function isFavoritesConfigured(settings: AppSettings): boolean {
  return settings.templateFavoritesConfigured === true;
}

export function getFavoriteIds(settings: AppSettings): string[] {
  return settings.favoriteTemplateIds ?? [];
}

export function resolveFavoriteTemplates(
  all: AveryTemplate[],
  settings: AppSettings,
): AveryTemplate[] {
  const ids = new Set(getFavoriteIds(settings));
  const byId = new Map(all.map((t) => [t.id, t]));
  const usage = settings.templateUsageCounts ?? {};
  return [...ids]
    .map((id) => byId.get(id))
    .filter((t): t is AveryTemplate => !!t)
    .sort((a, b) => {
      const du = (usage[b.id] ?? 0) - (usage[a.id] ?? 0);
      if (du !== 0) return du;
      return a.name.localeCompare(b.name);
    });
}

export function bumpTemplateUsage(
  templateId: string,
  settings: AppSettings,
): Partial<AppSettings> {
  const prev = settings.templateUsageCounts ?? {};
  return {
    templateUsageCounts: {
      ...prev,
      [templateId]: (prev[templateId] ?? 0) + 1,
    },
  };
}

export function toggleFavoriteId(
  settings: AppSettings,
  templateId: string,
): Partial<AppSettings> {
  const current = getFavoriteIds(settings);
  const has = current.includes(templateId);
  if (has) {
    return { favoriteTemplateIds: current.filter((id) => id !== templateId) };
  }
  if (current.length >= MAX_FAVORITES) return {};
  return { favoriteTemplateIds: [...current, templateId] };
}

const TEMPLATE_PICKER_VIEW_KEY = 'gaia:templatePickerView';

/** Open template picker in catalog mode after navigating from Settings. */
export function queueTemplatePickerCatalogView(): void {
  try {
    sessionStorage.setItem(TEMPLATE_PICKER_VIEW_KEY, 'catalog');
  } catch {
    /* private browsing */
  }
}

export function consumeTemplatePickerView(): 'mine' | 'catalog' | null {
  try {
    const v = sessionStorage.getItem(TEMPLATE_PICKER_VIEW_KEY);
    sessionStorage.removeItem(TEMPLATE_PICKER_VIEW_KEY);
    if (v === 'catalog' || v === 'mine') return v;
  } catch {
    /* ignore */
  }
  return null;
}
