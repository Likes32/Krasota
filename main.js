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

  if (BOOKING_URL) {
    Array.prototype.forEach.call(doc.querySelectorAll('a[data-book]'), function (el) {
      el.href = BOOKING_URL;
      el.target = '_blank';
      el.rel = 'noopener';
    });
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
