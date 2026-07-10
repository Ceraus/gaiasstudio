import * as pdfjsLib from "pdfjs-dist";

export const PDF_PREVIEW_VERSION = 3;

export const PDF_COMPRESSION_ERROR = "PDF image compression could not be decoded. Try exporting PDF as image.";

export function configurePdfWorker() {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsAssetUrl("pdf.worker.min.js");
}

export async function loadPdfDocument(file: Blob) {
  configurePdfWorker();
  const data = await file.arrayBuffer();
  return pdfjsLib.getDocument({
    data,
    cMapUrl: pdfjsAssetUrl("cmaps/"),
    cMapPacked: true,
    standardFontDataUrl: pdfjsAssetUrl("standard_fonts/"),
    wasmUrl: pdfjsAssetUrl("wasm/"),
    useWasm: true
  }).promise;
}

export async function renderPdfFirstPage(file: Blob) {
  const pdf = await loadPdfDocument(file);
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const outputScale = clampNumber((window.devicePixelRatio || 1) * 2, 2, 4);
  const viewport = page.getViewport({ scale: outputScale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({
    canvas,
    canvasContext: context,
    viewport,
    background: "#fff"
  }).promise;
  const previewBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PDF preview render failed")), "image/png");
  });
  if (await isBlankPreview(previewBlob)) throw new Error(PDF_COMPRESSION_ERROR);
  return {
    width: baseViewport.width,
    height: baseViewport.height,
    previewBlob,
    previewUrl: URL.createObjectURL(previewBlob)
  };
}

export async function renderPdfPageToCanvas({
  page,
  canvas,
  containerWidth,
  containerHeight,
  zoom
}: {
  page: { getViewport: (options: { scale: number }) => { width: number; height: number }; render: (options: unknown) => { promise: Promise<unknown>; cancel: () => void } };
  canvas: HTMLCanvasElement;
  containerWidth: number;
  containerHeight: number;
  zoom: number;
}) {
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Canvas 2D context unavailable");

  const baseViewport = page.getViewport({ scale: 1 });
  const fitScale = Math.min(containerWidth / baseViewport.width, containerHeight / baseViewport.height);
  const cssViewport = page.getViewport({ scale: fitScale });
  const outputScale = clampNumber((window.devicePixelRatio || 1) * Math.max(1, zoom), 1, 4);
  const renderViewport = page.getViewport({ scale: fitScale * outputScale });

  canvas.width = Math.max(1, Math.ceil(renderViewport.width));
  canvas.height = Math.max(1, Math.ceil(renderViewport.height));
  canvas.style.width = `${Math.max(1, Math.floor(cssViewport.width))}px`;
  canvas.style.height = `${Math.max(1, Math.floor(cssViewport.height))}px`;

  context.save();
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();

  const task = page.render({
    canvas,
    canvasContext: context,
    viewport: renderViewport,
    background: "#fff"
  });

  return {
    task,
    promise: task.promise.then(() => ({
      cssWidth: cssViewport.width,
      cssHeight: cssViewport.height,
      backingWidth: canvas.width,
      backingHeight: canvas.height
    }))
  };
}

async function isBlankPreview(blob: Blob) {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    return false;
  }
  const sampleSize = 96;
  const canvas = document.createElement("canvas");
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const context = canvas.getContext("2d");
  if (!context) return false;
  context.drawImage(bitmap, 0, 0, sampleSize, sampleSize);
  bitmap.close();
  const { data } = context.getImageData(0, 0, sampleSize, sampleSize);
  let nonWhitePixels = 0;
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = data[index + 3];
    if (alpha > 16 && (red < 245 || green < 245 || blue < 245)) nonWhitePixels += 1;
  }
  return nonWhitePixels < sampleSize * sampleSize * 0.01;
}

function pdfjsAssetUrl(path: string) {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const assetRoot = import.meta.env.DEV ? "pdfjs" : "assets/pdfjs";
  return new URL(`${normalizedBase}${assetRoot}/${path}`, window.location.origin).toString();
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
