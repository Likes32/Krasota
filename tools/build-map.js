/* Пересборка статичной карты под новый адрес.

   Использование (один раз поставить sharp, потом запускать):
     npm i sharp
     node tools/build-map.js 59.5655 30.1242        ← широта и долгота точки

   Что делает: скачивает 12 тайлов OpenStreetMap (zoom 15) вокруг точки, склеивает их
     photos/map.webp        — карта для страницы «Контакты» (цвет смягчён)
     photos/map-thumb.webp  — чёрно-белая миниатюра для подвала
   и печатает проценты для булавок .map__pin и .fmap__pin в styles.css.

   Карта © участники OpenStreetMap — подпись на странице оставляйте. */
const sharp = require('sharp'), fs = require('fs'), path = require('path');

const [lat, lon] = process.argv.slice(2).map(Number);
if (!isFinite(lat) || !isFinite(lon)) {
  console.error('Нужны широта и долгота: node tools/build-map.js 59.5655 30.1242');
  process.exit(1);
}

const Z = 15, T = 256, COLS = 4, ROWS = 3, N = 2 ** Z;
const xt = (lon + 180) / 360 * N;
const rad = lat * Math.PI / 180;
const yt = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * N;
const x0 = Math.round(xt - COLS / 2), y0 = Math.round(yt - ROWS / 2);
const W = COLS * T, H = ROWS * T;
const pin = { x: (xt - x0) * T, y: (yt - y0) * T };            // булавка в пикселях склейки
const OUT = path.join(__dirname, '..', 'photos');

/* до трёх попыток: сеть бывает капризной. Если стабильно «fetch failed» из-за антивируса,
   который подменяет HTTPS-сертификаты, запустите:  node --use-system-ca tools/build-map.js ... */
async function download(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'krasota-s-lubovyu-map-build/1.0 (static site, 12 tiles once)' } });
      if (!res.ok) throw new Error('ответ ' + res.status);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      const why = (e.cause && (e.cause.code || e.cause.message)) || e.message;
      if (attempt >= 3) throw new Error('тайл ' + url + ' не скачался: ' + why);
      await new Promise(ok => setTimeout(ok, 1500 * attempt));
    }
  }
}

(async () => {
  const tiles = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const url = `https://tile.openstreetmap.org/${Z}/${x0 + c}/${y0 + r}.png`;
    tiles.push({ input: await download(url), left: c * T, top: r * T });
    await new Promise(ok => setTimeout(ok, 400));              // политика OSM: без «очередей» запросов
  }
  const stitched = await sharp({ create: { width: W, height: H, channels: 3, background: '#eee' } }).composite(tiles).png().toBuffer();

  await sharp(stitched).modulate({ saturation: 0.72, brightness: 1.03 })
    .webp({ quality: 80, effort: 5 }).toFile(path.join(OUT, 'map.webp'));

  const CW = 600, CH = 450;                                     // кадр миниатюры вокруг булавки
  const left = Math.max(0, Math.min(W - CW, Math.round(pin.x - CW / 2)));
  const top = Math.max(0, Math.min(H - CH, Math.round(pin.y - CH / 2)));
  await sharp(stitched).extract({ left, top, width: CW, height: CH }).resize(312, 234)
    .grayscale().linear(1.05, -6).webp({ quality: 80, effort: 5 }).toFile(path.join(OUT, 'map-thumb.webp'));

  const pct = v => (Math.round(v * 10) / 10) + '%';
  console.log('Готово: photos/map.webp и photos/map-thumb.webp');
  console.log('Булавки в styles.css:');
  console.log(`  .map__pin  { left:${pct(pin.x / W * 100)}; top:${pct(pin.y / H * 100)}; }`);
  console.log(`  .fmap__pin { left:${pct((pin.x - left) / CW * 100)}; top:${pct((pin.y - top) / CH * 100)}; }`);
})().catch(e => { console.error('Ошибка:', e.message); process.exit(1); });
