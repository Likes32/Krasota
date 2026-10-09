#!/usr/bin/env node
/* Юридические сведения на страницах — из одного файла legal.json.

   В legal.json лежат данные продавца (исполнителя): кто он по ЕГРИП, ИНН, ОГРНИП,
   где и когда зарегистрирован, e-mail для обращений по персональным данным и дата
   редакции политики. Скрипт расставляет их по страницам:
     • в подвале каждой страницы — строка «ИП … · ИНН … · ОГРНИП …»
       (между <!-- LEGAL-REQ:START --> и <!-- LEGAL-REQ:END -->; пока нет
       ФИО, ИНН и ОГРНИП одновременно, строка не выводится);
     • в тексте политики (privacy.html) — вместо пометок <!--L:ключ-->…<!--/L-->;
       незаполненное поле выводится подсвеченной заглушкой, чтобы его нельзя было
       пропустить.

   Запуск (повторный запуск ничего не ломает):
     node tools/legal.js          — расставить данные
     node tools/legal.js --check  — то же, но с ошибкой (код 1), если что-то не заполнено;
                                    запускать перед сдачей сайта заказчику. */
'use strict';
const fs = require('fs'), path = require('path');

const ROOT = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'legal.json'), 'utf8'));
const PLACEHOLDER = {
  operator: '[ФИО ИП]', inn: '[ИНН]', ogrnip: '[ОГРНИП]',
  registration: '[орган и дата регистрации]', email: '[e-mail]', policyDate: '[дата]'
};
const val = k => String(data[k] ?? '').trim();
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const missing = Object.keys(PLACEHOLDER).filter(k => !val(k));

function render(key) {
  if (!val(key)) return `<mark class="fill">${PLACEHOLDER[key]}</mark>`;
  const v = esc(val(key));
  return key === 'email' ? `<a href="mailto:${v}">${v}</a>` : v;
}

const footerLine = val('operator') && val('inn') && val('ogrnip')
  ? `<p class="ftr__req">${esc(val('operator'))} · ИНН ${esc(val('inn'))} · ОГРНИП ${esc(val('ogrnip'))}</p>`
  : '';

let changed = 0, fields = 0, footers = 0;
for (const page of fs.readdirSync(ROOT).filter(f => f.endsWith('.html'))) {
  const file = path.join(ROOT, page);
  const before = fs.readFileSync(file, 'utf8');
  const after = before
    .replace(/<!--L:(\w+)-->[\s\S]*?<!--\/L-->/g, (m, key) => {
      if (!(key in PLACEHOLDER)) { console.error(`${page}: неизвестное поле «${key}»`); process.exit(1); }
      fields++; return `<!--L:${key}-->${render(key)}<!--/L-->`;
    })
    .replace(/(<!-- LEGAL-REQ:START -->)[\s\S]*?(<!-- LEGAL-REQ:END -->)/, (m, a, b) => {
      footers++; return `${a}\n    ${footerLine ? footerLine + '\n    ' : ''}${b}`;
    });
  if (after !== before) { fs.writeFileSync(file, after); changed++; }
}

console.log(`изменено страниц: ${changed}; полей в тексте: ${fields}; подвалов: ${footers}`);
if (missing.length) {
  console.log('НЕ ЗАПОЛНЕНО в legal.json: ' + missing.join(', ') + ' (на страницах стоят подсвеченные заглушки)');
  if (process.argv.includes('--check')) process.exit(1);
} else console.log('Все сведения заполнены.');
