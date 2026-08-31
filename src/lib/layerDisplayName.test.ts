import { describe, expect, it } from 'vitest';
import { LAYER_NAME_KEYS, layerDisplayName } from './layerDisplayName';

const STRINGS: Record<string, string> = {
  'layers.labelText': 'Texto de la etiqueta',
  'layers.productName': 'Nombre del producto',
  'layers.kindOverlay': 'Capa de legibilidad',
  'layers.kindBackground': 'Fondo',
  'layers.kindQr': 'Código QR',
  'layers.unnamed': 'Capa sin nombre',
};

function t(key: string) {
  return STRINGS[key] ?? key;
}

describe('layerDisplayName', () => {
  it('translates stored English defaults without changing the stored name', () => {
    expect(layerDisplayName('Label text', t)).toBe('Texto de la etiqueta');
    expect(layerDisplayName('Product name', t)).toBe('Nombre del producto');
    expect(layerDisplayName('Legibility Overlay', t)).toBe('Capa de legibilidad');
    expect(layerDisplayName('Background', t)).toBe('Fondo');
    expect(layerDisplayName('QR Code', t)).toBe('Código QR');
  });

  it('leaves custom or canvas artwork names untouched', () => {
    expect(layerDisplayName('Lavender and mint', t)).toBe('Lavender and mint');
    expect(LAYER_NAME_KEYS['Label text']).toBe('layers.labelText');
    expect(LAYER_NAME_KEYS['Product name']).toBe('layers.productName');
  });
});
