import type { AveryTemplate } from '@/types';

/** True when the printable die-cut is round/oval rather than rectangular. */
export function templateNeedsCircularMask(template: AveryTemplate): boolean {
  return template.shape === 'circle' || template.shape === 'oval';
}

/**
 * Applies an elliptical alpha mask so square PNG corners stay transparent —
 * saves ink on round Avery labels (e.g. 22562 print-to-the-edge rounds).
 */
export function maskPngToEllipse(pngDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(pngDataUrl);
        return;
      }
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Could not load label PNG for circular mask'));
    img.src = pngDataUrl;
  });
}

/** Masks round/oval templates; passes other shapes through unchanged. */
export async function maskLabelPngForTemplate(
  pngDataUrl: string,
  template: AveryTemplate,
): Promise<string> {
  if (!templateNeedsCircularMask(template)) return pngDataUrl;
  try {
    return await maskPngToEllipse(pngDataUrl);
  } catch {
    return pngDataUrl;
  }
}
