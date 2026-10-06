/* Красота с любовью — интерактив */
(function () {
  'use strict';

  var doc = document;

  /* ------------------------------------------------------------------
     ОНЛАЙН-ЗАПИСЬ — единственное место, где это настраивается.

     У направлений разная запись. Кнопка получает ссылку по значению
     своего атрибута data-book и открывает её в новой вкладке:
       data-book="anastasia" — запись к Анастасии: ресницы и загар (DIKIDI)
       data-book="cowork"    — аренда рабочих мест (DIKIDI коворкинга)
     Кнопка с пустым data-book остаётся на блоке записи contacts.html#zapis —
     там все три варианта, включая обучение (запись через MAX по телефону).
  ------------------------------------------------------------------ */
  var BOOKING = {
    anastasia: 'https://dikidi.net/1523754',
    cowork:    'https://dikidi.net/1794550'
  };

  /* Блоки, подгруженные из Google Таблицы, зовут это повторно
     для своих кнопок — см. cloud.js */
  window.applyBookingLinks = function (root) {
    var scope = root || doc;
    Array.prototype.forEach.call(scope.querySelectorAll('a[data-book]'), function (el) {
      var url = BOOKING[el.getAttribute('data-book')];
      if (!url) return;
      el.href = url;
      el.target = '_blank';
      el.rel = 'noopener';
    });
  };

  window.applyBookingLinks();

  /* ---------- Лёгкий параллакс розовых пятен в хиро ----------
     С мышью пятна плывут за курсором, на телефоне — при прокрутке
     (сдвиг сглаживает transition в CSS). Не работает, если пользователь
     просил уменьшить анимации. Сдвиг небольшой — это фон, а не аттракцион. */
  (function () {
    var blobs = doc.querySelectorAll('.hero__blob');
    if (!blobs.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var hero = doc.querySelector('.hero');
    if (!hero) return;

    var raf = 0, mx = 0, my = 0;

    if (window.matchMedia('(hover: none)').matches) {
      var visible = true;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(hero);
      }
      window.addEventListener('scroll', function () {
        if (!visible || raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var y = Math.min(window.scrollY, hero.offsetHeight);
          blobs[0] && (blobs[0].style.transform = 'translate3d(0,' + (y * 0.22) + 'px,0)');
          blobs[1] && (blobs[1].style.transform = 'translate3d(0,' + (y * -0.14) + 'px,0)');
        });
      }, { passive: true });
      return;
    }

    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width - 0.5;   /* -0.5..0.5 */
      my = (e.clientY - r.top) / r.height - 0.5;
      if (raf) return;                              /* не чаще одного раза за кадр */
      raf = requestAnimationFrame(function () {
        raf = 0;
        blobs[0] && (blobs[0].style.transform = 'translate(' + (mx * 22) + 'px,' + (my * 22) + 'px)');
        blobs[1] && (blobs[1].style.transform = 'translate(' + (mx * -16) + 'px,' + (my * -16) + 'px)');
      });
    }, { passive: true });
    hero.addEventListener('mouseleave', function () {
      blobs.forEach(function (b) { b.style.transform = ''; });
    });
  })();

  /* ---------- Подсветка под курсором на карточках ----------
     Положение курсора внутри карточки пишем в --mx/--my, остальное делает CSS.
     Только там, где есть настоящая мышь. Слушаем весь документ, поэтому
     карточки, подгруженные из таблицы позже, подхватываются сами. */
  (function () {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var SEL = '.card, .tariff, .place, .svc-card, .master, .edu-zapis';
    var frame = 0, hit = null, px = 0, py = 0;

    doc.addEventListener('pointermove', function (e) {
      var el = e.target.closest ? e.target.closest(SEL) : null;
      if (!el) return;
      hit = el; px = e.clientX; py = e.clientY;
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = 0;
        var r = hit.getBoundingClientRect();
        hit.style.setProperty('--mx', (px - r.left) + 'px');
        hit.style.setProperty('--my', (py - r.top) + 'px');
      });
    }, { passive: true });
  })();

  /* ---------- Телефон и планшет: эффекты наведения — через прокрутку и касание ----------
     Навести палец нельзя, поэтому:
     — карточка или фото, проходя середину экрана, получает .is-lit (как наведение);
     — по фото пробегает блик .is-glint: при выезде на середину и при касании;
     — при касании свет на карточке перескакивает под палец (.is-touch и --mx/--my).
     Следим через IntersectionObserver — без обработчиков прокрутки. Карточки,
     которые позже дорисует cloud.js, подключает window.watchTouchEffects. */
  (function () {
    if (!window.matchMedia('(hover: none)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    var CARDS = '.card, .tariff, .place, .svc-card, .master, .edu-zapis';
    var PHOTOS = '.gal figure, .split__media';

    function glint(el) {
      el.classList.remove('is-glint');
      void el.offsetWidth;                       /* перезапустить анимацию */
      el.classList.add('is-glint');
    }

    /* «середина экрана» — полоса в 30% высоты по центру */
    var middle = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var el = e.target;
        if (e.isIntersecting && !el.classList.contains('is-lit') && el.matches(PHOTOS)) glint(el);
        el.classList.toggle('is-lit', e.isIntersecting);
      });
    }, { rootMargin: '-35% 0px -35% 0px' });

    window.watchTouchEffects = function (root) {
      Array.prototype.forEach.call((root || doc).querySelectorAll(CARDS + ', ' + PHOTOS), function (el) {
        middle.observe(el);
      });
    };
    window.watchTouchEffects();

    doc.addEventListener('animationend', function (e) {
      if (e.animationName === 'glint') e.target.classList.remove('is-glint');
    });

    /* касание: свет под палец; гаснет через полсекунды после того, как палец убран */
    var touched = null, release = 0;
    function off(card) {
      card.classList.remove('is-touch');
      card.style.removeProperty('--mx');
      card.style.removeProperty('--my');
    }
    doc.addEventListener('pointerdown', function (e) {
      if (!e.target.closest) return;
      var photo = e.target.closest(PHOTOS);
      if (photo) glint(photo);
      var card = e.target.closest(CARDS);
      if (!card) return;
      clearTimeout(release);
      if (touched && touched !== card) off(touched);
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      card.classList.add('is-touch');
      touched = card;
    }, { passive: true });
    function letGo() {
      if (!touched) return;
      var card = touched;
      clearTimeout(release);
      release = setTimeout(function () { off(card); if (touched === card) touched = null; }, 650);
    }
    doc.addEventListener('pointerup', letGo, { passive: true });
    doc.addEventListener('pointercancel', letGo, { passive: true });

    /* iOS Safari включает :active (вжатие кнопок и карточек), только если на странице есть touchstart */
    doc.addEventListener('touchstart', function () {}, { passive: true });
  })();

  /* ---------- Минималистичный слайдер (примеры работ) ----------
     Без своей точки/JS показывает первый кадр как обычную фотографию —
     это и есть исходное состояние разметки, JS только добавляет смену. */
  Array.prototype.forEach.call(doc.querySelectorAll('[data-tslider]'), function (el) {
    var slides = el.querySelectorAll('.tslider__slide');
    var dots = el.querySelectorAll('.tslider__dots button');
    if (slides.length < 2) return;

    var current = 0;
    var timer = null;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function show(next) {
      slides[current].classList.remove('is-active');
      if (dots[current]) {
        dots[current].classList.remove('is-active');
        dots[current].setAttribute('aria-selected', 'false');
      }
      current = (next + slides.length) % slides.length;
      slides[current].classList.add('is-active');
      if (dots[current]) {
        dots[current].classList.add('is-active');
        dots[current].setAttribute('aria-selected', 'true');
      }
    }

    function start() {
      if (reduceMotion) return; /* точки листаются вручную, автопрокрутки нет */
      stop();
      timer = setInterval(function () { show(current + 1); }, 4200);
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    Array.prototype.forEach.call(dots, function (dot, idx) {
      dot.addEventListener('click', function () { show(idx); start(); });
    });
    el.addEventListener('mouseenter', stop);
    el.addEventListener('mouseleave', start);
    el.addEventListener('focusin', stop);
    el.addEventListener('focusout', start);

    /* свайп пальцем: влево — следующий кадр, вправо — предыдущий; пока палец на кадре — пауза */
    var sx = null, sy = 0;
    el.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { sx = null; return; }
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      stop();
    }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      sx = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) show(current + (dx < 0 ? 1 : -1));
      start();
    }, { passive: true });
    el.addEventListener('touchcancel', function () { sx = null; start(); }, { passive: true });

    start();
  });

  /* ---------- Имя мастера в блоке записи ----------
     На карточке мастера без своей ссылки кнопка ведёт сюда с ?m=Имя.
     Вставляем через textContent: значение приходит из адреса. */
  var who = doc.querySelector("[data-book-who]");
  if (who) {
    var name = new URLSearchParams(location.search).get("m");
    if (name) {
      who.textContent = "Ваша запись: " + name.slice(0, 80);
      who.hidden = false;
    }
  }

  /* ---------- Мобильное меню ---------- */
  var burger = doc.getElementById('burger');
  var nav = doc.getElementById('nav');

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      doc.body.classList.toggle('nav-open', open);
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        doc.body.classList.remove("nav-open");
      }
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        doc.body.classList.remove("nav-open");
        burger.focus();
      }
    });
  }

  /* ---------- Тень у шапки ---------- */
  var hdr = doc.getElementById('hdr');
  if (hdr) {
    var onScroll = function () {
      hdr.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Нижняя панель записи (телефон) ----------
     Выезжает, когда первый экран пролистан. Следим за самим первым
     экраном через IntersectionObserver — так плавнее, чем на scroll. */
  var mbar = doc.getElementById('mbar');
  var firstScreen = doc.querySelector('.hero, .phead');

  if (mbar) {
    if (firstScreen && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        mbar.classList.toggle('is-in', !entries[0].isIntersecting);
      }, { threshold: 0 }).observe(firstScreen);
    } else {
      mbar.classList.add('is-in');
    }
  }

  /* ---------- Появление блоков при скролле ---------- */
  var revs = doc.querySelectorAll('.rev');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || /[?&]static/.test(location.search); /* ?static — статичный режим для съёмки макетов */

  if (!revs.length) return;

  if (reduced || !('IntersectionObserver' in window)) {
    doc.documentElement.classList.add('no-anim');
    for (var i = 0; i < revs.length; i++) revs[i].classList.add('is-in');
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  revs.forEach(function (el) { io.observe(el); });

  /* Всё, что уже в первом экране, показываем сразу */
  requestAnimationFrame(function () {
    revs.forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
        el.classList.add('is-in');
      }
    });
  });
})();
