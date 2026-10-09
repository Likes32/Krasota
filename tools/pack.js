#!/usr/bin/env node
/* Сборка сайта для заливки на обычный хостинг (TimeWeb и т. п.):
     node tools/pack.js
   Результат — папка dist/site и архив dist/krasota-site.zip. В архив попадает только то,
   что нужно сайту: страницы, стили, скрипты, шрифты и ровно те фото, на которые есть
   ссылки. Исходники фото, tools/, README и шаблоны таблицы остаются в репозитории.
   Архив нужно распаковать в корень сайта (папка public_html): index.html — прямо в ней.

   Перед сборкой запускайте `node tools/version.js`, чтобы в ссылках были актуальные
   отпечатки версий. */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE = path.join(DIST, 'site');
const ZIP = path.join(DIST, 'krasota-site.zip');

const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
const code = ['styles.css', 'main.js', 'cloud.js'];
/* файлы в корне сайта: значки для поисковиков и браузеров, robots.txt, sitemap.xml */
const root = ['favicon.ico', 'favicon.svg', 'icon-192.png', 'apple-touch-icon.png', 'robots.txt', 'sitemap.xml'];

/* .htaccess: сжатие и кэш. HTML кэшируется на 10 минут, остальное — на месяц
   (ссылки на стили, скрипты и фото содержат ?v=отпечаток, поэтому обновления видны сразу). */
const HTACCESS = `# Красота с любовью — сжатие и кэш браузера
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript image/svg+xml
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 10 minutes"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType text/javascript "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType image/webp "access plus 1 month"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType image/svg+xml "access plus 1 month"
  ExpiresByType image/x-icon "access plus 1 month"
  ExpiresByType image/vnd.microsoft.icon "access plus 1 month"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType application/font-woff2 "access plus 1 year"
</IfModule>

AddType font/woff2 .woff2
AddType image/webp .webp

# своя страница «404»
ErrorDocument 404 /404.html
`;

/* какие фото и шрифты нужны: всё, что упомянуто в страницах и коде */
const refs = new Set(), rootAbs = [];
for (const f of [...pages, ...code]) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of s.matchAll(/\b((?:photos|fonts)\/[A-Za-z0-9_\-./]+\.[A-Za-z0-9]+)/g)) refs.add(m[1]);
  if (f.endsWith('.html')) for (const m of s.matchAll(/\b(?:href|src)="(\/[^\/"][^"]*)"/g)) rootAbs.push(`${f}: ${m[1]}`);
}
const missing = [...refs, ...root].filter(r => !fs.existsSync(path.join(ROOT, r)));
if (missing.length) { console.error('НЕТ ФАЙЛОВ, на которые есть ссылки:\n  ' + missing.join('\n  ')); process.exit(1); }
if (rootAbs.length) { console.error('Ссылки от корня сайта (/…) сломаются в подпапке:\n  ' + rootAbs.join('\n  ')); process.exit(1); }

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(SITE, { recursive: true });
for (const f of [...pages, ...code, ...root, ...refs]) {
  const to = path.join(SITE, f);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(ROOT, f), to);
}
fs.writeFileSync(path.join(SITE, '.htaccess'), HTACCESS);

/* архив: tar.exe из Windows умеет zip (-a) и пишет пути с «/», как нужно серверу */
const top = fs.readdirSync(SITE);
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\Windows', 'System32', 'tar.exe') : 'tar';
const r = cp.spawnSync(tar, ['-a', '-c', '-f', ZIP, '-C', SITE, ...top], { encoding: 'utf8' });
if (r.status !== 0) { console.error('Не удалось собрать zip: ' + (r.stderr || r.error)); console.error('Папка dist/site готова — её можно заархивировать вручную.'); process.exit(1); }

const size = p => fs.statSync(p).size;
const total = [...pages, ...code, ...root, ...refs].reduce((a, f) => a + size(path.join(SITE, f)), 0);
console.log(`страниц: ${pages.length}, фото и шрифтов: ${refs.size}, всего ${(total / 1048576).toFixed(1)} МБ`);
console.log(`архив: ${path.relative(ROOT, ZIP)} (${(size(ZIP) / 1048576).toFixed(1)} МБ)`);
