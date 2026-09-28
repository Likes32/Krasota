/* Красота с любовью — интерактив */
(function () {
  'use strict';

  var doc = document;

  /* ------------------------------------------------------------------
     ОНЛАЙН-ЗАПИСЬ — единственное место, где это настраивается.

     Впишите сюда ссылку из DIKIDI / YCLIENTS (или любого другого сервиса
     записи) — и все кнопки записи на сайте начнут вести туда, в новой
     вкладке. Пока строка пустая, кнопки работают по своим запасным
     адресам: телефон и страница контактов.

     Кнопки помечены атрибутом data-book, добавлять новые не нужно.
  ------------------------------------------------------------------ */
  var BOOKING_URL = '';

  /* Блоки, подгруженные из Google Таблицы, зовут это повторно
     для своих кнопок — см. cloud.js */
  window.applyBookingLinks = function (root) {
    if (!BOOKING_URL) return;
    var scope = root || doc;
    Array.prototype.forEach.call(scope.querySelectorAll('a[data-book]'), function (el) {
      el.href = BOOKING_URL;
      el.target = '_blank';
      el.rel = 'noopener';
    });
  };

  window.applyBookingLinks();

  /* ---------- Лёгкий параллакс розовых пятен в хиро ----------
     Только там, где есть настоящая мышь (не палец на экране), и только
     если пользователь не просил уменьшить анимации. Сдвиг небольшой —
     это фон, а не аттракцион. */
  (function () {
    var blobs = doc.querySelectorAll('.hero__blob');
    if (!blobs.length) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce), (hover: none), (pointer: coarse)').matches) return;

    var hero = doc.querySelector('.hero');
    if (!hero) return;

    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;  /* -0.5..0.5 */
      var y = (e.clientY - r.top) / r.height - 0.5;
      blobs[0] && (blobs[0].style.transform = 'translate(' + (x * 22) + 'px,' + (y * 22) + 'px)');
      blobs[1] && (blobs[1].style.transform = 'translate(' + (x * -16) + 'px,' + (y * -16) + 'px)');
    });
    hero.addEventListener('mouseleave', function () {
      blobs.forEach(function (b) { b.style.transform = ''; });
    });
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

    start();
  });

  /* ---------- Имя мастера в блоке записи ----------
     На карточке мастера без своей ссылки кнопка ведёт сюда с ?m=Имя.
     Вставляем через textContent: значение приходит из адреса. */
  var who = doc.querySelector("[data-book-who]");
  if (who) {
    var name = new URLSearchParams(location.search).get("m");
    if (name) {
      who.textContent = "Вы записываетесь к мастеру: " + name.slice(0, 80);
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
