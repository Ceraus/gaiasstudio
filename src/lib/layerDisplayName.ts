/** Stored canvas layer names stay English; UI language maps them at display time. */
export const LAYER_NAME_KEYS: Record<string, string> = {
  'AI Image': 'layers.kindAi',
  Arrow: 'add.arrow',
  Background: 'layers.kindBackground',
  Base: 'layers.kindBase',
  Circle: 'add.circle',
  'Directions & warnings': 'layers.directionsWarnings',
  Footer: 'layers.footer',
  Group: 'layers.group',
  Heading: 'layers.kindHeading',
  Hexagon: 'add.hexagon',
  Image: 'layers.kindImage',
  'Ingredients & info': 'layers.ingredientsInfo',
  'Ingredients (1)': 'layers.ingredients1',
  'Ingredients (2)': 'layers.ingredients2',
  'Label text': 'layers.labelText',
  Layer: 'layers.kindLayer',
  'Legibility Overlay': 'layers.kindOverlay',
  Line: 'add.line',
  Logo: 'layers.kindLogo',
  Maker: 'layers.maker',
  'Net weight': 'layers.netWeight',
  Overlay: 'layers.kindOverlay',
  Photo: 'layers.kindPhoto',
  'Product name': 'layers.productName',
  QR: 'layers.kindQr',
  'QR Code': 'layers.kindQr',
  Rectangle: 'add.rect',
  'Rounded Rectangle': 'add.roundRect',
  'Rounded rectangle': 'add.roundRect',
  Shape: 'layers.kindShape',
  Star: 'add.star',
  'Stock Photo': 'layers.kindStock',
  Text: 'layers.kindText',
  Title: 'layers.titleName',
  Triangle: 'add.triangle',
};

export function layerDisplayName(name: string, t: (key: string) => string): string {
  const key = LAYER_NAME_KEYS[name];
  return key ? t(key) : name || t('layers.unnamed');
}
