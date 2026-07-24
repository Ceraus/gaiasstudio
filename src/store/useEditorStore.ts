import { create } from 'zustand';
import type { ImageAdjust } from '@/lib/fabric/editorController';

export interface LayerInfo {
  id: string;
  name: string;
  kind: string;
  type: string;
  visible: boolean;
  locked: boolean;
  isLegibilityOverlay?: boolean;
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
  linethrough: boolean;
  textAlign: string;
  textTransform: string;
  lineHeight: number;
  charSpacing: number;
  /** Curved-text amount: -100 (arch down) … 0 (straight) … 100 (arch up). */
  curve: number;
  fontLoading: boolean;
  /** Image-only: brightness / contrast / saturation amounts (-1…1). */
  adjust: ImageAdjust;
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

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
  legibilityOverlayVisible: boolean;
  /** Physical inch rulers along the top and left canvas edges. */
  rulersVisible: boolean;
  /** Properties/Layers panel docked to the right edge vs. a movable window. */
  panelFloating: boolean;
  cropMode: boolean;
  zoom: number;
  /**
   * Bumped by any control that wants the canvas re-fitted to its container.
   * CanvasStage owns the actual measurement, so this keeps the zoom buttons in
   * the toolbar, the left rail and the keyboard shortcut all doing one thing.
   */
  fitRequest: number;
  historyTick: number;
  /** True while a style has been copied with Ctrl+Shift+C / Copy style button. */
  hasStyleCopied: boolean;
  /** True once objects have been copied with Ctrl/Cmd+C (enables Paste). */
  hasClipboard: boolean;
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
  legibilityOverlayVisible: true,
  rulersVisible: false,
  panelFloating: false,
  cropMode: false,
  zoom: 1,
  fitRequest: 0,
  historyTick: 0,
  hasStyleCopied: false,
  hasClipboard: false,
  set: (patch) => set(patch),
}));

/** Asks CanvasStage to re-fit the label to the visible canvas area. */
export function requestCanvasFit() {
  useEditorStore.setState((s) => ({ fitRequest: s.fitRequest + 1 }));
}
