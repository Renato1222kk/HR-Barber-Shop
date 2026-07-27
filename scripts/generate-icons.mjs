// Gera os icones PNG do PWA.
// Uso: npm run icons
//
// Se o pacote opcional `sharp` estiver instalado (npm i -D sharp), os icones
// sao gerados a partir da arte oficial em public/hr-barber-shop-logo.jpeg,
// centralizada sobre fundo branco e com margem interna.
//
// Sem `sharp`, o script cai no monograma vetorial "HR" — preto sobre branco,
// com um filete dourado discreto. Nenhuma dependencia externa e necessaria.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'public', 'icons');
const source = join(root, 'public', 'hr-barber-shop-logo.jpeg');
mkdirSync(outDir, { recursive: true });

// Tamanho do icone -> fracao da area ocupada pela margem interna.
// Maskable precisa de folga: o sistema pode recortar ate 20% de cada borda.
const TARGETS = [
  { file: 'favicon-32.png', size: 32, inset: 0.1 },
  { file: 'icon-192.png', size: 192, inset: 0.14 },
  { file: 'icon-512.png', size: 512, inset: 0.14 },
  { file: 'icon-maskable.png', size: 512, inset: 0.26 },
  { file: 'apple-touch-icon.png', size: 180, inset: 0.14 },
];

// ============================ PNG (encoder) ============================
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

/** Codifica RGB sem canal alfa: icone maskable nao pode ter transparencia. */
function encodePNG(width, height, rgb) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor (RGB)
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ======================= Monograma "HR" (fallback) =======================
const INK = [17, 17, 17]; // preto de destaque
const GOLD = [197, 155, 61]; // dourado discreto
const WHITE = [255, 255, 255];

/** Distancia de um ponto ao segmento (x1,y1)-(x2,y2). */
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * Diz se o ponto (x, y) — em coordenadas locais do glifo, 0..w por 0..h —
 * faz parte do traco da letra.
 */
/** Altura da barriga do R — o travessao do H se alinha ao fim dela. */
const BOWL = 0.54;

function inGlyph(ch, x, y, w, h, t) {
  const hb = h * BOWL;

  if (ch === 'H') {
    if (x <= t) return true; // haste esquerda
    if (x >= w - t) return true; // haste direita
    return y >= hb - t && y <= hb; // travessao, alinhado a barriga do R
  }

  // R
  const r = hb / 2; // raio do arco da barriga
  if (x <= t) return true; // haste
  if (y <= t && x <= w - r) return true; // barra superior
  if (y >= hb - t && y <= hb && x <= w - r) return true; // fechamento da barriga
  if (x >= w - r) {
    const d = Math.hypot(x - (w - r), y - r);
    if (d <= r && d >= r - t) return true; // arco
  }
  // Perna: para antes da borda para o traco nao ser cortado no recorte.
  return distToSegment(x, y, w * 0.42, hb, w * 0.92, h - t / 2) <= t / 2;
}

/** Desenha o monograma com 4x de supersampling (bordas suaves). */
function drawMonogram(size, inset) {
  const SS = 4;
  const big = size * SS;
  const buf = Buffer.alloc(big * big * 3, 0xff); // fundo branco

  const paint = (px, py, color) => {
    if (px < 0 || py < 0 || px >= big || py >= big) return;
    const i = (py * big + px) * 3;
    buf[i] = color[0];
    buf[i + 1] = color[1];
    buf[i + 2] = color[2];
  };

  const pad = big * inset;
  const areaW = big - pad * 2;
  const areaH = big - pad * 2;

  const gap = areaW * 0.1;
  const glyphW = (areaW - gap) / 2;
  const glyphH = areaH * 0.78;
  const stroke = glyphW * 0.22;
  const startY = pad + (areaH - glyphH) / 2 - areaH * 0.05;

  ['H', 'R'].forEach((ch, idx) => {
    const originX = pad + idx * (glyphW + gap);
    for (let py = Math.floor(startY); py < Math.ceil(startY + glyphH); py++) {
      for (let px = Math.floor(originX); px < Math.ceil(originX + glyphW); px++) {
        if (inGlyph(ch, px - originX, py - startY, glyphW, glyphH, stroke)) paint(px, py, INK);
      }
    }
  });

  // Filete dourado discreto sob o monograma.
  const ruleY = startY + glyphH + areaH * 0.08;
  const ruleH = Math.max(SS, Math.round(big * 0.014));
  const ruleW = areaW * 0.46;
  const ruleX = (big - ruleW) / 2;
  for (let py = Math.round(ruleY); py < Math.round(ruleY + ruleH); py++) {
    for (let px = Math.round(ruleX); px < Math.round(ruleX + ruleW); px++) paint(px, py, GOLD);
  }

  // Downsample: media dos SS x SS pixels -> anti-aliasing.
  const out = Buffer.alloc(size * size * 3);
  const n = SS * SS;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * big + (x * SS + sx)) * 3;
          r += buf[i];
          g += buf[i + 1];
          b += buf[i + 2];
        }
      }
      const o = (y * size + x) * 3;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
    }
  }
  return encodePNG(size, size, out);
}

// ============================== Execucao ==============================

/**
 * Acha a area util da arte: primeiro o retangulo que contem todo o traco
 * escuro, depois a faixa vazia que separa o monograma do dizer
 * "HR BARBER SHOP" logo abaixo.
 *
 * Os icones usam so o monograma. Num icone de app o nome ja aparece escrito
 * embaixo pelo proprio sistema, e o dizer da arte viraria borrao a 48px.
 */
async function findMonogram(sharp) {
  const { data, info } = await sharp(source)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const dark = (x, y) => data[y * info.width + x] < 160;

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (!dark(x, y)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null; // arte sem traco escuro: usa a imagem inteira

  // Maior faixa de linhas totalmente claras dentro do conteudo — e o respiro
  // entre o monograma e o dizer. Se nao houver, mantemos o conteudo todo.
  let gap = null;
  let run = null;
  for (let y = minY; y <= maxY; y++) {
    let empty = true;
    for (let x = minX; x <= maxX && empty; x++) if (dark(x, y)) empty = false;
    if (empty) {
      run = run ? [run[0], y] : [y, y];
    } else if (run) {
      if (!gap || run[1] - run[0] > gap[1] - gap[0]) gap = run;
      run = null;
    }
  }
  if (run && (!gap || run[1] - run[0] > gap[1] - gap[0])) gap = run;

  // So corta se a faixa for larga de verdade (>2% da altura) e estiver na
  // metade de baixo — assim um espaco interno do desenho nao engana o corte.
  const bottom = gap && gap[1] - gap[0] > info.height * 0.02 && gap[0] > minY + (maxY - minY) * 0.5
    ? gap[0]
    : maxY;

  // Reajusta as colunas ao trecho que sobrou: o dizer costuma ser mais largo
  // que o monograma, e sem isso o icone ficaria descentralizado.
  let x1 = info.width;
  let x2 = -1;
  for (let y = minY; y <= bottom; y++) {
    for (let x = 0; x < info.width; x++) {
      if (!dark(x, y)) continue;
      if (x < x1) x1 = x;
      if (x > x2) x2 = x;
    }
  }

  return { left: x1, top: minY, width: x2 - x1 + 1, height: bottom - minY + 1 };
}

async function withSharp() {
  if (!existsSync(source)) return false;
  let sharp;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch {
    return false; // dependencia opcional ausente
  }

  const box = await findMonogram(sharp);

  // O fundo do arquivo original e #fcfcfc, nao branco puro. Sem corrigir,
  // sobra um quadrado levemente cinza sobre a tela branca do icone.
  // O ganho de 255/252 leva o fundo ao branco exato e quase nao mexe no traco.
  let art = sharp(source);
  if (box) art = art.extract(box);
  const trimmed = await art.linear(255 / 252, 0).toBuffer();

  for (const { file, size, inset } of TARGETS) {
    const inner = Math.round(size * (1 - inset * 2));
    // `contain` preserva a proporcao: nada e esticado nem cortado.
    const logo = await sharp(trimmed)
      .resize(inner, inner, { fit: 'contain', background: '#ffffff' })
      .toBuffer();

    await sharp({
      create: { width: size, height: size, channels: 3, background: '#ffffff' },
    })
      .composite([{ input: logo, gravity: 'centre' }])
      .png()
      .toFile(join(outDir, file));
  }
  return true;
}

const usedSharp = await withSharp();

if (usedSharp) {
  console.log('Icones gerados em public/icons/ a partir de public/hr-barber-shop-logo.jpeg');
} else {
  for (const { file, size, inset } of TARGETS) {
    writeFileSync(join(outDir, file), drawMonogram(size, inset));
  }
  console.log('Icones gerados em public/icons/ (monograma "HR" preto sobre branco).');
  console.log('Para gerar a partir da arte oficial: npm i -D sharp && npm run icons');
}
