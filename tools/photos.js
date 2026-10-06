#!/usr/bin/env node
/* Сборка фото сайта из оригиналов Анастасии → photos/*.webp

   Подготовка (один раз):   npm i sharp heic-convert
   Оригиналы лежат в папке «Фото Анастасии» (в git она не попадает).

   Запуск:
     node tools/photos.js                  — пересобрать все фото
     node tools/photos.js hero-studio ...  — только указанные

   Что делает с каждым кадром:
     1. берёт оригинал (HEIC конвертирует), выравнивает по EXIF;
     2. вырезает кадр под своё место на сайте (манифест PHOTOS ниже);
     3. уменьшает до нужных ширин (sm → md → полный) за один проход из оригинала —
        без «копий с копий», как было раньше;
     4. тон под кремовый фон сайта, «ясность» (локальный контраст) для интерьеров,
        резкость под размер файла;
     5. сохраняет в WebP.
   Слабые источники (Telegram, меньше ~1000 px) можно предварительно увеличить нейросетью:
   node --use-system-ca tools/upscale.mjs  (нужен npm i @huggingface/transformers).
   Если готового увеличения нет — используется обычное увеличение. */
'use strict';
const fs = require('fs'), path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const ORIG = path.join(ROOT, 'Фото Анастасии');
const OUT = path.join(ROOT, 'photos');
const CACHE = path.join(__dirname, '.cache');   // выровненные оригиналы (в git не попадает)
const SR = path.join(__dirname, '.sr');         // увеличения ×4 от upscale.mjs: <имя>.png (в git не попадает)

/* короткий id → файл оригинала */
const FILES = {
  s01: 'IMG_5797.HEIC', s02: 'IMG_5798.HEIC', s05: 'IMG_5801.HEIC', s07: 'IMG_5803.HEIC', s08: 'IMG_5804.HEIC',
  t13: 'photo_2026-10-04_23-53-52.jpg', t14: 'photo_2026-10-04_23-53-55.jpg', t15: 'photo_2026-10-04_23-53-57.jpg',
  t16: 'photo_2026-10-04_23-54-00.jpg', t17: 'photo_2026-10-04_23-54-02.jpg',
  t19: 'photo_2026-10-04_23-54-07.jpg', t20: 'photo_2026-10-04_23-54-10.jpg',
};

/* Тон: белая точка уходит в кремовый цвет сайта (#FCF5F0), чёрные чуть приподняты — матовость. */
const LOOK = {
  interior: { tone: s => s.modulate({ brightness: 1.10, saturation: 0.96 }).linear([0.935, 0.915, 0.872], [16, 13, 12]),
              clarity: 0.35, detail: { sigma: 0.7, m1: 0.6, m2: 1.4 }, q: 70 },
  portrait: { tone: s => s.modulate({ brightness: 1.03, saturation: 0.96 }).linear([0.955, 0.95, 0.935], [9, 7, 7]),
              clarity: 0, detail: { sigma: 0.7, m1: 0.7, m2: 1.7 }, q: 80 },
  neon:     { tone: s => s.modulate({ brightness: 1.02 }).linear([0.97, 0.965, 0.96], [6, 5, 6]),
              clarity: 0, detail: { sigma: 0.6, m1: 0.5, m2: 1.2 }, q: 80 },
};

/* Кадры сайта.
   crop: [x, y, ширина] — доли исходника (x: число или 'center'); высота из ratio (ширина/высота).
   sizes: ширины файлов; по возрастанию получают суффиксы -sm, -md и без суффикса.
   sr: true — слабый источник, для него есть смысл в нейро-увеличении. */
const PHOTOS = [
  { name: 'hero-studio',     from: 's02', crop: [0, .05, 1],      ratio: 6 / 5, look: 'interior', sizes: [900, 1200, 1600] },
  { name: 'head-coworking',  from: 's08', crop: [0, .20, 1],      ratio: 1.6,   look: 'interior', sizes: [800, 1200, 1600] },
  { name: 'head-services',   from: 's08', crop: [0, .30, 1],      ratio: 1.6,   look: 'interior', sizes: [800, 1200, 1600] },
  { name: 'head-contacts',   from: 's05', crop: [0, .18, 1],      ratio: 1.6,   look: 'interior', sizes: [800, 1200, 1600] },
  { name: 'space-mirrors',   from: 's08', crop: [.04, .06, .92],  ratio: 3 / 4, look: 'interior', sizes: [520, 900] },
  { name: 'space-lash',      from: 's01', crop: [0, .10, .90],    ratio: 3 / 4, look: 'interior', sizes: [520, 900] },
  { name: 'space-window',    from: 's07', crop: [0, .05, .90],    ratio: 3 / 4, look: 'interior', sizes: [520, 900] },
  { name: 'space-lounge',    from: 's05', crop: [0, .08, .92],    ratio: 3 / 4, look: 'interior', sizes: [520, 900] },
  { name: 'about-anastasia', from: 't20', crop: [0, .03, 1],      ratio: 4 / 5, look: 'portrait', sizes: [640, 960] },
  { name: 'anastasia-tan',   from: 't15', crop: ['center', 0, .978], ratio: 4 / 5, look: 'portrait', sizes: [640, 960] },
  { name: 'work-process',    from: 't19', crop: [0, 0, 1],        ratio: 1,     look: 'portrait', sizes: [1000] },
  { name: 'edu-neon',        from: 't17', crop: [0, 0, 1],        ratio: 4 / 5, look: 'neon',     sizes: [600, 1200], sr: true },
  { name: 'work-graduate-1', from: 't14', crop: [0, .22, 1],      ratio: 1,     look: 'portrait', sizes: [1000], sr: true },
  { name: 'work-graduate-2', from: 't16', crop: [0, .16, 1],      ratio: 1,     look: 'portrait', sizes: [1000], sr: true },
  { name: 'mk-process',      from: 't13', crop: [0, .18, 1],      ratio: 4 / 3, look: 'portrait', sizes: [1000], sr: true, trim: true },
];

/* ---------- оригиналы ---------- */
async function loadSource(p) {
  const file = path.join(ORIG, FILES[p.from]);
  if (!fs.existsSync(file)) throw new Error(`нет оригинала: ${file}`);
  const cached = path.join(CACHE, p.from + (p.trim ? '-trim' : '') + '.jpg');
  if (fs.existsSync(cached) && fs.statSync(cached).mtimeMs >= fs.statSync(file).mtimeMs) return fs.readFileSync(cached);
  let buf = fs.readFileSync(file);
  if (/\.heic$/i.test(file)) buf = Buffer.from(await require('heic-convert')({ buffer: buf, format: 'JPEG', quality: 0.98 }));
  const meta = await sharp(buf).metadata();
  if (meta.orientation && meta.orientation !== 1) buf = await sharp(buf).rotate().jpeg({ quality: 98, chromaSubsampling: '4:4:4' }).toBuffer();
  if (p.trim) buf = await sharp(buf).trim({ threshold: 18 }).jpeg({ quality: 98, chromaSubsampling: '4:4:4' }).toBuffer();   // чёрные полосы скриншота сторис
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(cached, buf);
  return buf;
}

function cropBox(W, H, [fx, fy, fw], ratio) {
  const width = Math.round(fw * W), height = Math.round(width / ratio);
  const left = fx === 'center' ? Math.round((W - width) / 2) : Math.round(fx * W);
  const top = Math.min(Math.round(fy * H), H - height);
  if (left < 0 || top < 0 || left + width > W || top + height > H) throw new Error(`кадр ${width}×${height} не помещается в ${W}×${H}`);
  return { left, top, width, height };
}

/* кадр в разрешении источника без потерь — для upscale.mjs */
async function prepareCrop(p) {
  const buf = await loadSource(p);
  const { width, height } = await sharp(buf).metadata();
  return sharp(buf).extract(cropBox(width, height, p.crop, p.ratio)).png().toBuffer();
}

/* ---------- обработка ---------- */
/* «Ясность»: добавляем к пикселю разницу яркости с сильно размытой копией (локальный контраст),
   с ограничением, чтобы не было ореолов. Работает по яркости — цвета не плывут. */
async function clarity(img, sigma, amount, limit = 28) {
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: ch } = info;
  const grey = await sharp(data, { raw: info }).greyscale().raw().toBuffer();
  const blur = await sharp(grey, { raw: { width: w, height: h, channels: 1 } }).blur(sigma).extractChannel(0).raw().toBuffer();   // blur отдаёт 3 канала — берём один
  const out = Buffer.allocUnsafe(data.length);
  for (let i = 0, q = 0; i < w * h; i++, q += ch) {
    let d = (grey[i] - blur[i]) * amount; d = d > limit ? limit : d < -limit ? -limit : d;
    for (let c = 0; c < 3; c++) { const v = data[q + c] + d; out[q + c] = v < 0 ? 0 : v > 255 ? 255 : v; }
  }
  return sharp(out, { raw: info });
}

/* Нейро-увеличение смешиваем с обычным (70/30) и сверяем средний цвет, добавляем лёгкое зерно:
   чистая «реконструкция» даёт гладкую, чуть «нарисованную» кожу. */
async function srBase(p, crop, width, srFile) {
  const ai = await sharp(srFile).resize({ width, kernel: 'lanczos3' }).removeAlpha().toBuffer();
  const lan = await sharp(crop).resize({ width, kernel: 'lanczos3' }).removeAlpha().toBuffer();
  const [sa, sl] = (await Promise.all([ai, lan].map(b => sharp(b).stats()))).map(s => s.channels.map(c => c.mean));
  const fix = await sharp(ai).linear(sl.map((m, i) => m / sa[i]), [0, 0, 0]).toBuffer();           // средний цвет как у исходника
  const soft = await sharp(lan).ensureAlpha(0.3).png().toBuffer();
  return sharp(await sharp(fix).composite([{ input: soft, blend: 'over' }]).png().toBuffer());
}
async function grain(img, width) {
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const noise = await sharp({ create: { width: info.width, height: info.height, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 22 } } })
    .ensureAlpha(0.07).png().toBuffer();
  return sharp(data, { raw: info }).composite([{ input: noise, blend: 'soft-light' }]);
}

async function build(p) {
  const L = LOOK[p.look];
  const buf = await loadSource(p);
  const { width: W, height: H } = await sharp(buf).metadata();
  const box = cropBox(W, H, p.crop, p.ratio);
  const cropBuf = (p.sr || false) ? await sharp(buf).extract(box).png().toBuffer() : null;
  let srFile = p.sr ? path.join(SR, p.name + '.png') : null;
  if (srFile && !fs.existsSync(srFile)) srFile = null;
  if (srFile) {
    const m = await sharp(srFile).metadata();
    if (m.width !== box.width * 4) { console.warn(`  ! ${p.name}: увеличение ${m.width}px не от этого кадра (${box.width * 4} ожидалось) — пропускаю`); srFile = null; }
  }
  const sorted = [...p.sizes].sort((a, b) => a - b);
  const suffix = sorted.length === 3 ? ['-sm', '-md', ''] : sorted.length === 2 ? ['-sm', ''] : [''];
  const note = srFile ? 'нейро-увеличение' : p.sr ? 'обычное увеличение (нет .sr)' : 'из оригинала';
  console.log(`${p.name}  [${p.from} ${W}×${H} → кадр ${box.width}×${box.height}, ${note}]`);

  for (let i = 0; i < sorted.length; i++) {
    const width = Math.min(sorted[i], srFile ? sorted[i] : Infinity);
    let img;
    if (srFile) img = await srBase(p, cropBuf, width, srFile);
    else img = sharp(buf).extract(box).resize({ width, kernel: 'lanczos3' });
    img = L.tone(img);
    if (L.clarity) img = await clarity(img, Math.max(2, Math.round(width / 115)), L.clarity);
    img = img.sharpen(L.detail);
    if (srFile) img = await grain(img, width);
    const out = path.join(OUT, p.name + suffix[i] + '.webp');
    const info = await img.webp({ quality: L.q, effort: 6, smartSubsample: true }).toFile(out);
    console.log(`  ${path.basename(out).padEnd(28)} ${String(info.width + '×' + info.height).padEnd(10)} ${Math.round(info.size / 1024)} КБ`);
  }
}

async function main() {
  const wanted = process.argv.slice(2);
  const list = wanted.length ? PHOTOS.filter(p => wanted.includes(p.name)) : PHOTOS;
  if (wanted.length && list.length !== wanted.length) throw new Error('неизвестное имя; доступны: ' + PHOTOS.map(p => p.name).join(', '));
  fs.mkdirSync(OUT, { recursive: true });
  for (const p of list) await build(p);
}

module.exports = { PHOTOS, prepareCrop, SR };
if (require.main === module) main().catch(e => { console.error('Ошибка:', e.message); process.exit(1); });
