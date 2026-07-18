import { Canvas, FabricImage, Textbox } from "fabric";
import { withData } from "./fabricHelpers";
import { loadGoogleFont } from "./googleFonts";

export interface LabelContent {
  productName: string;
  benefit: string;
  ingredientsText: string;
  directions?: string;
  warnings?: string;
  netWeight?: string;
  businessFooter?: string;
  logoDataUrl?: string;
  fontFamily?: string;
}

const DEFAULT_FONT = "Montserrat";

async function addLogo(canvas: Canvas, dataUrl: string, maxWidthPx: number, maxHeightPx: number) {
  const img = await FabricImage.fromURL(dataUrl, { crossOrigin: "anonymous" });
  const scale = Math.min(maxWidthPx / (img.width || 1), maxHeightPx / (img.height || 1), 1);
  img.set({ scaleX: scale, scaleY: scale });
  withData(img, { name: "Logo" });
  canvas.add(img);
  return img;
}

/**
 * FRONT (logo-heavy) layout — modeled after round print-and-apply labels
 * such as Avery 22807 (2" round). The user's transparent brand logo is
 * "snapped" dead-center, matching how she relies on it visually, with the
 * product name curling underneath in a clean, legible type block.
 */
export async function applyFrontLayout(canvas: Canvas, content: LabelContent) {
  const w = canvas.getWidth();
  const h = canvas.getHeight();
  const font = content.fontFamily || DEFAULT_FONT;
  await loadGoogleFont(font);

  if (content.logoDataUrl) {
    const logo = await addLogo(canvas, content.logoDataUrl, w * 0.62, h * 0.5);
    logo.set({ left: w / 2, top: h * 0.42, originX: "center", originY: "center" });
    logo.setCoords();
  }

  const nameBox = withData(
    new Textbox(content.productName || "Product Name", {
      width: w * 0.82,
      fontFamily: font,
      fontSize: Math.max(14, Math.round(h * 0.09)),
      fontWeight: "600",
      fill: "#22301f",
      textAlign: "center",
      originX: "center",
      originY: "center",
      left: w / 2,
      top: h * 0.82,
    }),
    { name: "Product name" }
  );
  canvas.add(nameBox);
  canvas.requestRenderAll();
}

/**
 * BACK (information-heavy) layout — modeled after Avery 6871 (1.25" x 2.375").
 * AI-generated backgrounds for this context often hallucinate decorative
 * botanical borders, so this layout mathematically constrains all text to a
 * centralized "safe zone" (a generous inset from every edge) rather than
 * trusting the full label bounds, keeping ingredients/warnings/footer clear
 * of any busy border art.
 */
export async function applyBackLayout(canvas: Canvas, content: LabelContent) {
  const w = canvas.getWidth();
  const h = canvas.getHeight();
  const font = content.fontFamily || DEFAULT_FONT;
  await loadGoogleFont(font);

  const safeInsetX = w * 0.16;
  const safeInsetY = h * 0.12;
  const safeWidth = w - safeInsetX * 2;

  const lines = [
    content.ingredientsText ? `Ingredients: ${content.ingredientsText}` : "",
    content.directions ? `Directions: ${content.directions}` : "",
    content.warnings ? `Warnings: ${content.warnings}` : "",
    content.businessFooter || "",
  ].filter(Boolean);

  const body = withData(
    new Textbox(lines.join("\n\n"), {
      width: safeWidth,
      fontFamily: font,
      fontSize: Math.max(7, Math.round(h * 0.045)),
      lineHeight: 1.25,
      fill: "#2b2b2b",
      textAlign: "center",
      originX: "center",
      originY: "center",
      left: w / 2,
      top: h / 2,
    }),
    { name: "Back label copy" }
  );
  canvas.add(body);

  if (content.netWeight) {
    const weight = withData(
      new Textbox(content.netWeight, {
        width: safeWidth,
        fontFamily: font,
        fontSize: Math.max(7, Math.round(h * 0.04)),
        fill: "#2b2b2b",
        textAlign: "center",
        originX: "center",
        originY: "bottom",
        left: w / 2,
        top: h - safeInsetY,
      }),
      { name: "Net weight" }
    );
    canvas.add(weight);
  }

  canvas.requestRenderAll();
}

/**
 * SIDE (ribbon-wrap) layout — a wide, short strip (e.g. a 9" x 1.2" wrap
 * around a jar). AI-generated ribbon backgrounds typically leave a clean
 * vertical bar dead-center; this layout drops the logo and net-weight text
 * into exactly that central safe zone so nothing collides with the printed
 * pattern running along both sides.
 */
export async function applySideLayout(canvas: Canvas, content: LabelContent) {
  const w = canvas.getWidth();
  const h = canvas.getHeight();
  const font = content.fontFamily || DEFAULT_FONT;
  await loadGoogleFont(font);

  const centerBarWidth = Math.min(w * 0.26, h * 3.2);

  if (content.logoDataUrl) {
    const logo = await addLogo(canvas, content.logoDataUrl, centerBarWidth * 0.9, h * 0.62);
    logo.set({ left: w / 2, top: h * 0.42, originX: "center", originY: "center" });
    logo.setCoords();
  }

  const weightBox = withData(
    new Textbox(content.netWeight || content.productName || "", {
      width: centerBarWidth,
      fontFamily: font,
      fontSize: Math.max(8, Math.round(h * 0.16)),
      fill: "#22301f",
      textAlign: "center",
      originX: "center",
      originY: "center",
      left: w / 2,
      top: h * 0.85,
    }),
    { name: "Net weight" }
  );
  canvas.add(weightBox);

  canvas.requestRenderAll();
}

export async function applyContextualLayout(
  canvas: Canvas,
  context: "front" | "back" | "side",
  content: LabelContent
) {
  if (context === "front") return applyFrontLayout(canvas, content);
  if (context === "back") return applyBackLayout(canvas, content);
  return applySideLayout(canvas, content);
}
