// Genera los iconos PNG del PWA sin dependencias externas.
// Uso: node tools/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- PNG ---------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    const off = y * (size * 4 + 1);
    raw[off] = 0; // filtro "none"
    rgba.copy(raw, off + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- Rasterizador con funciones de distancia ---------- */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

const sdCircle = (px, py, cx, cy, r) => Math.hypot(px - cx, py - cy) - r;

function sdCapsule(px, py, ax, ay, bx, by, r) {
  const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay), 0, 1);
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
}

function hex(c) {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

/** Pinta una forma sobre el lienzo mezclando por cobertura (antialiasing). */
function paint(buf, size, color, sdf, alpha = 1) {
  const [r, g, b] = hex(color);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = sdf(x + 0.5, y + 0.5);
      const cov = clamp(0.5 - d, 0, 1) * alpha;
      if (cov <= 0) continue;
      const i = (y * size + x) * 4;
      const dstA = buf[i + 3] / 255;
      const outA = cov + dstA * (1 - cov);
      if (outA <= 0) continue;
      buf[i] = Math.round((r * cov + buf[i] * dstA * (1 - cov)) / outA);
      buf[i + 1] = Math.round((g * cov + buf[i + 1] * dstA * (1 - cov)) / outA);
      buf[i + 2] = Math.round((b * cov + buf[i + 2] * dstA * (1 - cov)) / outA);
      buf[i + 3] = Math.round(outA * 255);
    }
  }
}

/** Pinta un degradado (alfa variable por pixel) recortado por una forma. */
function paintGradient(buf, size, color, clip, alphaAt) {
  const [r, g, b] = hex(color);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5, py = y + 0.5;
      const cov = clamp(0.5 - clip(px, py), 0, 1) * alphaAt(px, py);
      if (cov <= 0) continue;
      const i = (y * size + x) * 4;
      const dstA = buf[i + 3] / 255;
      const outA = cov + dstA * (1 - cov);
      if (outA <= 0) continue;
      buf[i] = Math.round((r * cov + buf[i] * dstA * (1 - cov)) / outA);
      buf[i + 1] = Math.round((g * cov + buf[i + 1] * dstA * (1 - cov)) / outA);
      buf[i + 2] = Math.round((b * cov + buf[i + 2] * dstA * (1 - cov)) / outA);
      buf[i + 3] = Math.round(outA * 255);
    }
  }
}

/**
 * Icono: cuenco blanco humeante sobre fondo naranja.
 * `inset` deja aire alrededor para los iconos "maskable".
 */
function drawIcon(size, { maskable = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const u = size / 100; // unidad relativa
  const bgRadius = maskable ? 50 * u : 22 * u;

  const bg = (x, y) => sdRoundRect(x, y, size / 2, size / 2, size / 2, size / 2, bgRadius);
  paint(buf, size, '#E8532B', bg);
  // Degradado superior suave, recortado al fondo
  paintGradient(buf, size, '#FF8F52', bg, (x, y) => {
    const t = clamp(1 - Math.hypot(x - size * 0.3, y - size * 0.12) / (size * 0.85), 0, 1);
    return t * t * 0.85;
  });

  const s = maskable ? 0.78 : 1; // escala del dibujo dentro del lienzo
  const cx = size / 2;
  const cy = size / 2 + 6 * u * s;
  const bowlR = 30 * u * s;

  // Vapor
  for (const [dx, len] of [[-12, 13], [0, 18], [12, 13]]) {
    const x0 = cx + dx * u * s;
    const top = cy - (40 + (len - 13)) * u * s;
    paint(buf, size, '#FFE4D6', (x, y) =>
      sdCapsule(x, y, x0 - 2 * u * s, top, x0 + 2.5 * u * s, top + len * u * s, 2.8 * u * s));
  }

  // Cuenco (media circunferencia inferior)
  paint(buf, size, '#FFFFFF', (x, y) =>
    Math.max(sdCircle(x, y, cx, cy, bowlR), cy - y));
  // Borde / plato
  paint(buf, size, '#FFFFFF', (x, y) =>
    sdCapsule(x, y, cx - bowlR - 5 * u * s, cy, cx + bowlR + 5 * u * s, cy, 4.5 * u * s));
  // Pie del cuenco
  paint(buf, size, '#FFFFFF', (x, y) =>
    sdCapsule(x, y, cx - 8 * u * s, cy + bowlR + 1 * u * s, cx + 8 * u * s, cy + bowlR + 1 * u * s, 3 * u * s));
  // Sombra interior para dar volumen
  paint(buf, size, '#E8532B', (x, y) =>
    Math.max(sdCircle(x, y, cx, cy + 2 * u * s, bowlR * 0.62), cy + 2 * u * s - y), 0.18);

  return buf;
}

mkdirSync(join(ROOT, 'icons'), { recursive: true });
const targets = [
  ['icons/icon-192.png', 192, {}],
  ['icons/icon-512.png', 512, {}],
  ['icons/icon-maskable-512.png', 512, { maskable: true }],
  ['icons/apple-touch-icon.png', 180, { maskable: true }],
];
for (const [file, size, opts] of targets) {
  writeFileSync(join(ROOT, file), encodePng(size, drawIcon(size, opts)));
  console.log('escrito', file, `${size}x${size}`);
}
