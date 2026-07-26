/**
 * Canonical Avery-style round label stack (e.g. 22562 print-to-the-edge):
 *
 *   1. Base tint (sage) + full-bleed Background image in the outer botanical ring
 *   2. Inner white Legibility disc (~66% diameter) at 70% opacity
 *   3. Formatted foreground text (Ingredients, Directions, Warning, Benefits,
 *      Handmade + contact, net weight) inscribed inside the disc
 *   4. Optional curved product name in the ring above the disc
 */
import * as fabric from 'fabric';
import type { AveryTemplate } from '@/types';
import { editor } from '@/lib/fabric/editorController';
import { EDITOR_PPI } from '@/lib/units';

/** Default base colour when no background image is loaded. */
export const CIRCLE_SAGE_BASE = '#c8d4c0';

/** Inner legibility disc opacity (Avery reference). */
export const CIRCLE_LEGIBILITY_OPACITY = 0.7;

/**
 * Inner disc radius as a fraction of label width — 0.33 → 66% diameter disc,
 * leaving the outer ~17% ring for background art and curved product name.
 */
export const CIRCLE_INNER_DISC_RATIO = 0.33;

/** Inscribed text box vs inner disc diameter. */
export const CIRCLE_TEXT_WIDTH_RATIO = 0.8;
export const CIRCLE_TEXT_HEIGHT_RATIO = 0.72;

export function isCircleTemplate(template: AveryTemplate | null | undefined): boolean {
  return template?.shape === 'circle' || template?.shape === 'oval';
}

export function circleInnerDiscRadiusPx(labelWpx: number): number {
  return labelWpx * CIRCLE_INNER_DISC_RATIO;
}

type GaiaObj = fabric.FabricObject & {
  gaiaKind?: string;
  gaiaPlaceholder?: boolean;
  isLegibilityOverlay?: boolean;
  name?: string;
  locked?: boolean;
};

/** True when a real (non-placeholder) background image is on the canvas. */
export function circleHasBackgroundImage(): boolean {
  return (
    editor.canvas?.getObjects().some((o) => {
      const g = o as GaiaObj;
      return g.gaiaKind === 'background' && !g.gaiaPlaceholder;
    }) ?? false
  );
}

/** Tint the structural base layer sage when the background slot is still empty. */
export function applyCircleBaseTint(): void {
  const canvas = editor.canvas;
  if (!canvas) return;
  canvas.backgroundColor = CIRCLE_SAGE_BASE;
  const structuralBase = canvas
    .getObjects()
    .find((o) => (o as GaiaObj).gaiaKind === 'base');
  if (structuralBase && !circleHasBackgroundImage()) {
    structuralBase.set('fill', CIRCLE_SAGE_BASE);
  }
}

/**
 * Ensures the structural overlay layer is the inner legibility disc — not a
 * full-label ellipse. Updates in place when possible.
 */
export function syncCircleLegibilityDisc(cx: number, cy: number, discRadius: number): void {
  const canvas = editor.canvas;
  if (!canvas) return;

  const existing = canvas
    .getObjects()
    .find((o) => (o as GaiaObj).gaiaKind === 'overlay') as GaiaObj | undefined;

  const props = {
    left: cx,
    top: cy,
    originX: 'center' as const,
    originY: 'center' as const,
    fill: '#ffffff',
    opacity: CIRCLE_LEGIBILITY_OPACITY,
    stroke: '',
    strokeWidth: 0,
    selectable: false,
    evented: false,
    lockMovementX: true,
    lockMovementY: true,
    lockRotation: true,
    lockScalingX: true,
    lockScalingY: true,
    hasControls: false,
  };

  if (existing) {
    if (existing.type === 'circle') {
      existing.set({ ...props, radius: discRadius });
    } else if (existing.type === 'ellipse') {
      existing.set({ ...props, rx: discRadius, ry: discRadius });
    } else {
      canvas.remove(existing);
      addDisc(canvas, cx, cy, discRadius, props);
    }
    existing.isLegibilityOverlay = true;
    existing.setCoords();
    return;
  }

  addDisc(canvas, cx, cy, discRadius, props);
}

function addDisc(
  canvas: fabric.Canvas,
  cx: number,
  cy: number,
  discRadius: number,
  props: Record<string, unknown>,
) {
  const disc = new fabric.Circle({
    ...props,
    left: cx,
    top: cy,
    radius: discRadius,
  }) as fabric.Circle & GaiaObj;
  disc.gaiaKind = 'overlay';
  disc.name = 'Legibility Overlay';
  disc.isLegibilityOverlay = true;
  disc.locked = true;
  canvas.add(disc);
  const bg = canvas.getObjects().find((o) => (o as GaiaObj).gaiaKind === 'background');
  if (bg) {
    canvas.moveObjectTo(disc, canvas.getObjects().indexOf(bg) + 1);
  }
}

/** Ring geometry for curved product name between disc edge and label edge. */
export function circleRingMetrics(safeWidth: number, safeHeight: number, discRadius: number) {
  const safeRadius = Math.min(safeWidth, safeHeight) / 2;
  const ringMid = (discRadius + safeRadius) / 2;
  const ringThickness = safeRadius - discRadius;
  const ringUsable = ringThickness >= (6 / 72) * EDITOR_PPI;
  return { safeRadius, ringMid, ringThickness, ringUsable };
}
