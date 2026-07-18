import * as fabric from 'fabric';
import type { Ingredient, LabelContext, Recipe } from '@/types';
import { editor } from '@/lib/fabric/editorController';
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

  const name = new fabric.Textbox(recipe.name || 'Product Name', {
    width: s.width * 0.96,
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

  const sections: string[] = [];
  const inci = inciList(recipe, ingredients);
  if (inci) sections.push(`INGREDIENTS: ${inci}.`);
  if (recipe.directions?.trim()) sections.push(`DIRECTIONS: ${recipe.directions}`);
  if (recipe.warnings?.trim()) sections.push(`WARNING: ${recipe.warnings}`);
  if (recipe.netWeight?.trim()) sections.push(`NET WT ${recipe.netWeight}`);

  const bodyText = sections.join('\n\n');
  // Estimate a font size that keeps the body inside the safe zone.
  const availableH = s.height * 0.72;
  const bodyPt = fitBodyFont(bodyText, s.width, availableH);
  const body = new fabric.Textbox(bodyText || 'Add ingredients & directions to your recipe.', {
    width: s.width,
    fontFamily: BODY_FONT,
    fontSize: ptToPx(bodyPt),
    fill: INK,
    lineHeight: 1.22,
    textAlign: 'left',
    originX: 'center',
    originY: 'top',
    left: s.cx,
    top: s.top + ptToPx(titlePt) * 1.6,
  });
  editor.addCustom(body, 'text', 'Ingredients & info');

  if (recipe.footer?.trim()) {
    const footer = new fabric.Textbox(recipe.footer, {
      width: s.width,
      fontFamily: BODY_FONT,
      fontSize: ptToPx(clamp(wIn * 3.4, 5, 8)),
      fill: '#6a6a6a',
      textAlign: 'center',
      originX: 'center',
      originY: 'bottom',
      left: s.cx,
      top: s.top + s.height,
    });
    editor.addCustom(footer, 'text', 'Footer');
  }
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

function fitBodyFont(text: string, widthPx: number, availableHpx: number): number {
  // Rough character-based estimate: chars-per-line from width, lines from count.
  for (let pt = 9; pt >= 4.5; pt -= 0.5) {
    const charW = ptToPx(pt) * 0.52;
    const perLine = Math.max(8, Math.floor(widthPx / charW));
    const paras = text.split('\n');
    let lines = 0;
    for (const p of paras) lines += Math.max(1, Math.ceil(p.length / perLine));
    const totalH = lines * ptToPx(pt) * 1.28;
    if (totalH <= availableHpx) return pt;
  }
  return 4.5;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
