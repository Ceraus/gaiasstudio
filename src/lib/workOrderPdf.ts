import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { AppSettings } from '@/types';
import type { WorkOrderWithItems } from '@/db/repositories';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;

function safeFilenamePart(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'Client';
}

export function workOrderReceiptFilename(record: WorkOrderWithItems) {
  const date = new Date(record.order.orderDate).toISOString().slice(0, 10);
  return `${safeFilenamePart(record.order.clientName)}_${date}_${record.order.id.slice(0, 8)}.pdf`;
}

/** Build an immutable US Letter receipt from work-order snapshot data. */
export async function buildWorkOrderReceiptPdf(
  record: WorkOrderWithItems,
  settings: AppSettings,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(0.12, 0.19, 0.15);
  const green = rgb(0.23, 0.42, 0.31);
  const muted = rgb(0.42, 0.47, 0.44);

  page.drawText(settings.businessName || "Gaia's Label Studio", {
    x: MARGIN, y: 720, size: 22, font: bold, color: green,
  });
  page.drawText('RECEIPT', {
    x: PAGE_WIDTH - MARGIN - 86, y: 722, size: 18, font: bold, color: dark,
  });
  page.drawLine({
    start: { x: MARGIN, y: 700 },
    end: { x: PAGE_WIDTH - MARGIN, y: 700 },
    thickness: 1.5,
    color: green,
  });

  const orderDate = new Date(record.order.orderDate).toLocaleDateString();
  page.drawText(`Client: ${record.order.clientName}`, {
    x: MARGIN, y: 668, size: 11, font: bold, color: dark,
  });
  page.drawText(`Date: ${orderDate}`, {
    x: PAGE_WIDTH - MARGIN - 130, y: 668, size: 10, font: regular, color: muted,
  });
  page.drawText(`Order: ${record.order.id.slice(0, 12).toUpperCase()}`, {
    x: PAGE_WIDTH - MARGIN - 180, y: 650, size: 9, font: regular, color: muted,
  });

  let y = 610;
  page.drawRectangle({
    x: MARGIN, y: y - 8, width: PAGE_WIDTH - MARGIN * 2, height: 28,
    color: rgb(0.93, 0.96, 0.94),
  });
  page.drawText('ITEM', { x: MARGIN + 10, y, size: 9, font: bold, color: dark });
  page.drawText('QTY', { x: 350, y, size: 9, font: bold, color: dark });
  page.drawText('PRICE', { x: 410, y, size: 9, font: bold, color: dark });
  page.drawText('TOTAL', { x: 490, y, size: 9, font: bold, color: dark });

  y -= 34;
  for (const item of record.items) {
    page.drawText(item.recipeName.slice(0, 48), {
      x: MARGIN + 10, y, size: 10, font: regular, color: dark,
    });
    page.drawText(String(item.quantity), { x: 354, y, size: 10, font: regular, color: dark });
    page.drawText(`$${item.unitPrice.toFixed(2)}`, {
      x: 410, y, size: 10, font: regular, color: dark,
    });
    page.drawText(`$${item.lineTotal.toFixed(2)}`, {
      x: 490, y, size: 10, font: bold, color: dark,
    });
    y -= 26;
  }

  page.drawLine({
    start: { x: 350, y: y + 4 },
    end: { x: PAGE_WIDTH - MARGIN, y: y + 4 },
    thickness: 1,
    color: rgb(0.75, 0.79, 0.76),
  });
  page.drawText('TOTAL', { x: 410, y: y - 18, size: 11, font: bold, color: dark });
  page.drawText(`$${record.order.subtotal.toFixed(2)}`, {
    x: 486, y: y - 18, size: 13, font: bold, color: green,
  });

  if (record.order.notes) {
    page.drawText(`Notes: ${record.order.notes.slice(0, 100)}`, {
      x: MARGIN, y: Math.max(150, y - 70), size: 9, font: regular, color: muted,
    });
  }

  const footer = [
    settings.businessAddress,
    settings.contact,
  ].filter(Boolean).join('  •  ') || 'Thank you for supporting handmade soap.';
  page.drawLine({
    start: { x: MARGIN, y: 80 },
    end: { x: PAGE_WIDTH - MARGIN, y: 80 },
    thickness: 0.75,
    color: rgb(0.78, 0.82, 0.79),
  });
  page.drawText(footer.slice(0, 105), {
    x: MARGIN, y: 58, size: 8, font: regular, color: muted,
  });

  return pdf.save();
}
