import * as fabric from 'fabric';
import type { Ingredient, LabelContext, Recipe } from '@/types';
import { applyCurveToText, editor } from '@/lib/fabric/editorController';
import { ptToPx } from '@/lib/units';
import { loadFont } from '@/lib/fontManager';

const HEADING_FONT = 'Playfair Display';
const BODY_FONT = 'Montserrat';
const INK = '#2b2b2b';

interface SafeRect {
  left: number;
  top: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

function safeRect(): SafeRect {
  const t = editor.trim;
  const left = t.left + editor.safePx;
  const top = t.top + editor.safePx;
  const width = editor.labelWpx - editor.safePx * 2;
  const height = editor.labelHpx - editor.safePx * 2;
  return { left, top, width, height, cx: t.cx, cy: t.cy };
}

function inciList(recipe: Recipe, ingredients: Ingredient[]): string {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  return recipe.ingredientIds
    .map((id) => byId.get(id))
    .filter((i): i is Ingredient => !!i)
    .map((i) => (i.inci?.trim() ? i.inci : i.name))
    .join(', ');
}

/** Removes prior text/shape but keeps the user's background & logo images. */
function clearForLayout() {
  const canvas = editor.canvas;
  if (!canvas) return;
  canvas.discardActiveObject();
  canvas
    .getObjects()
    .slice()
    .forEach((o) => {
      const kind = String((o as { gaiaKind?: string }).gaiaKind ?? '');
      if (kind && !['background', 'logo'].includes(kind) && !kind.startsWith('__')) {
        canvas.remove(o);
      }
    });
}

/**
 * Auto-generates a context-specific foreground layout from a saved recipe.
 * Text and logos are mathematically constrained to the label's safe zone so
 * they never collide with AI-generated botanical borders (the "AI bleed" rule).
 */
export async function applyAutoLayout(
  recipe: Recipe,
  ingredients: Ingredient[],
  context: LabelContext,
) {
  const canvas = editor.canvas;
  const template = editor.template;
  if (!canvas || !template) return;

  await Promise.all([loadFont(HEADING_FONT), loadFont(BODY_FONT)]);
  clearForLayout();

  if (context === 'front') layoutFront(recipe);
  else if (context === 'back') layoutBack(recipe, ingredients);
  else layoutSide(recipe);

  canvas.requestRenderAll();
}

function layoutFront(recipe: Recipe) {
  const s = safeRect();
  const wIn = editor.template!.labelWidthIn;
  const namePt = clamp(wIn * 11, 11, 30);

  const existingLogo = editor.getObjectsByKind('logo')[0];
  if (existingLogo) {
    existingLogo.set({
      originX: 'center',
      originY: 'center',
      left: s.cx,
      top: s.cy - s.height * 0.16,
    });
    existingLogo.setCoords();
  } else {
    const r = Math.min(s.width, s.height) * 0.24;
    const placeholder = new fabric.Circle({
      radius: r,
      fill: 'rgba(124,58,237,0.06)',
      stroke: '#b9a4e6',
      strokeWidth: 1.5,
      strokeDashArray: [6, 5],
      originX: 'center',
      originY: 'center',
      left: s.cx,
      top: s.cy - s.height * 0.16,
    });
    editor.addCustom(placeholder, 'shape', 'Logo placeholder');
    const hint = new fabric.Textbox('Drop your\nlogo here', {
      width: r * 1.8,
      fontFamily: BODY_FONT,
      fontSize: ptToPx(clamp(wIn * 3.5, 6, 10)),
      fill: '#8b78c0',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      left: s.cx,
      top: s.cy - s.height * 0.16,
    });
    editor.addCustom(hint, 'text', 'Logo hint');
  }

  const shape = editor.template!.shape;
  const rounded = shape === 'circle' || shape === 'oval';
  const nameText = recipe.name || 'Product Name';
  // On round/oval labels the name curves along an arc; size the box to the text so
  // it stays centered on the path.
  const nameWidth = rounded
    ? Math.min(s.width * 0.96, measureLineWidth(nameText, namePt) + ptToPx(namePt))
    : s.width * 0.96;
  const name = new fabric.Textbox(nameText, {
    width: nameWidth,
    fontFamily: HEADING_FONT,
    fontSize: ptToPx(namePt),
    fill: INK,
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    left: s.cx,
    top: s.cy + s.height * 0.24,
  });
  editor.addCustom(name, 'text', 'Product name');
  if (rounded) applyCurveToText(name, 38);

  if (recipe.benefit?.trim()) {
    const benefit = new fabric.Textbox(recipe.benefit, {
      width: s.width * 0.92,
      fontFamily: BODY_FONT,
      fontSize: ptToPx(clamp(namePt * 0.42, 6, 12)),
      fill: '#5a5a5a',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      left: s.cx,
      top: s.cy + s.height * 0.42,
    });
    editor.addCustom(benefit, 'text', 'Benefit');
  }
}

function layoutBack(recipe: Recipe, ingredients: Ingredient[]) {
  const s = safeRect();
  const wIn = editor.template!.labelWidthIn;

  // --- Title (top) ---------------------------------------------------------
  const titlePt = clamp(wIn * 6, 8, 14);
  const title = new fabric.Textbox(recipe.name || 'Product', {
    width: s.width,
    fontFamily: HEADING_FONT,
    fontSize: ptToPx(titlePt),
    fill: INK,
    textAlign: 'center',
    originX: 'center',
    originY: 'top',
    left: s.cx,
    top: s.top,
  });
  editor.addCustom(title, 'text', 'Title');
  const titleH = title.height ?? ptToPx(titlePt) * 1.3;

  // --- Footer (bottom, optional) ------------------------------------------
  let footerH = 0;
  if (recipe.footer?.trim()) {
    const footerPt = clamp(wIn * 3.4, 5, 8);
    const footer = new fabric.Textbox(recipe.footer, {
      width: s.width,
      fontFamily: BODY_FONT,
      fontSize: ptToPx(footerPt),
      fill: '#6a6a6a',
      textAlign: 'center',
      originX: 'center',
      originY: 'bottom',
      left: s.cx,
      top: s.top + s.height,
    });
    editor.addCustom(footer, 'text', 'Footer');
    footerH = (footer.height ?? ptToPx(footerPt) * 1.3) + ptToPx(footerPt) * 0.5;
  }

  // --- Body between title and footer, always fit inside the safe zone ------
  const gap = ptToPx(titlePt) * 0.5;
  const bodyTop = s.top + titleH + gap;
  const availH = Math.max(ptToPx(4), s.top + s.height - footerH - bodyTop);

  const inci = inciList(recipe, ingredients);
  const extra: string[] = [];
  if (recipe.directions?.trim()) extra.push(`DIRECTIONS: ${recipe.directions}`);
  if (recipe.warnings?.trim()) extra.push(`WARNING: ${recipe.warnings}`);
  if (recipe.netWeight?.trim()) extra.push(`NET WT ${recipe.netWeight}`);
  const extraText = extra.join('\n\n');

  if (!inci && !extraText) {
    const hint = new fabric.Textbox('Add ingredients & directions to your recipe.', {
      width: s.width,
      fontFamily: BODY_FONT,
      fontSize: ptToPx(7),
      fill: INK,
      lineHeight: 1.22,
      textAlign: 'center',
      originX: 'center',
      originY: 'top',
      left: s.cx,
      top: bodyTop,
    });
    editor.addCustom(hint, 'text', 'Ingredients & info');
    return;
  }

  // First try a single measured-and-shrunk column for everything.
  const singleText = [inci ? `INGREDIENTS: ${inci}.` : '', extraText]
    .filter(Boolean)
    .join('\n\n');
  const singlePt = fitFont(singleText, s.width, availH, 9, 4);

  // If the single column would be uncomfortably small and the ingredient list is
  // long, switch INGREDIENTS to two columns for legibility.
  const longList = recipe.ingredientIds.length >= 12 && !!inci;
  if (singlePt >= 5.5 || !longList) {
    const body = new fabric.Textbox(singleText, {
      width: s.width,
      fontFamily: BODY_FONT,
      fontSize: ptToPx(singlePt),
      fill: INK,
      lineHeight: 1.2,
      textAlign: 'left',
      originX: 'center',
      originY: 'top',
      left: s.cx,
      top: bodyTop,
    });
    editor.addCustom(body, 'text', 'Ingredients & info');
    return;
  }

  // --- Two-column INCI layout ---------------------------------------------
  // Header holds directions / warnings / net weight; the ingredient list flows
  // beneath it in two balanced columns.
  let colTop = bodyTop;
  if (extraText) {
    const headPt = fitFont(extraText, s.width, availH * 0.4, 8, 4);
    const head = new fabric.Textbox(extraText, {
      width: s.width,
      fontFamily: BODY_FONT,
      fontSize: ptToPx(headPt),
      fill: INK,
      lineHeight: 1.2,
      textAlign: 'left',
      originX: 'center',
      originY: 'top',
      left: s.cx,
      top: bodyTop,
    });
    editor.addCustom(head, 'text', 'Directions & warnings');
    colTop = bodyTop + (head.height ?? ptToPx(headPt) * 2) + ptToPx(headPt) * 0.6;
  }

  const gutter = ptToPx(6);
  const colW = (s.width - gutter) / 2;
  const items = inci.split(', ');
  const half = Math.ceil(items.length / 2);
  const leftText = `INGREDIENTS: ${items.slice(0, half).join(', ')},`;
  const rightText = `${items.slice(half).join(', ')}.`;
  const colAvailH = Math.max(ptToPx(4), s.top + s.height - footerH - colTop);
  const colPt = Math.min(
    fitFont(leftText, colW, colAvailH, 8, 4),
    fitFont(rightText, colW, colAvailH, 8, 4),
  );
  const leftCol = new fabric.Textbox(leftText, {
    width: colW,
    fontFamily: BODY_FONT,
    fontSize: ptToPx(colPt),
    fill: INK,
    lineHeight: 1.2,
    textAlign: 'left',
    originX: 'left',
    originY: 'top',
    left: s.left,
    top: colTop,
  });
  editor.addCustom(leftCol, 'text', 'Ingredients (1)');
  const rightCol = new fabric.Textbox(rightText, {
    width: colW,
    fontFamily: BODY_FONT,
    fontSize: ptToPx(colPt),
    fill: INK,
    lineHeight: 1.2,
    textAlign: 'left',
    originX: 'left',
    originY: 'top',
    left: s.left + colW + gutter,
    top: colTop,
  });
  editor.addCustom(rightCol, 'text', 'Ingredients (2)');
}

function layoutSide(recipe: Recipe) {
  const s = safeRect();
  const hIn = editor.template!.labelHeightIn;
  const centralWidth = s.width * 0.44; // the empty central bar of a ribbon

  const existingLogo = editor.getObjectsByKind('logo')[0];
  if (existingLogo) {
    existingLogo.set({ originX: 'center', originY: 'center', left: s.cx, top: s.cy - s.height * 0.12 });
    existingLogo.setCoords();
  }

  const namePt = clamp(hIn * 11, 9, 20);
  const name = new fabric.Textbox(recipe.name || 'Product Name', {
    width: centralWidth,
    fontFamily: HEADING_FONT,
    fontSize: ptToPx(namePt),
    fill: INK,
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    left: s.cx,
    top: existingLogo ? s.cy + s.height * 0.22 : s.cy - s.height * 0.06,
  });
  editor.addCustom(name, 'text', 'Product name');

  if (recipe.netWeight?.trim()) {
    const net = new fabric.Textbox(`NET WT ${recipe.netWeight}`, {
      width: centralWidth,
      fontFamily: BODY_FONT,
      fontSize: ptToPx(clamp(namePt * 0.5, 6, 11)),
      fill: '#5a5a5a',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      left: s.cx,
      top: s.cy + s.height * 0.34,
    });
    editor.addCustom(net, 'text', 'Net weight');
  }
}

/** Real rendered height (px) of a wrapped text block using Fabric's measurer. */
function measuredHeight(text: string, widthPx: number, pt: number, lineHeight = 1.2): number {
  const tb = new fabric.Textbox(text, {
    width: widthPx,
    fontFamily: BODY_FONT,
    fontSize: ptToPx(pt),
    lineHeight,
  });
  return tb.height ?? 0;
}

/** Largest font (pt) whose measured height fits the available height. Guarantees fit. */
function fitFont(text: string, widthPx: number, availHpx: number, maxPt = 9, minPt = 4): number {
  for (let pt = maxPt; pt >= minPt; pt -= 0.25) {
    if (measuredHeight(text, widthPx, pt) <= availHpx) return pt;
  }
  return minPt;
}

/** Single-line rendered width (px) of a string at a given point size. */
function measureLineWidth(text: string, pt: number, fontFamily = HEADING_FONT): number {
  const t = new fabric.Text(text, { fontFamily, fontSize: ptToPx(pt) });
  return t.width ?? 0;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
