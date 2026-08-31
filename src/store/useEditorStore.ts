import { create } from 'zustand';
import type { ImageAdjust } from '@/lib/fabric/editorController';
import type { EditorTool, PendingShapeKind, TextPlacementMode } from '@/lib/editorTools';

export interface HistoryStepInfo {
  index: number;
  label: string;
  current: boolean;
}

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
  isQr: boolean;
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
  /** Fabric fontWeight normalized for the toolbar dropdown. */
  fontWeight: string;
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
  /** Wave slider vs Avery circle-path. */
  curveMode: 'wave' | 'circle';
  circleSide: 'top' | 'bottom' | 'left' | 'right' | null;
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
  /** Avery square alignment grid over the trim area. */
  gridEnabled: boolean;
  /** Drag-only: active object reached the print-to-the-edge ring. */
  printGuideBleedHit: boolean;
  /** Drag-only: active object reached/left the safety ring. */
  printGuideSafeHit: boolean;
  legibilityOverlayVisible: boolean;
  /** Light dashed outline around text objects (View → Show Text Box Outlines). */
  textBoxOutlines: boolean;
  /** Editor V2 root is in Fullscreen API mode. */
  editorFullscreen: boolean;
  /** Native spellcheck on the Fabric text-editing textarea. */
  spellCheckEnabled: boolean;
  /** Physical inch rulers along the top and left canvas edges. */
  rulersVisible: boolean;
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
  /** Active Photoshop-style tool in the left strip. */
  activeTool: EditorTool;
  /** Standard vs curved when placing text with the Text tool. */
  textPlacementMode: TextPlacementMode;
  /** Shape kind to place on next canvas click (Shape tool). */
  pendingShape: PendingShapeKind;
  /** Spacebar-held temporary hand tool. */
  spacePanActive: boolean;
  /** Undo stack labels for the History panel (newest first). */
  historySteps: HistoryStepInfo[];
  set: (patch: Partial<EditorState>) => void;
  setActiveTool: (tool: EditorTool) => void;
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
  gridEnabled: true,
  printGuideBleedHit: false,
  printGuideSafeHit: false,
  legibilityOverlayVisible: true,
  textBoxOutlines: false,
  editorFullscreen: false,
  spellCheckEnabled: true,
  rulersVisible: false,
  cropMode: false,
  zoom: 1,
  fitRequest: 0,
  historyTick: 0,
  hasStyleCopied: false,
  hasClipboard: false,
  activeTool: 'move',
  textPlacementMode: 'standard',
  pendingShape: 'rect',
  spacePanActive: false,
  historySteps: [],
  set: (patch) => set(patch),
  setActiveTool: (tool) => set({ activeTool: tool }),
}));

export const EDITOR_MIN_ZOOM = 0.05;
/** High enough that a 1/4" sticker can Fit-fill a 4K editor well. */
export const EDITOR_MAX_ZOOM = 48;

export function clampEditorZoom(v: number) {
  return Math.max(EDITOR_MIN_ZOOM, Math.min(EDITOR_MAX_ZOOM, v));
}

/** Asks CanvasStage to re-fit the label to the visible canvas area. */
export function requestCanvasFit() {
  useEditorStore.setState((s) => ({ fitRequest: s.fitRequest + 1 }));
}
