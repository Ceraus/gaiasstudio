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
