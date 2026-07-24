/* NARA BACK — render de las secciones creadas desde el /admin.
   Viven en content.data.sections y se insertan antes del bloque de booking.
   Todo el texto se escribe con textContent y las URLs se validan: aunque el
   autor sea el admin, así un contenido manipulado no puede inyectar scripts. */
(function () {
  'use strict';

  var CONTAINER_ID = 'nb-sections';
  var mounting = false;

  function safeUrl(u) {
    if (!u) return '';
    var s = String(u).trim();
    // Solo http(s) o rutas relativas del propio sitio.
    if (/^https?:\/\//i.test(s)) return s;
    if (/^\//.test(s) && !/^\/\//.test(s)) return s;
    return '';
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null && text !== '') n.textContent = text;
    return n;
  }

  function addImage(parent, url, alt) {
    var src = safeUrl(url);
    if (!src) return;
    var img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    parent.appendChild(img);
  }

  function head(sec, into) {
    if (sec.kicker) into.appendChild(el('span', 'nbs__kicker', sec.kicker));
    if (sec.title)  into.appendChild(el('h2', 'nbs__title', sec.title));
    if (sec.body)   into.appendChild(el('p', 'nbs__body', sec.body));
  }

  function build(sec) {
    var type = sec.type || 'texto';
    var wrap = el('section', 'nbs nbs--' + type);
    if (sec.id) wrap.id = 'sec-' + String(sec.id).replace(/[^a-z0-9_-]/gi, '');
    var inner = el('div', 'nbs__inner');

    if (type === 'imagen') {
      if (sec.flip) wrap.classList.add('is-flipped');
      var grid = el('div', 'nbs__grid');
      var media = el('div', 'nbs__media');
      addImage(media, sec.image, sec.title || '');
      var txt = el('div', 'nbs__text');
      head(sec, txt);
      grid.appendChild(media);
      grid.appendChild(txt);
      inner.appendChild(grid);

    } else if (type === 'galeria') {
      head(sec, inner);
      var gal = el('div', 'nbs__gallery');
      (sec.images || []).forEach(function (u) {
        if (!safeUrl(u)) return;
        var tile = el('div', 'nbs__tile');
        addImage(tile, u, sec.title || '');
        gal.appendChild(tile);
      });
      if (gal.children.length) inner.appendChild(gal);

    } else if (type === 'cta') {
      head(sec, inner);
      var href = safeUrl(sec.ctaUrl);
      if (sec.ctaLabel && href) {
        var a = el('a', 'nbs__btn', sec.ctaLabel);
        a.href = href;
        if (/^https?:/i.test(href)) { a.target = '_blank'; a.rel = 'noopener'; }
        inner.appendChild(a);
      }

    } else { // texto
      head(sec, inner);
    }

    wrap.appendChild(inner);
    return wrap;
  }

  function render(sections) {
    var wall = document.getElementById('wall');
    var anchor = document.getElementById('contact');
    if (!wall || !anchor) return false;

    var old = document.getElementById(CONTAINER_ID);
    if (old) old.remove();

    var list = (sections || []).filter(function (s) {
      return s && s.visible !== false && (s.title || s.body || s.image || (s.images || []).length);
    });
    if (!list.length) return true;

    var host = el('div', 'nbs-wrap');
    host.id = CONTAINER_ID;
    list.forEach(function (s) { host.appendChild(build(s)); });

    mounting = true;                       // evita reaccionar a mi propia inserción
    anchor.parentNode.insertBefore(host, anchor);
    setTimeout(function () { mounting = false; }, 60);
    return true;
  }

  function load() {
    return fetch('/api/content')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return (j && j.data && j.data.sections) || []; })
      .catch(function () { return []; });
  }

  function boot() {
    load().then(function (sections) {
      var tries = 0;
      (function poll() {
        if (render(sections)) {
          // El runtime del home re-renderiza su árbol: si se lleva puestas
          // las secciones, se vuelven a montar.
          var wall = document.getElementById('wall');
          if (wall && typeof MutationObserver !== 'undefined') {
            var t = null;
            new MutationObserver(function () {
              if (mounting) return;
              if (document.getElementById(CONTAINER_ID)) return;
              clearTimeout(t);
              t = setTimeout(function () { render(sections); }, 250);
            }).observe(wall, { childList: true, subtree: true });
          }
          return;
        }
        if (tries++ < 120) setTimeout(poll, 100);
      })();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
