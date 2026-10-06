/* Нейро-увеличение слабых исходников (Telegram и т.п.) ×4 → tools/.sr/<имя>.png
   Дальше tools/photos.js сам подхватит эти файлы и соберёт из них фото сайта.

   Подготовка (один раз):   npm i sharp heic-convert @huggingface/transformers
   Запуск:                  node --use-system-ca tools/upscale.mjs [имя ...]
                            (без имён — все кадры с sr: true из tools/photos.js)

   Модель — Swin2SR «real-world SR ×4, PSNR» (Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr):
   чинит артефакты JPEG и достраивает детали, не «выдумывая» лишнего, поэтому подходит для лиц.
   Скачивается один раз (~50 МБ) в tools/.hf-cache. Считает на процессоре: примерно 8 секунд на плитку
   160×160 px, то есть 2–5 минут на кадр. Сбой «fetch failed» из-за антивируса, подменяющего сертификаты,
   лечится ключом --use-system-ca. */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { pipeline, RawImage, env } from '@huggingface/transformers';

const require = createRequire(import.meta.url);
const { PHOTOS, prepareCrop, SR } = require('./photos.js');
const here = path.dirname(fileURLToPath(import.meta.url));
env.cacheDir = path.join(here, '.hf-cache');

const SCALE = 4, BLOCK = 160, MARGIN = 16;      // блок 160 px + поля по 16 px, чтобы на стыках не было швов

const wanted = process.argv.slice(2);
const list = PHOTOS.filter(p => (wanted.length ? wanted.includes(p.name) : p.sr));
if (!list.length) { console.log('нечего увеличивать: нет кадров с sr: true или имена не найдены'); process.exit(0); }

console.log('загружаю модель…');
const up = await pipeline('image-to-image', 'Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr', { device: 'cpu', dtype: 'fp32' });
fs.mkdirSync(SR, { recursive: true });

for (const p of list) {
  const crop = await prepareCrop(p);
  const { data, info } = await sharp(crop).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, OW = W * SCALE, OH = H * SCALE;
  const out = Buffer.alloc(OW * OH * 3);
  const nx = Math.ceil(W / BLOCK), ny = Math.ceil(H / BLOCK);
  let done = 0; const t0 = Date.now();
  for (let by = 0; by < ny; by++) for (let bx = 0; bx < nx; bx++) {
    const x0 = bx * BLOCK, y0 = by * BLOCK, x1 = Math.min(W, x0 + BLOCK), y1 = Math.min(H, y0 + BLOCK);
    const ex0 = Math.max(0, x0 - MARGIN), ey0 = Math.max(0, y0 - MARGIN), ex1 = Math.min(W, x1 + MARGIN), ey1 = Math.min(H, y1 + MARGIN);
    const tw = ex1 - ex0, th = ey1 - ey0;
    const tile = Buffer.alloc(tw * th * 3);
    for (let y = 0; y < th; y++) data.copy(tile, y * tw * 3, ((ey0 + y) * W + ex0) * 3, ((ey0 + y) * W + ex0 + tw) * 3);
    const res = await up(new RawImage(new Uint8ClampedArray(tile), tw, th, 3));
    const rw = res.width, rd = res.data;
    for (let y = (y0 - ey0) * SCALE; y < (y1 - ey0) * SCALE; y++) {
      const dy = ey0 * SCALE + y, sx = (x0 - ex0) * SCALE, len = (x1 - x0) * SCALE;
      Buffer.from(rd.buffer, rd.byteOffset + (y * rw + sx) * 3, len * 3).copy(out, (dy * OW + x0 * SCALE) * 3);
    }
    if (++done % 5 === 0 || done === nx * ny) console.log(`${p.name}: ${done}/${nx * ny} плиток, ${((Date.now() - t0) / 1000).toFixed(0)} с`);
  }
  await sharp(out, { raw: { width: OW, height: OH, channels: 3 } }).png().toFile(path.join(SR, p.name + '.png'));
  console.log(`${p.name}: готово ${W}×${H} → ${OW}×${OH}`);
}
console.log('Дальше: node tools/photos.js');
