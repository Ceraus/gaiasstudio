import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deflateSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");

const outputs = [
  ["public/assets/icons/icon-16.png", 16, false],
  ["public/assets/icons/favicon-16.png", 16, false],
  ["public/assets/icons/favicon-32.png", 32, false],
  ["public/assets/icons/apple-touch-icon.png", 180, false],
  ["public/assets/icons/icon-192.png", 192, false],
  ["public/assets/icons/icon-512.png", 512, false],
  ["public/assets/icons/maskable-192.png", 192, true],
  ["public/assets/icons/maskable-512.png", 512, true],
  ["resources/icon.png", 1024, false],
  ["resources/splash.png", 2732, true]
];

for (const [file, size, maskable] of outputs) {
  const target = resolve(root, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, createIconPng(size, maskable));
}

function createIconPng(size, maskable) {
  const data = Buffer.alloc((size * 4 + 1) * size);
  const center = size / 2;
  const radius = maskable ? size * 0.46 : size * 0.43;
  const corner = maskable ? size * 0.18 : size * 0.22;
  let offset = 0;

  for (let y = 0; y < size; y += 1) {
    data[offset++] = 0;
    for (let x = 0; x < size; x += 1) {
      const gradient = y / Math.max(1, size - 1);
      let color = mix([10, 15, 28], [15, 23, 42], gradient);

      if (maskable || roundedRect(x, y, size, corner)) {
        const panel = roundedRect(x - size * 0.28, y - size * 0.24, size * 0.44, size * 0.5, size * 0.045);
        const panelCut = roundedRect(x - size * 0.33, y - size * 0.29, size * 0.44, size * 0.5, size * 0.045);
        const panelLine = panel && !panelCut;
        const ring = Math.abs(Math.hypot(x - center, y - center) - radius) < size * 0.018;
        const routeA = distanceToSegment(x, y, size * 0.4, size * 0.56, size * 0.52, size * 0.68) < size * 0.024;
        const routeB = distanceToSegment(x, y, size * 0.52, size * 0.68, size * 0.75, size * 0.38) < size * 0.024;
        const node = Math.hypot(x - size * 0.75, y - size * 0.38) < size * 0.055;

        if (ring) color = [96, 165, 250];
        if (panelLine) color = [255, 255, 255];
        if (routeA || routeB) color = [22, 163, 74];
        if (node) color = [255, 255, 255];
      } else {
        color = [0, 0, 0, 0];
      }

      data[offset++] = color[0];
      data[offset++] = color[1];
      data[offset++] = color[2];
      data[offset++] = color[3] ?? 255;
    }
  }

  return png(size, size, data);
}

function roundedRect(x, y, size, r) {
  if (x < 0 || y < 0 || x > size || y > size) return false;
  const dx = x < r ? r - x : x > size - r ? x - (size - r) : 0;
  const dy = y < r ? r - y : y > size - r ? y - (size - r) : 0;
  return dx * dx + dy * dy <= r * r;
}

function mix(a, b, amount) {
  return a.map((value, index) => Math.round(value + (b[index] - value) * amount));
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function png(width, height, raw) {
  const chunks = [chunk("IHDR", ihdr(width, height)), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))];
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ...chunks]);
}

function ihdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  return buffer;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value ^= byte;
    for (let i = 0; i < 8; i += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return (value ^ 0xffffffff) >>> 0;
}
