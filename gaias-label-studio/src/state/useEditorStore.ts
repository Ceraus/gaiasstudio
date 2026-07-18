import { create } from "zustand";

export type SaveStatus = "idle" | "saving" | "saved";

interface EditorState {
  history: string[];
  historyIndex: number;
  showBleed: boolean;
  saveStatus: SaveStatus;
  toolboxPos: { x: number; y: number };
  selectedObjectId: string | null;
  pendingAssetDataUrl: string | null;
  setPendingAsset: (dataUrl: string | null) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: (json: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  resetHistory: (json?: string) => void;
  toggleBleed: () => void;
  setSaveStatus: (s: SaveStatus) => void;
  setToolboxPos: (pos: { x: number; y: number }) => void;
  setSelectedObjectId: (id: string | null) => void;
}

const MAX_HISTORY = 100;

export const useEditorStore = create<EditorState>((set, get) => ({
  history: [],
  historyIndex: -1,
  showBleed: true,
  saveStatus: "idle",
  toolboxPos: { x: 24, y: 96 },
  selectedObjectId: null,
  pendingAssetDataUrl: null,
  setPendingAsset: (pendingAssetDataUrl) => set({ pendingAssetDataUrl }),
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
  pushHistory: (json) =>
    set((state) => {
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, json].slice(-MAX_HISTORY);
      return { history: next, historyIndex: next.length - 1 };
    }),
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return null;
    const newIndex = historyIndex - 1;
    set({ historyIndex: newIndex });
    return history[newIndex];
  },
  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return null;
    const newIndex = historyIndex + 1;
    set({ historyIndex: newIndex });
    return history[newIndex];
  },
  resetHistory: (json) => set({ history: json ? [json] : [], historyIndex: json ? 0 : -1 }),
  toggleBleed: () => set((state) => ({ showBleed: !state.showBleed })),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setToolboxPos: (toolboxPos) => set({ toolboxPos }),
  setSelectedObjectId: (selectedObjectId) => set({ selectedObjectId }),
}));
