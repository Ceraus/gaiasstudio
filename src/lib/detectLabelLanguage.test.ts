import { describe, expect, it } from 'vitest';
import { detectCanvasLabelLanguage, detectLabelLanguageFromTexts } from './detectLabelLanguage';
import { writeCanvasLabelLanguage } from './fabric/canvasTextJson';

describe('detectLabelLanguageFromTexts', () => {
  it('detects English section headers and directions', () => {
    expect(
      detectLabelLanguageFromTexts([
        'INGREDIENTS',
        'Directions',
        'Lather with water and apply to skin. Rinse thoroughly.',
      ]),
    ).toBe('en');
  });

  it('detects Spanish section headers and directions', () => {
    expect(
      detectLabelLanguageFromTexts([
        'INGREDIENTES',
        'Instrucciones',
        'Enjabona con agua y aplica sobre la piel. Enjuaga bien.',
      ]),
    ).toBe('es');
  });

  it('uses Spanish punctuation when glossary is silent', () => {
    expect(detectLabelLanguageFromTexts(['¡Deja la piel suave y luminosa!'])).toBe('es');
  });

  it('uses a stored hint only when scores are close or empty', () => {
    expect(detectLabelLanguageFromTexts(['ABC-12345'], 'en')).toBe('en');
    expect(detectLabelLanguageFromTexts(['INGREDIENTES', 'Instrucciones'], 'en')).toBe('es');
  });
});

describe('detectCanvasLabelLanguage', () => {
  it('reads text layers and ignores a stale stamp when the copy is clearly the other language', () => {
    const json = writeCanvasLabelLanguage(
      JSON.stringify({
        objects: [
          { type: 'textbox', id: 'a', text: 'INGREDIENTS' },
          { type: 'textbox', id: 'b', text: 'Directions' },
        ],
      }),
      'es',
    );
    expect(detectCanvasLabelLanguage(json)).toBe('en');
  });

  it('falls back to the canvas stamp when text is language-neutral', () => {
    const json = writeCanvasLabelLanguage(
      JSON.stringify({
        objects: [{ type: 'textbox', id: 'lot', text: 'L260726' }],
      }),
      'es',
    );
    expect(detectCanvasLabelLanguage(json)).toBe('es');
  });
});
