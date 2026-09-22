/* ============================================================
   Наполнение сайта из Google Таблицы

   Заказчик правит таблицу — сайт подхватывает изменения сам,
   без правки кода и без захода в репозиторий.

   ────────── НАСТРОЙКА (делается один раз) ──────────

   1. Создайте Google Таблицу с листами: «Мастера», «Тарифы»,
      «Места», «Услуги» (шаблон лежит в папке sheet-template).
   2. В таблице: «Поделиться» → «Доступ по ссылке» →
      «Все, у кого есть ссылка» → роль «Читатель».
      Без этого сайт не сможет её прочитать.
   3. Скопируйте адрес таблицы из строки браузера и вставьте
      в SHEET ниже — целиком, разбираться с ним не нужно.

   Готово. Новая строка в таблице появляется на сайте в течение
   нескольких минут (Google кэширует ответ).

   Пока SHEET пустой, сайт живёт на том, что вшито в страницы.
   ============================================================ */

var SHEET = '';

/* Модерация. Лист «Мастера» заполняется анкетой, которую присылают сами
   мастера, поэтому новая строка НЕ появляется на сайте, пока владелец
   не поставит в колонке «Показывать» значение «да». Остальные листы
   заполняет владелец, там пустая колонка означает «показывать».
   Поставьте false, если модерация не нужна. */
var MODERATE_MASTERS = true;

/* Названия листов. Меняйте, только если переименовали листы в таблице. */
var SHEET_TABS = {
  masters:  'Мастера',
  tariffs:  'Тарифы',
  places:   'Места',
  services: 'Услуги'
};

/* Запасной путь. Если чтение по SHEET почему-то не работает, откройте
   «Файл → Поделиться → Опубликовать в интернете», выберите лист и формат
   CSV, и вставьте полученные ссылки сюда. Заполненные поля имеют
   приоритет над SHEET. */
var SHEET_CSV = {
  masters:  '',
  tariffs:  '',
  places:   '',
  services: ''
};

(function () {
  'use strict';

  var doc = document;

  /* ---------- адрес листа ---------- */

  function sheetId(value) {
    var m = String(value).match(/\/spreadsheets\/d\/([a-zA-Z0-9\-_]+)/);
    return m ? m[1] : String(value).trim();
  }

  function csvUrl(key) {
    if (SHEET_CSV[key]) return SHEET_CSV[key];
    if (!SHEET) return '';
    return 'https://docs.google.com/spreadsheets/d/' + sheetId(SHEET) +
      '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(SHEET_TABS[key]);
  }

  /* ---------- разбор CSV ---------- */

  function parseCsv(text) {
    var rows = [], row = [], cur = '', quoted = false, i = 0;
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    while (i < text.length) {
      var c = text.charAt(i);
      if (quoted) {
        if (c === '"') {
          if (text.charAt(i + 1) === '"') { cur += '"'; i++; }
          else quoted = false;
        } else cur += c;
      } else if (c === '"') {
        quoted = true;
      } else if (c === ',') {
        row.push(cur); cur = '';
      } else if (c === '\n') {
        row.push(cur); rows.push(row); row = []; cur = '';
      } else {
        cur += c;
      }
      i++;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  function norm(s) {
    return String(s || '').trim().toLowerCase().replace(/ё/g, 'е');
  }

  /* Строки таблицы → объекты с ключами из первой строки. */
  function toObjects(rows) {
    if (!rows.length) return [];
    var head = rows[0].map(norm);
    return rows.slice(1).map(function (r) {
      var o = {};
      head.forEach(function (name, idx) {
        if (name) o[name] = String(r[idx] || '').trim();
      });
      return o;
    }).filter(function (o) {
      /* пустые строки таблицы пропускаем */
      return Object.keys(o).some(function (k) { return o[k]; });
    });
  }

  function field(obj, names) {
    for (var i = 0; i < names.length; i++) {
      var v = obj[norm(names[i])];
      if (v) return v;
    }
    return '';
  }

  /* «нет», «no», «0», «скрыть» — строка не показывается */
  function visible(obj) {
    var v = norm(field(obj, ['Показывать', 'Показать', 'Активен']));
    if (!v) return true;
    return ['нет', 'no', '0', 'false', 'скрыть', '-'].indexOf(v) === -1;
  }

  /* «а; б; в» или перенос строки → массив */
  function list(value) {
    return String(value || '')
      .split(/[;\n]+/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- иконки ---------- */

  var ICONS = {
    'брови': 'i-eye', 'ресницы': 'i-eye', 'глаз': 'i-eye',
    'ногти': 'i-polish', 'лак': 'i-polish', 'маникюр': 'i-polish',
    'макияж': 'i-brush', 'кисть': 'i-brush',
    'волосы': 'i-scissors', 'ножницы': 'i-scissors', 'укладки': 'i-scissors',
    'косметология': 'i-leaf', 'уход': 'i-leaf', 'лист': 'i-leaf',
    'депиляция': 'i-drop', 'капля': 'i-drop',
    'зеркало': 'i-mirror', 'визажист': 'i-mirror',
    'кушетка': 'i-bed', 'косметолог': 'i-bed',
    'стол': 'i-table',
    'кресло': 'i-chair', 'парикмахер': 'i-chair',
    'часы': 'i-clock', 'время': 'i-clock',
    'чемодан': 'i-kit', 'оборудование': 'i-kit',
    'кофе': 'i-cup', 'чай': 'i-cup',
    'диван': 'i-sofa', 'сердце': 'i-heart-o',
    'диплом': 'i-cap', 'обучение': 'i-cap',
    'подарок': 'i-gift'
  };

  function iconFor(word) {
    var k = norm(word);
    if (ICONS[k]) return ICONS[k];
    for (var name in ICONS) {
      if (k.indexOf(name) > -1) return ICONS[name];
    }
    return 'i-heart-o';
  }

  function badge(word, big) {
    return '<span class="ic-badge' + (big ? ' ic-badge--lg' : '') + '">' +
      '<svg class="ic"><use href="#' + iconFor(word) + '"></use></svg></span>';
  }

  function check() {
    return '<svg class="ic"><use href="#i-check"></use></svg>';
  }

  /* ---------- фото ---------- */

  /* Принимаем и прямую ссылку на картинку, и ссылку на файл Google Диска. */
  function photoUrl(value) {
    var v = String(value || '').trim();
    if (!v) return '';
    var m = v.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9\-_]+)/);
    if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w600';
    return v;
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).slice(0, 2);
    return parts.map(function (p) { return p.charAt(0).toUpperCase(); }).join('');
  }

  /* ---------- сборка разметки ---------- */

  function bookHref() {
    /* на внутренних страницах ссылка на блок записи одна и та же */
    return 'contacts.html#zapis';
  }

  function renderMasters(rows) {
    return rows.map(function (r) {
      var name = field(r, ['Имя', 'Мастер', 'ФИО']);
      var role = field(r, ['Направление', 'Специализация', 'Роль']);
      var bio  = field(r, ['О себе', 'Описание', 'Текст']);
      var pic  = photoUrl(field(r, ['Фото', 'Фотография', 'Ссылка на фото']));
      var link = field(r, ['Контакт', 'Ссылка', 'Телефон', 'Запись']);

      var href = link
        ? (/^\+?[\d\s()\-]+$/.test(link) ? 'tel:' + link.replace(/[^\d+]/g, '') : link)
        : bookHref();

      var ph = pic
        ? '<img src="' + esc(pic) + '" alt="' + esc(name) + '" loading="lazy">'
        : '<span class="master__ini">' + esc(initials(name)) + '</span>';

      return '<article class="master">' +
        '<div class="master__ph">' + ph + '</div>' +
        (name ? '<h3>' + esc(name) + '</h3>' : '') +
        (role ? '<p class="master__role">' + esc(role) + '</p>' : '') +
        (bio  ? '<p class="master__bio">' + esc(bio) + '</p>' : '') +
        '<a class="btn btn--pale btn--sm" href="' + esc(href) + '"' +
          (link ? '' : ' data-book') + '>Записаться</a>' +
        '</article>';
    }).join('');
  }

  function renderTariffs(rows) {
    return rows.map(function (r) {
      var title = field(r, ['Название', 'Тариф', 'Период']);
      var price = field(r, ['Цена', 'Стоимость']);
      var note  = field(r, ['Примечание', 'Пояснение']);
      var tag   = field(r, ['Ярлык', 'Метка', 'Бейдж']);
      var items = list(field(r, ['Что входит', 'Входит', 'Условия']));

      return '<article class="tariff' + (tag ? ' tariff--best' : '') + '">' +
        (tag ? '<span class="tariff__tag">' + esc(tag) + '</span>' : '') +
        '<h3>' + esc(title) + '</h3>' +
        (price ? '<p class="tariff__price">от <b>' + esc(price) + '</b></p>' : '') +
        (note ? '<p class="tariff__note">' + esc(note) + '</p>' : '') +
        (items.length ? '<ul class="tariff__list">' + items.map(function (t) {
          return '<li>' + check() + esc(t) + '</li>';
        }).join('') + '</ul>' : '') +
        '<a class="btn btn--rose btn--sm btn--block" href="' + bookHref() + '" data-book>Забронировать</a>' +
        '</article>';
    }).join('');
  }

  function renderPlaces(rows) {
    return rows.map(function (r) {
      var title = field(r, ['Название', 'Место']);
      var text  = field(r, ['Описание', 'Оснащение', 'Текст']);
      var price = field(r, ['Цена', 'Стоимость']);
      var icon  = field(r, ['Иконка', 'Значок']) || title;

      return '<article class="place">' +
        badge(icon, true) +
        '<div class="place__body">' +
          '<h3>' + esc(title) + '</h3>' +
          (text ? '<p>' + esc(text) + '</p>' : '') +
          '<div class="place__foot">' +
            (price ? '<span class="place__price">от <b>' + esc(price) + '</b></span>' : '') +
            '<a class="btn btn--pale btn--sm" href="' + bookHref() + '" data-book>Забронировать</a>' +
          '</div>' +
        '</div>' +
        '</article>';
    }).join('');
  }

  function renderServices(rows) {
    return rows.map(function (r) {
      var title = field(r, ['Направление', 'Название', 'Услуга']);
      var items = list(field(r, ['Процедуры', 'Что входит', 'Список']));
      var icon  = field(r, ['Иконка', 'Значок']) || title;

      return '<article class="svc-card">' +
        badge(icon, true) +
        '<h3>' + esc(title) + '</h3>' +
        (items.length ? '<ul>' + items.map(function (t) {
          return '<li>' + esc(t) + '</li>';
        }).join('') + '</ul>' : '') +
        '<a class="btn btn--pale btn--sm" href="' + bookHref() + '" data-book>Записаться</a>' +
        '</article>';
    }).join('');
  }

  var RENDER = {
    masters:  renderMasters,
    tariffs:  renderTariffs,
    places:   renderPlaces,
    services: renderServices
  };

  /* ---------- загрузка ---------- */

  function fill(key) {
    var host = doc.querySelector('[data-cloud="' + key + '"]');
    if (!host) return;

    var url = csvUrl(key);
    if (!url) return;

    fetch(url, { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var rows = toObjects(parseCsv(text)).filter(function (r) {
          return visible(r, key);
        });
        if (!rows.length) return;

        host.innerHTML = RENDER[key](rows);

        /* показать секцию, если она ждала данных */
        var section = host.closest('[data-cloud-section]');
        if (section) {
          section.hidden = false;
          /* пометка «пример наполнения» больше не нужна */
          var note = section.querySelector('[data-demo-note]');
          if (note) note.remove();
        }

        /* новые кнопки записи должны вести туда же, куда все остальные */
        if (typeof window.applyBookingLinks === 'function') {
          window.applyBookingLinks(host);
        }
      })
      .catch(function (err) {
        /* Таблица недоступна — на странице остаётся вшитый вариант.
           Частые причины: не открыт доступ по ссылке, опечатка в SHEET,
           переименованный лист. */
        console.warn('[cloud] лист «' + SHEET_TABS[key] + '» не загрузился:', err.message);
      });
  }

  if (SHEET || Object.keys(SHEET_CSV).some(function (k) { return SHEET_CSV[k]; })) {
    Object.keys(RENDER).forEach(fill);
  }
})();
