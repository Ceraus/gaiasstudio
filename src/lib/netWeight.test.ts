import { describe, expect, it } from 'vitest';
import { formatNetWeightAmount, formatNetWeightLine, parseNetWeight } from '@/lib/netWeight';

describe('net weight dual declaration', () => {
  it('converts grams to ounces', () => {
    expect(parseNetWeight('100g')?.grams).toBe(100);
    expect(formatNetWeightAmount('100g')).toBe('3.53 oz (100 g)');
    expect(formatNetWeightAmount('128 g')).toBe('4.51 oz (128 g)');
  });

  it('converts ounces to grams', () => {
    expect(formatNetWeightAmount('3.5 oz')).toBe('3.50 oz (99.2 g)');
    expect(formatNetWeightAmount('4 oz')).toBe('4 oz (113.4 g)');
  });

  it('keeps an already-dual value as ounces plus grams', () => {
    expect(formatNetWeightAmount('3.5 oz (100 g)')).toBe('3.53 oz (100 g)');
    expect(formatNetWeightAmount('4.5 oz (128 g)')).toBe('4.51 oz (128 g)');
  });

  it('prefixes the label line', () => {
    expect(formatNetWeightLine('100g')).toBe('Net Wt 3.53 oz (100 g)');
    expect(formatNetWeightLine('100g', 'Peso Neto')).toBe('Peso Neto 3.53 oz (100 g)');
  });

  it('falls back to 100 g when empty', () => {
    expect(formatNetWeightAmount('')).toBe('3.53 oz (100 g)');
  });
});
