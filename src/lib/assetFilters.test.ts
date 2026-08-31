import { describe, expect, it } from 'vitest';
import { isGeneratedIngredientIcon, isGeminiLibraryAsset, isLibraryDisplayAsset } from './assetFilters';
import type { AssetRecord } from '@/types';

function asset(partial: Partial<AssetRecord>): AssetRecord {
  return {
    id: '1',
    name: 'Photo',
    kind: 'photo',
    dataUrl: 'data:image/png;base64,xx',
    width: 800,
    height: 600,
    createdAt: 1,
    ...partial,
  };
}

describe('library AI allowlist', () => {
  it('shows only Gemini-named AI assets', () => {
    expect(isGeminiLibraryAsset(asset({ name: 'gemini-123.png', kind: 'ai' }))).toBe(true);
    expect(isGeminiLibraryAsset(asset({ name: 'gemini-1710000-image.png', kind: 'ai' }))).toBe(true);
    expect(isGeminiLibraryAsset(asset({ name: 'AI Mango', kind: 'ai' }))).toBe(false);
    expect(isLibraryDisplayAsset(asset({ name: 'gemini-123.png', kind: 'ai', width: 1024, height: 768 }))).toBe(true);
    expect(isLibraryDisplayAsset(asset({ name: 'random-ai.png', kind: 'ai', width: 1024, height: 768 }))).toBe(false);
    expect(isLibraryDisplayAsset(asset({ name: 'AI Watermelon', kind: 'ai', width: 128, height: 128 }))).toBe(false);
    expect(isGeneratedIngredientIcon(asset({ name: 'AI: Mango', kind: 'icon', width: 128, height: 128 }))).toBe(true);
  });
});
