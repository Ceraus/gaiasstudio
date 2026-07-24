import { PDFDocument, degrees } from 'pdf-lib';
import type { AveryTemplate } from '@/types';
import {
  footprintHeightIn,
  footprintWidthIn,
  inToPt,
  slotPositionIn,
} from '@/lib/units';

export interface SheetLayoutSlot {
  col: number;
  row: number;
  page: number;
  xIn: number;
  yIn: number;
}

/** Computes how many sheets and which slots are used for a given quantity. */
export function planSheets(template: AveryTemplate, quantity: number, fillSheet: boolean) {
  const perSheet = template.perSheet;
  const total = fillSheet ? Math.ceil(Math.max(quantity, 1) / perSheet) * perSheet : quantity;
  const sheets = Math.max(1, Math.ceil(total / perSheet));
  const slots: SheetLayoutSlot[] = [];
  for (let i = 0; i < total; i++) {
    const slot = i % perSheet;
    const col = slot % template.columns;
    const row = Math.floor(slot / template.columns);
    const { xIn, yIn } = slotPositionIn(template, col, row);
    slots.push({ col, row, page: Math.floor(i / perSheet), xIn, yIn });
  }
  return { total, sheets, perSheet, slots };
}

export interface BuildPdfArgs {
  template: AveryTemplate;
  pngDataUrl: string;
  quantity: number;
  fillSheet: boolean;
}

/**
 * Stamps a flattened label PNG onto the exact Avery grid using pdf-lib.
 * Never uses window.print(); produces a true, dimension-accurate PDF.
 */
export async function buildLabelSheetPdf({
  template,
  pngDataUrl,
  quantity,
  fillSheet,
}: BuildPdfArgs): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const png = await doc.embedPng(pngDataUrl);

  const pageWpt = inToPt(template.pageWidthIn);
  const pageHpt = inToPt(template.pageHeightIn);
  const artWpt = inToPt(template.labelWidthIn);
  const artHpt = inToPt(template.labelHeightIn);
  const fwPt = inToPt(footprintWidthIn(template));
  const fhPt = inToPt(footprintHeightIn(template));

  const { total, perSheet } = planSheets(template, quantity, fillSheet);

  let page = doc.addPage([pageWpt, pageHpt]);
  for (let i = 0; i < total; i++) {
    const slot = i % perSheet;
    if (i > 0 && slot === 0) page = doc.addPage([pageWpt, pageHpt]);
    const col = slot % template.columns;
    const row = Math.floor(slot / template.columns);
    const { xIn, yIn } = slotPositionIn(template, col, row);
    const fx = inToPt(xIn);
    const fyBottom = pageHpt - inToPt(yIn) - fhPt;

    if (template.rotateForPrint) {
      page.drawImage(png, {
        x: fx + fwPt,
        y: fyBottom,
        width: artWpt,
        height: artHpt,
        rotate: degrees(90),
      });
    } else {
      page.drawImage(png, { x: fx, y: fyBottom, width: artWpt, height: artHpt });
    }
  }

  return doc.save();
}

export interface BatchItem {
  /** Flattened label PNG (data URL) at print resolution. */
  pngDataUrl: string;
  /** How many copies of this design to place on the sheet. */
  quantity: number;
}

/**
 * Expands a batch into the flat sequence of designs that will fill the sheet:
 * `[A, A, A, B, B, …]`. Kept separate from the PDF writer so the on-screen
 * preview and the printed sheet can never disagree about slot order.
 */
export function planBatchSlots(items: BatchItem[]): number[] {
  const order: number[] = [];
  items.forEach((item, i) => {
    for (let n = 0; n < Math.max(0, Math.floor(item.quantity)); n++) order.push(i);
  });
  return order;
}

/**
 * Stamps several *different* labels onto one Avery grid — the ink-saving batch
 * sheet. Designs are laid down in order and simply flow onto extra pages if the
 * quantities overflow, so a part-used sheet is never wasted.
 */
export async function buildMixedSheetPdf({
  template,
  items,
}: {
  template: AveryTemplate;
  items: BatchItem[];
}): Promise<Uint8Array> {
  const order = planBatchSlots(items);
  if (!order.length) throw new Error('Nothing selected to print');

  const doc = await PDFDocument.create();
  // Each distinct design is embedded once and re-drawn, keeping the PDF small
  // even when a sheet holds 80 stickers.
  const embedded = await Promise.all(items.map((item) => doc.embedPng(item.pngDataUrl)));

  const pageWpt = inToPt(template.pageWidthIn);
  const pageHpt = inToPt(template.pageHeightIn);
  const artWpt = inToPt(template.labelWidthIn);
  const artHpt = inToPt(template.labelHeightIn);
  const fwPt = inToPt(footprintWidthIn(template));
  const fhPt = inToPt(footprintHeightIn(template));
  const perSheet = template.perSheet;

  let page = doc.addPage([pageWpt, pageHpt]);
  for (let i = 0; i < order.length; i++) {
    const slot = i % perSheet;
    if (i > 0 && slot === 0) page = doc.addPage([pageWpt, pageHpt]);
    const col = slot % template.columns;
    const row = Math.floor(slot / template.columns);
    const { xIn, yIn } = slotPositionIn(template, col, row);
    const fx = inToPt(xIn);
    const fyBottom = pageHpt - inToPt(yIn) - fhPt;
    const png = embedded[order[i]];

    if (template.rotateForPrint) {
      page.drawImage(png, {
        x: fx + fwPt,
        y: fyBottom,
        width: artWpt,
        height: artHpt,
        rotate: degrees(90),
      });
    } else {
      page.drawImage(png, { x: fx, y: fyBottom, width: artWpt, height: artHpt });
    }
  }

  return doc.save();
}

/** Persistent per-prefix sequence so files are named PREFIX___01.pdf, PREFIX___02.pdf … */
export function peekExportName(prefix: string, ext = 'pdf'): string {
  const key = `gaia:seq:${prefix}`;
  const next = (Number(localStorage.getItem(key)) || 0) + 1;
  return `${prefix}___${String(next).padStart(2, '0')}.${ext}`;
}

export function bumpExportSeq(prefix: string) {
  const key = `gaia:seq:${prefix}`;
  const next = (Number(localStorage.getItem(key)) || 0) + 1;
  localStorage.setItem(key, String(next));
}

export function downloadBytes(bytes: Uint8Array, filename: string, mime = 'application/pdf') {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
