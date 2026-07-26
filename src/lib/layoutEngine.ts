import * as fabric from 'fabric';
import i18next from 'i18next';
import type { AppSettings, Ingredient, LabelContext, Recipe } from '@/types';
import { applyCurveToText, editor } from '@/lib/fabric/editorController';
import { ptToPx } from '@/lib/units';
import { loadFont } from '@/lib/fontManager';

const HEADING_FONT = 'Playfair Display';
const BODY_FONT = 'Montserrat';
const ROUND_BACK_FONT = 'EB Garamond';
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
      const tagged = o as { gaiaKind?: string; isBaseLayer?: boolean };
      const kind = String(tagged.gaiaKind ?? '');
      if (
        kind
        && !tagged.isBaseLayer
        && !['background', 'logo'].includes(kind)
        && !kind.startsWith('__')
      ) {
        canvas.remove(o);
      }
    });
}

/** Bilingual string tables for auto-layout label sections. */
const LABEL_STRINGS = {
  en: {
    ingredients:      'INGREDIENTS',
    directions:       'DIRECTIONS',
    warning:          'WARNING',
    netWt:            'NET WT',
    logoHint:         'Drop your\nlogo here',
    addHint:          'Add ingredients & directions to your recipe.',
    productName:      'Product Name',
    product:          'Product',
    // Round back label (title-case for readability at small sizes)
    benefits:         'Benefits',
    handmadeby:       'Handmade by',
    contact:          'Contact',
    directionsRound:  'Directions',
    warningRound:     'Warning',
    handcraftedIn:    'Handcrafted in',
  },
  es: {
    ingredients:      'INGREDIENTES',
    directions:       'MODO DE USO',
    warning:          'ADVERTENCIA',
    netWt:            'PESO NETO',
    logoHint:         'Pon tu\nlogotipo aquí',
    addHint:          'Agrega ingredientes e instrucciones a tu receta.',
    productName:      'Nombre del producto',
    product:          'Producto',
    benefits:         'Beneficios',
    handmadeby:       'Hecho a mano por',
    contact:          'Contacto',
    directionsRound:  'Instrucciones',
    warningRound:     'Advertencia',
    handcraftedIn:    'Artesanal en',
  },
} as const;

export type LayoutLang = keyof typeof LABEL_STRINGS;

type Str = {
  ingredients: string;
  directions: string;
  warning: string;
  netWt: string;
  logoHint: string;
  addHint: string;
  productName: string;
  product: string;
  benefits: string;
  handmadeby: string;
  contact: string;
  directionsRound: string;
  warningRound: string;
  handcraftedIn: string;
};

/**
 * Auto-generates a context-specific foreground layout from a saved recipe.
 * Text and logos are mathematically constrained to the label's safe zone so
 * they never collide with AI-generated botanical borders (the "AI bleed" rule).
 *
 * Pass `settings` to inject business name, address, and contact onto the back
 * label of round/circle templates.
 */
export async function applyAutoLayout(
  recipe: Recipe,
  ingredients: Ingredient[],
  context: LabelContext,
  lang: LayoutLang = 'en',
  settings: Partial<AppSettings> = {},
) {
  const canvas = editor.canvas;
  const template = editor.template;
  if (!canvas || !template) return;

  // Auto-detect language from i18next if not explicitly passed
  const detectedLang = (i18next.language?.startsWith('es') ? 'es' : 'en') as LayoutLang;
  const resolvedLang = lang ?? detectedLang;

  const str = LABEL_STRINGS[resolvedLang] ?? LABEL_STRINGS.en;

  const isRound = template.shape === 'circle' || template.shape === 'oval';

  await Promise.all([
    loadFont(HEADING_FONT),
    loadFont(BODY_FONT),
    ...(context === 'front' || (isRound && context === 'back') ? [loadFont(ROUND_BACK_FONT)] : []),
  ]);

  clearForLayout();

  if (context === 'front') {
    layoutFront(recipe, str, ingredients, settings);
  } else if (context === 'back') {
    if (isRound) {
      layoutRoundBack(recipe, ingredients, str, settings);
    } else {
      layoutBack(recipe, ingredients, str);
    }
  } else {
    layoutSide(recipe, str);
  }

  canvas.requestRenderAll();
}

function layoutFront(
  recipe: Recipe,
  str: Str,
  ingredients: Ingredient[],
  settings: Partial<AppSettings> = {},
) {
  const canvas = editor.canvas;
  if (!canvas) return;

  const s = safeRect();
  const cx = s.cx;
  const cy = s.cy;

  // Sage-green base — shows through when no background image is loaded
  canvas.backgroundColor = '#c8d4c0';

  // ── Legibility circle ────────────────────────────────────────────────────
  // Radius ≈ 38% of the label width → diameter ≈ 76% of label width
  const circleRadius = editor.labelWpx * 0.38;
  const circleOverlay = new fabric.Circle({
    radius: circleRadius,
    fill: 'rgba(255,255,255,0.30)',
    stroke: '',
    strokeWidth: 0,
    originX: 'center',
    originY: 'center',
    left: cx,
    top: cy,
    selectable: true,
    lockMovementX: false,
    lockMovementY: false,
  }) as fabric.Circle & { isLegibilityOverlay?: boolean };
  circleOverlay.isLegibilityOverlay = true;
  editor.addCustom(circleOverlay as fabric.FabricObject, 'shape', 'Legibility Overlay');

  // ── Text block ───────────────────────────────────────────────────────────
  const circleDiameter = circleRadius * 2;
  const textWidth = circleDiameter * 0.80;
  const fontFamily = ROUND_BACK_FONT;
  const LINE_HEIGHT = 1.4;

  // Product name is a dedicated curved foreground layer on round/oval labels.
  // Keeping it separate from the body preserves editing and word wrapping.
  const isRound = editor.template?.shape === 'circle' || editor.template?.shape === 'oval';
  const productName = new fabric.Textbox(recipe.name || str.productName, {
    width: textWidth,
    fontFamily: HEADING_FONT,
    fontSize: ptToPx(clamp((editor.template?.labelWidthIn ?? 2) * 8, 11, 22)),
    fontWeight: 'bold',
    fill: INK,
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    left: cx,
    top: cy - circleRadius * 0.56,
  });
  if (isRound) applyCurveToText(productName, 38);
  editor.addCustom(productName, 'text', 'Product Name');

  // Resolve ingredient INCI names
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const ingNames = recipe.ingredientIds
    .map((id) => byId.get(id))
    .filter((i): i is Ingredient => !!i)
    .map((i) => (i.inci?.trim() ? i.inci : i.name));

  const directions = recipe.directions?.trim() || 'Lather, rinse, and enjoy.';
  const warning = recipe.warnings?.trim() || 'For external use only. Avoid contact with eyes.';

  // Net-weight line: parse grams and derive oz
  let netWtLine = '';
  if (recipe.netWeight?.trim()) {
    const gMatch = recipe.netWeight.match(/(\d+(?:\.\d+)?)\s*g\b/i);
    if (gMatch) {
      const grams = parseFloat(gMatch[1]);
      const oz = (grams * 0.035274).toFixed(2);
      netWtLine = `Net Wt. ${grams}g / ${oz} oz`;
    } else {
      netWtLine = `Net Wt. ${recipe.netWeight}`;
    }
  }

  const year = new Date().getFullYear();

  // Build logical lines with per-span bold flags (same pattern as layoutRoundBack)
  type LinePart = { text: string; bold?: boolean };
  type LogicalLine = { parts: LinePart[] };
  const logicalLines: LogicalLine[] = [];

  const addBoldLine  = (label: string) => logicalLines.push({ parts: [{ text: label, bold: true }] });
  const addInlineBold = (label: string, body: string) =>
    logicalLines.push({ parts: [{ text: `${label}: `, bold: true }, { text: body }] });
  const addNormal = (text: string) => logicalLines.push({ parts: [{ text }] });
  const addBlank  = () => logicalLines.push({ parts: [{ text: '' }] });

  // Section 1 — Ingredients
  addBoldLine(`${str.ingredients}:`);
  for (const name of ingNames) addNormal(name);
  addBlank();

  // Section 2 — Directions + Warning
  addInlineBold(str.directionsRound, directions);
  addInlineBold(str.warningRound, warning);
  addBlank();

  // Section 3 — Benefits
  if (recipe.benefit?.trim()) {
    addInlineBold(str.benefits, recipe.benefit);
    addBlank();
  }

  // Section 4 — Maker info
  const bizName = settings.businessName?.trim() || "Gaia's Essences";
  addNormal(`${str.handmadeby}: ${bizName}`);
  if (settings.businessAddress?.trim()) addNormal(settings.businessAddress);
  if (settings.contact?.trim()) addNormal(`${str.contact}: ${settings.contact}`);

  // Section 5 — Net weight + year
  if (netWtLine) {
    addBlank();
    addNormal(netWtLine);
  }
  addNormal(`${str.handcraftedIn} ${year}`);

  // Assemble flat text string and per-character bold styles
  const textLines = logicalLines.map((l) => l.parts.map((p) => p.text).join(''));
  const fullText  = textLines.join('\n');

  type FabricStyleDecl = { fontWeight?: string };
  const stylesObj: Record<number, Record<number, FabricStyleDecl>> = {};

  logicalLines.forEach((line, lineIdx) => {
    let charOffset = 0;
    for (const part of line.parts) {
      if (part.bold) {
        if (!stylesObj[lineIdx]) stylesObj[lineIdx] = {};
        for (let c = 0; c < part.text.length; c++) {
          stylesObj[lineIdx][charOffset + c] = { fontWeight: 'bold' };
        }
      }
      charOffset += part.text.length;
    }
  });

  // Auto-scale font size to fit the inscribed text area
  const availH = circleDiameter * 0.85;
  const pt = fitFont(fullText, textWidth, availH, 14, 8, fontFamily, LINE_HEIGHT);

  const textbox = new fabric.Textbox(fullText, {
    width: textWidth,
    fontFamily,
    fontSize: ptToPx(pt),
    fill: INK,
    lineHeight: LINE_HEIGHT,
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    left: cx,
    top: cy,
    styles: stylesObj as Record<number, Record<number, object>>,
  });
  editor.addCustom(textbox, 'text', 'Label text');
}

function layoutBack(recipe: Recipe, ingredients: Ingredient[], str: Str) {
  const s = safeRect();
  const wIn = editor.template!.labelWidthIn;

  // --- Title (top) ---------------------------------------------------------
  const titlePt = clamp(wIn * 6, 8, 14);
  const title = new fabric.Textbox(recipe.name || str.product, {
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
  extra.push(`${str.directions}: ${recipe.directions?.trim() || 'Lather, rinse, and enjoy.'}`);
  extra.push(`${str.warning}: ${recipe.warnings?.trim() || 'For external use only. Avoid contact with eyes.'}`);
  if (recipe.netWeight?.trim()) extra.push(`${str.netWt} ${recipe.netWeight}`);
  const extraText = extra.join('\n\n');

  if (!inci && !extraText) {
    const hint = new fabric.Textbox(str.addHint, {
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
  const singleText = [inci ? `${str.ingredients}: ${inci}.` : '', extraText]
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
  const leftText = `${str.ingredients}: ${items.slice(0, half).join(', ')},`;
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

/**
 * Back-label layout for circle/oval templates.
 *
 * Adds a circular white legibility overlay at 70% opacity and a single
 * centred text block containing the full ingredient list, directions,
 * warnings, benefits, maker info, net weight, and year — formatted and
 * sized to fit comfortably inside the inscribed area of the overlay.
 */
function layoutRoundBack(
  recipe: Recipe,
  ingredients: Ingredient[],
  str: Str,
  settings: Partial<AppSettings>,
) {
  const s = safeRect();
  const fontFamily = ROUND_BACK_FONT;
  const LINE_HEIGHT = 1.25;

  // Circular legibility overlay
  const safeRadius = Math.min(s.width, s.height) / 2;
  const overlayRadius = safeRadius * 0.88;

  const circleOverlay = new fabric.Circle({
    radius: overlayRadius,
    fill: '#ffffff',
    opacity: 0.70,
    stroke: '',
    strokeWidth: 0,
    originX: 'center',
    originY: 'center',
    left: s.cx,
    top: s.cy,
  }) as fabric.Circle & { isLegibilityOverlay?: boolean };
  circleOverlay.isLegibilityOverlay = true;
  editor.addCustom(circleOverlay as fabric.FabricObject, 'shape', 'Legibility Overlay');

  // Inscribed rectangle for text — slightly narrower than the theoretical maximum
  // so no text clips against the circle edge.
  const textW = overlayRadius * Math.sqrt(2) * 0.78;
  const availH = overlayRadius * Math.sqrt(2) * 0.88;

  // Resolve ingredient names
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const ingNames = recipe.ingredientIds
    .map((id) => byId.get(id))
    .filter((i): i is Ingredient => !!i)
    .map((i) => (i.inci?.trim() ? i.inci : i.name));

  // Net-weight line: parse grams and derive oz
  let netWtLine = '';
  if (recipe.netWeight?.trim()) {
    const gMatch = recipe.netWeight.match(/(\d+(?:\.\d+)?)\s*g\b/i);
    if (gMatch) {
      const grams = parseFloat(gMatch[1]);
      const oz = (grams * 0.035274).toFixed(2);
      netWtLine = `Net Wt. ${grams}g / ${oz} oz`;
    } else {
      netWtLine = `Net Wt. ${recipe.netWeight}`;
    }
  }

  const year = new Date().getFullYear();

  // Build logical lines with per-span bold flags
  type LinePart = { text: string; bold?: boolean };
  type LogicalLine = { parts: LinePart[] };
  const logicalLines: LogicalLine[] = [];

  const addBoldLine = (label: string) => logicalLines.push({ parts: [{ text: label, bold: true }] });
  const addInlineBold = (label: string, body: string) =>
    logicalLines.push({ parts: [{ text: `${label}: `, bold: true }, { text: body }] });
  const addNormal = (text: string) => logicalLines.push({ parts: [{ text }] });
  const addBlank = () => logicalLines.push({ parts: [{ text: '' }] });

  // Section 1 — Ingredients header + list
  addBoldLine(`${str.ingredients}:`);
  for (const name of ingNames) addNormal(name);
  addBlank();

  // Section 2 — Directions + Warning (always present; defaults used when recipe leaves them blank)
  const directionsText = recipe.directions?.trim() || 'Lather, rinse, and enjoy.';
  const warningText = recipe.warnings?.trim() || 'For external use only. Avoid contact with eyes.';
  addInlineBold(str.directionsRound, directionsText);
  addInlineBold(str.warningRound, warningText);
  addBlank();

  // Section 3 — Benefits
  if (recipe.benefit?.trim()) {
    addInlineBold(str.benefits, recipe.benefit);
    addBlank();
  }

  // Section 4 — Maker info
  if (settings.businessName?.trim()) {
    addNormal(`${str.handmadeby}: ${settings.businessName}`);
  }
  if (settings.businessAddress?.trim()) {
    addNormal(settings.businessAddress);
  }
  const contactVal = settings.contact?.trim();
  if (contactVal) addNormal(`${str.contact}: ${contactVal}`);

  // Section 5 — Net weight + year
  if (netWtLine) {
    addBlank();
    addNormal(netWtLine);
  }
  addNormal(`${str.handcraftedIn} ${year}`);

  // Assemble the full text string
  const textLines = logicalLines.map((l) => l.parts.map((p) => p.text).join(''));
  const fullText = textLines.join('\n');

  // Build Fabric per-character styles for bold spans
  // Fabric v6 styles: { [lineIndex]: { [charIndex]: StyleDeclaration } }
  type FabricStyleDecl = { fontWeight?: string; fontSize?: number };
  const stylesObj: Record<number, Record<number, FabricStyleDecl>> = {};

  logicalLines.forEach((line, lineIdx) => {
    const lineText = textLines[lineIdx];
    let charOffset = 0;
    const isIngredientHeader = lineIdx === 0; // INGREDIENTS: header gets a size bump

    for (const part of line.parts) {
      if (part.bold || isIngredientHeader) {
        if (!stylesObj[lineIdx]) stylesObj[lineIdx] = {};
        for (let c = 0; c < part.text.length; c++) {
          const decl: FabricStyleDecl = { fontWeight: 'bold' };
          // INGREDIENTS header line gets a slightly larger font size
          if (isIngredientHeader && lineText.length > 0) {
            decl.fontSize = undefined; // set after we know pt; placeholder
          }
          stylesObj[lineIdx][charOffset + c] = decl;
        }
      }
      charOffset += part.text.length;
    }
  });

  // Auto-scale font to fit the available inscribed area
  const pt = fitFont(fullText, textW, availH, 11, 4.5, fontFamily, LINE_HEIGHT);

  // Now fix the INGREDIENTS header font size (1.2× body)
  const headerPt = pt * 1.2;
  if (stylesObj[0]) {
    const headerLineLen = textLines[0].length;
    for (let c = 0; c < headerLineLen; c++) {
      stylesObj[0][c] = { fontWeight: 'bold', fontSize: ptToPx(headerPt) };
    }
  }

  const textbox = new fabric.Textbox(fullText, {
    width: textW,
    fontFamily,
    fontSize: ptToPx(pt),
    fill: INK,
    lineHeight: LINE_HEIGHT,
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    left: s.cx,
    top: s.cy,
    styles: stylesObj as Record<number, Record<number, object>>,
  });
  editor.addCustom(textbox, 'text', 'Back label text');
}

function layoutSide(recipe: Recipe, str: Str) {
  const s = safeRect();
  const hIn = editor.template!.labelHeightIn;
  const centralWidth = s.width * 0.44; // the empty central bar of a ribbon

  const existingLogo = editor.getObjectsByKind('logo')[0];
  if (existingLogo) {
    existingLogo.set({ originX: 'center', originY: 'center', left: s.cx, top: s.cy - s.height * 0.12 });
    existingLogo.setCoords();
  }

  const namePt = clamp(hIn * 11, 9, 20);
  const name = new fabric.Textbox(recipe.name || str.productName, {
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
    const net = new fabric.Textbox(`${str.netWt} ${recipe.netWeight}`, {
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
function measuredHeight(
  text: string,
  widthPx: number,
  pt: number,
  lineHeight = 1.2,
  fontFamily = BODY_FONT,
): number {
  const tb = new fabric.Textbox(text, {
    width: widthPx,
    fontFamily,
    fontSize: ptToPx(pt),
    lineHeight,
  });
  return tb.height ?? 0;
}

/** Largest font (pt) whose measured height fits the available height. Guarantees fit. */
function fitFont(
  text: string,
  widthPx: number,
  availHpx: number,
  maxPt = 9,
  minPt = 4,
  fontFamily = BODY_FONT,
  lineHeight = 1.2,
): number {
  for (let pt = maxPt; pt >= minPt; pt -= 0.25) {
    if (measuredHeight(text, widthPx, pt, lineHeight, fontFamily) <= availHpx) return pt;
  }
  return minPt;
}


function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
