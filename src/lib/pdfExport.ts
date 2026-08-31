import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import type { AveryTemplate } from '@/types';
import { maskLabelPngForTemplate } from '@/lib/labelMask';
import {
  footprintHeightIn,
  footprintWidthIn,
  inToPt,
  slotPositionIn,
} from '@/lib/units';

interface SheetLayoutSlot {
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

interface BuildPdfArgs {
  template: AveryTemplate;
  pngDataUrl: string;
  quantity: number;
  fillSheet: boolean;
  /**
   * Optional lot/batch code (e.g. "L260726") stamped in small type just
   * inside the bottom edge of every label — soap-making traceability without
   * touching the design itself.
   */
  lotCode?: string;
}

const LOT_FONT_PT = 5;
const LOT_INSET_PT = inToPt(0.05); // sits inside the safe area

/**
 * Stamps a flattened label PNG onto the exact Avery grid using pdf-lib.
 * Never uses window.print(); produces a true, dimension-accurate PDF.
 */
export async function buildLabelSheetPdf({
  template,
  pngDataUrl,
  quantity,
  fillSheet,
  lotCode,
}: BuildPdfArgs): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const maskedPng = await maskLabelPngForTemplate(pngDataUrl, template);
  const png = await doc.embedPng(maskedPng);
  const lot = lotCode?.trim();
  const lotFont = lot ? await doc.embedFont(StandardFonts.Helvetica) : null;
  const lotColor = rgb(0.32, 0.35, 0.32);

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
      if (lot && lotFont) {
        // The artwork is rotated 90° CCW around its bottom-left corner, so the
        // design's bottom edge runs vertically along x = fx + fwPt. Rotate the
        // lot text the same way and center it along that edge.
        const tw = lotFont.widthOfTextAtSize(lot, LOT_FONT_PT);
        page.drawText(lot, {
          x: fx + fwPt - LOT_INSET_PT - LOT_FONT_PT,
          y: fyBottom + fhPt / 2 - tw / 2,
          size: LOT_FONT_PT,
          font: lotFont,
          color: lotColor,
          rotate: degrees(90),
        });
      }
    } else {
      page.drawImage(png, { x: fx, y: fyBottom, width: artWpt, height: artHpt });
      if (lot && lotFont) {
        const tw = lotFont.widthOfTextAtSize(lot, LOT_FONT_PT);
        page.drawText(lot, {
          x: fx + fwPt / 2 - tw / 2,
          y: fyBottom + LOT_INSET_PT,
          size: LOT_FONT_PT,
          font: lotFont,
          color: lotColor,
        });
      }
    }
  }

  return doc.save();
}

/** Suggested lot code for today, e.g. "L260726-A" without the suffix: "L260726". */
export function suggestLotCode(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `L${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
}

/**
 * A printer calibration page: print at 100% ("Actual size") and measure the
 * shapes — if the 1-inch square measures exactly 1 inch and the margin frame
 * sits 0.5" from every paper edge, label sheets will line up with the
 * die-cuts. Diagnoses the classic "my labels print 2 mm off" problem.
 */
export async function buildCalibrationPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.15, 0.2, 0.15);
  const accent = rgb(0.247, 0.404, 0.235);

  const W = inToPt(8.5);
  const H = inToPt(11);
  const page = doc.addPage([W, H]);

  // 0.5" margin frame.
  page.drawRectangle({
    x: inToPt(0.5), y: inToPt(0.5), width: W - inToPt(1), height: H - inToPt(1),
    borderColor: accent, borderWidth: 0.75,
  });

  // Title + instructions.
  page.drawText('Gaia\u2019s Essences \u2014 Printer Calibration', {
    x: inToPt(0.75), y: H - inToPt(1), size: 16, font: bold, color: ink,
  });
  const lines = [
    '1. Print this page at 100% / "Actual size" \u2014 NOT "Fit to page".',
    '2. Measure the square below with a ruler: it must be exactly 1 inch (25.4 mm) on each side.',
    '3. The outer frame must sit exactly 0.5 inch (12.7 mm) from every paper edge.',
    '4. If either is off, fix the printer scaling setting \u2014 label sheets will misalign until it is 100%.',
  ];
  lines.forEach((line, i) => {
    page.drawText(line, { x: inToPt(0.75), y: H - inToPt(1.35 + i * 0.28), size: 10, font, color: ink });
  });

  // The 1-inch reference square, centered horizontally.
  const sq = inToPt(1);
  const sqX = W / 2 - sq / 2;
  const sqY = H - inToPt(4.6);
  page.drawRectangle({ x: sqX, y: sqY, width: sq, height: sq, borderColor: ink, borderWidth: 1 });
  page.drawText('1 in \u00d7 1 in', {
    x: sqX + sq / 2 - font.widthOfTextAtSize('1 in \u00d7 1 in', 9) / 2,
    y: sqY - inToPt(0.25), size: 9, font, color: ink,
  });

  // Horizontal + vertical 5-inch rulers with 1/4" ticks, from the frame corner.
  const originX = inToPt(0.5);
  const originY = H - inToPt(0.5);
  for (let q = 0; q <= 20; q++) {
    const at = inToPt(0.5 + q / 4);
    const whole = q % 4 === 0;
    const len = whole ? inToPt(0.18) : inToPt(0.09);
    // Top ruler (measures across).
    page.drawLine({ start: { x: at, y: originY }, end: { x: at, y: originY - len }, thickness: whole ? 1 : 0.5, color: ink });
    if (whole && q > 0) {
      page.drawText(`${q / 4}"`, { x: at - 4, y: originY - len - 10, size: 7, font, color: ink });
    }
    // Left ruler (measures down).
    page.drawLine({ start: { x: originX, y: H - at }, end: { x: originX + len, y: H - at }, thickness: whole ? 1 : 0.5, color: ink });
    if (whole && q > 0) {
      page.drawText(`${q / 4}"`, { x: originX + len + 3, y: H - at - 2.5, size: 7, font, color: ink });
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
  const embedded = await Promise.all(
    items.map((item) => maskLabelPngForTemplate(item.pngDataUrl, template).then((url) => doc.embedPng(url))),
  );

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

/** Options for exported file names: `Gaia - Lavender Dream - v01.pdf` */
export interface ExportNameOptions {
  /** Brand segment — usually from Settings (defaults to "Gaia"). */
  brand?: string;
  /** Recipe or product name (middle segment). */
  recipeName?: string;
  /** Separate version counter per series (e.g. batch, variant). */
  series?: string;
  ext?: string;
}

function formatBrand(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Gaia's Essences";
  return trimmed.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function sanitizePart(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 48) || 'Label';
}

function seqStorageKey(opts: ExportNameOptions): string {
  const brand = (opts.brand ?? "Gaia's Essences").toLowerCase();
  const recipe = sanitizePart(opts.recipeName ?? 'Label').toLowerCase();
  const series = (opts.series ?? 'default').toLowerCase();
  return `${brand}|${recipe}|${series}`;
}

/** Preview the next export file name without incrementing the counter. */
export function peekExportName(opts: ExportNameOptions): string {
  const ext = opts.ext ?? 'pdf';
  const brand = formatBrand(opts.brand ?? "Gaia's Essences");
  const recipe = sanitizePart(opts.recipeName ?? 'Label');
  const key = `gaia:seq:${seqStorageKey(opts)}`;
  const next = (Number(localStorage.getItem(key)) || 0) + 1;
  const version = `Design Version ${String(next).padStart(2, '0')}`;
  return `${brand} – ${recipe} – ${version}.${ext}`;
}

export function bumpExportSeq(opts: ExportNameOptions) {
  const key = `gaia:seq:${seqStorageKey(opts)}`;
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
