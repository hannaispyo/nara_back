/* NARA BACK — modal "Agendar evento" + arreglo de botones Media Kit.
   - Convierte los CTA de agendar (hoy mailto) en un formulario real → bandeja.
   - "Media Kit ↓" del hero → scroll a la sección media kit.
   - "DESCARGAR Media Kit" → URL del CMS; si está vacía, se oculta. */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var modal, dialog, form, statusEl, lastFocus = null, open = false;
  var mediakitUrl = '';

  // ── Modal de agendar ────────────────────────────────────────────────
  function build() {
    modal = document.createElement('div');
    modal.className = 'nbk-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'nbk-title');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML =
      '<div class="nbk-dialog">' +
        '<div class="nbk-head">' +
          '<div><p class="nbk-kicker">[ booking ]</p><h2 class="nbk-title" id="nbk-title">Agendar evento</h2></div>' +
          '<button type="button" class="nbk-x" data-close>Cerrar ✕</button>' +
        '</div>' +
        '<form class="nbk-form" novalidate>' +
          '<div class="nbk-hp"><label>No llenar<input type="text" name="company" tabindex="-1" autocomplete="off"></label></div>' +
          '<div class="nbk-row">' +
            '<div class="nbk-field"><label>Nombre *</label><input name="name" required autocomplete="name"></div>' +
            '<div class="nbk-field"><label>Email *</label><input name="email" type="email" required autocomplete="email"></div>' +
          '</div>' +
          '<div class="nbk-row">' +
            '<div class="nbk-field"><label>Tipo de evento</label><select name="eventType">' +
              '<option>Club / Fiesta</option><option>Festival</option><option>Evento privado</option>' +
              '<option>Marca / Campaña</option><option>Otro</option></select></div>' +
            '<div class="nbk-field"><label>Fecha</label><input name="date" type="date"></div>' +
          '</div>' +
          '<div class="nbk-field"><label>Ciudad / Lugar</label><input name="city" autocomplete="off"></div>' +
          '<div class="nbk-field"><label>Detalles</label><textarea name="message" placeholder="Contame del evento, horario, presupuesto…"></textarea></div>' +
          '<button type="submit" class="nbk-submit">Enviar solicitud ✦</button>' +
          '<p class="nbk-status" role="status" aria-live="polite"></p>' +
        '</form>' +
      '</div>';
    document.body.appendChild(modal);
    dialog = modal.querySelector('.nbk-dialog');
    form = modal.querySelector('form');
    statusEl = modal.querySelector('.nbk-status');

    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.closest('[data-close]')) { e.preventDefault(); close(); }
    });
    form.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', onKey);
  }

  function openModal(prefillType) {
    lastFocus = document.activeElement;
    open = true;
    if (prefillType) {
      var sel = form.querySelector('select[name=eventType]');
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === prefillType) { sel.selectedIndex = i; break; }
      }
    }
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { try { form.querySelector('input[name=name]').focus(); } catch (e) {} });
  }

  function close() {
    open = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKey(e) {
    if (!open) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    var f = modal.querySelectorAll('input, select, textarea, button');
    f = Array.prototype.filter.call(f, function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function onSubmit(e) {
    e.preventDefault();
    var btn = form.querySelector('.nbk-submit');
    var d = {};
    Array.prototype.forEach.call(form.elements, function (el) { if (el.name) d[el.name] = el.value; });

    var name = (d.name || '').trim(), email = (d.email || '').trim();
    if (!name || !email) { setStatus('Completá nombre y email.', true); return; }

    var message =
      'Tipo: ' + (d.eventType || '—') + '\n' +
      'Fecha: ' + (d.date || '—') + '\n' +
      'Lugar: ' + (d.city || '—') + '\n\n' +
      ((d.message || '').trim() || '(sin detalles)');

    setStatus('Enviando…'); btn.disabled = true;
    fetch('/api/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name, email: email, company: d.company || '',
        subject: 'Agendar evento — ' + (d.eventType || ''),
        message: message
      })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.ok) {
          setStatus('¡Listo! Recibí tu solicitud, te respondo pronto.');
          form.reset();
          setTimeout(close, 1600);
        } else { setStatus((res.j && res.j.error) || 'No se pudo enviar.', true); }
      })
      .catch(function () { setStatus('Error de red. Intentá de nuevo.', true); })
      .finally(function () { btn.disabled = false; });
  }

  function setStatus(t, err) { statusEl.textContent = t; statusEl.className = 'nbk-status' + (err ? ' err' : ''); }

  // ── Cableado de CTAs y botones Media Kit (idempotente) ──────────────
  var AGENDAR = /agendar|agenda tu evento/i;

  function wire() {
    var links = document.querySelectorAll('#wall a');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var txt = (a.textContent || '').trim();

      // CTAs de agendar (eran mailto) → abren el modal
      if (AGENDAR.test(txt) && !a.dataset.nbkWired) {
        a.dataset.nbkWired = '1';
        a.addEventListener('click', function (e) { e.preventDefault(); openModal(); });
      }

      // "DESCARGAR Media Kit" → URL del CMS o se oculta
      if (/descargar/i.test(txt) && /media kit/i.test(txt)) {
        applyMediakit(a);
      } else if (txt === 'Media Kit ↓' && !a.dataset.nbkMk) {
        // Hero: la flecha ↓ indica bajar → scroll a la sección media kit
        a.dataset.nbkMk = 'scroll';
        a.setAttribute('href', '#mediakit');
        a.addEventListener('click', function (e) { e.preventDefault(); goTo('mediakit'); });
      }
    }
  }

  function applyMediakit(a) {
    if (mediakitUrl) {
      a.dataset.nbkMk = 'dl';
      a.style.display = '';
      a.setAttribute('href', mediakitUrl);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    } else {
      // Sin URL cargada: ocultar el botón en vez de dejar un link muerto.
      a.dataset.nbkMk = 'hidden';
      a.style.display = 'none';
    }
  }

  function refreshMediakit() {
    document.querySelectorAll('#wall a').forEach(function (a) {
      var txt = (a.textContent || '').trim();
      if (/descargar/i.test(txt) && /media kit/i.test(txt)) applyMediakit(a);
    });
  }

  // Scroll con garantía de aterrizaje (mismo criterio que el menú).
  function goTo(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var y0 = window.pageYOffset || document.documentElement.scrollTop || 0;
    var dest = Math.max(0, Math.round(el.getBoundingClientRect().top + y0 - 62));
    window.scrollTo({ top: dest, behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(function () {
      if (Math.abs((window.pageYOffset || 0) - dest) > 4) window.scrollTo({ top: dest, behavior: 'auto' });
    }, 560);
  }

  // ── Init ────────────────────────────────────────────────────────────
  function init() {
    build();
    fetch('/api/content').then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.data && j.data['url.mediakit']) mediakitUrl = j.data['url.mediakit'];
      refreshMediakit();
    }).catch(function () {}).finally(function () {
      wire();
    });

    var wall = document.getElementById('wall');
    if (wall && typeof MutationObserver !== 'undefined') {
      var t = null;
      new MutationObserver(function () { clearTimeout(t); t = setTimeout(wire, 250); })
        .observe(wall, { childList: true, subtree: true });
    }
  }

  function waitForWall(n) {
    if (document.getElementById('wall') || n > 100) { init(); return; }
    setTimeout(function () { waitForWall(n + 1); }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { waitForWall(0); });
  } else { waitForWall(0); }
})();
