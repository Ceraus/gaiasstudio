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
    fileSize?: number,
  ) => Promise<AssetRecord>;
  remove: (id: string) => Promise<void>;
  bulkRemove: (ids: string[]) => Promise<void>;
  archive: (id: string) => Promise<void>;
  unarchive: (id: string) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  assets: [],
  loaded: false,
  load: async () => {
    const assets = await assetsRepo.all();
    set({ assets, loaded: true });
  },
  addFromDataUrl: async (rawDataUrl, kind, name, fileSize) => {
    const dataUrl = await normalizeImage(rawDataUrl);
    const { width, height } = await imageSize(dataUrl);
    const rec = await assetsRepo.create({ name, kind, dataUrl, width, height, fileSize });
    set({ assets: [rec, ...get().assets] });
    return rec;
  },
  remove: async (id) => {
    await assetsRepo.remove(id);
    set({ assets: get().assets.filter((a) => a.id !== id) });
  },
  bulkRemove: async (ids) => {
    await assetsRepo.bulkRemove(ids);
    const idSet = new Set(ids);
    set({ assets: get().assets.filter((a) => !idSet.has(a.id)) });
  },
  archive: async (id) => {
    await assetsRepo.archive(id);
    set({ assets: get().assets.map((a) => a.id === id ? { ...a, archived: true } : a) });
  },
  unarchive: async (id) => {
    await assetsRepo.unarchive(id);
    set({ assets: get().assets.map((a) => a.id === id ? { ...a, archived: false } : a) });
  },
}));
