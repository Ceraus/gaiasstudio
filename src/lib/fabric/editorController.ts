import * as fabric from 'fabric';
import type { AppSettings, AveryTemplate, LabelContext } from '@/types';
import { EDITOR_PPI, EXPORT_PPI, ptToPx } from '@/lib/units';
import { DEFAULT_FONT } from '@/data/googleFonts';
import { loadFont } from '@/lib/fontManager';
import { versionsRepo, draftsRepo, recipesRepo, ingredientsRepo } from '@/db/repositories';
import { useEditorStore, type LayerInfo, type SelectionInfo, type SaveState } from '@/store/useEditorStore';
import { useAppStore } from '@/store/useAppStore';
import { configureFabricOnce, CUSTOM_PROPS } from './fabricConfig';
import {
  CIRCLE_INNER_DISC_RATIO,
  CIRCLE_LEGIBILITY_OPACITY,
  CIRCLE_SAGE_BASE,
  isCircleTemplate,
} from '@/lib/circleLabelTemplate';
import { drawBleedOverlay, type OverlayConfig } from './overlay';
import {
  computeResizeGuides,
  computeSnapGuides,
  drawGuides,
  type Guide,
  type TrimBox,
} from './snapping';
import { uid } from '@/lib/id';

type Gaia = fabric.FabricObject & {
  id?: string;
  name?: string;
  gaiaKind?: string;
  locked?: boolean;
  gaiaCurve?: number;
  gaiaLockAspect?: boolean;
  isLegibilityOverlay?: boolean;
  gaiaAdjust?: ImageAdjust;
  /** True on the empty "Background" slot rect (swapped for a real image later). */
  gaiaPlaceholder?: boolean;
};

/**
 * Structural layer kinds created by the strict 4-layer context initialization.
 * These survive auto-layouts (only foreground content is regenerated) and are
 * excluded from safe-zone fit checks.
 */
export const STRUCTURAL_KINDS = ['base', 'background', 'overlay'] as const;

/** Non-destructive image adjustments. All amounts are Fabric's -1…1 range. */
export interface ImageAdjust {
  brightness: number;
  contrast: number;
  saturation: number;
}

export const NEUTRAL_ADJUST: ImageAdjust = { brightness: 0, contrast: 0, saturation: 0 };

export type AddImageKind = 'photo' | 'logo' | 'ai' | 'stock' | 'background' | 'image';

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
  private legibilityOverlayVisible = true;
  private activeGuides: Guide[] = [];
  private isRestoring = false;

  private history: string[] = [];
  private historyIndex = -1;
  private historyTimer: ReturnType<typeof setTimeout> | null = null;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private initToken = 0;

  private cropRect: Gaia | null = null;
  private cropTarget: fabric.FabricImage | null = null;

  private adjustFrame: number | null = null;
  private pendingAdjust: (fabric.FabricImage & Gaia)[] = [];

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

    this.bleedPx = opts.settings.bleedIn * EDITOR_PPI;
    this.safePx = opts.settings.safeIn * EDITOR_PPI;
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

    // Force a minimum backing-store DPR of 3 so the canvas renders crisply on
    // all displays: 100% Windows scaling (DPR 1), 125–150% (DPR 1.25–1.5),
    // Retina (DPR 2+), and 4K (DPR 2–3).  Fabric reads this from its global
    // config singleton before initialising each canvas.
    if (typeof window !== 'undefined') {
      const dpr = Math.max(3, Math.round(window.devicePixelRatio ?? 1));
      fabric.config.configure({ devicePixelRatio: dpr });
    }

    const canvas = new fabric.Canvas(opts.el, {
      width: w,
      height: h,
      backgroundColor: '#ffffff',
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
    store.set({
      ready: true,
      overlayVisible: this.overlayVisible,
      guidesEnabled: this.guidesEnabled,
      legibilityOverlayVisible: this.legibilityOverlayVisible,
      zoom: 1,
      cropMode: false,
      saveState: 'idle',
    });

    if (opts.initialJson) {
      await this.load(opts.initialJson);
      if (token !== this.initToken || !this.canvas) return; // a newer init/dispose superseded us
      // Background chosen on the workflow step must apply even when a saved design exists.
      const { backgroundImageUrl: bgAfterLoad } = useAppStore.getState();
      if (bgAfterLoad) {
        await this.setBackgroundFromUrl(bgAfterLoad);
        useAppStore.getState().setBackgroundImageUrl(null);
        if (token !== this.initToken || !this.canvas) return;
      }
    } else {
      this.addDefaultLayers();
      // Inject background image chosen in the workflow Background step (fresh designs only).
      const { backgroundImageUrl } = useAppStore.getState();
      if (backgroundImageUrl) {
        await this.setBackgroundFromUrl(backgroundImageUrl);
        useAppStore.getState().setBackgroundImageUrl(null);
        if (token !== this.initToken || !this.canvas) return;
      }
    }

    // Sync legibility overlay visibility from canvas state (handles restored designs too).
    const legObj = this.canvas?.getObjects().find((o) => (o as Gaia).isLegibilityOverlay);
    this.legibilityOverlayVisible = legObj ? legObj.visible !== false : true;
    useEditorStore.getState().set({ legibilityOverlayVisible: this.legibilityOverlayVisible });

    this.history = [this.serialize()];
    this.historyIndex = 0;
    this.updateHistoryFlags();
    this.refreshLayers();
    canvas.requestRenderAll();
  }

  dispose() {
    this.initToken++;
    if (this.historyTimer) clearTimeout(this.historyTimer);
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    if (this.adjustFrame !== null) cancelAnimationFrame(this.adjustFrame);
    this.historyTimer = null;
    this.autosaveTimer = null;
    this.adjustFrame = null;
    this.pendingAdjust = [];
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
    }
    this.history = [];
    this.historyIndex = -1;
    this.activeGuides = [];
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
    const isRound = isCircleTemplate(this.template ?? null);
    const common = {
      left: this.trim.left,
      top: this.trim.top,
      originX: 'left' as const,
      originY: 'top' as const,
      fill: '#ffffff',
      opacity: isRound ? CIRCLE_LEGIBILITY_OPACITY : 0.15,
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
        ...EditorController.LOCKED_PROPS,
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
   * Populates a blank canvas with the STRICT 4-LAYER context stack:
   *   1 (bottom) Base — solid white covering the label trim zone.
   *   2          Background — the AI/photo background slot (an invisible
   *              placeholder until an image arrives, so the stack shape is
   *              always identical across Front / Back / Side contexts).
   *   3          Legibility Overlay — template-shaped white vector at 15%.
   *   4 (top)    Foreground — text (and later the transparent logo).
   */
  private addDefaultLayers() {
    if (!this.canvas) return;
    this.isRestoring = true;
    try {
      // Layer 1 — Base: sage for round labels, white for rectangular.
      const baseFill = isCircleTemplate(this.template ?? null) ? CIRCLE_SAGE_BASE : '#ffffff';
      const base = new fabric.Rect({
        left: this.trim.left,
        top: this.trim.top,
        width: this.labelWpx,
        height: this.labelHpx,
        fill: baseFill,
        stroke: '',
        strokeWidth: 0,
        originX: 'left',
        originY: 'top',
        ...EditorController.LOCKED_PROPS,
      }) as fabric.Rect & Gaia;
      base.id = uid();
      base.gaiaKind = 'base';
      base.name = 'Base';
      base.locked = true;
      this.canvas.add(base);

      if (isCircleTemplate(this.template ?? null)) {
        this.canvas.backgroundColor = CIRCLE_SAGE_BASE;
      }

      // Layer 2 — Background slot: fully transparent placeholder rect that a
      // real AI/photo background replaces in place (see insertBackgroundImage).
      const bgSlot = new fabric.Rect({
        left: this.trim.left,
        top: this.trim.top,
        width: this.labelWpx,
        height: this.labelHpx,
        fill: 'rgba(0,0,0,0)',
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
      overlay.locked = true;
      overlay.isLegibilityOverlay = true;
      this.canvas.add(overlay);

      // Layer 4 — Foreground: centred instructional placeholder text.
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
    canvas.on('object:added', () => this.onStructuralChange());
    canvas.on('object:removed', () => this.onStructuralChange());
    canvas.on('object:modified', () => {
      this.clearGuides();
      this.onChanged();
    });
    canvas.on('text:changed', () => {
      this.onChanged();
      this.syncSelection();
    });
    canvas.on('object:moving', (opt) => {
      if (!this.guidesEnabled || this.cropMode) {
        this.clearGuides();
        return;
      }
      const target = opt.target as fabric.FabricObject | undefined;
      if (!target) return;
      this.setGuides(computeSnapGuides(canvas, target, this.trim));
    });
    canvas.on('object:scaling', (opt) => {
      if (!this.guidesEnabled || this.cropMode) {
        this.clearGuides();
        return;
      }
      const target = opt.target as fabric.FabricObject | undefined;
      if (!target) return;
      this.setGuides(computeResizeGuides(canvas, target, this.trim));
    });
    canvas.on('mouse:up', () => {
      if (this.activeGuides.length) this.clearGuides();
    });
    canvas.on('after:render', (opt) => {
      // Only decorate the visible canvas, never export / offscreen renders.
      if (!this.canvas || opt.ctx !== this.canvas.getContext()) return;
      drawBleedOverlay(this.canvas, this.overlayConfig());
      drawGuides(this.canvas, this.activeGuides);
    });
  }

  private overlayConfig(): OverlayConfig {
    return {
      shape: this.template!.shape,
      bleedPx: this.bleedPx,
      safePx: this.safePx,
      cornerRadiusPx: (this.template!.cornerRadiusIn || 0) * EDITOR_PPI,
      visible: this.overlayVisible,
    };
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
    this.commitHistory();
    this.scheduleAutosave();
  }

  private scheduleHistory() {
    if (this.isRestoring) return;
    if (this.historyTimer) clearTimeout(this.historyTimer);
    this.historyTimer = setTimeout(() => this.commitHistory(), 350);
  }

  private commitHistory() {
    if (!this.canvas) return;
    const json = this.serialize();
    if (json === this.history[this.historyIndex]) return;
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(json);
    if (this.history.length > 60) this.history.shift();
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
        context: this.context,
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
    useEditorStore.getState().set({
      canUndo: this.historyIndex > 0,
      canRedo: this.historyIndex < this.history.length - 1,
    });
  }

  serialize(): string {
    const canvas = this.canvas!;
    // Detach curved-text paths before serializing so the JSON stays portable and
    // never trips loadFromJSON. Paths are rebuilt deterministically from
    // `gaiaCurve` on load.
    const detached: { obj: Gaia; path: unknown }[] = [];
    for (const o of canvas.getObjects()) {
      const g = o as Gaia & { path?: unknown };
      if (g.gaiaCurve && g.path) {
        detached.push({ obj: g, path: g.path });
        (g as { path?: unknown }).path = undefined;
      }
    }
    const json = JSON.stringify(canvas.toJSON());
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
    for (const o of this.canvas.getObjects()) {
      const g = o as Gaia;
      if (typeof g.gaiaCurve === 'number' && g.gaiaCurve !== 0 && isTextObject(o)) {
        applyCurveToText(o as fabric.Textbox, g.gaiaCurve);
      }
    }
  }

  async undo() {
    if (this.historyIndex <= 0) return;
    if (this.historyTimer) clearTimeout(this.historyTimer);
    this.historyIndex -= 1;
    await this.load(this.history[this.historyIndex]);
    this.updateHistoryFlags();
    this.scheduleAutosave();
  }

  async redo() {
    if (this.historyIndex >= this.history.length - 1) return;
    if (this.historyTimer) clearTimeout(this.historyTimer);
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

  /**
   * Slots a background image into the strict 4-layer stack: it REPLACES the
   * current background layer (the invisible placeholder or a previous image)
   * at the same stack position, so the order Base → Background → Legibility
   * Overlay → Foreground is always preserved. The layer arrives locked; it
   * can be unlocked from the Layers panel for repositioning.
   */
  private insertBackgroundImage(img: fabric.FabricImage & Gaia, name?: string) {
    const canvas = this.canvas!;
    img.set(EditorController.LOCKED_PROPS);
    img.id = uid();
    img.gaiaKind = 'background';
    img.name = name ?? 'Background';
    img.locked = true;
    img.gaiaPlaceholder = false;

    const existing = canvas
      .getObjects()
      .find((o) => (o as Gaia).gaiaKind === 'background') as Gaia | undefined;

    canvas.add(img);
    if (existing) {
      const slot = canvas.getObjects().indexOf(existing as fabric.FabricObject);
      canvas.remove(existing as fabric.FabricObject);
      canvas.moveObjectTo(img, slot);
    } else {
      // No slot (legacy design) — sit just above the base layer.
      const base = canvas.getObjects().find((o) => (o as Gaia).gaiaKind === 'base');
      canvas.moveObjectTo(img, base ? canvas.getObjects().indexOf(base) + 1 : 0);
    }
    canvas.requestRenderAll();
  }

  addText(kind: 'heading' | 'body' | string = 'body', text?: string) {
    if (!this.canvas) return;
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
    return t;
  }

  addShape(kind: 'rect' | 'circle' | 'triangle' | 'line') {
    if (!this.canvas) return;
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
    } else if (kind === 'circle') {
      obj = new fabric.Circle({ ...base, radius: size / 2 }) as fabric.Circle & Gaia;
    } else if (kind === 'triangle') {
      obj = new fabric.Triangle({ ...base, width: size, height: size }) as fabric.Triangle & Gaia;
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

  /** Bends the selected text along a circular arc. amount: -100…0…100. */
  setTextCurve(amount: number) {
    const canvas = this.canvas;
    if (!canvas) return;
    const o = canvas.getActiveObject();
    if (!o || !isTextObject(o)) return;
    applyCurveToText(o as fabric.Textbox, amount);
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
    canvas.requestRenderAll();
    this.onChanged();
  }

  async setActiveProps(patch: Record<string, unknown>) {
    const canvas = this.canvas;
    if (!canvas) return;
    const objs = canvas.getActiveObjects();
    if (!objs.length) return;

    if (typeof patch.fontFamily === 'string') {
      const sel = useEditorStore.getState().selection;
      if (sel) useEditorStore.getState().set({ selection: { ...sel, fontLoading: true } });
      await loadFont(patch.fontFamily);
    }

    for (const o of objs) {
      for (const [k, v] of Object.entries(patch)) {
        if (k === 'blend') o.set('globalCompositeOperation', v as GlobalCompositeOperation);
        else if (k === 'cornerRadius') {
          if (o.type === 'rect') {
            o.set('rx', v as number);
            o.set('ry', v as number);
          }
        } else o.set(k, v as never);
      }
      o.set('dirty', true);
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
    this.setImageAdjust(NEUTRAL_ADJUST);
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
  }

  toggleLayerVisible(id: string) {
    const o = this.findById(id);
    if (!o) return;
    o.set('visible', o.visible === false);
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
    this.canvas.requestRenderAll();
    this.refreshLayers();
    this.scheduleHistory();
    this.scheduleAutosave();
  }

  renameLayer(id: string, name: string) {
    const o = this.findById(id);
    if (!o) return;
    o.name = name;
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
    const isText = type === 'textbox' || type === 'i-text' || type === 'text';
    const fontWeight = a.fontWeight as string | number | undefined;
    const br = a.getBoundingRect();
    const info: SelectionInfo = {
      count: objs.length,
      isText,
      isImage: type === 'image',
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
      bold: fontWeight === 'bold' || Number(fontWeight) >= 700,
      italic: a.fontStyle === 'italic',
      underline: !!a.underline,
      linethrough: !!(a as Record<string, unknown>).linethrough,
      textAlign: (a.textAlign as string) ?? 'left',
      textTransform: (a as Record<string, unknown>).textTransform as string ?? 'none',
      lineHeight: (a.lineHeight as number) ?? 1.16,
      charSpacing: (a.charSpacing as number) ?? 0,
      curve: (a as Gaia).gaiaCurve ?? 0,
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
    const was = this.overlayVisible;
    if (was) {
      this.overlayVisible = false;
      // Synchronous re-render so the main canvas is clean before toDataURL reads it.
      this.canvas?.renderAll();
    }
    try {
      return fn();
    } finally {
      if (was) {
        this.overlayVisible = true;
        this.canvas?.requestRenderAll();
      }
    }
  }

  setGuidesEnabled(v: boolean) {
    this.guidesEnabled = v;
    useEditorStore.getState().set({ guidesEnabled: v });
  }

  setLegibilityOverlayVisible(v: boolean) {
    if (!this.canvas) return;
    // Both the structural overlay layer and any auto-layout legibility shape
    // carry the flag — toggle them together so the button always "just works".
    const overlays = this.canvas.getObjects().filter((o) => (o as Gaia).isLegibilityOverlay);
    if (!overlays.length) return;
    overlays.forEach((o) => o.set('visible', v));
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
    settings: AppSettings,
    ppi = EXPORT_PPI,
    mutate?: (canvas: fabric.Canvas) => void,
  ): Promise<string> {
    const bleedPx = (settings.bleedIn ?? 0.0625) * EDITOR_PPI;
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
    if (!this.canvas) return;
    const img = (await fabric.FabricImage.fromURL(url, {
      crossOrigin: 'anonymous',
    })) as fabric.FabricImage & Gaia;
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
    const { activeRecipeId } = useAppStore.getState();
    if (!activeRecipeId || !this.canvas || !this.template) return;

    const [recipe, ingredients] = await Promise.all([
      recipesRepo.get(activeRecipeId),
      ingredientsRepo.all(),
    ]);
    if (!recipe) return;

    // Dynamic import breaks the layoutEngine → editorController → layoutEngine cycle.
    const { applyAutoLayout: runLayout } = await import('@/lib/layoutEngine');
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
      const tb = o as fabric.Textbox;
      const size = (tb.fontSize as number) ?? 14;
      tb.set('fontSize', Math.max(6, size * factor));
      tb.initDimensions();
    });
    this.canvas.requestRenderAll();
    this.syncSelection();
    this.scheduleHistory();
    this.scheduleAutosave();
  }

  setAllTextFill(color: string) {
    if (!this.canvas) return;
    this.canvas.getObjects().filter(isTextObject).forEach((o) => o.set('fill', color));
    this.canvas.requestRenderAll();
    this.syncSelection();
    this.scheduleHistory();
    this.scheduleAutosave();
  }
}

export function isTextObject(o: fabric.FabricObject): boolean {
  return o.type === 'textbox' || o.type === 'i-text' || o.type === 'text';
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
  return out;
}

/**
 * Builds a smooth circular-arc path (approximated by a fine polyline so we never
 * fight SVG sweep-flag ambiguity). Positive amount arches the text upward
 * (a "smile"), negative arches it downward. Returns null for a straight line.
 */
export function buildCurvePath(width: number, amount: number): fabric.Path | null {
  const a = Math.max(-100, Math.min(100, amount)) / 100;
  if (a === 0 || width <= 0) return null;
  const dir = a < 0 ? -1 : 1;
  const theta = Math.abs(a) * Math.PI * 0.9; // total sweep, up to ~162°
  const radius = width / theta; // arc length ≈ width
  const steps = 72;
  const cosHalf = Math.cos(theta / 2);
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const ang = -theta / 2 + (theta * i) / steps;
    const x = radius * Math.sin(ang) + width / 2;
    const sag = radius * (Math.cos(ang) - cosHalf);
    const y = dir > 0 ? -sag : sag;
    d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `;
  }
  return new fabric.Path(d.trim(), { fill: '', stroke: '' });
}

/** Applies (or clears) a curved-text path on a text object and records the amount. */
export function applyCurveToText(text: fabric.Textbox, amount: number) {
  const g = text as fabric.Textbox & Gaia;
  const clamped = Math.max(-100, Math.min(100, Math.round(amount)));
  if (clamped === 0) {
    (text as { path?: unknown }).path = undefined;
    g.gaiaCurve = 0;
    text.set('objectCaching', true);
  } else {
    const width = text.width || 200;
    const path = buildCurvePath(width, clamped);
    if (path) {
      text.set({ path, pathAlign: 'center', pathStartOffset: 0, pathSide: 'left' } as never);
    }
    g.gaiaCurve = clamped;
    // Fabric sizes an object's cache canvas from the text box, which knows
    // nothing about how far the arc rises above it — a deeply curved headline
    // gets its ascenders sliced off along the arc. Rendering uncached costs a
    // little redraw time and is correct at any curve amount.
    text.set('objectCaching', false);
  }
  text.set('dirty', true);
}

function defaultName(kind: string) {
  const map: Record<string, string> = {
    logo: 'Logo',
    background: 'Background',
    base: 'Base',
    overlay: 'Legibility Overlay',
    photo: 'Photo',
    ai: 'AI image',
    stock: 'Stock photo',
    image: 'Image',
    text: 'Text',
    shape: 'Shape',
    group: 'Group',
  };
  return map[kind] ?? 'Layer';
}

function shapeName(kind: string) {
  const map: Record<string, string> = {
    rect: 'Rectangle',
    circle: 'Circle',
    triangle: 'Triangle',
    line: 'Line',
  };
  return map[kind] ?? 'Shape';
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

/** Parse text objects from serialized JSON without loading a full canvas. */
export function parseTextObjectsFromJson(canvasJson: string): Array<{ id: string; text: string }> {
  try {
    const parsed = JSON.parse(canvasJson) as { objects?: Array<{ type?: string; id?: string; text?: string }> };
    return (parsed.objects ?? [])
      .filter((o) => o.type === 'textbox' || o.type === 'i-text' || o.type === 'text')
      .map((o) => ({ id: o.id ?? '', text: (o.text ?? '').trim() }))
      .filter((o) => o.text);
  } catch {
    return [];
  }
}
