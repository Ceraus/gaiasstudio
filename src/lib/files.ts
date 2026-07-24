export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function imageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = src;
  });
}

export const isImageFile = (file: File) => /^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.type);

/** Downscale very large uploads so the offline DB & canvas stay responsive. */
export async function normalizeImage(dataUrl: string, maxDim = 2000): Promise<string> {
  const { width, height } = await imageSize(dataUrl);
  if (!width || (width <= maxDim && height <= maxDim)) return dataUrl;
  const scale = maxDim / Math.max(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  const img = new Image();
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.src = dataUrl;
  });
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // Keep PNG for transparency (logos), otherwise JPEG for size.
  const isPng = dataUrl.startsWith('data:image/png');
  return canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.92);
}
