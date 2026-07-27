// ---------------------------------------------------------------------------
// CLIENT receipt PDF generator — pdf-lib, 8.5" × 11" US Letter (612 × 792 pt).
//
// Naming note: `Receipt` records in the database are Rosa's EXPENSES (money
// she spends at suppliers — see the Finances screen). This module renders the
// SALES receipt she hands to a client when a Work Order is completed.
//
// Layout:
//   ┌──────────────────────────────────────────────┐
//   │  ████ brand band: business name   RECEIPT    │
//   │  Billed to / order number / dates            │
//   │  Item table (name · qty · unit · amount)     │
//   │  Subtotal / TOTAL box                        │
//   │  notes (optional)                            │
//   │  footer rule: address • contact • thank-you  │
//   └──────────────────────────────────────────────┘
//
// Inside Electron the PDF is written silently to
//   <Gaia's Save System>/work_orders/<Client_Name>_<ORD-xxx>.pdf
// (no "Save As" dialog); in the browser it downloads via a blob link.
// ---------------------------------------------------------------------------
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import type { AppSettings, WorkOrder, WorkOrderItem } from '@/types';

// US Letter in PDF points (72 pt / inch)
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54; // 0.75"

// Brand palette (mirrors tailwind gaia-600 / gaia-800 / slate tones)
const BRAND       = rgb(0.247, 0.404, 0.235); // #3f673c
const BRAND_DARK  = rgb(0.169, 0.259, 0.165); // #2b422a
const INK         = rgb(0.122, 0.161, 0.216); // slate-800
const MUTED       = rgb(0.4, 0.45, 0.5);      // slate-500
const LINE        = rgb(0.89, 0.91, 0.93);    // slate-200
const ROW_TINT    = rgb(0.965, 0.975, 0.96);  // gaia-50-ish

const money = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Replaces characters WinAnsi (Helvetica) can't encode so drawText never throws. */
const winAnsiSafe = (s: string) => s.replace(/[^\x20-\x7E¡-ÿ]/g, '?');

/** Truncates a string to fit a given width at a given font size. */
function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  const safe = winAnsiSafe(text);
  if (font.widthOfTextAtSize(safe, size) <= maxWidth) return safe;
  let out = safe;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

export interface ReceiptData {
  order: WorkOrder;
  items: WorkOrderItem[];
  settings: AppSettings;
}

/** Builds the receipt and returns the raw PDF bytes. */
export async function buildReceiptPdf({ order, items, settings }: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const businessName = settings.businessName?.trim() || "Gaia's Essences";
  doc.setTitle(`Receipt ${order.orderNumber} — ${order.clientName}`);
  doc.setAuthor(businessName);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H;

  const drawFooter = (p: PDFPage) => {
    const parts = [settings.businessAddress?.trim(), settings.contact?.trim()].filter(Boolean);
    p.drawLine({
      start: { x: MARGIN, y: 72 },
      end: { x: PAGE_W - MARGIN, y: 72 },
      thickness: 0.75,
      color: LINE,
    });
    p.drawText(winAnsiSafe(businessName), {
      x: MARGIN, y: 56, size: 9, font: bold, color: BRAND_DARK,
    });
    if (parts.length) {
      p.drawText(fitText(parts.join('  •  '), font, 8.5, PAGE_W - MARGIN * 2), {
        x: MARGIN, y: 44, size: 8.5, font, color: MUTED,
      });
    }
    const thanks = 'Thank you for supporting handmade!';
    p.drawText(thanks, {
      x: PAGE_W - MARGIN - font.widthOfTextAtSize(thanks, 8.5),
      y: 56, size: 8.5, font, color: MUTED,
    });
  };

  // ── Brand band ─────────────────────────────────────────────────────────────
  const BAND_H = 86;
  page.drawRectangle({ x: 0, y: PAGE_H - BAND_H, width: PAGE_W, height: BAND_H, color: BRAND });
  page.drawText(fitText(businessName, bold, 21, 330), {
    x: MARGIN, y: PAGE_H - 42, size: 21, font: bold, color: rgb(1, 1, 1),
  });
  page.drawText('Handcrafted soaps & botanicals', {
    x: MARGIN, y: PAGE_H - 60, size: 9.5, font, color: rgb(0.85, 0.91, 0.84),
  });
  const receiptWord = 'RECEIPT';
  page.drawText(receiptWord, {
    x: PAGE_W - MARGIN - bold.widthOfTextAtSize(receiptWord, 26),
    y: PAGE_H - 48, size: 26, font: bold, color: rgb(1, 1, 1),
  });
  y = PAGE_H - BAND_H - 34;

  // ── Order meta (billed-to on the left, order facts on the right) ───────────
  const createdDate = new Date(order.createdAt).toLocaleDateString();
  const completedDate = order.completedAt ? new Date(order.completedAt).toLocaleDateString() : null;

  page.drawText('BILLED TO', { x: MARGIN, y, size: 8, font: bold, color: MUTED });
  page.drawText(fitText(order.clientName, bold, 14, 280), {
    x: MARGIN, y: y - 17, size: 14, font: bold, color: INK,
  });

  const metaRows: Array<[string, string]> = [
    ['Receipt #', order.orderNumber],
    ['Order date', createdDate],
    ...(completedDate ? ([['Completed', completedDate]] as Array<[string, string]>) : []),
  ];
  let metaY = y;
  for (const [k, v] of metaRows) {
    page.drawText(k, {
      x: PAGE_W - MARGIN - 170, y: metaY, size: 9, font, color: MUTED,
    });
    page.drawText(winAnsiSafe(v), {
      x: PAGE_W - MARGIN - font.widthOfTextAtSize(winAnsiSafe(v), 9),
      y: metaY, size: 9, font: bold, color: INK,
    });
    metaY -= 14;
  }
  y -= 52;

  // ── Item table ─────────────────────────────────────────────────────────────
  const COL_ITEM = MARGIN + 8;
  const COL_QTY = 388;      // right edge of the qty column
  const COL_UNIT = 470;     // right edge of the unit-price column
  const COL_AMT = PAGE_W - MARGIN - 8; // right edge of the amount column
  const ROW_H = 22;

  const drawTableHeader = () => {
    page.drawRectangle({
      x: MARGIN, y: y - 6, width: PAGE_W - MARGIN * 2, height: 20, color: BRAND_DARK,
    });
    page.drawText('ITEM', { x: COL_ITEM, y, size: 8.5, font: bold, color: rgb(1, 1, 1) });
    const th = (label: string, rightX: number) =>
      page.drawText(label, {
        x: rightX - bold.widthOfTextAtSize(label, 8.5), y, size: 8.5, font: bold, color: rgb(1, 1, 1),
      });
    th('QTY', COL_QTY);
    th('UNIT PRICE', COL_UNIT);
    th('AMOUNT', COL_AMT);
    y -= ROW_H + 2;
  };

  const ensureRoom = (needed: number) => {
    if (y - needed > 96) return;
    drawFooter(page);
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
    drawTableHeader();
  };

  drawTableHeader();

  items.forEach((item, idx) => {
    ensureRoom(item.lotCode ? ROW_H + 10 : ROW_H);
    if (idx % 2 === 1) {
      page.drawRectangle({
        x: MARGIN, y: y - 6, width: PAGE_W - MARGIN * 2, height: ROW_H - 4, color: ROW_TINT,
      });
    }
    page.drawText(fitText(item.recipeName, font, 10, COL_QTY - COL_ITEM - 60), {
      x: COL_ITEM, y, size: 10, font, color: INK,
    });
    if (item.lotCode?.trim()) {
      const lotPrefix = settings.language === 'es' ? 'Lote:' : 'Lot:';
      const lotLabel = `${lotPrefix} ${item.lotCode.trim()}`;
      page.drawText(fitText(lotLabel, font, 7.5, COL_QTY - COL_ITEM - 60), {
        x: COL_ITEM, y: y - 11, size: 7.5, font, color: MUTED,
      });
    }
    const td = (val: string, rightX: number, useBold = false) => {
      const f = useBold ? bold : font;
      page.drawText(val, { x: rightX - f.widthOfTextAtSize(val, 10), y, size: 10, font: f, color: INK });
    };
    td(String(item.quantity), COL_QTY);
    td(money(item.unitPrice), COL_UNIT);
    td(money(item.lineTotal), COL_AMT, true);
    y -= item.lotCode?.trim() ? ROW_H + 10 : ROW_H;
  });

  // Rule under the table
  page.drawLine({
    start: { x: MARGIN, y: y + ROW_H - 12 },
    end: { x: PAGE_W - MARGIN, y: y + ROW_H - 12 },
    thickness: 0.75,
    color: LINE,
  });
  y -= 6;

  // ── Totals ─────────────────────────────────────────────────────────────────
  ensureRoom(80);
  const totalsRight = COL_AMT;
  const totalsLabelX = COL_UNIT - 60;

  page.drawText('Subtotal', { x: totalsLabelX, y, size: 10, font, color: MUTED });
  page.drawText(money(order.subtotal), {
    x: totalsRight - font.widthOfTextAtSize(money(order.subtotal), 10), y, size: 10, font, color: INK,
  });
  y -= 26;

  // TOTAL box
  page.drawRectangle({
    x: totalsLabelX - 12, y: y - 9, width: PAGE_W - MARGIN - (totalsLabelX - 12), height: 30, color: BRAND,
  });
  page.drawText('TOTAL', { x: totalsLabelX, y, size: 12, font: bold, color: rgb(1, 1, 1) });
  page.drawText(money(order.total), {
    x: totalsRight - bold.widthOfTextAtSize(money(order.total), 13), y, size: 13, font: bold, color: rgb(1, 1, 1),
  });
  y -= 44;

  // ── Notes ──────────────────────────────────────────────────────────────────
  if (order.notes?.trim()) {
    ensureRoom(40);
    page.drawText('NOTES', { x: MARGIN, y, size: 8, font: bold, color: MUTED });
    page.drawText(fitText(order.notes.trim(), font, 9.5, PAGE_W - MARGIN * 2), {
      x: MARGIN, y: y - 14, size: 9.5, font, color: INK,
    });
  }

  drawFooter(page);
  return doc.save();
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

/** "Maria López" → "Maria_Lopez" (safe for every filesystem). */
export function sanitizeFilePart(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'Client';
}

export function receiptFileName(order: WorkOrder): string {
  return `${sanitizeFilePart(order.clientName)}_${order.orderNumber}.pdf`;
}

interface ElectronPdfApi {
  savePdf?: (base64: string, folder: string, filename: string) => Promise<{ path: string }>;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Saves the receipt: silently into `<save system>/work_orders/` inside
 * Electron (returns the absolute path), or as a browser download (returns
 * null). Never opens a "Save As" dialog.
 */
export async function saveReceiptPdf(bytes: Uint8Array, filename: string): Promise<string | null> {
  const api =
    typeof window !== 'undefined'
      ? (window as unknown as { electronAPI?: ElectronPdfApi }).electronAPI
      : undefined;

  if (api?.savePdf) {
    const { path } = await api.savePdf(uint8ToBase64(bytes), 'work_orders', filename);
    return path;
  }

  // Browser fallback — regular download.
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return null;
}
