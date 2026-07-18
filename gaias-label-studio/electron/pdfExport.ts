import { PDFDocument } from "pdf-lib";
import fs from "node:fs";
import path from "node:path";
import type { AveryTemplate, PdfExportRequest, PdfExportResult } from "../shared/contract";

const PT_PER_IN = 72;
const LETTER_W_PT = 8.5 * PT_PER_IN;
const LETTER_H_PT = 11 * PT_PER_IN;

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; isPng: boolean } {
  const match = /^data:image\/(png|jpeg);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Unsupported canvas image format; expected a PNG or JPEG data URL.");
  const [, ext, b64] = match;
  return { bytes: Uint8Array.from(Buffer.from(b64, "base64")), isPng: ext === "png" };
}

/** Finds the next available `${prefix}___NN.pdf` file name inside `designsDir`. */
export function nextDesignFileName(designsDir: string, prefix: string): string {
  fs.mkdirSync(designsDir, { recursive: true });
  const safePrefix = (prefix || "LABEL").replace(/[^a-zA-Z0-9_-]/g, "_");
  const existing = fs.readdirSync(designsDir);
  const pattern = new RegExp(`^${safePrefix}___(\\d{2,})\\.pdf$`, "i");
  let max = 0;
  for (const f of existing) {
    const m = pattern.exec(f);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const next = String(max + 1).padStart(2, "0");
  return path.join(designsDir, `${safePrefix}___${next}.pdf`);
}

/**
 * Stamps the flattened Fabric.js canvas export onto the exact grid
 * coordinates of an Avery sheet, generating as many pages as needed to
 * cover `quantity` labels. Never relies on the browser/OS print dialog.
 */
export async function exportLabelsToPdf(
  template: AveryTemplate,
  req: PdfExportRequest,
  designsDir: string,
  filePrefix: string
): Promise<PdfExportResult> {
  try {
    const { bytes, isPng } = dataUrlToBytes(req.canvasDataUrl);
    const pdfDoc = await PDFDocument.create();
    const image = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);

    const slotsPerSheet = Math.max(1, template.columns * template.rows);
    const quantity = Math.max(1, req.quantity);
    const sheetsNeeded = Math.ceil(quantity / slotsPerSheet);

    const labelWPt = template.widthIn * PT_PER_IN;
    const labelHPt = template.heightIn * PT_PER_IN;

    let remaining = quantity;
    for (let sheetIndex = 0; sheetIndex < sheetsNeeded; sheetIndex++) {
      const page = pdfDoc.addPage([LETTER_W_PT, LETTER_H_PT]);
      for (let row = 0; row < template.rows && remaining > 0; row++) {
        for (let col = 0; col < template.columns && remaining > 0; col++) {
          const xPt = (template.marginLeftIn + col * template.pitchXIn) * PT_PER_IN;
          // PDF origin is bottom-left; template margins are measured from the top of the sheet.
          const yFromTopPt = (template.marginTopIn + row * template.pitchYIn) * PT_PER_IN;
          const yPt = LETTER_H_PT - yFromTopPt - labelHPt;
          page.drawImage(image, { x: xPt, y: yPt, width: labelWPt, height: labelHPt });
          remaining--;
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    const outPath = nextDesignFileName(designsDir, filePrefix);
    fs.writeFileSync(outPath, pdfBytes);

    return { success: true, filePath: outPath, sheetsGenerated: sheetsNeeded };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
