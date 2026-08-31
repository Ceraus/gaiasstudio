import { describe, expect, it } from 'vitest';
import { EMPTY_QR_FIELDS, buildQrPayload, meaningfulUrl, type QrFields } from './qrPayload';

function fields(patch: Partial<QrFields>): QrFields {
  return { ...EMPTY_QR_FIELDS, ...patch };
}

describe('QR combined payload', () => {
  it('treats scheme-only placeholders as empty', () => {
    expect(meaningfulUrl('https://')).toBe('');
    expect(meaningfulUrl('http://')).toBe('');
    expect(meaningfulUrl('  https://example.com  ')).toBe('https://example.com');
  });

  it('encodes a lone website as a URL', () => {
    const result = buildQrPayload(fields({ url: 'https://gaiasessences.com' }));
    expect(result.kind).toBe('url');
    expect(result.payload).toBe('https://gaiasessences.com');
  });

  it('encodes a lone social profile as a URL', () => {
    const result = buildQrPayload(fields({ instagram: 'https://instagram.com/gaia' }));
    expect(result.kind).toBe('url');
    expect(result.payload).toBe('https://instagram.com/gaia');
  });

  it('encodes plain text without a label', () => {
    const result = buildQrPayload(fields({ text: 'Thank you' }));
    expect(result.kind).toBe('text');
    expect(result.payload).toBe('Thank you');
  });

  it('omits empty sections', () => {
    expect(buildQrPayload(EMPTY_QR_FIELDS)).toEqual({ payload: '', kind: 'empty' });
    expect(buildQrPayload(fields({ url: 'https://' })).kind).toBe('empty');
  });

  it('uses labeled lines for URL + text without contact', () => {
    const result = buildQrPayload(fields({
      url: 'https://shop.example',
      text: 'Scan for ingredients',
    }));
    expect(result.kind).toBe('text');
    expect(result.payload).toBe('URL: https://shop.example\nText: Scan for ingredients');
  });

  it('uses labeled lines for multiple social URLs', () => {
    const result = buildQrPayload(fields({
      instagram: 'https://instagram.com/gaia',
      etsy: 'https://etsy.com/shop/gaia',
    }));
    expect(result.kind).toBe('text');
    expect(result.payload).toContain('Instagram: https://instagram.com/gaia');
    expect(result.payload).toContain('Etsy: https://etsy.com/shop/gaia');
  });

  it('builds a vCard when contact fields are present and folds in URL, social, and note', () => {
    const result = buildQrPayload(fields({
      name: 'Rosa Gaia',
      phone: '555-0100',
      email: 'rosa@example.com',
      address: '123 Herb St',
      url: 'https://gaiasessences.com',
      instagram: 'https://instagram.com/gaia',
      text: 'Handmade soaps',
    }));
    expect(result.kind).toBe('vcard');
    expect(result.payload).toMatch(/^BEGIN:VCARD\nVERSION:3.0\n/);
    expect(result.payload).toContain('FN:Rosa Gaia');
    expect(result.payload).toContain('N:Gaia;Rosa;;;');
    expect(result.payload).toContain('TEL:555-0100');
    expect(result.payload).toContain('EMAIL:rosa@example.com');
    expect(result.payload).toContain('ADR;TYPE=HOME:;;123 Herb St;;;;');
    expect(result.payload).toContain('URL:https://gaiasessences.com');
    expect(result.payload).toContain('URL:https://instagram.com/gaia');
    expect(result.payload).toContain('NOTE:Handmade soaps');
    expect(result.payload).toMatch(/END:VCARD$/);
  });

  it('escapes vCard special characters', () => {
    const result = buildQrPayload(fields({
      name: 'A;B',
      text: 'line1\nline2',
    }));
    expect(result.payload).toContain('FN:A\\;B');
    expect(result.payload).toContain('NOTE:line1\\nline2');
  });
});
