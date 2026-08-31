import * as fabric from 'fabric';
import i18next from 'i18next';
import type { AppSettings, Ingredient, LabelContext, Recipe } from '@/types';
import { applyCurveToText, editor } from '@/lib/fabric/editorController';
import {
  applyCircleBaseTint,
  circleInnerDiscRadiusPx,
  circleRingMetrics,
  CIRCLE_TEXT_HEIGHT_RATIO,
  CIRCLE_TEXT_WIDTH_RATIO,
  syncCircleLegibilityDisc,
} from '@/lib/circleLabelTemplate';
import { EDITOR_PPI, ptToPx } from '@/lib/units';
import { loadFont } from '@/lib/fontManager';
import {
  localizeRecipeBenefit,
  localizeRecipeDirections,
  localizeRecipeWarnings,
  resolveRecipeBenefitForLang,
} from '@/lib/recipeI18n';
import { buildSortedInciList } from '@/lib/inventoryMath';
import { formatNetWeightLine } from '@/lib/netWeight';
import { useAppStore } from '@/store/useAppStore';

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
  return buildSortedInciList(recipe, ingredients);
}

/** Removes prior text/shape but keeps the user's background & logo images. */
/**
 * Kinds that survive an auto-layout: the user's background & logo images AND
 * the structural 4-layer stack (white base + legibility overlay), so layout
 * runs only regenerate the foreground content.
 */
const LAYOUT_KEEP_KINDS = ['background', 'logo', 'overlay'];

const PRODUCT_NAME_LAYER = 'Product name';

/** Stock auto-layout labels — not treated as user-typed product names. */
const STOCK_PRODUCT_NAME_LABELS = new Set([
  'Product Name',
  'Nombre del producto',
  'Product',
  'Producto',
]);

function clearForLayout() {
  const canvas = editor.canvas;
  if (!canvas) return;
  canvas.discardActiveObject();
  canvas
    .getObjects()
    .slice()
    .forEach((o) => {
      const kind = String((o as { gaiaKind?: string }).gaiaKind ?? '');
      if (kind && !LAYOUT_KEEP_KINDS.includes(kind) && !kind.startsWith('__')) {
        canvas.remove(o);
      }
    });
}

function objectLayerName(o: fabric.FabricObject): string {
  return String((o as { name?: string }).name ?? '');
}

function objectPlainText(o: fabric.FabricObject): string {
  const g = o as {
    text?: string;
    gaiaCurveSourceText?: string;
    getObjects?: () => fabric.FabricObject[];
  };
  const fromCurve = g.gaiaCurveSourceText?.trim();
  if (fromCurve) return fromCurve;
  if (typeof g.text === 'string' && g.text.trim()) return g.text.trim();
  if (typeof g.getObjects === 'function') {
    for (const child of g.getObjects()) {
      const t = (child as { text?: string }).text?.trim();
      if (t) return t;
    }
  }
  return '';
}

/**
 * Keep a Product name the user typed. Drop recipe auto-fills and stock
 * placeholders so language / recipe re-apply does not write recipe.name back.
 */
function captureUserProductName(recipeName: string): string {
  const canvas = editor.canvas;
  if (!canvas) return '';
  const obj = canvas.getObjects().find((o) => objectLayerName(o) === PRODUCT_NAME_LAYER);
  if (!obj) return '';
  const text = objectPlainText(obj);
  if (!text || STOCK_PRODUCT_NAME_LABELS.has(text)) return '';
  const recipe = recipeName.trim();
  if (recipe && text.localeCompare(recipe, undefined, { sensitivity: 'accent' }) === 0) {
    return '';
  }
  return text;
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
  lang?: LayoutLang,
  settings: Partial<AppSettings> = {},
) {
  const canvas = editor.canvas;
  const template = editor.template;
  if (!canvas || !template) return;

  // Auto-detect language from i18next if not explicitly passed
  const detectedLang = (i18next.language?.startsWith('es') ? 'es' : 'en') as LayoutLang;
  const resolvedLang = lang ?? detectedLang;

  const str = LABEL_STRINGS[resolvedLang] ?? LABEL_STRINGS.en;

  const t = i18next.t.bind(i18next);
  const localizedRecipe: Recipe = {
    ...recipe,
    benefit: (() => {
      const bilingual = resolveRecipeBenefitForLang(recipe, resolvedLang);
      if (bilingual) return bilingual;
      return localizeRecipeBenefit(recipe.name, recipe.benefit, t);
    })(),
    directions: localizeRecipeDirections(recipe.directions, t),
    warnings: localizeRecipeWarnings(recipe.warnings, t),
  };

  const isRound = template.shape === 'circle' || template.shape === 'oval';

  await Promise.all([
    loadFont(HEADING_FONT),
    loadFont(BODY_FONT),
    ...(isRound ? [loadFont(ROUND_BACK_FONT)] : []),
  ]);

  // Read before clearForLayout — that pass removes the Product name object.
  const userProductName = captureUserProductName(recipe.name);

  clearForLayout();

  // Every circle/oval uses the same Avery-style stack: background ring,
  // inner legibility disc, and full formatted regulatory text.
  if (isRound) {
    layoutCircleLabel(localizedRecipe, ingredients, str, settings, resolvedLang, userProductName);
  } else if (context === 'front') {
    layoutFront(localizedRecipe, str, settings, false, userProductName);
  } else if (context === 'back') {
    layoutBack(localizedRecipe, ingredients, str);
  } else {
    layoutSide(localizedRecipe, str, userProductName);
  }

  canvas.requestRenderAll();
  useAppStore.getState().setLabelLanguage(resolvedLang);
}

function layoutFront(
  recipe: Recipe,
  str: Str,
  settings: Partial<AppSettings> = {},
  isRound = false,
  userProductName = '',
) {
  const canvas = editor.canvas;
  if (!canvas) return;

  const s = safeRect();
  const cx = s.cx;
  const cy = s.cy;

  const bgPlate = canvas
    .getObjects()
    .find((o) => (o as { gaiaKind?: string }).gaiaKind === 'background') as
    | { gaiaKind?: string; gaiaPlaceholder?: boolean; set: (k: string, v: string) => void }
    | undefined;
  const hasBgImage = bgPlate && !bgPlate.gaiaPlaceholder;
  if (bgPlate?.gaiaPlaceholder && !hasBgImage) {
    bgPlate.set('fill', '#c8d4c0');
  }

  // Front (non-round) keeps using a centered column. Circle/oval labels go
  // through layoutCircleLabel, which owns the interactive white disc.
  const circleRadius = editor.labelWpx * 0.33;

  // ── Content ──────────────────────────────────────────────────────────────
  // A front label is the shop-window face of the bar: what it is, what it does
  // for you, and how much of it there is. The full ingredient / directions /
  // warning block belongs on the back, where layoutBack and layoutRoundBack
  // have the room to typeset it.
  const tagline = recipe.benefit?.trim() ?? '';
  const netWtLine = formatNetWeightLine(recipe.netWeight, str.netWt, '100g');
  const maker = settings.businessName?.trim() ?? '';

  const circleDiameter = circleRadius * 2;
  const innerWidth = circleDiameter * 0.8;
  // Ring between the legibility circle and the safe edge, where curved text sits.
  const ringMid = (circleRadius + Math.min(s.width, s.height) / 2) / 2;
  const ringThickness = Math.min(s.width, s.height) / 2 - circleRadius;
  // Below roughly 6 pt the arc is unreadable and would spill over the die-cut,
  // so tiny labels (0.75" rounds and the like) keep everything in the middle.
  const ringUsable = isRound && ringThickness >= ptToPx(6);

  // ── Product name (user-typed only — never recipe.name) ───────────────────
  if (ringUsable) {
    addRingText(userProductName, {
      cx,
      ringMid,
      ringThickness,
      safeTop: s.top,
      safeBottom: s.top + s.height,
      atTop: true,
      fontFamily: HEADING_FONT,
      name: PRODUCT_NAME_LAYER,
    });
  } else if (!isRound) {
    const namePt = clamp(editor.template!.labelWidthIn * 7, 8, 18);
    const title = new fabric.Textbox(userProductName, {
      width: s.width,
      fontFamily: HEADING_FONT,
      fontSize: ptToPx(namePt),
      fill: INK,
      textAlign: 'center',
      originX: 'center',
      originY: 'top',
      left: cx,
      top: s.top,
    });
    editor.addCustom(title, 'text', PRODUCT_NAME_LAYER);
  }

  // ── Everything that lives inside the legibility circle ───────────────────
  // Ordered by importance: whatever cannot fit is dropped from the bottom
  // rather than printed over the label's edge.
  const innerLines: string[] = [];
  if (tagline) innerLines.push(tagline);
  if (netWtLine) innerLines.push(netWtLine);
  if (!ringUsable && maker) innerLines.push(`${str.handmadeby}: ${maker}`);

  const block = fitBlock(innerLines, innerWidth, circleDiameter * 0.72, 13, 6, ROUND_BACK_FONT, 1.35);
  if (block) {
    const textbox = new fabric.Textbox(block.text, {
      width: innerWidth,
      fontFamily: ROUND_BACK_FONT,
      fontSize: ptToPx(block.pt),
      fill: INK,
      lineHeight: 1.35,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      left: cx,
      top: cy,
    });
    editor.addCustom(textbox, 'text', 'Label text');
  }

  // ── Maker name along the bottom of the ring (round labels only) ──────────
  if (ringUsable && maker) {
    addRingText(maker, {
      cx,
      ringMid,
      ringThickness,
      safeTop: s.top,
      safeBottom: s.top + s.height,
      atTop: false,
      fontFamily: ROUND_BACK_FONT,
      name: 'Maker',
      maxPt: 9,
    });
  }
}

/**
 * Fits as many of `lines` as will physically go, largest readable size first.
 *
 * `fitFont` alone can only shrink to `minPt` and then gives up, which is how a
 * 0.75" label ended up printing text past its own die-cut. Here the last line
 * is dropped and the fit retried, so the label always keeps its most important
 * information and never overflows.
 */
function fitBlock(
  lines: string[],
  widthPx: number,
  availHpx: number,
  maxPt: number,
  minPt: number,
  fontFamily: string,
  lineHeight: number,
): { text: string; pt: number } | null {
  for (let count = lines.length; count > 0; count--) {
    const text = lines.slice(0, count).join('\n\n');
    const pt = fitFont(text, widthPx, availHpx, maxPt, minPt, fontFamily, lineHeight);
    if (measuredHeight(text, widthPx, pt, lineHeight, fontFamily) <= availHpx) return { text, pt };
  }
  return null;
}


interface RingTextOptions {
  cx: number;
  /** Radius of the arc the text should follow. */
  ringMid: number;
  /** How tall the text may be, i.e. the gap between circle and safe edge. */
  ringThickness: number;
  safeTop: number;
  safeBottom: number;
  /** Arch upward along the top of the label, or downward along the bottom. */
  atTop: boolean;
  fontFamily: string;
  name: string;
  maxPt?: number;
}

/** Sweep of the arc, in radians. ~130° leaves the label's sides clear. */
const RING_SWEEP = 2.27;

/**
 * Sets text on a circular arc in the ring outside the legibility circle.
 *
 * Both the curve and the placement are solved from the geometry rather than
 * eyeballed. `buildCurvePath` uses `radius = width / (amount/100 · π · 0.9)`,
 * so picking `amount` for the ring radius makes the text follow the label's
 * edge exactly.
 *
 * Fabric renders each glyph at `pathPoint − path.pathOffset` relative to the
 * text object's centre, which means the arc's bounding-box centre lands on the
 * object's centre. The object's own bounding box says nothing useful about
 * where the glyphs ended up, so the arc's height is derived instead: the apex
 * sits `sagitta / 2` from the centre, and half a line of type beyond that.
 */
function addRingText(text: string, opts: RingTextOptions) {
  const value = text.trim();

  const { cx, ringMid, ringThickness, safeTop, safeBottom, atTop, fontFamily, name } = opts;

  const arcWidth = ringMid * RING_SWEEP;
  // Type has to clear the ring's thickness; ringThickness is in canvas px.
  const ringPt = (ringThickness / EDITOR_PPI) * 72 * 0.85;
  const maxPt = Math.min(opts.maxPt ?? 14, Math.max(6, ringPt));
  const pt = value
    ? fitFont(value, arcWidth, ptToPx(maxPt) * 1.05, maxPt, 5, fontFamily, 1)
    : maxPt;
  const fontPx = ptToPx(pt);

  const box = new fabric.Textbox(value, {
    width: arcWidth,
    fontFamily,
    fontSize: fontPx,
    fill: INK,
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    left: cx,
    top: 0,
  });
  const amount = clamp(Math.round((arcWidth / (ringMid * Math.PI * 0.9)) * 100), 25, 100);
  const curved = applyCurveToText(box, atTop ? amount : -amount);

  // Sagitta of the arc, i.e. how far the apex rises above its end points.
  const theta = (amount / 100) * Math.PI * 0.9;
  const radius = arcWidth / theta;
  const sagitta = radius * (1 - Math.cos(theta / 2));
  const apexToCentre = sagitta / 2 + fontPx * 0.6;

  curved.set({ top: atTop ? safeTop + apexToCentre : safeBottom - apexToCentre });
  curved.setCoords();
  editor.addCustom(curved, 'text', name);
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
  if (recipe.netWeight?.trim()) extra.push(formatNetWeightLine(recipe.netWeight, str.netWt));
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

type LinePart = { text: string; bold?: boolean };
type LogicalLine = { parts: LinePart[] };

/**
 * Canonical round-label layout (Avery 22562-style):
 *   • Full-bleed background visible in the outer ring
 *   • Inner white legibility disc (70% opacity)
 *   • Curved Product name slot in the ring (empty unless the user typed one)
 *   • Full formatted text block inside the disc
 */
function layoutCircleLabel(
  recipe: Recipe,
  ingredients: Ingredient[],
  str: Str,
  settings: Partial<AppSettings>,
  lang: LayoutLang,
  userProductName: string,
) {
  const s = safeRect();
  const fontFamily = ROUND_BACK_FONT;
  const LINE_HEIGHT = 1.25;

  applyCircleBaseTint();

  const discRadius = circleInnerDiscRadiusPx(editor.labelWpx);
  syncCircleLegibilityDisc(s.cx, s.cy, discRadius);

  const textW = discRadius * 2 * CIRCLE_TEXT_WIDTH_RATIO;
  const availH = discRadius * 2 * CIRCLE_TEXT_HEIGHT_RATIO;

  const { ringMid, ringThickness, ringUsable } = circleRingMetrics(s.width, s.height, discRadius);

  if (ringUsable) {
    addRingText(userProductName, {
      cx: s.cx,
      ringMid,
      ringThickness,
      safeTop: s.top,
      safeBottom: s.top + s.height,
      atTop: true,
      fontFamily: HEADING_FONT,
      name: PRODUCT_NAME_LAYER,
    });
  } else {
    const namePt = clamp(editor.template!.labelWidthIn * 7, 8, 14);
    const title = new fabric.Textbox(userProductName, {
      width: textW,
      fontFamily: HEADING_FONT,
      fontSize: ptToPx(namePt),
      fill: INK,
      textAlign: 'center',
      originX: 'center',
      originY: 'top',
      left: s.cx,
      top: s.cy - discRadius * CIRCLE_TEXT_HEIGHT_RATIO,
    });
    editor.addCustom(title, 'text', PRODUCT_NAME_LAYER);
  }

  const logicalLines = buildCircleLabelLines(recipe, ingredients, str, settings, lang);
  placeCircleFormattedText(logicalLines, s.cx, s.cy, textW, availH, fontFamily, LINE_HEIGHT);
}

/** Builds Ingredients / Directions / Warning / Benefits / Handmade lines. */
function buildCircleLabelLines(
  recipe: Recipe,
  ingredients: Ingredient[],
  str: Str,
  settings: Partial<AppSettings>,
  lang: LayoutLang,
): LogicalLine[] {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const glycerinBase = ingredients.find(
    (i) => i.isSoapBase && /glycerin base \(clear\)/i.test(i.name),
  );
  const orderedIds = glycerinBase && !recipe.ingredientIds.includes(glycerinBase.id)
    ? [glycerinBase.id, ...recipe.ingredientIds]
    : glycerinBase
      ? [glycerinBase.id, ...recipe.ingredientIds.filter((id) => id !== glycerinBase.id)]
      : recipe.ingredientIds;
  const ingNames = orderedIds
    .map((id) => byId.get(id))
    .filter((i): i is Ingredient => !!i)
    .map((i) => (i.inci?.trim() ? i.inci : i.name));

  const netWtLine = formatNetWeightLine(recipe.netWeight, str.netWt, '100g');

  const year = new Date().getFullYear();

  const logicalLines: LogicalLine[] = [];

  const addBoldLine = (label: string) => logicalLines.push({ parts: [{ text: label, bold: true }] });
  const addInlineBold = (label: string, body: string) =>
    logicalLines.push({ parts: [{ text: `${label}: `, bold: true }, { text: body }] });
  const addNormal = (text: string) => logicalLines.push({ parts: [{ text }] });
  const addBlank = () => logicalLines.push({ parts: [{ text: '' }] });

  // Section 1 — Ingredients header + list (LABEL_STRINGS.addHint when the recipe is empty)
  addBoldLine(`${str.ingredients}:`);
  if (ingNames.length === 0) addNormal(str.addHint);
  else for (const name of ingNames) addNormal(name);
  addBlank();

  // Section 2 — Directions + Warning (always present; defaults used when recipe leaves them blank)
  const directionsText =
    recipe.directions?.trim() ||
    (lang === 'es'
      ? 'Enjabona con agua, enjuaga y disfruta.'
      : 'Lather with water, rinse, and enjoy.');
  const warningText =
    recipe.warnings?.trim() ||
    (lang === 'es'
      ? 'Solo para uso externo. Evite el contacto con los ojos.'
      : 'For external use only. Avoid contact with eyes.');
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

  return logicalLines;
}

function placeCircleFormattedText(
  logicalLines: LogicalLine[],
  cx: number,
  cy: number,
  textW: number,
  availH: number,
  fontFamily: string,
  lineHeight: number,
) {
  const textLines = logicalLines.map((l) => l.parts.map((p) => p.text).join(''));
  const fullText = textLines.join('\n');

  type FabricStyleDecl = { fontWeight?: string; fontSize?: number };
  const stylesObj: Record<number, Record<number, FabricStyleDecl>> = {};

  logicalLines.forEach((line, lineIdx) => {
    let charOffset = 0;
    const isIngredientHeader = lineIdx === 0;

    for (const part of line.parts) {
      if (part.bold || isIngredientHeader) {
        if (!stylesObj[lineIdx]) stylesObj[lineIdx] = {};
        for (let c = 0; c < part.text.length; c++) {
          stylesObj[lineIdx][charOffset + c] = { fontWeight: 'bold' };
        }
      }
      charOffset += part.text.length;
    }
  });

  const pt = fitFont(fullText, textW, availH, 11, 4.5, fontFamily, lineHeight);
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
    lineHeight,
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    left: cx,
    top: cy,
    styles: stylesObj as Record<number, Record<number, object>>,
  });
  editor.addCustom(textbox, 'text', 'Label text');
}

function layoutSide(recipe: Recipe, str: Str, userProductName = '') {
  const s = safeRect();
  const hIn = editor.template!.labelHeightIn;
  const centralWidth = s.width * 0.44; // the empty central bar of a ribbon

  const existingLogo = editor.getObjectsByKind('logo')[0];
  if (existingLogo) {
    existingLogo.set({ originX: 'center', originY: 'center', left: s.cx, top: s.cy - s.height * 0.12 });
    existingLogo.setCoords();
  }

  const namePt = clamp(hIn * 11, 9, 20);
  const name = new fabric.Textbox(userProductName, {
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
  editor.addCustom(name, 'text', PRODUCT_NAME_LAYER);

  if (recipe.netWeight?.trim()) {
    const net = new fabric.Textbox(formatNetWeightLine(recipe.netWeight, str.netWt), {
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
  const tb = new fabric.Textbox(text, {
    width: widthPx,
    fontFamily,
    fontSize: ptToPx(maxPt),
    lineHeight,
  });
  for (let pt = maxPt; pt >= minPt; pt -= 0.25) {
    tb.set({ fontSize: ptToPx(pt) });
    tb.initDimensions();
    if ((tb.height ?? 0) <= availHpx) return pt;
  }
  return minPt;
}


function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
