import { describe, expect, it } from 'vitest';
import {
  recipeBilingualPairs,
  translateLabelTextOffline,
  translateLabelTextsOffline,
} from './offlineLabelTranslate';

describe('offline label translate', () => {
  it('translates section headers both ways', () => {
    expect(translateLabelTextOffline('INGREDIENTS', 'es').text).toBe('INGREDIENTES');
    expect(translateLabelTextOffline('INGREDIENTES', 'en').text).toBe('INGREDIENTS');
    expect(translateLabelTextOffline('Directions', 'es').text).toMatch(/instrucciones|modo de uso/i);
    expect(translateLabelTextOffline('NET WT', 'es').text).toBe('PESO NETO');
  });

  it('translates default directions and warnings offline', () => {
    const directions = translateLabelTextOffline(
      'Lather with water and apply to skin. Rinse thoroughly.',
      'es',
    );
    expect(directions.confidence).toBe('exact');
    expect(directions.text).toMatch(/enjabona/i);
    expect(directions.text).toMatch(/enjuaga/i);

    const warning = translateLabelTextOffline(
      'For external use only. Avoid contact with eyes.',
      'es',
    );
    expect(warning.confidence).toBe('exact');
    expect(warning.text).toMatch(/uso externo/i);
  });

  it('uses stored benefitEn/benefitEs instead of machine translate', () => {
    const pairs = recipeBilingualPairs({
      benefitEn: 'Leaves skin feeling creamy.',
      benefitEs: 'Deja la piel con un tacto cremoso.',
    });
    const toEs = translateLabelTextOffline('Leaves skin feeling creamy.', 'es', pairs);
    expect(toEs.text).toBe('Deja la piel con un tacto cremoso.');
    expect(toEs.confidence).toBe('exact');

    const toEn = translateLabelTextOffline('Deja la piel con un tacto cremoso.', 'en', pairs);
    expect(toEn.text).toBe('Leaves skin feeling creamy.');
  });

  it('translates seeded recipe benefit taglines', () => {
    const result = translateLabelTextOffline('Moisturizing & Aromatic', 'es');
    expect(result.text).toMatch(/aromático|aromatico/i);
    expect(result.text).not.toBe('Moisturizing & Aromatic');
  });

  it('passes through INCI names, emails, and lot-style codes', () => {
    const inci = 'Butyrospermum Parkii (Shea) Butter';
    expect(translateLabelTextOffline(inci, 'es').text).toBe(inci);
    expect(translateLabelTextOffline(inci, 'es').confidence).toBe('passthrough');

    const email = 'customercare@gaiasessences.com';
    expect(translateLabelTextOffline(email, 'es').text).toBe(email);

    const lot = 'L260726';
    expect(translateLabelTextOffline(lot, 'es').text).toBe(lot);
  });

  it('keeps proper-noun product names', () => {
    const name = "Gaia's Essences";
    const result = translateLabelTextOffline(name, 'es');
    expect(result.text).toBe(name);
    expect(result.confidence).toBe('passthrough');
  });

  it('does not half-translate an unknown English sentence', () => {
    const line = 'Leaves skin feeling creamy.';
    const result = translateLabelTextOffline(line, 'es');
    expect(result.text).toBe(line);
    expect(result.confidence).toBe('unknown');
  });

  it('rewrites Handmade by while keeping the brand', () => {
    const result = translateLabelTextOffline("Handmade by Gaia's Essences", 'es');
    expect(result.text).toMatch(/hecho a mano por/i);
    expect(result.text).toMatch(/Gaia's Essences/);
  });

  it('preserves source capitalization on glossary hits', () => {
    expect(translateLabelTextOffline('SOAP', 'es').text).toBe('JABÓN');
    expect(translateLabelTextOffline('Handmade', 'es').text).toBe('Hecho a mano');
    expect(translateLabelTextOffline('Handmade soap', 'es').text).toBe('Jabón artesanal');
    expect(translateLabelTextOffline('handmade soap', 'es').text).toBe('jabón artesanal');
  });

  it('round-trips a batch of label lines', () => {
    const lines = ['INGREDIENTS', 'For external use only', 'Shea Butter'];
    const toEs = translateLabelTextsOffline(lines, 'es');
    expect(toEs[0].text).toBe('INGREDIENTES');
    expect(toEs[1].text).toMatch(/uso externo/i);
    expect(toEs[2].text.toLowerCase()).toMatch(/karité|manteca/);
    const back = translateLabelTextsOffline(toEs.map((row) => row.text), 'en');
    expect(back[0].text.toUpperCase()).toBe('INGREDIENTS');
  });
});
