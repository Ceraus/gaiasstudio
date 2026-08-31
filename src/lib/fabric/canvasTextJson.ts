/** Language last applied to label text (not the app EN/ES chrome toggle). */
export type CanvasLabelLanguage = 'en' | 'es';

/** Read the persisted label-text language from serialized canvas JSON. */
export function readCanvasLabelLanguage(canvasJson: string | null | undefined): CanvasLabelLanguage | null {
  if (!canvasJson) return null;
  try {
    const parsed = JSON.parse(canvasJson) as { gaiaLabelLanguage?: unknown };
    return parsed.gaiaLabelLanguage === 'en' || parsed.gaiaLabelLanguage === 'es'
      ? parsed.gaiaLabelLanguage
      : null;
  } catch {
    return null;
  }
}

/** Stamp the applied label-text language onto serialized canvas JSON. */
export function writeCanvasLabelLanguage(canvasJson: string, lang: CanvasLabelLanguage): string {
  const parsed = JSON.parse(canvasJson) as Record<string, unknown>;
  parsed.gaiaLabelLanguage = lang;
  return JSON.stringify(parsed);
}

/** Serialized Fabric object we walk for label-language translation. */
export interface CanvasJsonObject {
  type?: string;
  id?: string;
  text?: string;
  gaiaCurve?: number;
  gaiaCurveSourceText?: string;
  objects?: CanvasJsonObject[];
}

export type CanvasTextEntry = { id: string; text: string };

function jsonType(o: CanvasJsonObject): string {
  return String(o.type ?? '').toLowerCase();
}

function isJsonTextType(o: CanvasJsonObject): boolean {
  const t = jsonType(o);
  return t === 'textbox' || t === 'i-text' || t === 'text';
}

/** Curved product-name groups store the real string on the group, not each glyph. */
export function isJsonCurvedTextGroup(o: CanvasJsonObject): boolean {
  if (jsonType(o) !== 'group') return false;
  if (typeof o.gaiaCurveSourceText === 'string' && o.gaiaCurveSourceText.trim()) return true;
  return typeof o.gaiaCurve === 'number' && o.gaiaCurve !== 0;
}

function firstChildText(o: CanvasJsonObject): string {
  const child = (o.objects ?? []).find(isJsonTextType);
  return (child?.text ?? '').trim();
}

export function curvedGroupSourceText(o: CanvasJsonObject): string {
  const source = o.gaiaCurveSourceText?.trim();
  return source || firstChildText(o);
}

function collectTextObjects(objects: CanvasJsonObject[] | undefined, out: CanvasTextEntry[]): void {
  for (const o of objects ?? []) {
    if (isJsonCurvedTextGroup(o)) {
      const text = curvedGroupSourceText(o);
      if (text) out.push({ id: o.id ?? '', text });
      continue;
    }
    if (isJsonTextType(o)) {
      const text = (o.text ?? '').trim();
      if (text) out.push({ id: o.id ?? '', text });
      continue;
    }
    if (jsonType(o) === 'group') {
      collectTextObjects(o.objects, out);
    }
  }
}

function applyMapToObjects(objects: CanvasJsonObject[] | undefined, map: Record<string, string>): void {
  for (const o of objects ?? []) {
    if (o.id && map[o.id] != null) {
      if (isJsonTextType(o)) {
        o.text = map[o.id];
      }
      if (isJsonCurvedTextGroup(o) || (jsonType(o) === 'group' && o.gaiaCurveSourceText != null)) {
        o.gaiaCurveSourceText = map[o.id];
        const child = (o.objects ?? []).find(isJsonTextType);
        if (child) child.text = map[o.id];
      }
    }
    if (jsonType(o) === 'group') {
      applyMapToObjects(o.objects, map);
    }
  }
}

/** Parse text objects from serialized JSON without loading a full canvas. */
export function parseTextObjectsFromJson(canvasJson: string): CanvasTextEntry[] {
  try {
    const parsed = JSON.parse(canvasJson) as { objects?: CanvasJsonObject[] };
    const out: CanvasTextEntry[] = [];
    collectTextObjects(parsed.objects, out);
    return out;
  } catch {
    return [];
  }
}

/** Replace text on serialized canvas objects by id (walks groups). */
export function applyTextMapToCanvasJson(canvasJson: string, map: Record<string, string>): string {
  const parsed = JSON.parse(canvasJson) as { objects?: CanvasJsonObject[] };
  applyMapToObjects(parsed.objects, map);
  return JSON.stringify(parsed);
}
