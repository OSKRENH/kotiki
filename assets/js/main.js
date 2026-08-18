/* ==========================================================================
   Эталон × Vetcity Adoption — интерактив и анимации лендинга
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------------
     1. Размытые превью (blur-up) для тяжёлых фотографий
     ------------------------------------------------------------------ */
  var LQIP = window.__LQIP__ || {};

  $$('.media').forEach(function (box) {
    var key = box.dataset.lqip;
    if (key && LQIP[key]) box.style.backgroundImage = 'url(' + LQIP[key] + ')';

    var img = $('img', box);
    if (!img) return;
    var done = function () { box.classList.add('is-loaded'); };
    if (img.complete && img.naturalWidth) done();
    else { img.addEventListener('load', done); img.addEventListener('error', done); }
  });

  /* ------------------------------------------------------------------
     2. Пословное раскрытие заголовка первого экрана
     ------------------------------------------------------------------ */
  $$('[data-split]').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(function (w, i) {
      var wrap = document.createElement('span');
      wrap.className = 'reveal-word';
      var inner = document.createElement('span');
      inner.style.setProperty('--i', i);
      inner.textContent = w;
      wrap.appendChild(inner);
      el.appendChild(wrap);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  requestAnimationFrame(function () {
    requestAnimationFrame(function () { document.body.classList.add('is-ready'); });
  });

  /* ------------------------------------------------------------------
     3. Цитата: слова «загораются» по мере прокрутки
     ------------------------------------------------------------------ */
  var quote = $('[data-split-words]');
  var quoteWords = [];
  if (quote) {
    var parts = quote.textContent.trim().split(/(\s+)/);
    quote.textContent = '';
    parts.forEach(function (p) {
      if (/^\s+$/.test(p)) { quote.appendChild(document.createTextNode(p)); return; }
      var s = document.createElement('span');
      s.className = 'word';
      s.style.setProperty('--w', quoteWords.length);
      s.textContent = p;
      quote.appendChild(s);
      quoteWords.push(s);
    });
  }

  /* ------------------------------------------------------------------
     4. Появление блоков при прокрутке
     ------------------------------------------------------------------ */
  var revealables = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      });
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
    revealables.forEach(function (el) { io.observe(el); });

    /* подсветка ключевых слов внутри «оживших» блоков */
    var markIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        markIo.unobserve(e.target);
      });
    }, { threshold: 0.9 });
    $$('.mark').forEach(function (el) { markIo.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-visible'); });
    $$('.mark').forEach(function (el) { el.classList.add('is-visible'); });
    if (quote) quote.classList.add('is-lit');
  }

  /* ------------------------------------------------------------------
     5. Счётчики
     ------------------------------------------------------------------ */
  function runCounter(el) {
    var target = parseInt(el.dataset.count, 10) || 0;
    if (reduced) { el.textContent = target; return; }
    var start = performance.now();
    var dur = 1400;
    (function tick(now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }
  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        runCounter(e.target);
        cio.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(runCounter);
  }

  /* ------------------------------------------------------------------
     6. Прокрутка: прогресс-бар, шапка, параллакс, цитата, док
     ------------------------------------------------------------------ */
  var progress = $('#progress');
  var nav = $('#nav');
  var heroMedia = $('#heroMedia');
  var hero = $('#hero');
  var quoteMark = $('#quoteMark');
  var dock = $('#dock');
  var lastY = window.pageYOffset;
  var ticking = false;

  function onScroll() {
    var y = window.pageYOffset;
    var docH = document.documentElement.scrollHeight - window.innerHeight;

    if (progress) progress.style.transform = 'scaleX(' + (docH > 0 ? y / docH : 0) + ')';

    if (nav) {
      nav.classList.toggle('is-stuck', y > 40);
      nav.classList.toggle('is-hidden', y > 420 && y > lastY + 6);
    }

    if (dock && hero) dock.classList.toggle('is-on', y > hero.offsetHeight * 0.8);

    if (!reduced) {
      if (heroMedia && hero && y < hero.offsetHeight) {
        heroMedia.style.transform = 'translate3d(0,' + (y * 0.28) + 'px,0)';
      }
      if (quoteMark) {
        var r = quoteMark.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) {
          var mid = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
          quoteMark.style.transform = 'translate3d(0,' + (mid * -38) + 'px,0) rotate(' + (mid * -4) + 'deg)';
        }
      }
    }

    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(onScroll);
  }, { passive: true });
  onScroll();

  /* цитата «загорается» пословно, когда попадает в кадр */
  if (quote) {
    if ('IntersectionObserver' in window && !reduced) {
      var qio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          quote.classList.add('is-lit');
          qio.disconnect();
        });
      }, { threshold: 0.35 });
      qio.observe(quote);
    } else {
      quote.classList.add('is-lit');
    }
  }

  /* ------------------------------------------------------------------
     7. Бегущая строка
     ------------------------------------------------------------------ */
  var ticker = $('#ticker');
  if (ticker) {
    var phrases = [
      'Помоги нам найти дом',
      'Спасены с «Электрозавода»',
      'Эталон × Vetcity Adoption',
      'Забота · Лечение · Новая семья'
    ];
    var paw = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<ellipse cx="7" cy="8" rx="2.1" ry="2.8"/><ellipse cx="12" cy="6.3" rx="2.1" ry="2.9"/>' +
      '<ellipse cx="17" cy="8" rx="2.1" ry="2.8"/><path d="M12 11c3 0 5.4 2.3 5.4 4.7 0 2-1.6 3.3-3.4 3.3-1 0-1.4-.4-2-.4s-1 .4-2 .4c-1.8 0-3.4-1.3-3.4-3.3C6.6 13.3 9 11 12 11z"/></svg>';
    var group = phrases.map(function (t) { return '<span>' + t + '</span>' + paw; }).join('');
    ticker.innerHTML = '<div class="ticker__group">' + group + '</div><div class="ticker__group">' + group + '</div>';
  }

  /* ------------------------------------------------------------------
     8. Плавающие лапки на первом экране
     ------------------------------------------------------------------ */
  var pawsBox = $('#paws');
  if (pawsBox && !reduced) {
    var svg = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<ellipse cx="7" cy="8" rx="2.1" ry="2.8"/><ellipse cx="12" cy="6.3" rx="2.1" ry="2.9"/>' +
      '<ellipse cx="17" cy="8" rx="2.1" ry="2.8"/><path d="M12 11c3 0 5.4 2.3 5.4 4.7 0 2-1.6 3.3-3.4 3.3-1 0-1.4-.4-2-.4s-1 .4-2 .4c-1.8 0-3.4-1.3-3.4-3.3C6.6 13.3 9 11 12 11z"/></svg>';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 12; i++) {
      var p = document.createElement('span');
      p.className = 'paw';
      p.innerHTML = svg;
      p.style.left = (Math.random() * 96) + '%';
      p.style.bottom = '-40px';
      p.style.width = p.style.height = (16 + Math.random() * 22) + 'px';
      p.style.animationDuration = (16 + Math.random() * 16) + 's';
      p.style.animationDelay = (-Math.random() * 22) + 's';
      frag.appendChild(p);
    }
    pawsBox.appendChild(frag);
  }

  /* ------------------------------------------------------------------
     9. «Магнитные» кнопки
     ------------------------------------------------------------------ */
  if (!reduced && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    $$('[data-magnetic]').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * 0.22;
        var y = (e.clientY - r.top - r.height / 2) * 0.32;
        btn.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------------
     10. Ленивая загрузка карты
     ------------------------------------------------------------------ */
  var map = $('#map');
  if (map && map.dataset.src) {
    var mount = function () {
      if (map.dataset.mounted) return;
      map.dataset.mounted = '1';
      var f = document.createElement('iframe');
      f.src = map.dataset.src;
      f.loading = 'lazy';
      f.title = 'Карта: Москва, Зубарев переулок, 7';
      f.setAttribute('allowfullscreen', '');
      f.addEventListener('load', function () { map.classList.add('is-ready'); });
      map.insertBefore(f, map.firstChild);
    };
    if ('IntersectionObserver' in window) {
      var mio = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) { mount(); mio.disconnect(); }
      }, { rootMargin: '400px' });
      mio.observe(map);
    } else { mount(); }
  }

  /* ------------------------------------------------------------------
     11. Лайтбокс галереи
     ------------------------------------------------------------------ */
  var lb = $('#lightbox');
  var lbImg = $('#lightboxImg');
  var lbCount = $('#lightboxCount');
  var tiles = $$('#gallery .shot');
  var idx = 0;
  var lastFocus = null;

  function show(i) {
    idx = (i + tiles.length) % tiles.length;
    var tile = tiles[idx];
    lbImg.src = tile.dataset.full;
    var img = $('img', tile);
    lbImg.alt = img ? img.alt : '';
    if (lbCount) lbCount.textContent = (idx + 1) + ' / ' + tiles.length;
  }
  function openLb(i) {
    lastFocus = document.activeElement;
    show(i);
    lb.classList.add('is-open');
    document.body.classList.add('is-locked');
    $('[data-lb="close"]', lb).focus();
  }
  function closeLb() {
    lb.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    if (lastFocus) lastFocus.focus();
  }

  tiles.forEach(function (t, i) {
    t.addEventListener('click', function () { openLb(i); });
  });

  if (lb) {
    lb.addEventListener('click', function (e) {
      var act = e.target.closest('[data-lb]');
      if (act) {
        var a = act.dataset.lb;
        if (a === 'close') closeLb();
        if (a === 'prev') show(idx - 1);
        if (a === 'next') show(idx + 1);
        return;
      }
      if (e.target === lb) closeLb();
    });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }


  /* ------------------------------------------------------------------
     13. Подопечные: карточки и раскрывающаяся анкета
     ------------------------------------------------------------------ */
  var CATS = window.__CATS__ || [];
  var cardsBox = $('#cards');

  if (cardsBox && CATS.length) {
    cardsBox.innerHTML = CATS.map(function (c, i) {
      var age = c.cardAge ? '<span class="card__age">' + c.cardAge + '</span>' : '';
      return '<button class="card" type="button" data-i="' + i + '" style="--d:' + (i * 80) + '" ' +
             'aria-label="Открыть карточку: ' + c.name + '">' +
               '<span class="card__media"' + (c.lqip ? ' style="background-image:url(' + c.lqip + ')"' : '') + '>' +
                 '<img src="' + c.photos[0] + '" alt="' + c.name + '" loading="lazy" decoding="async">' +
                 '<span class="card__more">' + c.photos.length + ' фото</span>' +
               '</span>' +
               '<span class="card__bar"><b class="card__name">' + c.name + '</b>' + age + '</span>' +
             '</button>';
    }).join('');

    $$('.card img', cardsBox).forEach(function (img) {
      var box = img.parentNode;
      var done = function () { box.classList.add('is-loaded'); };
      if (img.complete && img.naturalWidth) done();
      else { img.addEventListener('load', done); img.addEventListener('error', done); }
    });
  }

  var sheet = $('#sheet');
  var sPhoto = $('#sheetPhoto'), sThumbs = $('#sheetThumbs'), sCount = $('#sheetCount');
  var sName = $('#sheetName'), sSpecs = $('#sheetSpecs'), sText = $('#sheetText'), sMail = $('#sheetMail');
  var cur = 0, shot = 0, sheetFocus = null;

  function paintPhoto() {
    var c = CATS[cur];
    sPhoto.src = c.photos[shot];
    sPhoto.alt = c.name + ' — фото ' + (shot + 1);
    sCount.textContent = (shot + 1) + ' / ' + c.photos.length;
    var many = c.photos.length > 1;
    $$('.sheet__nav', sheet).forEach(function (b) { b.hidden = !many; });
    sCount.hidden = !many;
    $$('.sheet__thumb', sThumbs).forEach(function (t, i) {
      t.classList.toggle('is-on', i === shot);
    });
  }

  function openSheet(i) {
    var c = CATS[i];
    if (!c) return;
    cur = i; shot = 0;
    sheetFocus = document.activeElement;

    sName.textContent = c.name;

    var specs = [['Возраст', c.age], ['Пол', c.sex], ['Характер', c.trait], ['Статус', c.status]]
      .filter(function (p) { return p[1]; })
      .map(function (p) {
        return '<div class="spec"><span class="spec__k">' + p[0] + '</span><span class="spec__v">' + p[1] + '</span></div>';
      }).join('');
    sSpecs.innerHTML = specs;
    sSpecs.hidden = !specs;

    sText.innerHTML = c.text.map(function (t) {
      return '<p>' + t.replace(
        /(https?:\/\/)?(vetcityadoption\.ru\/?)/g,
        '<a href="https://vetcityadoption.ru/" target="_blank" rel="noopener">vetcityadoption.ru</a>'
      ) + '</p>';
    }).join('');

    sMail.href = 'mailto:Natalya.Batueva@etalongroup.com?subject=' +
      encodeURIComponent('Хочу забрать домой: ' + c.name);

    sThumbs.innerHTML = c.photos.length > 1
      ? c.photos.map(function (src, k) {
          return '<button class="sheet__thumb" type="button" data-k="' + k + '" aria-label="Фото ' + (k + 1) + '">' +
                 '<img src="' + src + '" alt="" loading="lazy"></button>';
        }).join('')
      : '';
    sThumbs.hidden = c.photos.length < 2;

    paintPhoto();
    sheet.classList.add('is-open');
    document.body.classList.add('is-locked');
    $('[data-sheet="close"]', sheet).focus();
  }

  function closeSheet() {
    sheet.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    if (sheetFocus) sheetFocus.focus();
  }

  if (cardsBox) {
    cardsBox.addEventListener('click', function (e) {
      var card = e.target.closest('.card');
      if (card) openSheet(+card.dataset.i);
    });
  }

  if (sheet) {
    sheet.addEventListener('click', function (e) {
      var thumb = e.target.closest('.sheet__thumb');
      if (thumb) { shot = +thumb.dataset.k; paintPhoto(); return; }

      var act = e.target.closest('[data-sheet]');
      if (act) {
        var a = act.dataset.sheet;
        var n = CATS[cur].photos.length;
        if (a === 'close') closeSheet();
        if (a === 'prev') { shot = (shot - 1 + n) % n; paintPhoto(); }
        if (a === 'next') { shot = (shot + 1) % n; paintPhoto(); }
        return;
      }
      if (e.target === sheet) closeSheet();
    });

    document.addEventListener('keydown', function (e) {
      if (!sheet.classList.contains('is-open')) return;
      var n = CATS[cur].photos.length;
      if (e.key === 'Escape') closeSheet();
      if (e.key === 'ArrowLeft')  { shot = (shot - 1 + n) % n; paintPhoto(); }
      if (e.key === 'ArrowRight') { shot = (shot + 1) % n; paintPhoto(); }
    });
  }

  /* ------------------------------------------------------------------
     12. Плавная прокрутка по якорям
     ------------------------------------------------------------------ */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      var top = t.getBoundingClientRect().top + window.pageYOffset - (id === '#top' ? 0 : 60);
      window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
      if (history.replaceState) history.replaceState(null, '', id);
    });
  });
})();
