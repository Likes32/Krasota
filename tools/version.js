#!/usr/bin/env node
/* Отпечатки версий в ссылках на файлы сайта: styles.css → styles.css?v=1a2b3c4d.

   Зачем: GitHub Pages разрешает браузеру 10 минут не перепроверять файлы
   (Cache-Control: max-age=600). Без версии в адресе телефон после выкладки
   ещё до 10 минут показывает старые стили и скрипты — даже если открыть
   страницу заново. С отпечатком изменившийся файл получает новый адрес,
   и браузер обязан скачать его сразу; неизменившиеся остаются в кэше.

   Запускать перед каждой выкладкой (повторный запуск ничего не ломает):
     node tools/version.js

   Что версионируется: стили, скрипты и картинки, на которые ссылаются
   страницы (href, src, srcset, imagesrcset). Шрифты — нет: на них ссылается
   и styles.css (@font-face), и предзагрузка в <head>, адреса должны совпадать;
   сами шрифты не меняются. Ссылки на страницы и внешние адреса не трогаются. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
const ASSET = /\.(css|js|webp|jpe?g|png|svg|gif|avif)$/i;
const hashes = {};
const missing = new Set();

function hash(rel) {
  return hashes[rel] ??= crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex').slice(0, 8);
}

function versioned(url) {
  if (/^(https?:|data:|#|mailto:|tel:|\/\/)/i.test(url)) return url;
  const clean = url.split('?')[0].split('#')[0];
  if (!ASSET.test(clean) || clean.startsWith('fonts/')) return url;
  if (!fs.existsSync(path.join(ROOT, clean))) { missing.add(clean); return url; }
  return `${clean}?v=${hash(clean)}`;
}

let changedPages = 0, links = 0;
for (const page of PAGES) {
  const file = path.join(ROOT, page);
  const before = fs.readFileSync(file, 'utf8');
  const after = before
    .replace(/\b(href|src)="([^"]+)"/g, (m, attr, url) => { const v = versioned(url); if (v !== url) links++; return `${attr}="${v}"`; })
    .replace(/\b(srcset|imagesrcset)="([^"]+)"/g, (m, attr, list) => `${attr}="${list.split(',').map(candidate => {
      const [url, ...descriptor] = candidate.trim().split(/\s+/);
      const v = versioned(url); if (v !== url) links++;
      return [v, ...descriptor].join(' ');
    }).join(', ')}"`);
  if (after !== before) { fs.writeFileSync(file, after); changedPages++; }
}

console.log(`страниц: ${PAGES.length}, изменено: ${changedPages}; ссылок с новой версией: ${links}; файлов с отпечатком: ${Object.keys(hashes).length}`);
if (missing.size) {
  console.error('НЕТ ФАЙЛОВ (ссылки битые, проверьте):\n  ' + [...missing].join('\n  '));
  process.exit(1);
}
