// Gera os icones PNG do PWA sem dependencias externas.
// Uso: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

// ---- CRC32 (PNG) ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // rest zero
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- Monograma "BS" em bitmap 5x7 ----
const GLYPHS = {
  B: [
    '11110',
    '10001',
    '10001',
    '11110',
    '10001',
    '10001',
    '11110',
  ],
  S: [
    '01111',
    '10000',
    '10000',
    '01110',
    '00001',
    '00001',
    '11110',
  ],
};

function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function draw(size, { padding = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const bg = hexToRgb('#0a0a0b');
  const panel = hexToRgb('#17171a');
  const gold = hexToRgb('#c9a24b');

  const set = (x, y, [r, g, b], a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = a;
  };

  // background
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, bg);

  // rounded inner panel (so maskable looks good)
  const inset = padding ? Math.round(size * 0.14) : Math.round(size * 0.06);
  const radius = Math.round(size * 0.22);
  for (let y = inset; y < size - inset; y++) {
    for (let x = inset; x < size - inset; x++) {
      const dx = Math.min(x - inset, size - inset - 1 - x);
      const dy = Math.min(y - inset, size - inset - 1 - y);
      if (dx < radius && dy < radius) {
        const cd = Math.hypot(radius - dx, radius - dy);
        if (cd > radius) continue;
      }
      set(x, y, panel);
    }
  }

  // gold border ring
  const bw = Math.max(2, Math.round(size * 0.012));
  for (let y = inset; y < size - inset; y++) {
    for (let x = inset; x < size - inset; x++) {
      const dx = Math.min(x - inset, size - inset - 1 - x);
      const dy = Math.min(y - inset, size - inset - 1 - y);
      const onEdge = dx < bw || dy < bw;
      const inCorner = dx < radius && dy < radius;
      if (inCorner) {
        const cd = Math.hypot(radius - dx, radius - dy);
        if (cd <= radius && cd >= radius - bw) set(x, y, gold);
      } else if (onEdge) {
        set(x, y, gold);
      }
    }
  }

  // draw "BS"
  const word = ['B', 'S'];
  const cols = 5;
  const rows = 7;
  const gap = 1;
  const totalCols = word.length * cols + (word.length - 1) * gap;
  const cell = Math.floor((size * (padding ? 0.5 : 0.58)) / totalCols);
  const glyphW = totalCols * cell;
  const glyphH = rows * cell;
  const startX = Math.round((size - glyphW) / 2);
  const startY = Math.round((size - glyphH) / 2);

  word.forEach((ch, wi) => {
    const g = GLYPHS[ch];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (g[r][c] === '1') {
          const px = startX + (wi * (cols + gap) + c) * cell;
          const py = startY + r * cell;
          for (let yy = 0; yy < cell; yy++)
            for (let xx = 0; xx < cell; xx++) set(px + xx, py + yy, gold);
        }
      }
    }
  });

  return encodePNG(size, size, rgba);
}

writeFileSync(join(outDir, 'icon-192.png'), draw(192));
writeFileSync(join(outDir, 'icon-512.png'), draw(512));
writeFileSync(join(outDir, 'icon-maskable.png'), draw(512, { padding: true }));
writeFileSync(join(outDir, 'apple-touch-icon.png'), draw(180));
console.log('Icones gerados em public/icons/');
