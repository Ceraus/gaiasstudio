import { Canvas, FabricObject, Rect } from "fabric";

export const BLEED_MASK_ROLE = "bleed-mask";
export const SNAP_THRESHOLD_PX = 8;
export const GUIDE_COLOR = "#e619c9"; // magenta, matches the Canva-style alignment guide convention

/** Every design object we create carries a stable id + role in its custom `data`, which
 * Fabric preserves through toJSON/loadFromJSON as long as we pass "data" to toJSON(). */
export interface FabricObjectData {
  id: string;
  role: "design" | "bleed-mask";
  name?: string;
}

export function withData<T extends FabricObject>(obj: T, data: Partial<FabricObjectData> = {}): T {
  const id = (obj as any).data?.id ?? crypto.randomUUID();
  (obj as any).data = { id, role: "design", ...data } as FabricObjectData;
  return obj;
}

export function getObjectData(obj: FabricObject | null | undefined): FabricObjectData | null {
  return obj ? ((obj as any).data ?? null) : null;
}

export function isBleedMask(obj: FabricObject): boolean {
  return getObjectData(obj)?.role === BLEED_MASK_ROLE;
}

/** Design objects are anything drawn by the user — i.e. not the bleed-mask overlay. */
export function getDesignObjects(canvas: Canvas): FabricObject[] {
  return canvas.getObjects().filter((o) => !isBleedMask(o));
}

/**
 * Hides bleed-mask objects for the duration of `fn` (used right before any
 * flattened export — PDF, thumbnail, etc.) then restores their visibility.
 */
export async function withExportGuardsHidden<T>(canvas: Canvas, fn: () => Promise<T> | T): Promise<T> {
  const masks = canvas.getObjects().filter(isBleedMask);
  masks.forEach((m) => m.set({ visible: false }));
  canvas.requestRenderAll();
  try {
    return await fn();
  } finally {
    masks.forEach((m) => m.set({ visible: true }));
    canvas.requestRenderAll();
  }
}

/**
 * Draws (or refreshes) the four semi-transparent gray "bleed zone" bands
 * inset from each edge of the label by `bleedInPx`. This is the visual
 * equivalent of Canva's print-safe-zone guide: everything inside the tinted
 * band risks being trimmed off during die-cutting, so non-technical users
 * instinctively keep text and logos clear of it without ever seeing the
 * word "bleed" spelled out in numbers.
 */
export function upsertBleedMask(canvas: Canvas, bleedInPx: number, visible: boolean) {
  const w = canvas.getWidth();
  const h = canvas.getHeight();

  const existing = canvas.getObjects().filter(isBleedMask);
  existing.forEach((o) => canvas.remove(o));

  if (bleedInPx <= 0) {
    canvas.requestRenderAll();
    return;
  }

  const common = {
    fill: "rgba(90, 90, 90, 0.35)",
    selectable: false,
    evented: false,
    excludeFromExport: false,
    visible,
    hoverCursor: "default",
  };

  const bands = [
    new Rect({ ...common, left: 0, top: 0, width: w, height: bleedInPx }), // top
    new Rect({ ...common, left: 0, top: h - bleedInPx, width: w, height: bleedInPx }), // bottom
    new Rect({ ...common, left: 0, top: 0, width: bleedInPx, height: h }), // left
    new Rect({ ...common, left: w - bleedInPx, top: 0, width: bleedInPx, height: h }), // right
  ];

  bands.forEach((band) => {
    withData(band, { role: "bleed-mask", name: "Print safe-zone" });
    canvas.add(band);
    canvas.bringObjectToFront(band);
  });
  canvas.requestRenderAll();
}

/**
 * Installs Canva-style smart alignment guides: while dragging an object,
 * magenta dashed lines appear (drawn on Fabric's transient `contextTop`
 * layer, so they never leak into exported images) whenever the object's
 * center or edges line up with the canvas center or another object.
 */
export function setupSmartGuides(canvas: Canvas) {
  const clearGuides = () => {
    const ctx = canvas.contextTop;
    if (ctx) canvas.clearContext(ctx);
  };

  const drawGuides = (vLines: number[], hLines: number[]) => {
    const ctx = canvas.contextTop;
    if (!ctx) return;
    canvas.clearContext(ctx);
    ctx.save();
    ctx.strokeStyle = GUIDE_COLOR;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    vLines.forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, canvas.getHeight());
      ctx.stroke();
    });
    hLines.forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(canvas.getWidth(), y + 0.5);
      ctx.stroke();
    });
    ctx.restore();
  };

  canvas.on("object:moving", (e) => {
    const target = e.target as FabricObject | undefined;
    if (!target || isBleedMask(target)) return;

    target.setCoords();
    const box = target.getBoundingRect();
    let centerX = box.left + box.width / 2;
    let centerY = box.top + box.height / 2;
    let left = box.left;
    let right = box.left + box.width;
    let top = box.top;
    let bottom = box.top + box.height;

    const vGuides: number[] = [];
    const hGuides: number[] = [];

    const canvasCenterX = canvas.getWidth() / 2;
    const canvasCenterY = canvas.getHeight() / 2;

    let dx = 0;
    let dy = 0;

    if (Math.abs(centerX - canvasCenterX) < SNAP_THRESHOLD_PX) {
      dx = canvasCenterX - centerX;
      vGuides.push(canvasCenterX);
    }
    if (Math.abs(centerY - canvasCenterY) < SNAP_THRESHOLD_PX) {
      dy = canvasCenterY - centerY;
      hGuides.push(canvasCenterY);
    }

    for (const other of canvas.getObjects()) {
      if (other === target || isBleedMask(other)) continue;
      const ob = other.getBoundingRect();
      const oCenterX = ob.left + ob.width / 2;
      const oCenterY = ob.top + ob.height / 2;
      const oLeft = ob.left;
      const oRight = ob.left + ob.width;
      const oTop = ob.top;
      const oBottom = ob.top + ob.height;

      if (dx === 0 && Math.abs(centerX - oCenterX) < SNAP_THRESHOLD_PX) {
        dx = oCenterX - centerX;
        vGuides.push(oCenterX);
      } else if (dx === 0 && Math.abs(left - oLeft) < SNAP_THRESHOLD_PX) {
        dx = oLeft - left;
        vGuides.push(oLeft);
      } else if (dx === 0 && Math.abs(right - oRight) < SNAP_THRESHOLD_PX) {
        dx = oRight - right;
        vGuides.push(oRight);
      }

      if (dy === 0 && Math.abs(centerY - oCenterY) < SNAP_THRESHOLD_PX) {
        dy = oCenterY - centerY;
        hGuides.push(oCenterY);
      } else if (dy === 0 && Math.abs(top - oTop) < SNAP_THRESHOLD_PX) {
        dy = oTop - top;
        hGuides.push(oTop);
      } else if (dy === 0 && Math.abs(bottom - oBottom) < SNAP_THRESHOLD_PX) {
        dy = oBottom - bottom;
        hGuides.push(oBottom);
      }
    }

    if (dx !== 0 || dy !== 0) {
      target.set({ left: (target.left ?? 0) + dx, top: (target.top ?? 0) + dy });
      target.setCoords();
    }

    if (vGuides.length || hGuides.length) {
      drawGuides(vGuides, hGuides);
    } else {
      clearGuides();
    }
  });

  canvas.on("mouse:up", clearGuides);
  canvas.on("object:modified", clearGuides);
}
