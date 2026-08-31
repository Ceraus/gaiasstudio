import type { AssetRecord } from '@/types';

/** Gemini harvest / Electron auto-import — the only AI files that belong in photo libraries. */
export function isGeminiLibraryAsset(
  asset: Pick<AssetRecord, 'name' | 'kind'>,
): boolean {
  return asset.kind === 'ai' && /^gemini[-_\s]/i.test(asset.name.trim());
}

/** Comfy-generated ingredient icons — keep them off photo/background libraries. */
export function isGeneratedIngredientIcon(
  asset: Pick<AssetRecord, 'name' | 'kind' | 'width' | 'height'>,
): boolean {
  if (asset.kind === 'icon') return true;
  const name = asset.name.trim();
  if (/^AI[:\s]/i.test(name) || /^gaias_ingredient/i.test(name)) return true;
  return asset.kind === 'ai'
    && asset.width <= 256
    && asset.height <= 256
    && asset.width === asset.height;
}

export function isLibraryDisplayAsset(asset: AssetRecord): boolean {
  if (asset.kind === 'icon') return false;
  if (asset.kind === 'ai') return isGeminiLibraryAsset(asset);
  return !isGeneratedIngredientIcon(asset);
}
