#!/usr/bin/env node
/* SEO в <head> каждой страницы, robots.txt и sitemap.xml — из одного места.
     node tools/seo.js
   Скрипт заменяет <title> и description, ставит canonical, карточку для соцсетей (Open Graph,
   Twitter), значки и микроразметку schema.org (организация — на «Главной» и «Контактах»,
   «хлебные крошки» — на внутренних страницах) между <!-- SEO:START --> и <!-- SEO:END -->.
   Повторный запуск ничего не ломает. Домен и тексты — в блоке настроек ниже. */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');

/* ---------------- настройки ---------------- */
const DOMAIN = 'https://krasotalove.ru';      // главный адрес сайта, без «/» на конце
const LASTMOD = '2026-10-09';                  // дата для sitemap.xml: менять, когда меняется содержание
const SITE = 'Красота с любовью';
const OG_IMAGE = { file: 'photos/og-cover.jpg', w: 1200, h: 630, alt: 'Рабочие места с зеркалами в бьюти-пространстве «Красота с любовью», Гатчина' };

const BUSINESS = {
  '@context': 'https://schema.org',
  '@type': 'BeautySalon',
  '@id': DOMAIN + '/#business',
  name: SITE,
  description: 'Бьюти-пространство в Гатчине: услуги мастеров, коворкинг для бьюти-специалистов, обучение наращиванию ресниц и мастер-классы.',
  url: DOMAIN + '/',
  telephone: '+79111280122',
  image: DOMAIN + '/' + OG_IMAGE.file,
  address: { '@type': 'PostalAddress', streetAddress: 'ул. Горького, д. 3', addressLocality: 'Гатчина', addressRegion: 'Ленинградская область', addressCountry: 'RU' },
  geo: { '@type': 'GeoCoordinates', latitude: 59.56557, longitude: 30.124248 },
  hasMap: 'https://yandex.ru/maps/10867/gatchina/house/ulitsa_gorkogo_3/Z0kYdwVkS0EPQFtjfXl3dHlkZA==/',
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], opens: '08:00', closes: '21:00' }],
  founder: { '@type': 'Person', name: 'Анастасия Коробова' },
  sameAs: ['https://dikidi.net/1523754', 'https://dikidi.net/1794550']
};

/* title/description: null — оставить как есть на странице */
const PAGES = {
  'index.html': { url: '/', title: 'Красота с любовью — бьюти-коворкинг, услуги и обучение в Гатчине',
    description: 'Бьюти-пространство в Гатчине: услуги мастеров, коворкинг для бьюти-специалистов, обучение наращиванию ресниц и мастер-классы. ул. Горького, 3.', business: true },
  'services.html': { url: '/services.html', crumb: 'Услуги', title: 'Наращивание ресниц и услуги красоты в Гатчине | Красота с любовью',
    description: 'Наращивание ресниц, брови и моментальный загар у Анастасии Коробовой; маникюр, макияж, причёски, косметология и депиляция — мастера на выбор. Гатчина, ул. Горького, 3.' },
  'coworking.html': { url: '/coworking.html', crumb: 'Коворкинг', title: 'Аренда рабочего места мастеру красоты в Гатчине | Красота с любовью', description: null },
  'contacts.html': { url: '/contacts.html', crumb: 'Контакты', title: 'Контакты и запись — Красота с любовью, Гатчина, ул. Горького, 3', description: null, business: true },
  'privacy.html': { url: '/privacy.html', crumb: 'Политика конфиденциальности', title: null, description: null }
};

/* ---------------- сборка ---------------- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const json = o => JSON.stringify(o, null, 2).replace(/</g, '\u003c');
const abs = u => DOMAIN + u;

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const pageText = (html, re) => (html.match(re) || [])[1];

let touched = 0;
for (const [file, cfg] of Object.entries(PAGES)) {
  let html = read(file);
  const before = html;

  if (cfg.title) html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(cfg.title)}</title>`);
  if (cfg.description) html = html.replace(/(<meta name="description" content=")[^"]*(">)/, (m, a, b) => a + esc(cfg.description) + b);
  const title = pageText(html, /<title>([^<]*)<\/title>/).replace(/&amp;/g, '&');
  const description = pageText(html, /<meta name="description" content="([^"]*)">/).replace(/&amp;/g, '&').replace(/&quot;/g, '"');

  const lines = [
    '<!-- SEO:START -->',
    `<link rel="canonical" href="${abs(cfg.url)}">`,
    '<meta name="theme-color" content="#FCF5F0">',
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="ru_RU">',
    `<meta property="og:site_name" content="${esc(SITE)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${abs(cfg.url)}">`,
    `<meta property="og:image" content="${abs('/' + OG_IMAGE.file)}">`,
    `<meta property="og:image:width" content="${OG_IMAGE.w}">`,
    `<meta property="og:image:height" content="${OG_IMAGE.h}">`,
    `<meta property="og:image:alt" content="${esc(OG_IMAGE.alt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    '<link rel="icon" href="favicon.ico" sizes="48x48">',
    '<link rel="icon" href="favicon.svg" type="image/svg+xml">',
    '<link rel="icon" href="icon-192.png" type="image/png" sizes="192x192">',
    '<link rel="apple-touch-icon" href="apple-touch-icon.png">'
  ];
  if (cfg.business) lines.push(`<script type="application/ld+json">\n${json(BUSINESS)}\n</script>`);
  if (cfg.crumb) lines.push(`<script type="application/ld+json">\n${json({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: cfg.crumb, item: abs(cfg.url) }
    ] })}\n</script>`);
  lines.push('<!-- SEO:END -->');
  const block = lines.join('\n');

  /* старый значок-«сердечко» в data:-адресе заменён файлами (favicon.ico, .svg, .png) */
  html = html.replace(/<link rel="icon" href="data:image\/svg\+xml[^"]*">\n?/, '');
  if (html.includes('<!-- SEO:START -->')) html = html.replace(/<!-- SEO:START -->[\s\S]*?<!-- SEO:END -->/, () => block);
  else {
    if (!html.includes('<link rel="stylesheet"')) throw new Error(file + ': нет <link rel="stylesheet">, некуда вставить блок');
    html = html.replace('<link rel="stylesheet"', () => block + '\n<link rel="stylesheet"');
  }
  if (html !== before) { fs.writeFileSync(path.join(ROOT, file), html); touched++; }
  if (title.length > 75) console.warn(`  ! ${file}: заголовок ${title.length} симв. — в выдаче обрежется (желательно до ~65)`);
  if (description.length > 175) console.warn(`  ! ${file}: описание ${description.length} симв. — в выдаче обрежется (желательно до ~160)`);
}

/* robots.txt и sitemap.xml */
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${DOMAIN}/sitemap.xml\n`);
const urls = Object.values(PAGES).map(p => `  <url>\n    <loc>${abs(p.url)}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n  </url>`).join('\n');
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);

console.log(`страниц обновлено: ${touched} из ${Object.keys(PAGES).length}; robots.txt и sitemap.xml записаны (домен ${DOMAIN})`);
