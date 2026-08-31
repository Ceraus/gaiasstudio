import { describe, expect, it } from 'vitest';
import {
  applyTextMapToCanvasJson,
  parseTextObjectsFromJson,
  readCanvasLabelLanguage,
  writeCanvasLabelLanguage,
} from './canvasTextJson';

const curvedGroupJson = JSON.stringify({
  objects: [
    {
      type: 'group',
      id: 'curve-1',
      gaiaCurve: 66,
      gaiaCurveSourceText: 'Lavender Soap',
      objects: [
        { type: 'text', id: 'glyph-1', text: 'L' },
        { type: 'text', id: 'glyph-2', text: 'a' },
      ],
    },
    {
      type: 'group',
      id: 'wrap',
      objects: [
        { type: 'textbox', id: 'inner', text: 'Directions' },
      ],
    },
    { type: 'textbox', id: 'top', text: 'INGREDIENTS' },
  ],
});

describe('parseTextObjectsFromJson', () => {
  it('walks groups and uses gaiaCurveSourceText for curved labels', () => {
    expect(parseTextObjectsFromJson(curvedGroupJson)).toEqual([
      { id: 'curve-1', text: 'Lavender Soap' },
      { id: 'inner', text: 'Directions' },
      { id: 'top', text: 'INGREDIENTS' },
    ]);
  });

  it('falls back to the first child text when source text is missing', () => {
    const json = JSON.stringify({
      objects: [
        {
          type: 'group',
          id: 'curve-2',
          gaiaCurve: 40,
          objects: [{ type: 'i-text', text: 'Rose Bar' }],
        },
      ],
    });
    expect(parseTextObjectsFromJson(json)).toEqual([{ id: 'curve-2', text: 'Rose Bar' }]);
  });

  it('returns empty for canvases with no text', () => {
    expect(parseTextObjectsFromJson(JSON.stringify({ objects: [{ type: 'rect' }] }))).toEqual([]);
    expect(parseTextObjectsFromJson('not-json')).toEqual([]);
  });
});

describe('applyTextMapToCanvasJson', () => {
  it('updates group source text and the first child', () => {
    const next = applyTextMapToCanvasJson(curvedGroupJson, {
      'curve-1': 'Jabón de Lavanda',
      inner: 'Instrucciones',
    });
    const parsed = JSON.parse(next) as {
      objects: Array<{
        gaiaCurveSourceText?: string;
        objects?: Array<{ text?: string }>;
      }>;
    };
    expect(parsed.objects[0].gaiaCurveSourceText).toBe('Jabón de Lavanda');
    expect(parsed.objects[0].objects?.[0].text).toBe('Jabón de Lavanda');
    expect(parsed.objects[1].objects?.[0].text).toBe('Instrucciones');
  });
});

describe('canvas label language', () => {
  it('reads and writes gaiaLabelLanguage without dropping objects', () => {
    const stamped = writeCanvasLabelLanguage(curvedGroupJson, 'en');
    expect(readCanvasLabelLanguage(stamped)).toBe('en');
    expect(parseTextObjectsFromJson(stamped)).toEqual(parseTextObjectsFromJson(curvedGroupJson));
    expect(readCanvasLabelLanguage(writeCanvasLabelLanguage(stamped, 'es'))).toBe('es');
  });

  it('returns null when the field is missing or invalid', () => {
    expect(readCanvasLabelLanguage(curvedGroupJson)).toBeNull();
    expect(readCanvasLabelLanguage(JSON.stringify({ gaiaLabelLanguage: 'fr' }))).toBeNull();
    expect(readCanvasLabelLanguage(null)).toBeNull();
  });
});
