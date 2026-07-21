/* NARA BACK — capa de hidratación del CMS.
   Superpone contenido editable sobre el home sin tocar su markup:
   - textos: reemplaza el texto de nodos hoja localizados por (scope, texto original, ocurrencia)
   - imágenes: setea el atributo `src` de cada <image-slot> por id
   - Instagram: superpone feed/stats en vivo cuando la cuenta está configurada
   El home funciona igual si esto falla (degradación elegante). */
(function () {
  'use strict';

  var SPEC = null;
  var VALUES = {};       // { key: value }
  var applied = false;

  function fetchJson(url, opts) {
    return fetch(url, opts).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  // ── localizar nodos de texto ────────────────────────────
  // Recorre TODOS los nodos de texto (hojas y text-nodes mezclados con <span>).
  function textNodes(scopeEl) {
    var out = [];
    if (!scopeEl || typeof document.createTreeWalker !== 'function') return out;
    var w = document.createTreeWalker(scopeEl, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = w.nextNode())) {
      if ((n.nodeValue || '').trim()) out.push(n);
    }
    return out;
  }

  // Reemplaza el texto conservando los espacios/saltos que rodean al nodo.
  function setNodeText(node, value) {
    var raw = node.nodeValue || '';
    var lead = (raw.match(/^\s*/) || [''])[0];
    var trail = (raw.match(/\s*$/) || [''])[0];
    var next = lead + value + trail;
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  function applyText(field) {
    var value = VALUES[field.key];
    if (value == null || value === '') return;         // sin override → deja el texto original
    var scope = document.querySelector(field.scope || 'body');
    if (!scope) return;
    var occ = field.occurrence || 0;
    var seen = 0;
    var nodes = textNodes(scope);
    for (var i = 0; i < nodes.length; i++) {
      if ((nodes[i].nodeValue || '').trim() === field.find) {
        if (seen === occ) { setNodeText(nodes[i], value); return true; }
        seen++;
      }
    }
    return false;
  }

  function applyImage(field) {
    var value = VALUES[field.key];
    if (!value) return;
    var el = document.getElementById(field.img);
    if (el && el.getAttribute('src') !== value) el.setAttribute('src', value);
  }

  function eachField(cb) {
    if (!SPEC || !SPEC.groups) return;
    SPEC.groups.forEach(function (g) { (g.fields || []).forEach(cb); });
  }

  function applyAll() {
    eachField(function (f) {
      if (f.type === 'image') applyImage(f);
      else if (f.type === 'text') applyText(f);
    });
    applied = true;
  }

  // ── Instagram en vivo (cuentas configuradas) ────────────
  // Mapea handle → { statPrefix, feedImgIds } para superponer sobre el CMS.
  var IG_TARGETS = {
    narabacks: { statsScope: '#agenda', feed: ['agenda-1', 'agenda-2', 'agenda-3', 'agenda-4', 'agenda-5', 'agenda-6'], avatar: 'agenda-avatar' },
    yellowfevermusic: { feed: ['ig-yf-1', 'ig-yf-2', 'ig-yf-3'], avatar: 'ig-av-yf' },
    eslulujam: { feed: ['ig-lj-1', 'ig-lj-2', 'ig-lj-3'], avatar: 'ig-av-lj' },
    wantedupcycling: { feed: ['ig-wt-1', 'ig-wt-2', 'ig-wt-3'], avatar: 'ig-av-wt' },
    'upcycled.work': { feed: ['ig-up-1', 'ig-up-2', 'ig-up-3'], avatar: 'ig-av-up' }
  };

  function fmtCount(n) {
    if (n == null) return null;
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '') + 'K';
    return String(n);
  }

  function overlayInstagram() {
    Object.keys(IG_TARGETS).forEach(function (handle) {
      var t = IG_TARGETS[handle];
      fetchJson('/api/instagram?handle=' + encodeURIComponent(handle) + '&limit=' + t.feed.length)
        .then(function (data) {
          if (!data || !data.configured) return;      // sin token → queda el contenido curado
          (data.media || []).forEach(function (m, i) {
            var el = t.feed[i] && document.getElementById(t.feed[i]);
            if (el && m.image) el.setAttribute('src', m.image);
          });
          if (data.profile && t.statsScope) {
            var scope = document.querySelector(t.statsScope);
            if (scope) {
              var posts = fmtCount(data.profile.posts);
              var foll = fmtCount(data.profile.followers);
              // reutiliza applyText por ocurrencia sobre los valores actuales
              setStat(scope, VALUES['ig.nb.posts'], posts);
              setStat(scope, VALUES['ig.nb.followers'], foll);
            }
          }
        });
    });
  }

  function setStat(scope, currentText, newText) {
    if (!newText || !currentText) return;
    var nodes = textNodes(scope);
    for (var i = 0; i < nodes.length; i++) {
      if ((nodes[i].nodeValue || '').trim() === String(currentText)) { setNodeText(nodes[i], newText); return; }
    }
  }

  // ── arranque: esperar a que el runtime renderice, luego aplicar ──
  function ready() {
    return document.querySelector('#wall') && document.querySelector('#agenda');
  }

  function boot() {
    var tries = 0;
    (function poll() {
      if (ready()) {
        applyAll();
        overlayInstagram();
        observe();
      } else if (tries++ < 120) {
        setTimeout(poll, 100);            // hasta ~12s
      }
    })();
  }

  var reapplyTimer = null;
  function observe() {
    var wall = document.getElementById('wall');
    if (!wall || typeof MutationObserver === 'undefined') return;
    var mo = new MutationObserver(function () {
      clearTimeout(reapplyTimer);
      reapplyTimer = setTimeout(applyAll, 150);   // el runtime re-renderiza (componentDidUpdate)
    });
    mo.observe(wall, { childList: true, subtree: true, characterData: true });
  }

  Promise.all([
    fetchJson('/content.spec.json'),
    fetchJson('/api/content')
  ]).then(function (res) {
    SPEC = res[0];
    var content = res[1];
    if (content && content.data && typeof content.data === 'object') VALUES = content.data;
    if (!SPEC) return;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  });
})();
