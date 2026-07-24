/* NARA BACK — render de las secciones creadas desde el /admin.
   Viven en content.data.sections y se insertan antes del bloque de booking.
   Todo el texto se escribe con textContent y las URLs se validan: aunque el
   autor sea el admin, así un contenido manipulado no puede inyectar scripts. */
(function () {
  'use strict';

  var CONTAINER_ID = 'nb-sections';
  var mounting = false;

  // Posiciones ofrecidas. Solo bloques de NIVEL SUPERIOR: las secciones
  // internas (Música, Campañas, Eventos, Instagram) viven dentro del acordeón
  // #colecciones y arrancan colapsadas, así que insertar ahí escondería el
  // contenido. Debe coincidir con SEC_ANCHORS del /admin.
  var ANCHORS = ['colecciones', 'contact', 'contact-form', '__end'];
  var DEFAULT_ANCHOR = 'contact';

  function anchorOf(sec) {
    var a = sec && sec.anchor;
    return ANCHORS.indexOf(a) >= 0 ? a : DEFAULT_ANCHOR;
  }

  // Lista blanca de destinos: externos http(s), rutas propias, anclas de la
  // misma página y contacto. Todo lo demás se descarta (javascript:, data:…).
  function safeUrl(u) {
    if (!u) return '';
    var s = String(u).trim();
    if (/^https?:\/\//i.test(s)) return s;
    if (/^#[\w-]+$/.test(s)) return s;                      // ancla interna
    if (/^\//.test(s) && !/^\/\//.test(s)) return s;         // ruta propia
    if (/^(mailto|tel):[^\s<>"']+$/i.test(s)) return s;      // email / teléfono
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

  function hostId(anchor) { return CONTAINER_ID + '-' + anchor.replace(/[^a-z0-9_-]/gi, ''); }

  function mountPoints() {
    // Devuelve el punto de inserción por posición, o null si no existe aún.
    var wall = document.getElementById('wall');
    if (!wall) return null;
    var pts = {};
    ANCHORS.forEach(function (a) {
      if (a === '__end') { pts[a] = { parent: wall, before: null }; return; }
      var t = document.getElementById(a);
      if (t && t.parentNode) pts[a] = { parent: t.parentNode, before: t };
    });
    return pts;
  }

  function render(sections) {
    var pts = mountPoints();
    if (!pts || !pts[DEFAULT_ANCHOR]) return false;   // esperamos al home

    ANCHORS.forEach(function (a) {
      var old = document.getElementById(hostId(a));
      if (old) old.remove();
    });

    var visible = (sections || []).filter(function (s) {
      return s && s.visible !== false && (s.title || s.body || s.image || (s.images || []).length);
    });
    if (!visible.length) return true;

    // Agrupa por posición conservando el orden del admin dentro de cada grupo.
    var groups = {};
    visible.forEach(function (s) {
      var a = anchorOf(s);
      if (!pts[a]) a = DEFAULT_ANCHOR;               // posición no disponible
      (groups[a] = groups[a] || []).push(s);
    });

    mounting = true;                                  // ignora mis propias mutaciones
    Object.keys(groups).forEach(function (a) {
      var host = el('div', 'nbs-wrap');
      host.id = hostId(a);
      groups[a].forEach(function (s) { host.appendChild(build(s)); });
      var p = pts[a];
      if (p.before) p.parent.insertBefore(host, p.before);
      else p.parent.appendChild(host);
    });
    setTimeout(function () { mounting = false; }, 60);
    return true;
  }

  function allMounted(sections) {
    var need = {};
    (sections || []).forEach(function (s) {
      if (s && s.visible !== false) need[anchorOf(s)] = true;
    });
    return Object.keys(need).every(function (a) { return !!document.getElementById(hostId(a)); });
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
              if (allMounted(sections)) return;
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
