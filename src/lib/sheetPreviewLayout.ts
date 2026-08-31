import type { AveryTemplate } from '@/types';
import { footprintHeightIn, footprintWidthIn, slotPositionIn } from '@/lib/units';

/** One die-cut on the sheet, in inches from the page top-left. */
export interface SheetPreviewSlot {
  idx: number;
  col: number;
  row: number;
  xIn: number;
  yIn: number;
  wIn: number;
  hIn: number;
}

/** Grid slots matching Avery columns × rows (print geometry, not CSS pixels). */
export function sheetPreviewSlots(template: AveryTemplate): SheetPreviewSlot[] {
  const wIn = footprintWidthIn(template);
  const hIn = footprintHeightIn(template);
  const slots: SheetPreviewSlot[] = [];
  let idx = 0;
  for (let row = 0; row < template.rows; row++) {
    for (let col = 0; col < template.columns; col++) {
      const { xIn, yIn } = slotPositionIn(template, col, row);
      slots.push({ idx, col, row, xIn, yIn, wIn, hIn });
      idx++;
    }
  }
  return slots;
}

export function sheetPreviewCluster(slots: SheetPreviewSlot[]) {
  const minX = Math.min(...slots.map((s) => s.xIn));
  const minY = Math.min(...slots.map((s) => s.yIn));
  const maxX = Math.max(...slots.map((s) => s.xIn + s.wIn));
  const maxY = Math.max(...slots.map((s) => s.yIn + s.hIn));
  return {
    minX,
    minY,
    maxX,
    maxY,
    widthIn: maxX - minX,
    heightIn: maxY - minY,
    centerXIn: (minX + maxX) / 2,
    centerYIn: (minY + maxY) / 2,
  };
}
