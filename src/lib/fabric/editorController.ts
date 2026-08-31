import * as fabric from 'fabric';
import type { AppSettings, AveryTemplate, LabelContext } from '@/types';
import { EDITOR_PPI, EXPORT_PPI, ptToPx } from '@/lib/units';
import { DEFAULT_FONT } from '@/data/googleFonts';
import { loadFont } from '@/lib/fontManager';
import { versionsRepo, draftsRepo, recipesRepo, ingredientsRepo } from '@/db/repositories';
import { useEditorStore, type LayerInfo, type SelectionInfo, type SaveState } from '@/store/useEditorStore';
import { useAppStore } from '@/store/useAppStore';
import type { EditorTool, PendingShapeKind } from '@/lib/editorTools';
import { configureFabricOnce, CUSTOM_PROPS } from './fabricConfig';
import {
  applyCurveToText,
  isCurvedTextGroup,
  type CircleSide,
  type CurveApplyOptions,
  type CurveMode,
} from './curveText';
import {
  applyCircleDiscInteractivity,
  CIRCLE_INNER_DISC_RATIO,
  CIRCLE_LEGIBILITY_OPACITY,
  CIRCLE_SAGE_BASE,
} from '@/lib/circleLabelTemplate';
import { ALIGNMENT_GRID_PX, drawBleedOverlay, EDITOR_WORKSPACE_BG, type OverlayConfig } from './overlay';
import { guideHitsFromBBox, printGuideLayoutPx, resolvePrintGuides } from '@/lib/printGuides';
import {
  computeResizeGuides,
  computeSnapGuides,
  drawGuides,
  type Guide,
  type TrimBox,
} from './snapping';
import { uid } from '@/lib/id';
import { normalizeQrFields, type QrFields } from '@/lib/qrPayload';

export { applyCurveToText, buildCurvePath, splitCurveLines } from './curveText';

type Gaia = fabric.FabricObject & {
  id?: string;
  name?: string;
  gaiaKind?: string;
  locked?: boolean;
  gaiaCurve?: number;
  /** Box width before curving, so slider 0 can wrap again. */
  gaiaCurveWrapWidth?: number;
  gaiaCurveSourceText?: string;
  gaiaCurveLines?: string[];
  gaiaCurveCharSpacing?: number;
  gaiaCurveMode?: CurveMode;
  gaiaCircleSide?: CircleSide;
  gaiaCircleDiameter?: number;
  gaiaCircleLabelW?: number;
  gaiaCircleLabelH?: number;
  gaiaCircleSafePx?: number;
  gaiaLockAspect?: boolean;
  isLegibilityOverlay?: boolean;
  gaiaAdjust?: ImageAdjust;
  /** True on the empty "Background" slot rect (swapped for a real image later). */
  gaiaPlaceholder?: boolean;
  /** Combined QR builder fields so editing reloads every section. */
  gaiaQrFields?: QrFields;
  /** Encoded URL / vCard / labeled-text payload baked into the QR image. */
  gaiaQrPayload?: string;
};

/**
 * Structural layer kinds created by the strict 4-layer context initialization.
 * These survive auto-layouts (only foreground content is regenerated) and are
 * excluded from safe-zone fit checks.
 */
export const STRUCTURAL_KINDS = ['background', 'overlay'] as const;

/** Non-destructive image adjustments. All amounts are Fabric's -1…1 range. */
export interface ImageAdjust {
  brightness: number;
  contrast: number;
  saturation: number;
  /** Optional hex tint applied with Fabric BlendColor. */
  tint?: string;
}

export const NEUTRAL_ADJUST: ImageAdjust = { brightness: 0, contrast: 0, saturation: 0 };

export type AddImageKind = 'photo' | 'logo' | 'ai' | 'stock' | 'background' | 'image' | 'qr';

export interface InitOptions {
  el: HTMLCanvasElement;
  template: AveryTemplate;
  context: LabelContext;
  settings: AppSettings;
  designId: string;
  initialJson?: string | null;
}

const SHAPE_TYPES = ['rect', 'circle', 'ellipse', 'triangle', 'line', 'polygon', 'path'];

class EditorController {
  canvas: fabric.Canvas | null = null;
  template: AveryTemplate | null = null;
  context: LabelContext = 'front';
  settings: AppSettings | null = null;
  designId = '';

  bleedPx = 0;
  safePx = 0;
  labelWpx = 0;
  labelHpx = 0;
  trim: TrimBox = { left: 0, top: 0, right: 0, bottom: 0, cx: 0, cy: 0 };

  private overlayVisible = true;
  private guidesEnabled = true;
  private gridEnabled = true;
  private textBoxOutlines = false;
  private spellCheckEnabled = true;
  private legibilityOverlayVisible = true;
  private activeGuides: Guide[] = [];
  private printGuideHits = { bleed: false, safety: false };
  private isRestoring = false;

  private history: string[] = [];
  private historyLabels: string[] = [];
  private historyIndex = -1;
  private pendingHistoryLabel = 'Edit';
  private historyTimer: ReturnType<typeof setTimeout> | null = null;
  private selectionSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private structuralChangeQueued = false;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private initToken = 0;

  private cropRect: Gaia | null = null;
  private cropTarget: fabric.FabricImage | null = null;

  private adjustFrame: number | null = null;
  private pendingAdjust: (fabric.FabricImage & Gaia)[] = [];
  private layerPulse: { obj: Gaia; started: number; raf: number } | null = null;
  private static readonly LAYER_PULSE_MS = 1100;

  /** Objects copied with Ctrl/Cmd+C, serialized so paste survives deletion. */
  private clipboard: Record<string, unknown>[] = [];

  // -- lifecycle ------------------------------------------------------------

  async init(opts: InitOptions) {
    configureFabricOnce();
    this.dispose();
    const token = this.initToken;

    this.template = opts.template;
    this.context = opts.context;
    this.settings = opts.settings;
    this.designId = opts.designId;

    const printGuides = resolvePrintGuides(opts.template);
    this.bleedPx = printGuides.bleedIn * EDITOR_PPI;
    this.safePx = printGuides.safeIn * EDITOR_PPI;
    this.labelWpx = opts.template.labelWidthIn * EDITOR_PPI;
    this.labelHpx = opts.template.labelHeightIn * EDITOR_PPI;

    const w = this.labelWpx + this.bleedPx * 2;
    const h = this.labelHpx + this.bleedPx * 2;
    this.trim = {
      left: this.bleedPx,
      top: this.bleedPx,
      right: this.bleedPx + this.labelWpx,
      bottom: this.bleedPx + this.labelHpx,
      cx: w / 2,
      cy: h / 2,
    };

    // Fabric reads devicePixelRatio from its global config before each canvas
    // init. Start at the zoom-1 floor; applyDisplayScale() raises it with view
    // zoom so CSS `transform: scale(zoom)` never upscales a soft bitmap.
    this.applyDisplayScale(useEditorStore.getState().zoom);

    const canvas = new fabric.Canvas(opts.el, {
      width: w,
      height: h,
      backgroundColor: EDITOR_WORKSPACE_BG,
      preserveObjectStacking: true,
      enableRetinaScaling: true,
      controlsAboveOverlay: true,
      selectionColor: 'rgba(124,58,237,0.12)',
      selectionBorderColor: '#7c3aed',
      selectionLineWidth: 1,
    });
    this.canvas = canvas;

    this.attachEvents();

    const store = useEditorStore.getState();
    this.textBoxOutlines = store.textBoxOutlines;
    this.spellCheckEnabled = store.spellCheckEnabled;
    store.set({
      ready: false,
      overlayVisible: this.overlayVisible,
      guidesEnabled: this.guidesEnabled,
      gridEnabled: this.gridEnabled,
      printGuideBleedHit: false,
      printGuideSafeHit: false,
      legibilityOverlayVisible: this.legibilityOverlayVisible,
      zoom: 1,
      cropMode: false,
      saveState: 'idle',
    });

    if (opts.initialJson) {
      await this.load(opts.initialJson);
      if (token !== this.initToken || !this.canvas) return; // a newer init/dispose superseded us
      // Background chosen on the workflow step must apply even when a saved design exists.
      // Keep the URL so Choose Background stays complete in the stepper.
      const { backgroundImageUrl: bgAfterLoad } = useAppStore.getState();
      if (bgAfterLoad) {
        await this.setBackgroundFromUrl(bgAfterLoad);
        if (token !== this.initToken || !this.canvas) return;
      }
    } else {
      this.addDefaultLayers();
      // Inject background image chosen in the workflow Background step (fresh designs only).
      const { backgroundImageUrl } = useAppStore.getState();
      if (backgroundImageUrl) {
        await this.setBackgroundFromUrl(backgroundImageUrl);
        if (token !== this.initToken || !this.canvas) return;
      }
      // Circle labels always get the Avery stack (curved name, copy block, disc).
      // Other shapes still wait for a recipe. Snapshot as Initial after this.
      const isRound = opts.template.shape === 'circle' || opts.template.shape === 'oval';
      if (isRound || useAppStore.getState().activeRecipeId) {
        this.isRestoring = true;
        try {
          await this.applyAutoLayout(opts.context);
        } catch (err) {
          console.error('applyAutoLayout failed', err);
        } finally {
          this.isRestoring = false;
        }
        if (token !== this.initToken || !this.canvas) return;
      }
    }

    this.stripBaseLayers();
    // Circle discs used to be structural (locked, hidden from Layers). Promote
    // them to a normal shape layer so they show up and can be moved / restyled.
    this.promoteCircleLegibilityDisc();

    // Sync legibility overlay visibility from canvas state (handles restored designs too).
    const legObj = this.canvas?.getObjects().find((o) => (o as Gaia).isLegibilityOverlay);
    this.legibilityOverlayVisible = legObj ? legObj.visible !== false : true;
    useEditorStore.getState().set({ legibilityOverlayVisible: this.legibilityOverlayVisible });

    this.history = [this.serialize()];
    this.historyLabels = ['Initial State'];
    this.historyIndex = 0;
    this.updateHistoryFlags();
    this.refreshLayers();
    useEditorStore.getState().set({
      ready: true,
      legibilityOverlayVisible: this.legibilityOverlayVisible,
    });
    canvas.requestRenderAll();
  }

  /**
   * Backing-store pixels per CSS canvas pixel. Kept ≥ 3 at 100% so 1× Windows
   * scaling still looks crisp; multiplied by view zoom (capped) so a high Fit
   * on a tiny sticker stays retina-sharp. toDataURL defaults
   * enableRetinaScaling=false, so export size is unchanged.
   */
  applyDisplayScale(zoom: number) {
    if (typeof window === 'undefined') return;
    const baseDpr = Math.max(3, Math.round(window.devicePixelRatio ?? 1));
    const dpr = Math.min(16, baseDpr * Math.max(1, zoom));
    if (Math.abs((fabric.config.devicePixelRatio ?? 0) - dpr) < 0.01 && this.canvas) return;
    fabric.config.configure({ devicePixelRatio: dpr });
    if (!this.canvas) return;
    const w = this.canvas.getWidth();
    const h = this.canvas.getHeight();
    this.canvas.setDimensions({ width: w, height: h });
    this.canvas.getObjects().forEach((obj) => obj.set('dirty', true));
    this.canvas.requestRenderAll();
  }

  dispose() {
    this.initToken++;
    if (this.historyTimer) clearTimeout(this.historyTimer);
    if (this.selectionSyncTimer) clearTimeout(this.selectionSyncTimer);
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    if (this.adjustFrame !== null) cancelAnimationFrame(this.adjustFrame);
    if (this.layerPulse?.raf) cancelAnimationFrame(this.layerPulse.raf);
    this.layerPulse = null;
    this.historyTimer = null;
    this.selectionSyncTimer = null;
    this.structuralChangeQueued = false;
    this.autosaveTimer = null;
    this.adjustFrame = null;
    this.pendingAdjust = [];
    if (typeof window !== 'undefined') {
      const dpr = Math.max(3, Math.round(window.devicePixelRatio ?? 1));
      fabric.config.configure({ devicePixelRatio: dpr });
    }
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
    }
    this.history = [];
    this.historyLabels = [];
    this.historyIndex = -1;
    this.activeGuides = [];
    this.printGuideHits = { bleed: false, safety: false };
    useEditorStore.getState().set({ printGuideBleedHit: false, printGuideSafeHit: false });
    this.cropRect = null;
    this.cropTarget = null;
  }

  /** Fabric props that make a structural layer immovable until unlocked. */
  private static readonly LOCKED_PROPS = {
    selectable: false,
    evented: false,
    lockMovementX: true,
    lockMovementY: true,
    lockRotation: true,
    lockScalingX: true,
    lockScalingY: true,
    hasControls: false,
  } as const;

  /**
   * Builds the Legibility Overlay: a semi-transparent white vector shape that
   * MATCHES the template shape (circle/oval → ellipse, rounded sticker →
   * rounded rect, otherwise rect) at 15% opacity. It sits between the
   * background and the foreground text so type stays readable over busy
   * AI-generated art.
   */
  private buildLegibilityShape(): fabric.FabricObject & Gaia {
    
    const common = {
      left: this.trim.left,
      top: this.trim.top,
      originX: 'left' as const,
      originY: 'top' as const,
      fill: '#ffffff',
      opacity: 0 /* user requested removal */,
      stroke: '',
      strokeWidth: 0,
      ...EditorController.LOCKED_PROPS,
    };
    const shape = this.template?.shape;
    if (shape === 'circle' || shape === 'oval') {
      const r = this.labelWpx * CIRCLE_INNER_DISC_RATIO;
      return new fabric.Circle({
        left: this.trim.cx,
        top: this.trim.cy,
        originX: 'center',
        originY: 'center',
        radius: r,
        fill: '#ffffff',
        opacity: CIRCLE_LEGIBILITY_OPACITY,
        stroke: '',
        strokeWidth: 0,
        selectable: true,
        evented: true,
        hasControls: true,
      }) as fabric.Circle & Gaia;
    }
    const radius =
      shape === 'rounded-rectangle' ? (this.template?.cornerRadiusIn || 0.1) * EDITOR_PPI : 0;
    return new fabric.Rect({
      ...common,
      width: this.labelWpx,
      height: this.labelHpx,
      rx: radius,
      ry: radius,
    }) as fabric.Rect & Gaia;
  }

  /**
   * Populates a blank canvas:
   *   1 (bottom) Background — chosen photo, or a sage/white plate until one arrives.
   *   2          Legibility Overlay — inner white disc / template-shaped vector.
   *   3 (top)    Foreground — text (and later the transparent logo).
   */
  private addDefaultLayers() {
    if (!this.canvas) return;
    this.isRestoring = true;
    try {
      const isRound = this.template?.shape === 'circle' || this.template?.shape === 'oval';
      const bgFill = isRound ? CIRCLE_SAGE_BASE : '#ffffff';
      const bgSlot = new fabric.Rect({
        left: this.trim.left,
        top: this.trim.top,
        width: this.labelWpx,
        height: this.labelHpx,
        fill: bgFill,
        stroke: '',
        strokeWidth: 0,
        originX: 'left',
        originY: 'top',
        ...EditorController.LOCKED_PROPS,
      }) as fabric.Rect & Gaia;
      bgSlot.id = uid();
      bgSlot.gaiaKind = 'background';
      bgSlot.name = 'Background';
      bgSlot.locked = true;
      bgSlot.gaiaPlaceholder = true;
      this.canvas.add(bgSlot);

      // Layer 3 — Legibility Overlay: template-shaped vector at 15% opacity.
      const overlay = this.buildLegibilityShape();
      overlay.id = uid();
      overlay.gaiaKind = 'overlay';
      overlay.name = 'Legibility Overlay';
      overlay.isLegibilityOverlay = true;
      if (isRound) {
        applyCircleDiscInteractivity(overlay, false);
      } else {
        overlay.locked = true;
      }
      this.canvas.add(overlay);

      // Layer 4 — Foreground stub for rectangles. Circles get the full copy
      // stack from applyAutoLayout() (product name + ingredients block, etc.).
      if (!isRound) {
        const textObj = new fabric.Textbox('Your product name here', {
          width: this.labelWpx * 0.82,
          fontFamily: DEFAULT_FONT,
          fontSize: ptToPx(18),
          fill: '#2b2b2b',
          textAlign: 'center',
          originX: 'center',
          originY: 'center',
          left: this.trim.cx,
          top: this.trim.cy,
        }) as fabric.Textbox & Gaia;
        textObj.id = uid();
        textObj.gaiaKind = 'text';
        textObj.name = 'Text / Info';
        textObj.locked = false;
        loadFont(DEFAULT_FONT);
        this.canvas.add(textObj);
      }
    } finally {
      this.isRestoring = false;
    }
  }

  private attachEvents() {
    const canvas = this.canvas!;
    canvas.on('selection:created', () => this.syncSelection());
    canvas.on('selection:updated', () => this.syncSelection());
    canvas.on('selection:cleared', () =>
      useEditorStore.getState().set({ selection: null, activeIds: [] }),
    );
    canvas.on('object:added', (e) => {
      const o = e.target as Gaia | undefined;
      if (
        !this.isRestoring &&
        o &&
        !String(o.gaiaKind ?? '').startsWith('__') &&
        this.pendingHistoryLabel === 'Edit'
      ) {
        this.noteHistoryAction(historyWithLayer('Add', o));
      }
      this.onStructuralChange();
    });
    canvas.on('object:removed', (e) => {
      const o = e.target as Gaia | undefined;
      if (
        !this.isRestoring &&
        o &&
        !String(o.gaiaKind ?? '').startsWith('__') &&
        this.pendingHistoryLabel === 'Edit'
      ) {
        this.noteHistoryAction(historyWithLayer('Delete', o));
      }
      this.onStructuralChange();
    });
    canvas.on('object:modified', (e) => {
      this.clearGuides();
      const ev = e as { action?: string; transform?: { action?: string }; target?: fabric.FabricObject };
      const action = ev.action ?? ev.transform?.action ?? '';
      const target = ev.target ?? this.canvas?.getActiveObject();
      if (action === 'drag') this.noteHistoryAction(historyWithLayer('Move', target));
      else if (action === 'scale' || action === 'scaleX' || action === 'scaleY') {
        this.noteHistoryAction(historyWithLayer('Resize', target));
      } else if (action === 'rotate') this.noteHistoryAction(historyWithLayer('Rotate', target));
      else if (action === 'skewX' || action === 'skewY') this.noteHistoryAction(historyWithLayer('Skew', target));
      else this.noteHistoryAction(historyWithLayer('Change', target));
      this.onChanged();
    });
    canvas.on('text:changed', (opt) => {
      const t = opt.target;
      if (t && isTextObject(t)) {
        const g = t as Gaia;
        if (typeof g.gaiaCurve === 'number' && g.gaiaCurve !== 0) {
          delete g.gaiaCurveLines;
          const next = applyCurveToText(t as fabric.Textbox, g.gaiaCurve, this.circleCurveLayout(false));
          if (next !== t) this.replaceObject(t, next);
        }
      }
      this.noteHistoryAction(historyWithLayer('Edit', t));
      this.onChanged();
      this.scheduleSelectionSync();
    });
    canvas.on('object:moving', (opt) => {
      const target = opt.target as fabric.FabricObject | undefined;
      this.updatePrintGuideHits(target);
      if (this.cropMode || (!this.guidesEnabled && !this.gridEnabled)) {
        this.clearGuides();
        return;
      }
      if (!target) return;
      const guides = computeSnapGuides(canvas, target, this.trim, {
        gridSpacing: this.gridEnabled ? ALIGNMENT_GRID_PX : 0,
      });
      if (this.guidesEnabled) this.setGuides(guides);
      else this.clearGuides();
    });
    canvas.on('object:scaling', (opt) => {
      const target = opt.target as fabric.FabricObject | undefined;
      this.updatePrintGuideHits(target);
      if (!this.guidesEnabled || this.cropMode) {
        this.clearGuides();
        return;
      }
      if (!target) return;
      this.setGuides(computeResizeGuides(canvas, target, this.trim));
    });
    canvas.on('object:rotating', (opt) => {
      this.updatePrintGuideHits(opt.target as fabric.FabricObject | undefined);
    });
    canvas.on('mouse:up', () => {
      if (this.activeGuides.length) this.clearGuides();
      this.clearPrintGuideHits();
    });
    canvas.on('mouse:down', (opt) => {
      this.handleToolMouseDown(opt);
    });
    canvas.on('after:render', (opt) => {
      // Only decorate the visible canvas, never export / offscreen renders.
      if (!this.canvas || opt.ctx !== this.canvas.getContext()) return;
      drawBleedOverlay(this.canvas, this.overlayConfig());
      drawGuides(this.canvas, this.activeGuides);
      if (this.textBoxOutlines) this.drawTextBoxOutlines();
      this.drawLayerPulse();
    });
    canvas.on('text:editing:entered', (opt) => {
      this.applySpellCheckToEditor(opt.target);
    });
  }

  private overlayConfig(): OverlayConfig {
    return {
      shape: this.template!.shape,
      bleedPx: this.bleedPx,
      safePx: this.safePx,
      cornerRadiusPx: (this.template!.cornerRadiusIn || 0) * EDITOR_PPI,
      visible: this.overlayVisible,
      gridVisible: this.gridEnabled,
      gridSpacingPx: ALIGNMENT_GRID_PX,
      bleedHit: this.printGuideHits.bleed,
      safeHit: this.printGuideHits.safety,
    };
  }

  private setPrintGuideHits(bleed: boolean, safety: boolean) {
    if (this.printGuideHits.bleed === bleed && this.printGuideHits.safety === safety) return;
    this.printGuideHits = { bleed, safety };
    useEditorStore.getState().set({
      printGuideBleedHit: bleed,
      printGuideSafeHit: safety,
    });
    this.canvas?.requestRenderAll();
  }

  private updatePrintGuideHits(target?: fabric.FabricObject | null) {
    if (!target || !this.canvas || !this.template || this.cropMode) {
      this.setPrintGuideHits(false, false);
      return;
    }
    const hits = guideHitsFromBBox(
      target.getBoundingRect(),
      printGuideLayoutPx(this.template),
      this.template.shape,
    );
    const pte = this.bleedPx > 0.5 && resolvePrintGuides(this.template).printToTheEdge;
    this.setPrintGuideHits(pte && hits.bleed, this.safePx > 0.5 && hits.safety);
  }

  private clearPrintGuideHits() {
    this.setPrintGuideHits(false, false);
  }

  /**
   * Guides are recomputed on every pointer move. Fabric already repaints the
   * canvas during a drag, so an extra render is only worth requesting when the
   * guide set actually changed.
   */
  private setGuides(next: Guide[]) {
    if (guidesEqual(this.activeGuides, next)) return;
    this.activeGuides = next;
    this.canvas?.requestRenderAll();
  }

  private clearGuides() {
    if (!this.activeGuides.length) return;
    this.activeGuides = [];
    this.canvas?.requestRenderAll();
  }

  // -- change / history / autosave -----------------------------------------

  private onChanged() {
    if (this.isRestoring || !this.canvas) return;
    this.refreshLayers();
    this.scheduleHistory();
    this.scheduleAutosave();
  }

  /** Structural edits (add/remove/group) snapshot history immediately so undo is precise. */
  private onStructuralChange() {
    if (this.isRestoring || !this.canvas) return;
    this.refreshLayers();
    if (this.historyTimer) clearTimeout(this.historyTimer);
    if (this.structuralChangeQueued) return;
    this.structuralChangeQueued = true;
    queueMicrotask(() => {
      this.structuralChangeQueued = false;
      this.commitHistory();
      this.scheduleAutosave();
    });
  }

  private scheduleSelectionSync() {
    if (this.selectionSyncTimer) clearTimeout(this.selectionSyncTimer);
    this.selectionSyncTimer = setTimeout(() => {
      this.selectionSyncTimer = null;
      this.syncSelection();
    }, 100);
  }

  private scheduleHistory() {
    if (this.isRestoring) return;
    if (this.historyTimer) clearTimeout(this.historyTimer);
    this.historyTimer = setTimeout(() => this.commitHistory(), 350);
  }

  /** Label shown on the next history snapshot (e.g. "Added text"). */
  noteHistoryAction(label: string) {
    this.pendingHistoryLabel = label;
  }

  private commitHistory(label?: string) {
    if (!this.canvas) return;
    const json = this.serialize();
    if (json === this.history[this.historyIndex]) return;
    let entryLabel = label ?? this.pendingHistoryLabel;
    if (entryLabel === 'Edit') {
      const active = this.canvas.getActiveObject() as Gaia | undefined;
      entryLabel = historyWithLayer('Change', active);
    }
    this.pendingHistoryLabel = 'Edit';
    // keep default for unlabeled snapshots
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.historyLabels = this.historyLabels.slice(0, this.historyIndex + 1);
    this.history.push(json);
    this.historyLabels.push(entryLabel);
    if (this.history.length > 60) {
      this.history.shift();
      this.historyLabels.shift();
    }
    this.historyIndex = this.history.length - 1;
    this.updateHistoryFlags();
  }

  private scheduleAutosave() {
    if (this.isRestoring) return;
    useEditorStore.getState().set({ saveState: 'saving' });
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => this.commitAutosave(), 2000);
  }

  private async commitAutosave() {
    if (!this.canvas || !this.template) return;
    try {
      const json = this.serialize();
      const thumb = this.thumbnail(140);

      await versionsRepo.create({
        designId: this.designId,
        templateId: this.template.id,
        context: this.context,
        canvasJson: json,
        thumbnail: thumb,
        label: new Date().toLocaleString(),
      });

      // Also auto-save to the Workspace (drafts) so the current design is always
      // preserved even if the user closes without a manual save.
      const appState = useAppStore.getState();
      const draftName = this.template.name || 'Current Work';
      const draft = await draftsRepo.save({
        id: appState.activeDraftId ?? undefined,
        name: draftName,
        designJson: json,
        templateId: this.template.id,
        context: appState.context,
        thumb,
        // Recorded so the Workspace can search designs by recipe or ingredient.
        recipeId: appState.activeRecipeId ?? undefined,
      });
      if (!appState.activeDraftId) {
        appState.setActiveDraftId(draft.id);
      }

      useEditorStore.getState().set({ saveState: 'saved', historyTick: Date.now() });
    } catch {
      // Surface a visible error so the user knows the snapshot failed.
      // 'error' is a transient state; the next successful autosave clears it.
      useEditorStore.getState().set({ saveState: 'error' as SaveState });
    }
  }

  private updateHistoryFlags() {
    const steps = this.historyLabels.map((label, index) => ({
      index,
      label,
      current: index === this.historyIndex,
    }));
    useEditorStore.getState().set({
      canUndo: this.historyIndex > 0,
      canRedo: this.historyIndex < this.history.length - 1,
      historySteps: [...steps].reverse(),
    });
  }

  async jumpToHistory(index: number) {
    if (index < 0 || index >= this.history.length || index === this.historyIndex) return;
    if (this.historyTimer) clearTimeout(this.historyTimer);
    this.historyIndex = index;
    await this.load(this.history[index]);
    this.updateHistoryFlags();
    this.scheduleAutosave();
  }

  applyTextMap(map: Record<string, string>) {
    if (!this.canvas) return;
    let changed = false;
    const visit = (o: fabric.FabricObject) => {
      const g = o as Gaia;
      if (g.id && map[g.id] != null) {
        if (isCurvedTextGroup(o)) {
          g.gaiaCurveSourceText = map[g.id];
          const first = (o as fabric.Group).getObjects().find((child) =>
            child.type === 'textbox' || child.type === 'i-text' || child.type === 'text',
          );
          if (first) first.set('text', map[g.id]);
          o.set('dirty', true);
          changed = true;
          return;
        }
        if (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text') {
          o.set('text', map[g.id]);
          o.set('dirty', true);
          changed = true;
          return;
        }
      }
      if (o.type === 'group') {
        (o as fabric.Group).getObjects().forEach(visit);
      }
    };
    for (const o of this.canvas.getObjects()) visit(o);
    if (changed) {
      this.noteHistoryAction('Text');
      this.canvas.requestRenderAll();
      this.onChanged();
    }
  }

  serialize(): string {
    const canvas = this.canvas!;
    // Detach curved-text paths before serializing so the JSON stays portable and
    // never trips loadFromJSON. Paths are rebuilt deterministically from
    // `gaiaCurve` on load.
    const detached: { obj: Gaia; path: unknown }[] = [];
    const visit = (o: fabric.FabricObject) => {
      const g = o as Gaia & { path?: unknown };
      if (g.gaiaCurve && g.path) {
        detached.push({ obj: g, path: g.path });
        (g as { path?: unknown }).path = undefined;
      }
      if (o.type === 'group') {
        (o as fabric.Group).getObjects().forEach(visit);
      }
    };
    for (const o of canvas.getObjects()) visit(o);
    const payload = canvas.toJSON() as Record<string, unknown>;
    const labelLanguage = useAppStore.getState().labelLanguage;
    if (labelLanguage) payload.gaiaLabelLanguage = labelLanguage;
    const json = JSON.stringify(payload);
    for (const d of detached) (d.obj as { path?: unknown }).path = d.path;
    return json;
  }

  private async load(json: string) {
    if (!this.canvas) return;
    this.isRestoring = true;
    try {
      await this.canvas.loadFromJSON(json);
      this.rebuildCurves();
      // Sync lockUniScaling from gaiaLockAspect so drag-resize respects the
      // aspect-ratio lock even after undo/redo or history restore.
      for (const o of this.canvas.getObjects()) {
        const g = o as Gaia;
        o.set('lockUniScaling', !!g.gaiaLockAspect);
      }
      this.canvas?.requestRenderAll();
    } catch {
      // Canvas may have been disposed mid-load (e.g. fast navigation); ignore.
    } finally {
      this.isRestoring = false;
    }
    this.refreshLayers();
    this.syncSelection();
  }

  /** Re-applies curved-text paths from each object's saved `gaiaCurve` amount. */
  private rebuildCurves() {
    if (!this.canvas) return;
    for (const o of [...this.canvas.getObjects()]) {
      const g = o as Gaia;
      if (typeof g.gaiaCurve === 'number' && g.gaiaCurve !== 0 && isTextObject(o)) {
        const next = applyCurveToText(o as fabric.Textbox, g.gaiaCurve, this.circleCurveLayout(false));
        if (next !== o) this.replaceObject(o, next);
      }
    }
  }

  private flushPendingHistory() {
    if (this.historyTimer) {
      clearTimeout(this.historyTimer);
      this.historyTimer = null;
    }
    if (this.structuralChangeQueued) {
      this.structuralChangeQueued = false;
      this.commitHistory();
    }
  }

  async undo() {
    this.flushPendingHistory();
    if (this.historyIndex <= 0) return;
    this.historyIndex -= 1;
    await this.load(this.history[this.historyIndex]);
    this.updateHistoryFlags();
    this.scheduleAutosave();
  }

  async redo() {
    this.flushPendingHistory();
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex += 1;
    await this.load(this.history[this.historyIndex]);
    this.updateHistoryFlags();
    this.scheduleAutosave();
  }

  async restoreJson(json: string) {
    await this.load(json);
    this.commitHistory();
    this.scheduleAutosave();
  }

  // -- object factory helpers ----------------------------------------------

  private tag(obj: Gaia, kind: string, name?: string) {
    obj.id = uid();
    obj.gaiaKind = kind;
    obj.name = name ?? defaultName(kind);
    obj.locked = false;
  }

  private place(obj: Gaia, select = true) {
    const canvas = this.canvas!;
    canvas.add(obj);
    if (select) {
      canvas.setActiveObject(obj);
      this.syncSelection();
    }
    canvas.requestRenderAll();
  }

  async addImageFromUrl(
    url: string,
    kind: AddImageKind = 'image',
    name?: string,
    /** If provided, the image is scaled so its shorter side equals this many canvas pixels. */
    targetSidePx?: number,
  ) {
    if (!this.canvas) return;
    this.noteHistoryAction('Add Image');
    const img = (await fabric.FabricImage.fromURL(url, {
      crossOrigin: 'anonymous',
    })) as fabric.FabricImage & Gaia;

    const isBg = kind === 'background';
    const targetW = targetSidePx ?? (isBg ? this.canvas.getWidth() : this.labelWpx * (kind === 'logo' ? 0.55 : 0.9));
    const targetH = targetSidePx ?? (isBg ? this.canvas.getHeight() : this.labelHpx * (kind === 'logo' ? 0.55 : 0.9));
    const iw = img.width || 1;
    const ih = img.height || 1;
    const scale = isBg
      ? Math.max(targetW / iw, targetH / ih)
      : Math.min(targetW / iw, targetH / ih);

    // Every image (logos especially) spawns dead-center on the label —
    // the "auto-center" rule for transparent brand logos. Snap-to-center
    // guides keep it centered if the user nudges it later.
    img.set({
      originX: 'center',
      originY: 'center',
      left: this.trim.cx,
      top: this.trim.cy,
      scaleX: scale,
      scaleY: scale,
    });

    if (isBg) {
      this.insertBackgroundImage(img, name);
      this.onChanged();
      return img;
    }

    this.tag(img, kind, name);
    this.place(img, true);
    return img;
  }

  private isQrObject(o: Gaia | undefined): boolean {
    if (!o) return false;
    return o.gaiaKind === 'qr' || !!o.gaiaQrFields || o.name === 'QR Code' || o.name === 'Código QR';
  }

  /** Fields + encoded payload for the selected QR, if any. */
  getActiveQrMeta(): { fields: QrFields; payload: string } | null {
    const o = this.canvas?.getActiveObject() as Gaia | undefined;
    if (!this.isQrObject(o) || !o) return null;
    return {
      fields: normalizeQrFields(o.gaiaQrFields),
      payload: o.gaiaQrPayload ?? '',
    };
  }

  /** Persist combined-QR metadata on the selected object (survives save/clone). */
  stampActiveQr(fields: QrFields, payload: string) {
    const o = this.canvas?.getActiveObject() as Gaia | undefined;
    if (!o) return;
    o.gaiaKind = 'qr';
    o.gaiaQrFields = normalizeQrFields(fields);
    o.gaiaQrPayload = payload;
    this.refreshLayers();
    this.syncSelection();
    this.onChanged();
  }

  /** Swap the selected image for a new file while keeping size and position. */
  async replaceSelectedImage(url: string, name?: string) {
    const canvas = this.canvas;
    if (!canvas) return;
    const active = canvas.getActiveObject() as (fabric.FabricImage & Gaia) | undefined;
    if (!active || active.type !== 'image') return;
    const next = (await fabric.FabricImage.fromURL(url, {
      crossOrigin: 'anonymous',
    })) as fabric.FabricImage & Gaia;
    if (!this.canvas) return;
    next.set({
      originX: active.originX,
      originY: active.originY,
      left: active.left,
      top: active.top,
      angle: active.angle,
      flipX: active.flipX,
      flipY: active.flipY,
      opacity: active.opacity,
    });
    const oldW = (active.width || 1) * (active.scaleX || 1);
    const oldH = (active.height || 1) * (active.scaleY || 1);
    next.set({
      scaleX: oldW / (next.width || 1),
      scaleY: oldH / (next.height || 1),
    });
    this.tag(next, active.gaiaKind === 'qr' ? 'qr' : (active.gaiaKind || 'image'), name ?? active.name);
    next.gaiaAdjust = active.gaiaAdjust;
    next.gaiaLockAspect = active.gaiaLockAspect;
    next.gaiaQrFields = active.gaiaQrFields;
    next.gaiaQrPayload = active.gaiaQrPayload;
    const slot = canvas.getObjects().indexOf(active);
    canvas.remove(active);
    canvas.add(next);
    if (slot >= 0) canvas.moveObjectTo(next, slot);
    canvas.setActiveObject(next);
    canvas.requestRenderAll();
    this.syncSelection();
    this.onChanged();
    return next;
  }

  /**
   * Slots a background image into the Background layer, replacing the
   * placeholder plate or a previous photo. Stays at the bottom of the stack
   * (under the legibility disc and text). Locked until unlocked in Layers.
   */
  private insertBackgroundImage(img: fabric.FabricImage & Gaia, name?: string) {
    const canvas = this.canvas!;
    img.set(EditorController.LOCKED_PROPS);
    img.id = uid();
    img.gaiaKind = 'background';
    img.name = name ?? 'Background';
    img.locked = true;
    img.gaiaPlaceholder = false;
    this.noteHistoryAction('Set Background');

    const existing = canvas
      .getObjects()
      .find((o) => (o as Gaia).gaiaKind === 'background') as Gaia | undefined;

    if (existing) {
      const slot = canvas.getObjects().indexOf(existing as fabric.FabricObject);
      canvas.remove(existing as fabric.FabricObject);
      canvas.add(img);
      canvas.moveObjectTo(img, Math.max(0, slot));
    } else {
      canvas.add(img);
      canvas.moveObjectTo(img, 0);
    }
    canvas.requestRenderAll();
    this.refreshLayers();
  }

  /** Drop the unused Base plate from older designs. */
  private stripBaseLayers() {
    if (!this.canvas) return;
    for (const o of this.canvas.getObjects().slice()) {
      if ((o as Gaia).gaiaKind === 'base') this.canvas.remove(o);
    }
  }

  addText(kind: 'heading' | 'body' | string = 'body', text?: string) {
    if (!this.canvas) return;
    this.noteHistoryAction('Add Text');
    const isHeading = kind === 'heading';
    const t = new fabric.Textbox(text ?? (isHeading ? 'Your Product' : 'Add your text here'), {
      width: this.labelWpx * 0.82,
      fontFamily: DEFAULT_FONT,
      fontSize: ptToPx(isHeading ? 20 : 11),
      fill: '#2b2b2b',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      left: this.trim.cx,
      top: this.trim.cy,
    }) as fabric.Textbox & Gaia;
    this.tag(t, 'text', text ? clip(text) : isHeading ? 'Heading' : 'Text');
    loadFont(DEFAULT_FONT);
    this.place(t);
    this.flushPendingHistory();
    return t;
  }

  addShape(kind: PendingShapeKind) {
    if (!this.canvas) return;
    this.noteHistoryAction('Add Shape');
    const size = Math.min(this.labelWpx, this.labelHpx) * 0.5;
    let obj: (fabric.FabricObject & Gaia) | null = null;
    const base = {
      originX: 'center' as const,
      originY: 'center' as const,
      left: this.trim.cx,
      top: this.trim.cy,
      fill: '#a7c4a0',
      stroke: '',
      strokeWidth: 0,
    };
    if (kind === 'rect') {
      obj = new fabric.Rect({ ...base, width: this.labelWpx * 0.6, height: this.labelHpx * 0.4, rx: 0, ry: 0 }) as fabric.Rect & Gaia;
    } else if (kind === 'roundRect') {
      obj = new fabric.Rect({ ...base, width: this.labelWpx * 0.6, height: this.labelHpx * 0.4, rx: 18, ry: 18 }) as fabric.Rect & Gaia;
    } else if (kind === 'circle') {
      obj = new fabric.Circle({ ...base, radius: size / 2 }) as fabric.Circle & Gaia;
    } else if (kind === 'triangle') {
      obj = new fabric.Triangle({ ...base, width: size, height: size }) as fabric.Triangle & Gaia;
    } else if (kind === 'star') {
      obj = new fabric.Polygon(starPolygon(0, 0, 5, size / 2, size / 4), { ...base }) as fabric.Polygon & Gaia;
    } else if (kind === 'hexagon') {
      obj = new fabric.Polygon(regularPolygon(0, 0, 6, size / 2), { ...base }) as fabric.Polygon & Gaia;
    } else if (kind === 'arrow') {
      obj = new fabric.Polygon(arrowPolygon(this.labelWpx * 0.55, size * 0.45), { ...base }) as fabric.Polygon & Gaia;
    } else {
      obj = new fabric.Line([0, 0, this.labelWpx * 0.6, 0], {
        ...base,
        fill: '',
        stroke: '#6b7c66',
        strokeWidth: 4,
      }) as fabric.Line & Gaia;
    }
    this.tag(obj, 'shape', shapeName(kind));
    this.place(obj);
    this.flushPendingHistory();
    return obj;
  }

  // -- editing operations ---------------------------------------------------

  // ── Copy / Paste Style (format painter) ──────────────────────────────────
  private copiedStyle: Record<string, unknown> | null = null;

  copyStyle() {
    const a = this.canvas?.getActiveObject() as (fabric.FabricObject & Record<string, unknown>) | undefined;
    if (!a) return false;
    const STYLE_PROPS = [
      'fill', 'stroke', 'strokeWidth', 'opacity', 'globalCompositeOperation',
      'shadow', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
      'underline', 'linethrough', 'textAlign', 'lineHeight', 'charSpacing',
    ] as const;
    this.copiedStyle = Object.fromEntries(
      STYLE_PROPS.map((k) => [k, a[k] as unknown]).filter(([, v]) => v !== undefined),
    );
    useEditorStore.getState().set({ hasStyleCopied: true });
    return true;
  }

  pasteStyle() {
    if (!this.copiedStyle || !this.canvas) return;
    const style = this.copiedStyle;
    this.canvas.getActiveObjects().forEach((o) => {
      const isText = o.type === 'textbox' || o.type === 'i-text' || o.type === 'text';
      const patch: Record<string, unknown> = { ...style };
      // Don't apply text-only props to non-text objects
      if (!isText) {
        delete patch.fontFamily; delete patch.fontSize; delete patch.fontWeight;
        delete patch.fontStyle; delete patch.underline; delete patch.linethrough;
        delete patch.textAlign; delete patch.lineHeight; delete patch.charSpacing;
      }
      o.set(patch as Partial<fabric.FabricObject>);
    });
    this.canvas.requestRenderAll();
    this.onChanged();
    this.syncSelection();
  }

  get hascopiedStyle() { return !!this.copiedStyle; }

  // ── Object clipboard (Ctrl/Cmd + C / X / V) ──────────────────────────────
  // Objects are stored as plain serialized data rather than live Fabric
  // instances so a copied layer can still be pasted after it was deleted.

  copySelected(): boolean {
    const objs = this.canvas?.getActiveObjects() ?? [];
    if (!objs.length) return false;
    this.clipboard = objs.map((o) => o.toObject(CUSTOM_PROPS) as Record<string, unknown>);
    useEditorStore.getState().set({ hasClipboard: true });
    return true;
  }

  cutSelected(): boolean {
    if (!this.copySelected()) return false;
    this.deleteSelected();
    return true;
  }

  async pasteClipboard() {
    const canvas = this.canvas;
    if (!canvas || !this.clipboard.length) return;
    const revived = await fabric.util.enlivenObjects<fabric.FabricObject>(this.clipboard);
    if (!this.canvas) return; // disposed while images were decoding

    canvas.discardActiveObject();
    const pasted: fabric.FabricObject[] = [];
    for (const obj of revived) {
      const g = obj as Gaia;
      g.id = uid();
      obj.set({ left: (obj.left ?? 0) + 20, top: (obj.top ?? 0) + 20 });
      canvas.add(obj);
      pasted.push(obj);
    }
    if (pasted.length === 1) canvas.setActiveObject(pasted[0]);
    else if (pasted.length > 1) canvas.setActiveObject(new fabric.ActiveSelection(pasted, { canvas }));
    canvas.requestRenderAll();
    this.syncSelection();
  }

  get hasClipboard() { return this.clipboard.length > 0; }

  deleteSelected() {
    const canvas = this.canvas;
    if (!canvas) return;
    const deleting = canvas.getActiveObjects();
    this.noteHistoryAction(
      deleting.length === 1
        ? historyWithLayer('Delete', deleting[0])
        : `Delete ${deleting.length} layers`,
    );
    const active = canvas.getActiveObject() as (fabric.FabricObject & { isEditing?: boolean }) | undefined;
    if (active && 'isEditing' in active && active.isEditing) return;
    const objs = canvas.getActiveObjects();
    if (!objs.length) return;
    canvas.discardActiveObject();
    objs.forEach((o) => canvas.remove(o));
    canvas.requestRenderAll();
  }

  async duplicateSelected() {
    const canvas = this.canvas;
    if (!canvas) return;
    const actives = canvas.getActiveObjects();
    if (!actives.length) return;
    this.noteHistoryAction(
      actives.length === 1 ? historyWithLayer('Duplicate', actives[0]) : `Duplicate ${actives.length} layers`,
    );
    canvas.discardActiveObject();
    const clones: fabric.FabricObject[] = [];
    for (const o of actives) {
      const c = (await o.clone(CUSTOM_PROPS)) as Gaia;
      c.id = uid();
      c.set({ left: (o.left ?? 0) + 20, top: (o.top ?? 0) + 20 });
      canvas.add(c);
      clones.push(c);
    }
    if (clones.length === 1) {
      canvas.setActiveObject(clones[0]);
    } else if (clones.length > 1) {
      canvas.setActiveObject(new fabric.ActiveSelection(clones, { canvas }));
    }
    canvas.requestRenderAll();
    this.syncSelection();
  }

  group() {
    const canvas = this.canvas;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.type !== 'activeselection') return;
    const objects = (active as fabric.ActiveSelection).getObjects();
    if (objects.length < 2) return;
    canvas.discardActiveObject();
    objects.forEach((o) => canvas.remove(o));
    this.noteHistoryAction('Group');
    const group = new fabric.Group(objects) as fabric.Group & Gaia;
    this.tag(group, 'group', 'Group');
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
    this.onChanged();
    this.syncSelection();
  }

  ungroup() {
    const canvas = this.canvas;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active || active.type !== 'group') return;
    const group = active as fabric.Group;
    const items = group.removeAll() as fabric.FabricObject[];
    canvas.remove(group);
    items.forEach((o) => canvas.add(o));
    canvas.setActiveObject(new fabric.ActiveSelection(items, { canvas }));
    canvas.requestRenderAll();
    this.onChanged();
    this.syncSelection();
  }

  align(type: 'left' | 'right' | 'centerH' | 'top' | 'bottom' | 'centerV') {
    const canvas = this.canvas;
    if (!canvas) return;
    const objs = canvas.getActiveObjects();
    if (!objs.length) return;
    for (const o of objs) {
      const br = o.getBoundingRect();
      if (type === 'left') o.set('left', (o.left ?? 0) + (this.trim.left - br.left));
      else if (type === 'right') o.set('left', (o.left ?? 0) + (this.trim.right - (br.left + br.width)));
      else if (type === 'centerH') o.set('left', (o.left ?? 0) + (this.trim.cx - (br.left + br.width / 2)));
      else if (type === 'top') o.set('top', (o.top ?? 0) + (this.trim.top - br.top));
      else if (type === 'bottom') o.set('top', (o.top ?? 0) + (this.trim.bottom - (br.top + br.height)));
      else if (type === 'centerV') o.set('top', (o.top ?? 0) + (this.trim.cy - (br.top + br.height / 2)));
      o.setCoords();
    }
    canvas.requestRenderAll();
    this.onChanged();
  }

  centerSelected() {
    this.align('centerH');
    this.align('centerV');
  }

  // -- curved text ----------------------------------------------------------

  /** Swap `old` for `next` on the canvas, keeping id / kind / layer slot. */
  private replaceObject(old: fabric.FabricObject, next: fabric.FabricObject) {
    const canvas = this.canvas;
    if (!canvas || old === next) return next;
    const idx = canvas.getObjects().indexOf(old);
    const src = old as Gaia;
    const dest = next as Gaia;
    dest.id = src.id;
    dest.name = src.name;
    dest.gaiaKind = src.gaiaKind;
    dest.locked = src.locked;
    const wasActive = canvas.getActiveObject() === old;
    if (idx >= 0) {
      canvas.remove(old);
      canvas.add(next);
      canvas.moveObjectTo(next, idx);
    }
    if (wasActive || !canvas.getActiveObject()) {
      canvas.setActiveObject(next);
    }
    return next;
  }

  /** Bends the selected text along a smile/frown wave. amount: -100…0…100. */
  setTextCurve(amount: number) {
    this.applyTextCurve(amount, { mode: 'wave' });
  }

  /**
   * Avery curved-text presets: wave (abc up/down) or circle-path (top/bottom/left/right).
   */
  setTextCurveStyle(opts: { mode: CurveMode; side?: CircleSide; amount?: number }) {
    const amount = opts.mode === 'circle' ? 100 : (opts.amount ?? 50);
    this.applyTextCurve(amount, {
      mode: opts.mode,
      side: opts.side,
      ...this.circleCurveLayout(opts.mode === 'circle'),
    });
  }

  /** Safety-ring metrics for circle-path text. Presets also snap to trim center. */
  private circleCurveLayout(snapCenter: boolean): CurveApplyOptions {
    return {
      labelW: this.labelWpx,
      labelH: this.labelHpx,
      safePx: this.safePx,
      ...(snapCenter ? { centerX: this.trim.cx, centerY: this.trim.cy } : {}),
    };
  }

  private applyTextCurve(amount: number, options: CurveApplyOptions) {
    const canvas = this.canvas;
    if (!canvas) return;
    const o = canvas.getActiveObject();
    if (!o || !isTextObject(o)) return;
    const next = applyCurveToText(o as fabric.Textbox, amount, {
      ...this.circleCurveLayout(false),
      ...options,
    });
    if (next !== o) this.replaceObject(o, next);
    canvas.setActiveObject(next);
    canvas.requestRenderAll();
    this.syncSelection();
    this.onChanged();
  }

  // -- precise (inch-based) geometry ---------------------------------------

  /** Move the selection by a pixel delta (used by arrow-key nudging). */
  nudge(dx: number, dy: number) {
    const canvas = this.canvas;
    if (!canvas) return;
    const objs = canvas.getActiveObjects();
    if (!objs.length) return;
    for (const o of objs) {
      o.set({ left: (o.left ?? 0) + dx, top: (o.top ?? 0) + dy });
      o.setCoords();
    }
    canvas.requestRenderAll();
    this.syncSelection();
    this.onChanged();
  }

  setSelectedSizeIn(widthIn: number, heightIn: number) {
    const canvas = this.canvas;
    if (!canvas) return;
    const o = canvas.getActiveObject();
    if (!o) return;
    const baseW = o.width || 1;
    const baseH = o.height || 1;
    const targetW = Math.max(0.05, widthIn) * EDITOR_PPI;
    const targetH = Math.max(0.05, heightIn) * EDITOR_PPI;
    if ((o as Gaia).gaiaLockAspect) {
      const s = targetW / baseW;
      o.set({ scaleX: s, scaleY: s });
    } else {
      o.set({ scaleX: targetW / baseW, scaleY: targetH / baseH });
    }
    o.setCoords();
    canvas.requestRenderAll();
    this.syncSelection();
    this.onChanged();
  }

  setSelectedPositionIn(leftIn: number, topIn: number) {
    const canvas = this.canvas;
    if (!canvas) return;
    const o = canvas.getActiveObject();
    if (!o) return;
    const br = o.getBoundingRect();
    const targetLeft = this.trim.left + leftIn * EDITOR_PPI;
    const targetTop = this.trim.top + topIn * EDITOR_PPI;
    o.set({
      left: (o.left ?? 0) + (targetLeft - br.left),
      top: (o.top ?? 0) + (targetTop - br.top),
    });
    o.setCoords();
    canvas.requestRenderAll();
    this.syncSelection();
    this.onChanged();
  }

  toggleLockAspect() {
    const canvas = this.canvas;
    if (!canvas) return;
    const o = canvas.getActiveObject() as Gaia | undefined;
    if (!o) return;
    o.gaiaLockAspect = !o.gaiaLockAspect;
    // Sync Fabric's native uniform-scaling lock so drag-resize on the canvas
    // also respects the setting (not only the numeric inch inputs).
    o.set('lockUniScaling', !!o.gaiaLockAspect);
    this.syncSelection();
    this.onChanged();
  }

  stack(action: 'forward' | 'backward' | 'front' | 'back') {
    const canvas = this.canvas;
    if (!canvas) return;
    const o = canvas.getActiveObject();
    if (!o) return;
    if (action === 'forward') canvas.bringObjectForward(o);
    else if (action === 'backward') canvas.sendObjectBackwards(o);
    else if (action === 'front') canvas.bringObjectToFront(o);
    else canvas.sendObjectToBack(o);
    canvas.requestRenderAll();
    this.onChanged();
  }

  flip(axis: 'h' | 'v') {
    const canvas = this.canvas;
    if (!canvas) return;
    const o = canvas.getActiveObject();
    if (!o) return;
    if (axis === 'h') o.set('flipX', !o.flipX);
    else o.set('flipY', !o.flipY);
    this.noteHistoryAction(historyWithLayer('Flip', o));
    canvas.requestRenderAll();
    this.onChanged();
  }

  async setActiveProps(patch: Record<string, unknown>) {
    const canvas = this.canvas;
    if (!canvas) return;
    this.noteHistoryAction(historyWithLayer(historyLabelForProps(patch), canvas.getActiveObject()));
    const objs = canvas.getActiveObjects();
    if (!objs.length) return;

    if (typeof patch.fontFamily === 'string') {
      const sel = useEditorStore.getState().selection;
      if (sel) useEditorStore.getState().set({ selection: { ...sel, fontLoading: true } });
      await loadFont(patch.fontFamily);
    }

    for (const o of objs) {
      const targets: fabric.FabricObject[] = isCurvedTextGroup(o)
        ? [o, ...(o as fabric.Group).getObjects()]
        : [o];
      for (const t of targets) {
        for (const [k, v] of Object.entries(patch)) {
          if (k === 'blend') t.set('globalCompositeOperation', v as GlobalCompositeOperation);
          else if (k === 'cornerRadius') {
            if (t.type === 'rect') {
              t.set('rx', v as number);
              t.set('ry', v as number);
            }
          } else t.set(k, v as never);
        }
        t.set('dirty', true);
      }
      const curve = (o as Gaia).gaiaCurve;
      if (isTextObject(o) && typeof curve === 'number' && curve !== 0) {
        const next = applyCurveToText(o as fabric.Textbox, curve, this.circleCurveLayout(false));
        if (next !== o) this.replaceObject(o, next);
      }
    }
    canvas.requestRenderAll();
    this.syncSelection();
    this.onChanged();
  }

  // -- image adjustments ----------------------------------------------------

  /**
   * Applies brightness / contrast / saturation to the selected image(s).
   *
   * Fabric rebuilds the whole texture on every `applyFilters()` call, which is
   * far too slow to run on each slider tick, so the newest amounts are coalesced
   * into a single animation frame.
   */
  setImageAdjust(patch: Partial<ImageAdjust>) {
    const canvas = this.canvas;
    if (!canvas) return;
    const images = canvas
      .getActiveObjects()
      .filter((o): o is fabric.FabricImage & Gaia => o.type === 'image');
    if (!images.length) return;

    for (const img of images) {
      img.gaiaAdjust = { ...NEUTRAL_ADJUST, ...img.gaiaAdjust, ...patch };
    }
    this.pendingAdjust = images;
    this.syncSelection();

    if (this.adjustFrame !== null) return;
    this.adjustFrame = requestAnimationFrame(() => {
      this.adjustFrame = null;
      const targets = this.pendingAdjust;
      this.pendingAdjust = [];
      for (const img of targets) {
        if (!this.canvas?.contains(img)) continue;
        img.filters = buildFilters(img.gaiaAdjust ?? NEUTRAL_ADJUST);
        img.applyFilters();
      }
      this.canvas?.requestRenderAll();
      this.onChanged();
    });
  }

  resetImageAdjust() {
    const canvas = this.canvas;
    if (!canvas) return;
    const images = canvas
      .getActiveObjects()
      .filter((o): o is fabric.FabricImage & Gaia => o.type === 'image');
    for (const img of images) img.gaiaAdjust = { ...NEUTRAL_ADJUST };
    this.pendingAdjust = images;
    this.syncSelection();
    this.setImageAdjust({ ...NEUTRAL_ADJUST });
  }

  // -- crop -----------------------------------------------------------------

  get cropMode() {
    return !!this.cropRect;
  }

  startCrop() {
    const canvas = this.canvas;
    if (!canvas) return;
    const target = canvas.getActiveObject();
    if (!target || target.type !== 'image') return;
    const img = target as fabric.FabricImage;
    const br = img.getBoundingRect();
    const rect = new fabric.Rect({
      left: br.left,
      top: br.top,
      width: br.width,
      height: br.height,
      fill: 'rgba(124,58,237,0.15)',
      stroke: '#7c3aed',
      strokeWidth: 1.5,
      strokeDashArray: [6, 4],
      originX: 'left',
      originY: 'top',
      cornerColor: '#ffffff',
      cornerStrokeColor: '#7c3aed',
      transparentCorners: false,
    }) as fabric.Rect & Gaia;
    rect.gaiaKind = '__crop';
    rect.id = uid();
    this.cropRect = rect;
    this.cropTarget = img;
    canvas.getObjects().forEach((o) => {
      if (o !== rect) o.set({ selectable: false, evented: false });
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.requestRenderAll();
    useEditorStore.getState().set({ cropMode: true });
  }

  applyCrop() {
    const canvas = this.canvas;
    if (!canvas || !this.cropRect || !this.cropTarget) return this.cancelCrop();
    const img = this.cropTarget;
    const rect = this.cropRect;
    const sx = img.scaleX || 1;
    const sy = img.scaleY || 1;
    const ib = img.getBoundingRect();
    const rb = rect.getBoundingRect();

    // Intersect crop rect with the image, in canvas pixels.
    const ix = Math.max(ib.left, rb.left);
    const iy = Math.max(ib.top, rb.top);
    const ix2 = Math.min(ib.left + ib.width, rb.left + rb.width);
    const iy2 = Math.min(ib.top + ib.height, rb.top + rb.height);
    const cw = Math.max(8, ix2 - ix);
    const ch = Math.max(8, iy2 - iy);

    const newCropX = (img.cropX || 0) + (ix - ib.left) / sx;
    const newCropY = (img.cropY || 0) + (iy - ib.top) / sy;

    img.set({
      cropX: newCropX,
      cropY: newCropY,
      width: cw / sx,
      height: ch / sy,
      originX: 'center',
      originY: 'center',
      left: ix + cw / 2,
      top: iy + ch / 2,
    });
    img.setCoords();
    this.finishCrop();
    this.onChanged();
  }

  cancelCrop() {
    this.finishCrop();
  }

  private finishCrop() {
    const canvas = this.canvas;
    if (!canvas) return;
    if (this.cropRect) canvas.remove(this.cropRect);
    // Restore interactivity only for unlocked objects — locked layers must
    // stay non-selectable/non-evented even after the crop mode exits.
    canvas.getObjects().forEach((o) => {
      const isLocked = !!(o as Gaia).locked;
      o.set({ selectable: !isLocked, evented: !isLocked });
    });
    if (this.cropTarget) canvas.setActiveObject(this.cropTarget);
    this.cropRect = null;
    this.cropTarget = null;
    canvas.requestRenderAll();
    useEditorStore.getState().set({ cropMode: false });
    this.syncSelection();
  }

  // -- layers ---------------------------------------------------------------

  private findById(id: string): Gaia | undefined {
    return this.canvas?.getObjects().find((o) => (o as Gaia).id === id) as Gaia | undefined;
  }

  private refreshLayers() {
    if (!this.canvas) return;
    const layers = this.canvas
      .getObjects()
      .filter((o) => !String((o as Gaia).gaiaKind ?? '').startsWith('__'))
      .slice()
      .reverse()
      .map((o) => {
        const g = o as Gaia;
        return {
          id: g.id ?? '',
          name: g.name ?? g.type,
          kind: g.gaiaKind ?? g.type,
          type: g.type,
          visible: g.visible !== false,
          locked: !!g.locked,
          isLegibilityOverlay: !!g.isLegibilityOverlay,
        };
      });
    // Dragging fires object:modified continuously; pushing a fresh array each
    // time would re-render the whole layers panel for no visible change.
    const store = useEditorStore.getState();
    if (layersEqual(store.layers, layers)) return;
    store.set({ layers });
  }

  selectLayer(id: string) {
    const o = this.findById(id);
    if (!o || !this.canvas) return;
    // Fabric v6 refuses setActiveObject for non-selectable objects. Temporarily
    // allow selection so the properties panel can read and change the object's
    // properties (e.g. opacity on the legibility overlay) without the user first
    // having to unlock the layer.
    const wasSelectable = o.selectable;
    if (!wasSelectable) o.set('selectable', true);
    this.canvas.setActiveObject(o);
    if (!wasSelectable) o.set('selectable', false);
    this.canvas.requestRenderAll();
    this.syncSelection();
    this.pulseLayer(id);
  }

  /** Brief canvas flash so a Layers-panel click is visible on the object. */
  pulseLayer(id: string) {
    const o = this.findById(id);
    if (!o || !this.canvas) return;
    if (this.layerPulse?.raf) cancelAnimationFrame(this.layerPulse.raf);
    this.layerPulse = { obj: o, started: performance.now(), raf: 0 };
    const tick = () => {
      if (!this.layerPulse) return;
      const elapsed = performance.now() - this.layerPulse.started;
      this.canvas?.requestRenderAll();
      if (elapsed < EditorController.LAYER_PULSE_MS) {
        this.layerPulse.raf = requestAnimationFrame(tick);
      } else {
        this.layerPulse = null;
        this.canvas?.requestRenderAll();
      }
    };
    this.layerPulse.raf = requestAnimationFrame(tick);
  }

  private clipPulseToDieCut(ctx: CanvasRenderingContext2D) {
    const t = this.trim;
    const w = this.labelWpx;
    const h = this.labelHpx;
    const shape = this.template?.shape;
    const r = (this.template?.cornerRadiusIn || 0) * EDITOR_PPI;
    ctx.beginPath();
    if (shape === 'circle' || shape === 'oval') {
      ctx.ellipse(t.cx, t.cy, Math.max(0, w / 2), Math.max(0, h / 2), 0, 0, Math.PI * 2);
    } else if (shape === 'rounded-rectangle') {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.moveTo(t.left + rr, t.top);
      ctx.arcTo(t.right, t.top, t.right, t.bottom, rr);
      ctx.arcTo(t.right, t.bottom, t.left, t.bottom, rr);
      ctx.arcTo(t.left, t.bottom, t.left, t.top, rr);
      ctx.arcTo(t.left, t.top, t.right, t.top, rr);
    } else {
      ctx.rect(t.left, t.top, w, h);
    }
    ctx.clip();
  }

  private drawLayerPulse() {
    const pulse = this.layerPulse;
    const canvas = this.canvas;
    if (!pulse || !canvas) return;
    const o = pulse.obj;
    if (!canvas.getObjects().includes(o) || o.visible === false) return;
    const u = Math.min(1, (performance.now() - pulse.started) / EditorController.LAYER_PULSE_MS);
    // Rise and fall evenly (sine) so it does not slam on at full white.
    const alpha = 0.62 * Math.sin(Math.PI * u);
    if (alpha < 0.02) return;

    const ctx = canvas.getContext();
    ctx.save();
    this.clipPulseToDieCut(ctx);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#52814e';
    ctx.lineWidth = 3;

    if (o.type === 'circle') {
      const c = o as fabric.Circle;
      const radius = (c.radius ?? 0) * (c.scaleX ?? 1);
      ctx.beginPath();
      ctx.arc(c.left ?? 0, c.top ?? 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (o.type === 'ellipse') {
      const e = o as fabric.Ellipse;
      ctx.beginPath();
      ctx.ellipse(
        e.left ?? 0,
        e.top ?? 0,
        (e.rx ?? 0) * (e.scaleX ?? 1),
        (e.ry ?? 0) * (e.scaleY ?? 1),
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.stroke();
    } else {
      const br = o.getBoundingRect();
      ctx.beginPath();
      ctx.rect(br.left, br.top, br.width, br.height);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  toggleLayerVisible(id: string) {
    const o = this.findById(id);
    if (!o) return;
    o.set('visible', o.visible === false);
    this.noteHistoryAction(historyWithLayer(o.visible === false ? 'Hide' : 'Show', o));
    this.canvas?.requestRenderAll();
    this.refreshLayers();
    this.scheduleHistory();
    this.scheduleAutosave();
  }

  toggleLayerLock(id: string) {
    const o = this.findById(id);
    if (!o || !this.canvas) return;
    const locked = !o.locked;
    o.locked = locked;
    o.set({
      selectable: !locked,
      evented: !locked,
      lockMovementX: locked,
      lockMovementY: locked,
      lockRotation: locked,
      lockScalingX: locked,
      lockScalingY: locked,
      hasControls: !locked,
    });
    if (locked && this.canvas.getActiveObject() === o) this.canvas.discardActiveObject();
    this.noteHistoryAction(historyWithLayer(locked ? 'Lock' : 'Unlock', o));
    this.canvas.requestRenderAll();
    this.refreshLayers();
    this.scheduleHistory();
    this.scheduleAutosave();
  }

  renameLayer(id: string, name: string) {
    const o = this.findById(id);
    if (!o) return;
    o.name = name;
    this.noteHistoryAction(historyWithLayer('Rename', o));
    this.refreshLayers();
    this.scheduleHistory();
    this.scheduleAutosave();
  }

  moveLayer(id: string, dir: 'up' | 'down') {
    const o = this.findById(id);
    if (!o || !this.canvas) return;
    // Panel shows top layer first, so "up" == bring forward.
    if (dir === 'up') this.canvas.bringObjectForward(o);
    else this.canvas.sendObjectBackwards(o);
    this.noteHistoryAction(historyWithLayer('Reorder', o));
    this.canvas.requestRenderAll();
    this.onChanged();
  }

  /**
   * Drag-and-drop z-index reordering from the Layers panel.
   * `targetPanelIndex` is the FINAL position in panel order (0 = topmost
   * layer = highest canvas index). Fabric's moveObjectTo uses remove-then-
   * insert semantics, so the final index equals the requested index no matter
   * which direction the layer travels.
   */
  reorderLayer(id: string, targetPanelIndex: number) {
    const canvas = this.canvas;
    if (!canvas || this.cropMode) return;
    const o = this.findById(id);
    if (!o) return;
    const count = canvas.getObjects().length;
    const clamped = Math.max(0, Math.min(count - 1, targetPanelIndex));
    const targetCanvasIndex = count - 1 - clamped; // panel order is reversed
    if (canvas.getObjects().indexOf(o) === targetCanvasIndex) return;
    canvas.moveObjectTo(o, targetCanvasIndex);
    canvas.requestRenderAll();
    this.onChanged();
  }

  /**
   * Selects multiple layers from the panel (Ctrl/Shift-click) as one
   * ActiveSelection so they can be moved / grouped together. Locked and
   * hidden layers are skipped — they cannot participate in a live selection.
   */
  selectLayers(ids: string[]) {
    const canvas = this.canvas;
    if (!canvas) return;
    const wanted = new Set(ids);
    const objs = canvas
      .getObjects()
      .filter((o) => {
        const g = o as Gaia;
        return g.id !== undefined && wanted.has(g.id) && !g.locked && o.visible !== false;
      });
    canvas.discardActiveObject();
    if (objs.length === 1) {
      canvas.setActiveObject(objs[0]);
    } else if (objs.length > 1) {
      canvas.setActiveObject(new fabric.ActiveSelection(objs, { canvas }));
    }
    canvas.requestRenderAll();
    this.syncSelection();
  }

  deleteLayer(id: string) {
    const o = this.findById(id);
    if (!o || !this.canvas) return;
    if (this.canvas.getActiveObject() === o) this.canvas.discardActiveObject();
    this.canvas.remove(o);
    this.canvas.requestRenderAll();
  }

  // -- selection sync -------------------------------------------------------

  private syncSelection() {
    const canvas = this.canvas;
    if (!canvas) return;
    const objs = canvas.getActiveObjects();
    if (!objs.length) {
      useEditorStore.getState().set({ selection: null, activeIds: [] });
      return;
    }
    const a = canvas.getActiveObject() as fabric.FabricObject & Record<string, unknown>;
    const type = a.type;
    const isText = type === 'textbox' || type === 'i-text' || type === 'text' || isCurvedTextGroup(a);
    const fontWeight = a.fontWeight as string | number | undefined;
    const br = a.getBoundingRect();
    const info: SelectionInfo = {
      count: objs.length,
      isText,
      isImage: type === 'image',
      isQr: this.isQrObject(a as Gaia),
      isGroup: type === 'group',
      isShape: SHAPE_TYPES.includes(type),
      type,
      fill: typeof a.fill === 'string' ? a.fill : '#000000',
      stroke: typeof a.stroke === 'string' ? a.stroke : '',
      strokeWidth: (a.strokeWidth as number) ?? 0,
      opacity: (a.opacity as number) ?? 1,
      blend: (a.globalCompositeOperation as string) || 'source-over',
      angle: (a.angle as number) ?? 0,
      cornerRadius: type === 'rect' ? ((a.rx as number) ?? 0) : 0,
      hasCornerRadius: type === 'rect',
      widthIn: br.width / EDITOR_PPI,
      heightIn: br.height / EDITOR_PPI,
      leftIn: (br.left - this.trim.left) / EDITOR_PPI,
      topIn: (br.top - this.trim.top) / EDITOR_PPI,
      lockAspect: !!(a as Gaia).gaiaLockAspect,
      fontFamily: (a.fontFamily as string) ?? DEFAULT_FONT,
      fontSize: (a.fontSize as number) ?? 20,
      fontWeight:
        fontWeight === 'bold' || Number(fontWeight) >= 700
          ? 'bold'
          : Number(fontWeight) >= 600
            ? '600'
            : 'normal',
      bold: fontWeight === 'bold' || Number(fontWeight) >= 700,
      italic: a.fontStyle === 'italic',
      underline: !!a.underline,
      linethrough: !!(a as Record<string, unknown>).linethrough,
      textAlign: (a.textAlign as string) ?? 'left',
      textTransform: (a as Record<string, unknown>).textTransform as string ?? 'none',
      lineHeight: (a.lineHeight as number) ?? 1.16,
      charSpacing: (a.charSpacing as number) ?? 0,
      curve: (a as Gaia).gaiaCurve ?? 0,
      curveMode: (a as Gaia).gaiaCurveMode ?? 'wave',
      circleSide: (a as Gaia).gaiaCircleSide ?? null,
      fontLoading: false,
      adjust: readAdjust(a),
    };
    const activeIds = objs.map((o) => (o as Gaia).id ?? '');
    const store = useEditorStore.getState();
    if (
      shallowEqual(store.selection as Record<string, unknown> | null, info as unknown as Record<string, unknown>) &&
      arrayEqual(store.activeIds, activeIds)
    ) return;
    store.set({ selection: info, activeIds });
  }

  // -- view / export --------------------------------------------------------

  setOverlayVisible(v: boolean) {
    this.overlayVisible = v;
    useEditorStore.getState().set({ overlayVisible: v });
    this.canvas?.requestRenderAll();
  }

  /**
   * Temporarily hides the bleed/safe-zone overlay, executes fn() synchronously,
   * then restores the overlay. Ensures the pink cut line and blue safe zone never
   * bleed into thumbnails or exported PNGs regardless of the Fabric rendering path.
   */
  private withoutOverlay<T>(fn: () => T): T {
    const wasOverlay = this.overlayVisible;
    const wasGrid = this.gridEnabled;
    const wasOutlines = this.textBoxOutlines;
    if (wasOverlay || wasGrid || wasOutlines) {
      this.overlayVisible = false;
      this.gridEnabled = false;
      this.textBoxOutlines = false;
      // Synchronous re-render so the main canvas is clean before toDataURL reads it.
      this.canvas?.renderAll();
    }
    try {
      return fn();
    } finally {
      this.overlayVisible = wasOverlay;
      this.gridEnabled = wasGrid;
      this.textBoxOutlines = wasOutlines;
      if (wasOverlay || wasGrid || wasOutlines) {
        this.canvas?.requestRenderAll();
      }
    }
  }

  setGuidesEnabled(v: boolean) {
    this.guidesEnabled = v;
    useEditorStore.getState().set({ guidesEnabled: v });
  }

  setGridEnabled(v: boolean) {
    this.gridEnabled = v;
    useEditorStore.getState().set({ gridEnabled: v });
    this.canvas?.requestRenderAll();
  }

  setTextBoxOutlines(v: boolean) {
    this.textBoxOutlines = v;
    useEditorStore.getState().set({ textBoxOutlines: v });
    this.canvas?.requestRenderAll();
  }

  setSpellCheckEnabled(v: boolean) {
    this.spellCheckEnabled = v;
    useEditorStore.getState().set({ spellCheckEnabled: v });
    this.applySpellCheckToEditor(this.canvas?.getActiveObject());
  }

  private applySpellCheckToEditor(target?: fabric.FabricObject | null) {
    const enabled = this.spellCheckEnabled;
    const fromTarget = (
      target as (fabric.FabricObject & { hiddenTextarea?: HTMLTextAreaElement }) | null | undefined
    )?.hiddenTextarea;
    if (fromTarget) {
      fromTarget.spellcheck = enabled;
      return;
    }
    const wrap =
      (this.canvas as fabric.Canvas & { wrapperEl?: HTMLElement } | null)?.wrapperEl ??
      this.canvas?.getElement()?.parentElement;
    wrap?.querySelectorAll('textarea').forEach((el) => {
      el.spellcheck = enabled;
    });
  }

  private drawTextBoxOutlines() {
    const canvas = this.canvas;
    if (!canvas) return;
    const ctx = canvas.getContext();
    ctx.save();
    ctx.strokeStyle = 'rgba(15, 46, 83, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    for (const o of canvas.getObjects()) {
      if (!isTextObject(o) || o.visible === false) continue;
      const br = o.getBoundingRect();
      ctx.strokeRect(br.left + 0.5, br.top + 0.5, br.width, br.height);
    }
    ctx.restore();
  }

  /** Unlock the inner white disc so it appears in Layers and can be edited. */
  private promoteCircleLegibilityDisc() {
    if (!this.canvas) return;
    const isRound = this.template?.shape === 'circle' || this.template?.shape === 'oval';
    if (!isRound) return;
    for (const o of this.canvas.getObjects()) {
      const g = o as Gaia;
      if (!g.isLegibilityOverlay && g.gaiaKind !== 'overlay') continue;
      if (o.type !== 'circle' && o.type !== 'ellipse') continue;
      if (!g.id) g.id = uid();
      g.name = g.name || 'Legibility Overlay';
      applyCircleDiscInteractivity(g, false);
    }
  }

  setLegibilityOverlayVisible(v: boolean) {
    if (!this.canvas) return;
    // Both the structural overlay layer and any auto-layout legibility shape
    // carry the flag — toggle them together so the button always "just works".
    const overlays = this.canvas.getObjects().filter((o) => (o as Gaia).isLegibilityOverlay);
    if (!overlays.length) return;
    overlays.forEach((o) => o.set('visible', v));
    this.noteHistoryAction(v ? 'Show Legibility Overlay' : 'Hide Legibility Overlay');
    this.legibilityOverlayVisible = v;
    useEditorStore.getState().set({ legibilityOverlayVisible: v });
    this.canvas.requestRenderAll();
    this.refreshLayers();
    this.scheduleHistory();
    this.scheduleAutosave();
  }

  toggleLegibilityOverlay() {
    this.setLegibilityOverlayVisible(!this.legibilityOverlayVisible);
  }

  thumbnail(maxDim = 140): string | undefined {
    if (!this.canvas) return undefined;
    const mult = maxDim / Math.max(this.labelWpx, this.labelHpx);
    // Hide overlay so guide lines never appear in saved thumbnails.
    return this.withoutOverlay(() =>
      this.canvas!.toDataURL({
        left: this.bleedPx,
        top: this.bleedPx,
        width: this.labelWpx,
        height: this.labelHpx,
        multiplier: mult,
        format: 'png',
      }),
    );
  }

  /** PNG of just the trim region at print resolution (used by the PDF engine). */
  exportLabelPng(ppi = EXPORT_PPI): string {
    if (!this.canvas) return '';
    this.canvas.discardActiveObject();
    // Hide overlay so the pink cut line and blue safe zone never appear in exports.
    return this.withoutOverlay(() =>
      this.canvas!.toDataURL({
        left: this.bleedPx,
        top: this.bleedPx,
        width: this.labelWpx,
        height: this.labelHpx,
        multiplier: Math.max(4, ppi / EDITOR_PPI),
        format: 'png',
      }),
    );
  }

  hasContent(): boolean {
    return (
      !!this.canvas &&
      this.canvas.getObjects().filter((o) => !String((o as Gaia).gaiaKind ?? '').startsWith('__')).length > 0
    );
  }

  /**
   * Rasterizes serialized canvas JSON on a temporary off-screen Fabric canvas
   * and returns a print-resolution PNG of the trim area.
   *
   * Works without a live editor, so the Export and Batch screens can render
   * saved designs after the main canvas has been disposed.
   *
   * @param mutate optional hook to tweak the revived objects before painting.
   */
  async renderDesignPng(
    canvasJson: string,
    template: AveryTemplate,
    _settings: AppSettings,
    ppi = EXPORT_PPI,
    mutate?: (canvas: fabric.Canvas) => void,
  ): Promise<string> {
    const bleedPx = resolvePrintGuides(template).bleedIn * EDITOR_PPI;
    const labelW  = template.labelWidthIn  * EDITOR_PPI;
    const labelH  = template.labelHeightIn * EDITOR_PPI;
    const totalW  = Math.round(labelW  + bleedPx * 2);
    const totalH  = Math.round(labelH  + bleedPx * 2);

    // Ensure Fabric custom properties are registered even when the main canvas
    // has already been disposed (e.g. navigating from editor to export screen).
    configureFabricOnce();

    const el = document.createElement('canvas');
    el.width  = totalW;
    el.height = totalH;

    const fc = new fabric.Canvas(el, {
      width: totalW,
      height: totalH,
      backgroundColor: '#ffffff',
      renderOnAddRemove: false,
    });
    try {
      const parsed = JSON.parse(canvasJson) as { objects?: unknown[] };
      await fc.loadFromJSON(parsed);
      // Restore white background in case the serialised JSON omitted it.
      if (!fc.backgroundColor) fc.backgroundColor = '#ffffff';
      mutate?.(fc);
      fc.discardActiveObject();
      // renderAll() is synchronous — ensures every mutation is painted before
      // toDataURL() reads pixel data (requestRenderAll uses rAF, which is async).
      fc.renderAll();
      return fc.toDataURL({
        left:       bleedPx,
        top:        bleedPx,
        width:      labelW,
        height:     labelH,
        multiplier: ppi / EDITOR_PPI,
        format:     'png',
      });
    } finally {
      fc.dispose();
      el.remove();
    }
  }

  /**
   * Same as renderDesignPng but swaps one text object's content first.
   * Used by Quick Variant on the Export screen.
   */
  exportVariantPng(
    canvasJson: string,
    targetId: string,
    replacement: string,
    template: AveryTemplate,
    settings: AppSettings,
    ppi = EXPORT_PPI,
  ): Promise<string> {
    return this.renderDesignPng(canvasJson, template, settings, ppi, (fc) => {
      const target = fc.getObjects().find((o) => (o as Gaia).id === targetId) as
        | (fabric.FabricObject & { text?: string })
        | undefined;
      if (target && 'text' in target) {
        target.set({ text: replacement } as Partial<fabric.FabricObject>);
      }
    });
  }


  // -- background & auto-layout helpers -------------------------------------

  /**
   * Loads an image from a URL and slots it into the Background layer of the
   * strict 4-layer stack (replacing the placeholder or a previous image).
   * Safe to call on fresh canvases immediately after addDefaultLayers().
   */
  async setBackgroundFromUrl(url: string): Promise<void> {
    if (!this.canvas || !url) return;
    let img: fabric.FabricImage & Gaia;
    try {
      img = (await fabric.FabricImage.fromURL(url, {
        crossOrigin: 'anonymous',
      })) as fabric.FabricImage & Gaia;
    } catch {
      const res = await fetch(url);
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      img = (await fabric.FabricImage.fromURL(dataUrl)) as fabric.FabricImage & Gaia;
    }
    if (!this.canvas) return; // disposed while the image was loading

    const cw = this.canvas.getWidth();
    const ch = this.canvas.getHeight();
    const iw = img.width || 1;
    const ih = img.height || 1;
    // Cover mode: scale so the image fills the entire canvas (incl. bleed).
    const scale = Math.max(cw / iw, ch / ih);

    img.set({
      originX: 'center',
      originY: 'center',
      left: this.trim.cx,
      top: this.trim.cy,
      scaleX: scale,
      scaleY: scale,
    });
    this.insertBackgroundImage(img);
  }

  /**
   * Reads the active recipe from the app store, fetches its ingredients,
   * and runs the auto-layout engine for the given (or current) label context.
   * Exposed on window.gaiaEditor so EditorScreen can call it once on mount.
   * Pass an explicit context (e.g. `'back'`) to override this.context.
   */
  async applyAutoLayout(context?: LabelContext, lang?: import('@/lib/layoutEngine').LayoutLang): Promise<void> {
    if (!this.canvas || !this.template) return;
    const isRound = this.template.shape === 'circle' || this.template.shape === 'oval';
    const { activeRecipeId } = useAppStore.getState();

    const [stored, ingredients] = await Promise.all([
      activeRecipeId ? recipesRepo.get(activeRecipeId) : Promise.resolve(undefined),
      ingredientsRepo.all(),
    ]);
    // Rectangles still need a saved recipe. Circles always run layoutCircleLabel —
    // empty fields fall through to LABEL_STRINGS (addHint, defaults). Product name
    // is left blank unless the user already typed it.
    if (!stored && !isRound) return;

    // Dynamic import breaks the layoutEngine → editorController → layoutEngine cycle.
    const { applyAutoLayout: runLayout } = await import('@/lib/layoutEngine');
    const recipe = stored ?? {
      id: '',
      name: '',
      ingredientIds: [],
      benefit: '',
      createdAt: 0,
      updatedAt: 0,
    };
    const appSettings = useAppStore.getState().settings;
    await runLayout(recipe, ingredients, context ?? this.context, lang, appSettings);
  }

  // -- helpers used by the auto-layout engine -------------------------------

  addCustom(obj: fabric.FabricObject, kind: string, name?: string, select = false) {
    this.tag(obj as Gaia, kind, name);
    this.place(obj as Gaia, select);
    return obj;
  }

  clearContent() {
    const canvas = this.canvas;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas
      .getObjects()
      .filter((o) => !String((o as Gaia).gaiaKind ?? '').startsWith('__'))
      .forEach((o) => canvas.remove(o));
    canvas.requestRenderAll();
  }

  getObjectsByKind(kind: string) {
    return (this.canvas?.getObjects() ?? []).filter((o) => (o as Gaia).gaiaKind === kind);
  }

  // -- mobile editor (3-layer controls) ---------------------------------------

  getMobileLegibilityState(): { opacity: number; tone: 'light' | 'dark'; visible: boolean } {
    const overlays = (this.canvas?.getObjects() ?? []).filter((o) => (o as Gaia).isLegibilityOverlay);
    const first = overlays[0];
    if (!first) {
      return { opacity: 0.15, tone: 'light', visible: this.legibilityOverlayVisible };
    }
    const fill = String(first.fill ?? '#ffffff').toLowerCase();
    const tone = fill === '#000000' || fill === 'black' || fill === '#000' ? 'dark' : 'light';
    return {
      opacity: (first.opacity as number) ?? 0.15,
      tone,
      visible: this.legibilityOverlayVisible,
    };
  }

  setMobileLegibilityOpacity(opacity: number) {
    if (!this.canvas) return;
    const v = Math.max(0, Math.min(1, opacity));
    this.canvas
      .getObjects()
      .filter((o) => (o as Gaia).isLegibilityOverlay)
      .forEach((o) => o.set('opacity', v));
    this.canvas.requestRenderAll();
    this.refreshLayers();
    this.scheduleHistory();
    this.scheduleAutosave();
  }

  setMobileLegibilityTone(tone: 'light' | 'dark') {
    if (!this.canvas) return;
    const fill = tone === 'dark' ? '#000000' : '#ffffff';
    this.canvas
      .getObjects()
      .filter((o) => (o as Gaia).isLegibilityOverlay)
      .forEach((o) => o.set('fill', fill));
    this.canvas.requestRenderAll();
    this.refreshLayers();
    this.scheduleHistory();
    this.scheduleAutosave();
  }

  getMobileTextFill(): string {
    const texts = (this.canvas?.getObjects() ?? []).filter(isTextObject);
    if (!texts.length) return '#1e293b';
    return String(texts[0].fill ?? '#1e293b');
  }

  /** Multiplies every text object's font size (call with ratio, e.g. 1.05 / 0.95). */
  scaleAllTextBy(factor: number) {
    if (!this.canvas || factor <= 0 || !Number.isFinite(factor)) return;
    this.canvas.getObjects().filter(isTextObject).forEach((o) => {
      const applySize = (tb: fabric.Textbox) => {
        const size = (tb.fontSize as number) ?? 14;
        tb.set('fontSize', Math.max(6, size * factor));
        if (typeof tb.initDimensions === 'function') tb.initDimensions();
      };
      if (isCurvedTextGroup(o)) {
        (o as fabric.Group).getObjects().forEach((c) => applySize(c as fabric.Textbox));
      } else {
        applySize(o as fabric.Textbox);
      }
      const curve = (o as Gaia).gaiaCurve;
      if (typeof curve === 'number' && curve !== 0) {
        const next = applyCurveToText(o as fabric.Textbox, curve, this.circleCurveLayout(false));
        if (next !== o) this.replaceObject(o, next);
      }
    });
    this.canvas.requestRenderAll();
    this.syncSelection();
    this.scheduleHistory();
    this.scheduleAutosave();
  }

  setAllTextFill(color: string) {
    if (!this.canvas) return;
    this.canvas.getObjects().filter(isTextObject).forEach((o) => {
      if (isCurvedTextGroup(o)) {
        (o as fabric.Group).getObjects().forEach((c) => c.set('fill', color));
      }
      o.set('fill', color);
    });
    this.canvas.requestRenderAll();
    this.syncSelection();
    this.scheduleHistory();
    this.scheduleAutosave();
  }

  private imageFilePicker: (() => void) | null = null;

  /** LeftRail registers the hidden file input opener for the Image tool (I). */
  registerImageFilePicker(fn: () => void) {
    this.imageFilePicker = fn;
  }

  triggerImageUpload() {
    this.imageFilePicker?.();
  }

  /** Switch the active Photoshop-style tool and update canvas cursors. */
  setActiveTool(tool: EditorTool) {
    useEditorStore.getState().setActiveTool(tool);
    this.applyToolCursor(tool);
  }

  refreshToolCursor() {
    this.applyToolCursor(useEditorStore.getState().activeTool);
  }

  private applyToolCursor(tool: EditorTool) {
    const canvas = this.canvas;
    if (!canvas) return;
    const pan = tool === 'hand' || useEditorStore.getState().spacePanActive;
    canvas.selection = !pan && tool !== 'zoom';
    canvas.defaultCursor = pan ? 'grab' : tool === 'zoom' ? 'zoom-in' : 'default';
    canvas.hoverCursor = pan ? 'grab' : tool === 'zoom' ? 'zoom-in' : 'move';
  }

  private handleToolMouseDown(opt: fabric.TPointerEventInfo<fabric.TPointerEvent>) {
    const store = useEditorStore.getState();
    const tool = store.activeTool;
    if (tool === 'hand' || store.spacePanActive) return;
    if (opt.target && tool !== 'zoom') return;

    const pointer = this.canvas?.getScenePoint(opt.e as MouseEvent);
    if (!pointer) return;

    if (tool === 'text') {
      this.noteHistoryAction('Added text');
      const mode = store.textPlacementMode;
      this.addText('body');
      const active = this.canvas?.getActiveObject();
      if (active && isTextObject(active)) {
        active.set({ left: pointer.x, top: pointer.y, originX: 'center', originY: 'center' });
        if (mode === 'curved') {
          const next = applyCurveToText(active as fabric.Textbox, 40, this.circleCurveLayout(false));
          if (next !== active) this.replaceObject(active, next);
        }
        this.canvas?.requestRenderAll();
      }
      this.setActiveTool('move');
    } else if (tool === 'shape') {
      this.noteHistoryAction('Added shape');
      const kind = store.pendingShape;
      this.addShape(kind);
      const active = this.canvas?.getActiveObject();
      if (active) {
        active.set({ left: pointer.x, top: pointer.y, originX: 'center', originY: 'center' });
        this.canvas?.requestRenderAll();
      }
      this.setActiveTool('move');
    } else if (tool === 'eraser' && opt.target?.type === 'image') {
      this.removeBackgroundFromSelection();
    } else if (tool === 'zoom') {
      const alt = (opt.e as MouseEvent).altKey;
      const current = store.zoom;
      const factor = alt ? 1 / 1.25 : 1.25;
      store.set({ zoom: Math.max(0.05, Math.min(5, current * factor)) });
    }
  }

  /** Trims/isolates the selected photo — opens crop mode for edge cleanup. */
  removeBackgroundFromSelection(): boolean {
    const active = this.canvas?.getActiveObject();
    if (!active || active.type !== 'image') return false;
    this.noteHistoryAction('Remove background');
    this.startCrop();
    return true;
  }
}

export function isTextObject(o: fabric.FabricObject): boolean {
  return o.type === 'textbox' || o.type === 'i-text' || o.type === 'text' || isCurvedTextGroup(o);
}

// ── change-detection helpers ────────────────────────────────────────────────
// The canvas fires modification events on every pointer move. Comparing before
// writing to the store keeps React from re-rendering the panels 60×/second.

function arrayEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function shallowEqual(
  a: Record<string, unknown> | null,
  b: Record<string, unknown> | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => {
    const av = a[k];
    const bv = b[k];
    if (av && bv && typeof av === 'object' && typeof bv === 'object') {
      return shallowEqual(av as Record<string, unknown>, bv as Record<string, unknown>);
    }
    return av === bv;
  });
}

function layersEqual(a: LayerInfo[], b: LayerInfo[]): boolean {
  return (
    a.length === b.length &&
    a.every((l, i) => shallowEqual(l as unknown as Record<string, unknown>, b[i] as unknown as Record<string, unknown>))
  );
}

function guidesEqual(a: Guide[], b: Guide[]): boolean {
  return (
    a.length === b.length &&
    a.every((g, i) => g.vertical === b[i].vertical && g.pos === b[i].pos && g.center === b[i].center)
  );
}

// ── image adjustments ───────────────────────────────────────────────────────

/** Reads the stored adjustment amounts off an object (neutral for non-images). */
function readAdjust(o: fabric.FabricObject): ImageAdjust {
  if (o.type !== 'image') return NEUTRAL_ADJUST;
  return { ...NEUTRAL_ADJUST, ...(o as Gaia).gaiaAdjust };
}

/** Neutral amounts are omitted so untouched images skip filtering entirely. */
function buildFilters(adjust: ImageAdjust): fabric.filters.BaseFilter<string>[] {
  const out: fabric.filters.BaseFilter<string>[] = [];
  if (adjust.brightness) out.push(new fabric.filters.Brightness({ brightness: adjust.brightness }));
  if (adjust.contrast) out.push(new fabric.filters.Contrast({ contrast: adjust.contrast }));
  if (adjust.saturation) out.push(new fabric.filters.Saturation({ saturation: adjust.saturation }));
  if (adjust.tint) {
    out.push(new fabric.filters.BlendColor({ color: adjust.tint, mode: 'tint', alpha: 0.45 }));
  }
  return out;
}

function defaultName(kind: string) {
  const map: Record<string, string> = {
    logo: 'Logo',
    background: 'Background',
    base: 'Base',
    overlay: 'Legibility Overlay',
    photo: 'Photo',
    ai: 'AI Image',
    stock: 'Stock Photo',
    image: 'Image',
    qr: 'QR Code',
    text: 'Text',
    shape: 'Shape',
    group: 'Group',
  };
  return map[kind] ?? 'Layer';
}

function shapeName(kind: string) {
  const map: Record<string, string> = {
    rect: 'Rectangle',
    roundRect: 'Rounded rectangle',
    circle: 'Circle',
    triangle: 'Triangle',
    line: 'Line',
    star: 'Star',
    arrow: 'Arrow',
    hexagon: 'Hexagon',
  };
  return map[kind] ?? 'Shape';
}

function layerHistoryName(o?: fabric.FabricObject | null): string {
  if (!o) return '';
  const g = o as Gaia;
  return String(g.name || g.gaiaKind || o.type || '').trim();
}

function historyWithLayer(verb: string, o?: fabric.FabricObject | null): string {
  const name = layerHistoryName(o);
  return name ? `${verb} ${name}` : verb;
}

function historyLabelForProps(patch: Record<string, unknown>): string {
  if ('fontFamily' in patch || 'fontSize' in patch) return 'Font';
  if ('fill' in patch || 'stroke' in patch || 'strokeWidth' in patch) return 'Color';
  if ('fontWeight' in patch || 'fontStyle' in patch || 'underline' in patch || 'linethrough' in patch) {
    return 'Style';
  }
  if ('textAlign' in patch) return 'Align';
  if ('opacity' in patch) return 'Opacity';
  if ('gaiaCurve' in patch || 'curve' in patch) return 'Curve';
  if ('charSpacing' in patch || 'lineHeight' in patch) return 'Spacing';
  return 'Change';
}

function starPolygon(cx: number, cy: number, points: number, outerR: number, innerR: number) {
  const out: { x: number; y: number }[] = [];
  const step = Math.PI / points;
  let angle = -Math.PI / 2;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    out.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    angle += step;
  }
  return out;
}

function regularPolygon(cx: number, cy: number, sides: number, r: number) {
  const out: { x: number; y: number }[] = [];
  const start = -Math.PI / 2;
  for (let i = 0; i < sides; i++) {
    const angle = start + (i * 2 * Math.PI) / sides;
    out.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return out;
}

function arrowPolygon(width: number, height: number) {
  const head = width * 0.38;
  const shaftH = height * 0.42;
  return [
    { x: -width / 2, y: -shaftH / 2 },
    { x: width / 2 - head, y: -shaftH / 2 },
    { x: width / 2 - head, y: -height / 2 },
    { x: width / 2, y: 0 },
    { x: width / 2 - head, y: height / 2 },
    { x: width / 2 - head, y: shaftH / 2 },
    { x: -width / 2, y: shaftH / 2 },
  ];
}

function clip(text: string) {
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > 24 ? `${t.slice(0, 24)}…` : t || 'Text';
}

export const editor = new EditorController();

// Handy for debugging and automated smoke tests.
if (typeof window !== 'undefined') {
  (window as unknown as { gaiaEditor: EditorController }).gaiaEditor = editor;
}

export {
  applyTextMapToCanvasJson,
  parseTextObjectsFromJson,
  readCanvasLabelLanguage,
  writeCanvasLabelLanguage,
} from './canvasTextJson';

/** Collect translatable text from a live Fabric canvas (groups + curved labels). */
export function parseTextObjectsFromCanvas(
  canvas: { getObjects: () => fabric.FabricObject[] } | null | undefined,
): Array<{ id: string; text: string }> {
  if (!canvas) return [];
  const out: Array<{ id: string; text: string }> = [];
  const visit = (o: fabric.FabricObject) => {
    const g = o as Gaia;
    if (isCurvedTextGroup(o)) {
      const first = (o as fabric.Group).getObjects().find((child) =>
        child.type === 'textbox' || child.type === 'i-text' || child.type === 'text',
      ) as { text?: string } | undefined;
      const text = (g.gaiaCurveSourceText ?? first?.text ?? '').trim();
      if (text) out.push({ id: g.id ?? '', text });
      return;
    }
    if (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text') {
      const text = String((o as { text?: string }).text ?? '').trim();
      if (text) out.push({ id: g.id ?? '', text });
      return;
    }
    if (o.type === 'group') {
      (o as fabric.Group).getObjects().forEach(visit);
    }
  };
  for (const o of canvas.getObjects()) visit(o);
  return out;
}
