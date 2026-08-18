(() => {
  'use strict';

  const FEED_UID = '166910607191';
  const FEED_URL = `https://feeds.tildaapi.com/api/getfeed/?feeduid=${FEED_UID}&recid=&c=${Date.now()}&size=100&slice=1&sort%5Bdate%5D=desc&filters%5Bdate%5D=&getparts=true`;
  const ADOPTION_EMAIL = 'Natalya.Batueva@etalongroup.com';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const header = $('[data-header]');
  const grid = $('[data-cats-grid]');
  const feedStatus = $('[data-feed-status]');
  const heroPhoto = $('[data-hero-photo]');
  const heroLabel = $('[data-hero-label]');
  const modal = $('[data-modal]');

  let cats = [];
  let activeCat = null;
  let activeImageIndex = 0;
  let lastFocusedElement = null;

  // Header
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 36);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  // Reveal animations
  $$('.reveal').forEach((el) => {
    if (el.dataset.delay) el.style.setProperty('--delay', `${el.dataset.delay}ms`);
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach((el) => observer.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('is-visible'));
  }

  // Gentle magnetic buttons on pointer devices
  if (matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $$('.magnetic').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.12;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.16;
        button.style.transform = `translate(${x}px, ${y}px)`;
      });
      button.addEventListener('pointerleave', () => { button.style.transform = ''; });
    });
  }

  const cleanHtml = (value = '') => {
    const template = document.createElement('template');
    template.innerHTML = String(value);
    template.content.querySelectorAll('script,style,iframe,object,embed,form,input,button').forEach((node) => node.remove());
    template.content.querySelectorAll('*').forEach((node) => {
      [...node.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        const val = attr.value.trim().toLowerCase();
        if (name.startsWith('on') || (['href','src'].includes(name) && val.startsWith('javascript:'))) {
          node.removeAttribute(attr.name);
        }
      });
    });
    return template.innerHTML;
  };

  const textOnly = (html = '') => {
    const div = document.createElement('div');
    div.innerHTML = cleanHtml(html);
    return div.textContent?.replace(/\s+/g, ' ').trim() || '';
  };

  const firstValue = (obj, keys) => {
    for (const key of keys) {
      if (obj && obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') return obj[key];
    }
    return '';
  };

  const collectUrls = (value, output = []) => {
    if (!value) return output;
    if (typeof value === 'string') {
      const urls = value.match(/https?:\/\/[^\s"'<>\\]+/g) || [];
      urls.forEach((url) => {
        const cleaned = url.replace(/&amp;/g, '&').replace(/[),.;]+$/, '');
        if (/\.(?:jpe?g|png|webp|gif|avif)(?:\?|$)/i.test(cleaned) || /tildacdn\.com/i.test(cleaned)) output.push(cleaned);
      });
      return output;
    }
    if (Array.isArray(value)) value.forEach((item) => collectUrls(item, output));
    else if (typeof value === 'object') Object.values(value).forEach((item) => collectUrls(item, output));
    return output;
  };

  const unique = (items) => [...new Set(items.filter(Boolean))];

  const extractPosts = (payload) => {
    const candidates = [
      payload?.posts,
      payload?.result?.posts,
      payload?.result?.items,
      payload?.items,
      payload?.data?.posts,
      payload?.data?.items,
      payload?.feed?.posts,
      payload?.result
    ];
    const direct = candidates.find(Array.isArray);
    if (direct) return direct;

    // Fallback: find the first array of objects that resembles posts.
    const queue = [payload];
    const seen = new Set();
    while (queue.length) {
      const current = queue.shift();
      if (!current || typeof current !== 'object' || seen.has(current)) continue;
      seen.add(current);
      for (const value of Object.values(current)) {
        if (Array.isArray(value) && value.length && value.every((item) => item && typeof item === 'object')) {
          const score = value.reduce((acc, item) => acc + (('title' in item || 'posttitle' in item || 'uid' in item || 'postuid' in item) ? 1 : 0), 0);
          if (score >= Math.ceil(value.length / 2)) return value;
        }
        if (value && typeof value === 'object') queue.push(value);
      }
    }
    return [];
  };

  const normalizeCat = (post, index) => {
    const titleRaw = firstValue(post, ['title', 'posttitle', 'name', 'post_title']);
    const title = textOnly(titleRaw) || `Подопечный ${index + 1}`;
    const description = firstValue(post, ['descr', 'description', 'shortdescr', 'short_description', 'subtitle']);
    const body = firstValue(post, ['text', 'body', 'content', 'html', 'posttext', 'post_text']) || description;
    const media = firstValue(post, ['mediadata', 'media', 'image', 'img', 'cover', 'thumb', 'thumbnail']);
    const gallery = firstValue(post, ['gallery', 'images', 'photos', 'mediagallery', 'media_gallery']);
    const allImages = unique([
      ...collectUrls(media),
      ...collectUrls(gallery),
      ...collectUrls(post?.images),
      ...collectUrls(post?.gallery),
      ...collectUrls(post)
    ]).filter((url) => !/\.svg(?:\?|$)/i.test(url));

    const age = textOnly(firstValue(post, ['age', 'subtitle', 'subTitle']));
    const sex = textOnly(firstValue(post, ['sex', 'gender']));
    const status = textOnly(firstValue(post, ['status', 'state'])) || 'Ищет дом';
    const tags = [];
    [age, sex].filter(Boolean).forEach((v) => tags.push(v));

    // Tilda feed descriptions often contain concise age/sex/status fragments.
    const short = textOnly(description);
    if (!tags.length && short && short.length < 120) {
      short.split(/[•|·,—]+/).map((x) => x.trim()).filter(Boolean).slice(0, 3).forEach((x) => tags.push(x));
    }

    return {
      id: firstValue(post, ['uid', 'postuid', 'id']) || `${index}`,
      title,
      status,
      tags: unique(tags).slice(0, 4),
      description: short,
      body: cleanHtml(body),
      images: allImages,
      raw: post
    };
  };

  const setHero = (cat) => {
    const image = cat?.images?.[0];
    if (!image || !heroPhoto) return;
    heroPhoto.style.backgroundImage = `url("${image.replace(/"/g, '%22')}")`;
    heroPhoto.classList.remove('skeleton');
    heroPhoto.removeAttribute('aria-hidden');
    heroPhoto.setAttribute('role', 'img');
    heroPhoto.setAttribute('aria-label', `${cat.title} — кошка, которая ищет дом`);
    if (heroLabel) heroLabel.textContent = `${cat.title} · ждёт свою семью`;
  };

  const renderCards = () => {
    if (!grid) return;
    grid.innerHTML = '';
    cats.forEach((cat, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cat-card reveal is-visible';
      button.dataset.catIndex = String(index);
      button.setAttribute('aria-label', `Открыть анкету: ${cat.title}`);
      const image = cat.images[0];
      const tags = cat.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
      button.innerHTML = `
        ${image ? `<span class="cat-card-image" style="background-image:url(&quot;${escapeAttr(image)}&quot;)"></span>` : '<span class="cat-card-image"></span>'}
        <span class="cat-card-content">
          <span class="cat-card-top">
            <h3>${escapeHtml(cat.title)}</h3>
            <span class="cat-card-arrow" aria-hidden="true">↗</span>
          </span>
          ${tags ? `<span class="cat-card-meta">${tags}</span>` : ''}
        </span>`;
      button.addEventListener('click', () => openModal(index));
      grid.appendChild(button);
    });
  };

  const escapeHtml = (value = '') => String(value).replace(/[&<>"]/g, (ch) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[ch]));
  const escapeAttr = (value = '') => escapeHtml(value).replace(/'/g, '&#39;');

  const renderFallback = () => {
    if (!grid) return;
    const fallback = [
      ['Лена', ''], ['Сима', ''], ['Нева', ''], ['Волга', ''], ['Енисей', '']
    ];
    grid.innerHTML = fallback.map(([name], index) => `
      <a class="cat-card cat-card--fallback" href="mailto:${ADOPTION_EMAIL}?subject=${encodeURIComponent(`Хочу познакомиться: ${name}`)}">
        <span class="cat-card-content">
          <span class="cat-card-top"><h3>${name}</h3><span class="cat-card-arrow" aria-hidden="true">↗</span></span>
          <span class="cat-card-meta"><span>Анкета временно недоступна</span></span>
        </span>
      </a>`).join('');
  };

  async function loadFeed() {
    try {
      const response = await fetch(FEED_URL, { mode: 'cors', credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw new Error(`Feed HTTP ${response.status}`);
      const payload = await response.json();
      const posts = extractPosts(payload);
      if (!posts.length) throw new Error('В ответе потока не найдены карточки');

      cats = posts.map(normalizeCat).filter((cat) => cat.title && (cat.images.length || cat.body || cat.description));
      if (!cats.length) throw new Error('Карточки потока не удалось распознать');

      $$('[data-cat-count]').forEach((node) => { node.textContent = String(cats.length); });
      if (feedStatus) feedStatus.textContent = `${cats.length} подопечных · нажмите на карточку, чтобы открыть историю`;
      renderCards();
      setHero(cats.find((cat) => cat.images.length) || cats[0]);
    } catch (error) {
      console.warn('[cathelp] Не удалось загрузить Tilda Feed:', error);
      if (feedStatus) feedStatus.textContent = 'Анкеты временно не загрузились. Можно написать нам напрямую — мы познакомим вас с подопечными.';
      renderFallback();
      if (heroLabel) heroLabel.textContent = 'Пять кошек ждут свою семью';
    }
  }

  const updateGallery = () => {
    if (!activeCat) return;
    const images = activeCat.images.length ? activeCat.images : [];
    const image = images[activeImageIndex];
    const main = $('[data-modal-image]');
    if (main) main.style.backgroundImage = image ? `url("${image.replace(/"/g, '%22')}")` : '';
    const counter = $('[data-gallery-counter]');
    if (counter) counter.textContent = images.length ? `${String(activeImageIndex + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')}` : '';
    $$('.gallery-thumb', modal).forEach((thumb, index) => thumb.classList.toggle('is-active', index === activeImageIndex));
    const arrows = $$('[data-gallery-prev], [data-gallery-next]', modal);
    arrows.forEach((arrow) => { arrow.hidden = images.length < 2; });
  };

  const openModal = (index) => {
    activeCat = cats[index];
    if (!activeCat || !modal) return;
    activeImageIndex = 0;
    lastFocusedElement = document.activeElement;

    $('[data-modal-title]').textContent = activeCat.title;
    $('[data-modal-status]').textContent = activeCat.status || 'Ищет дом';
    $('[data-modal-meta]').innerHTML = activeCat.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('');
    $('[data-modal-text]').innerHTML = activeCat.body || (activeCat.description ? `<p>${escapeHtml(activeCat.description)}</p>` : '<p>Напишите нам — расскажем об этом подопечном подробнее.</p>');

    const cta = $('[data-modal-cta]');
    const subject = encodeURIComponent(`Хочу познакомиться с ${activeCat.title}`);
    cta.href = `mailto:${ADOPTION_EMAIL}?subject=${subject}`;

    const thumbs = $('[data-gallery-thumbs]');
    thumbs.innerHTML = activeCat.images.map((image, imageIndex) => `<button type="button" class="gallery-thumb${imageIndex === 0 ? ' is-active' : ''}" style="background-image:url(&quot;${escapeAttr(image)}&quot;)" aria-label="Фото ${imageIndex + 1}"></button>`).join('');
    $$('.gallery-thumb', thumbs).forEach((thumb, imageIndex) => thumb.addEventListener('click', () => {
      activeImageIndex = imageIndex;
      updateGallery();
    }));

    updateGallery();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    $('.modal-close', modal)?.focus();
  };

  const closeModal = () => {
    if (!modal?.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    activeCat = null;
    if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
  };

  const shiftGallery = (direction) => {
    if (!activeCat?.images?.length) return;
    activeImageIndex = (activeImageIndex + direction + activeCat.images.length) % activeCat.images.length;
    updateGallery();
  };

  $$('[data-close-modal]').forEach((node) => node.addEventListener('click', closeModal));
  $('[data-gallery-prev]')?.addEventListener('click', () => shiftGallery(-1));
  $('[data-gallery-next]')?.addEventListener('click', () => shiftGallery(1));

  document.addEventListener('keydown', (event) => {
    if (!modal?.classList.contains('is-open')) return;
    if (event.key === 'Escape') closeModal();
    if (event.key === 'ArrowLeft') shiftGallery(-1);
    if (event.key === 'ArrowRight') shiftGallery(1);
    if (event.key === 'Tab') {
      const focusable = $$('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])', modal).filter((el) => !el.hidden);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });

  // Pause marquee when it is not visible to save a little battery.
  if ('IntersectionObserver' in window) {
    const ticker = $('.ticker-track');
    if (ticker) {
      const tickerObserver = new IntersectionObserver(([entry]) => {
        ticker.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
      });
      tickerObserver.observe(ticker);
    }
  }

  loadFeed();
})();
