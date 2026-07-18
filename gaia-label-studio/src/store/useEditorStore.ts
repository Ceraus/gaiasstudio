import { create } from 'zustand';

export interface LayerInfo {
  id: string;
  name: string;
  kind: string;
  type: string;
  visible: boolean;
  locked: boolean;
}

export interface SelectionInfo {
  count: number;
  isText: boolean;
  isImage: boolean;
  isGroup: boolean;
  isShape: boolean;
  type: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  blend: string;
  angle: number;
  cornerRadius: number;
  hasCornerRadius: boolean;
  // Precise, zero-math geometry shown to the user in INCHES.
  widthIn: number;
  heightIn: number;
  leftIn: number;
  topIn: number;
  lockAspect: boolean;
  // Text-only fields
  fontFamily: string;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textAlign: string;
  lineHeight: number;
  charSpacing: number;
  /** Curved-text amount: -100 (arch down) … 0 (straight) … 100 (arch up). */
  curve: number;
  fontLoading: boolean;
}

export type SaveState = 'idle' | 'saving' | 'saved';

interface EditorState {
  ready: boolean;
  layers: LayerInfo[];
  activeIds: string[];
  selection: SelectionInfo | null;
  canUndo: boolean;
  canRedo: boolean;
  saveState: SaveState;
  overlayVisible: boolean;
  guidesEnabled: boolean;
  cropMode: boolean;
  zoom: number;
  historyTick: number;
  set: (patch: Partial<EditorState>) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  ready: false,
  layers: [],
  activeIds: [],
  selection: null,
  canUndo: false,
  canRedo: false,
  saveState: 'idle',
  overlayVisible: true,
  guidesEnabled: true,
  cropMode: false,
  zoom: 1,
  historyTick: 0,
  set: (patch) => set(patch),
}));
