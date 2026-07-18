import { create } from 'zustand';
import type { AssetRecord } from '@/types';
import { assetsRepo } from '@/db/repositories';
import { imageSize, normalizeImage } from '@/lib/files';

interface LibraryState {
  assets: AssetRecord[];
  loaded: boolean;
  load: () => Promise<void>;
  addFromDataUrl: (
    rawDataUrl: string,
    kind: AssetRecord['kind'],
    name: string,
  ) => Promise<AssetRecord>;
  remove: (id: string) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  assets: [],
  loaded: false,
  load: async () => {
    const assets = await assetsRepo.all();
    set({ assets, loaded: true });
  },
  addFromDataUrl: async (rawDataUrl, kind, name) => {
    const dataUrl = await normalizeImage(rawDataUrl);
    const { width, height } = await imageSize(dataUrl);
    const rec = await assetsRepo.create({ name, kind, dataUrl, width, height });
    set({ assets: [rec, ...get().assets] });
    return rec;
  },
  remove: async (id) => {
    await assetsRepo.remove(id);
    set({ assets: get().assets.filter((a) => a.id !== id) });
  },
}));
