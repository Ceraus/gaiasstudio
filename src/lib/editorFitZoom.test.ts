import { describe, expect, it } from 'vitest';
import { computeEditorFitZoom, snapUniformZoom } from './editorFitZoom';

const PPI = 150;
const RULER = 24;

describe('computeEditorFitZoom', () => {
  const desk = { containerW: 1146, containerH: 852, rulerSize: RULER, minZoom: 0.05, maxZoom: 48 };

  it('fills the 1920×1080 editor well for a 2.5" PTE round (~150–200%+)', () => {
    const artboard = (2.5 + 0.125 * 2) * PPI;
    const z = computeEditorFitZoom({
      ...desk,
      artboardW: artboard,
      artboardH: artboard,
      rulersVisible: false,
    });
    expect(z).toBeGreaterThanOrEqual(1.5);
    expect(artboard * z).toBeGreaterThanOrEqual(400);
    expect(artboard * z).toBeLessThan(desk.containerH);
  });

  it('fills the well for a 1/4" sticker instead of capping at 200%', () => {
    const artboard = 0.25 * PPI;
    const z = computeEditorFitZoom({
      ...desk,
      artboardW: artboard,
      artboardH: artboard,
      rulersVisible: false,
    });
    expect(z).toBeGreaterThan(5);
    expect(artboard * z).toBeGreaterThanOrEqual(400);
    const at200 = artboard * 2;
    expect(artboard * z).toBeGreaterThan(at200 * 4);
  });

  it('keeps the displayed artboard on integer CSS pixels', () => {
    const artboard = 0.25 * PPI;
    const z = computeEditorFitZoom({
      ...desk,
      artboardW: artboard,
      artboardH: artboard,
      rulersVisible: false,
    });
    expect(artboard * z).toBeCloseTo(Math.round(artboard * z), 6);
  });
});

describe('snapUniformZoom', () => {
  it('uses one scale for width and height', () => {
    const z = snapUniformZoom(1.773, 412.5, 412.5);
    expect(412.5 * z).toBeCloseTo(412.5 * z, 10);
    expect(Math.abs(412.5 * z - Math.round(412.5 * z))).toBeLessThan(1e-6);
  });
});
