/* Красота с любовью — интерактив */
(function () {
  'use strict';

  var doc = document;

  /* ---------- Мобильное меню ---------- */
  var burger = doc.getElementById('burger');
  var nav = doc.getElementById('nav');

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });

    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        burger.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        burger.focus();
      }
    });
  }

  /* ---------- Тень у шапки при скролле ---------- */
  var hdr = doc.getElementById('hdr');
  if (hdr) {
    var onScroll = function () {
      hdr.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
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
