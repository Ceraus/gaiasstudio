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
    try {
      const assets = await assetsRepo.all();
      set({ assets, loaded: true });
    } catch (err) {
      console.error('[gaia] library.load failed', err);
      set({ loaded: true });
    }
  },
  addFromDataUrl: async (rawDataUrl, kind, name, fileSize) => {
    try {
      const dataUrl = await normalizeImage(rawDataUrl);
      const { width, height } = await imageSize(dataUrl);
      const rec = await assetsRepo.create({ name, kind, dataUrl, width, height, fileSize });
      set({ assets: [rec, ...get().assets] });
      return rec;
    } catch (err) {
      console.error('[gaia] library.addFromDataUrl failed', err);
      throw err;
    }
  },
  remove: async (id) => {
    try {
      await assetsRepo.remove(id);
      set({ assets: get().assets.filter((a) => a.id !== id) });
    } catch (err) {
      console.error('[gaia] library.remove failed', err);
    }
  },
  bulkRemove: async (ids) => {
    try {
      await assetsRepo.bulkRemove(ids);
      const idSet = new Set(ids);
      set({ assets: get().assets.filter((a) => !idSet.has(a.id)) });
    } catch (err) {
      console.error('[gaia] library.bulkRemove failed', err);
    }
  },
  archive: async (id) => {
    try {
      await assetsRepo.archive(id);
      set({ assets: get().assets.map((a) => a.id === id ? { ...a, archived: true } : a) });
    } catch (err) {
      console.error('[gaia] library.archive failed', err);
    }
  },
  unarchive: async (id) => {
    try {
      await assetsRepo.unarchive(id);
      set({ assets: get().assets.map((a) => a.id === id ? { ...a, archived: false } : a) });
    } catch (err) {
      console.error('[gaia] library.unarchive failed', err);
    }
  },
}));
