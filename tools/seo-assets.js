#!/usr/bin/env node
/* Картинка для превью ссылки и значки сайта (нужен sharp: npm i sharp):
     node tools/seo-assets.js
   Создаёт:
     photos/og-cover.jpg   1200×630 — карточка при отправке ссылки в мессенджер/соцсеть;
     favicon.svg           значок для браузеров;
     favicon.ico           16/32/48 — значок для Яндекса и старых браузеров, лежит в корне сайта;
     icon-192.png          192×192 — значок для Google (требует размер, кратный 48 px) и Android;
     apple-touch-icon.png  180×180 — значок для iPhone.
   Значок — белое сердечко на розовой плашке: на белом фоне поисковой выдачи он заметнее,
   чем розовое сердечко без фона. Результат лежит в репозитории; скрипт нужен, только если
   захотите сменить кадр или цвет. */
'use strict';
const fs = require('fs'), path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const ROSE = '#E77E93';
const HEART = 'M12 21s-6.7-4.3-9-8.2C1.3 9.9 2.6 6 6.2 5.1 8.4 4.6 10.7 5.6 12 7.4c1.3-1.8 3.6-2.8 5.8-2.3 3.6.9 4.9 4.8 3.2 7.7-2.3 3.9-9 8.2-9 8.2Z';
const icon = (rx) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="${rx}" fill="${ROSE}"/><g transform="translate(12 12) scale(.64) translate(-12 -12.9)"><path fill="#fff" d="${HEART}"/></g></svg>`;
const png = (svg, size) => sharp(Buffer.from(svg), { density: 800 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
const out = f => path.join(ROOT, f);

(async () => {
  /* карточка для соцсетей: кадр с зеркалами, 1200×630 */
  await sharp(out('photos/hero-studio.webp')).resize(1200, 630, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 82, mozjpeg: true }).toFile(out('photos/og-cover.jpg'));

  const rounded = icon(5.5), square = icon(0);
  fs.writeFileSync(out('favicon.svg'), rounded + '\n');
  fs.writeFileSync(out('icon-192.png'), await png(rounded, 192));
  fs.writeFileSync(out('apple-touch-icon.png'), await png(square, 180));

  /* ICO с PNG внутри (16, 32, 48) */
  const sizes = [16, 32, 48], imgs = await Promise.all(sizes.map(s => png(rounded, s)));
  const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let offset = 6 + 16 * sizes.length;
  const dir = sizes.map((s, i) => { const e = Buffer.alloc(16); e[0] = s; e[1] = s; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(imgs[i].length, 8); e.writeUInt32LE(offset, 12); offset += imgs[i].length; return e; });
  fs.writeFileSync(out('favicon.ico'), Buffer.concat([head, ...dir, ...imgs]));

  for (const f of ['photos/og-cover.jpg', 'favicon.svg', 'favicon.ico', 'icon-192.png', 'apple-touch-icon.png'])
    console.log(f.padEnd(24), (fs.statSync(out(f)).size / 1024).toFixed(1) + ' КБ');
})().catch(e => { console.error('ОШИБКА:', e.message); process.exit(1); });
