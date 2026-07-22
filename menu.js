/* NARA BACK — barra sticky + menú a pantalla completa.
   Se monta en <body> (fuera de #wall) para no pelear con el runtime de
   componentes del home, que re-renderiza su árbol. Los parches sobre el hero
   son idempotentes y se reaplican si el runtime vuelve a pintar. */
(function () {
  'use strict';

  var SECTIONS = [
    { n: '01', label: 'Música',    target: '#proyectos' },
    { n: '02', label: 'Campañas',  target: '#campanas' },
    { n: '03', label: 'Eventos',   target: '#eventos' },
    { n: '04', label: 'Media Kit', target: '#mediakit' },
    { n: '05', label: 'Booking',   target: '#contact' },
    { n: '06', label: 'Escríbeme', target: '#contact-form' }
  ];

  // Cada link del hero apuntaba a un destino repetido (4 links → 2 anclas).
  var HERO_HREFS = {
    'My DJ Sets': '#proyectos',
    'Eventos':    '#eventos',
    'Booking':    '#contact',
    'Media Kit':  '#mediakit'
  };

  var EMAIL = 'naraback.p@gmail.com';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var bar, panel, burger, closeBtn, lastFocus = null, open = false;

  // ── Parches sobre el home (idempotentes) ────────────────────────────
  function patchHero() {
    var links = document.querySelectorAll('#wall a');
    var navParent = null;
    for (var i = 0; i < links.length; i++) {
      var t = (links[i].textContent || '').trim();
      if (HERO_HREFS[t]) {
        if (links[i].getAttribute('href') !== HERO_HREFS[t]) {
          links[i].setAttribute('href', HERO_HREFS[t]);
        }
        if (t === 'My DJ Sets') navParent = links[i].parentElement;
      }
    }
    if (navParent && !navParent.classList.contains('nb-heronav')) {
      navParent.classList.add('nb-heronav');
    }
    // El bloque de media kit no tenía id al que anclar.
    if (!document.getElementById('mediakit')) {
      var hs = document.querySelectorAll('#wall h2');
      for (var j = 0; j < hs.length; j++) {
        if (/TRABAJA/i.test(hs[j].textContent || '')) { hs[j].id = 'mediakit'; break; }
      }
    }
  }

  // ── Construcción de la UI ───────────────────────────────────────────
  function build() {
    bar = document.createElement('header');
    bar.className = 'nb-bar';
    bar.innerHTML =
      '<a class="nb-bar__mark" href="#top" aria-label="NARA BACK — ir al inicio">NARA <span>BACK</span></a>' +
      '<button class="nb-burger" type="button" aria-expanded="false" aria-controls="nb-panel">' +
        '<span>[ Menú ]</span>' +
        '<span class="nb-burger__lines" aria-hidden="true"><i></i><i></i><i></i></span>' +
      '</button>';

    panel = document.createElement('nav');
    panel.className = 'nb-panel';
    panel.id = 'nb-panel';
    panel.setAttribute('aria-label', 'Menú principal');
    panel.setAttribute('aria-hidden', 'true');

    var links = SECTIONS.map(function (s, i) {
      return '<a class="nb-link" href="' + s.target + '" style="animation-delay:' +
        (reduce ? 0 : 60 + i * 55) + 'ms">' +
        '<span class="nb-link__n">' + s.n + '</span>' +
        '<span class="nb-link__t">' + s.label + '</span></a>';
    }).join('');

    var marquee = 'SAY IT LOUD ★ NARA BACK ★ CRUDO Y REAL ★ ';
    panel.innerHTML =
      '<div class="nb-panel__top">' +
        '<span class="nb-panel__kicker">[ navegación ]</span>' +
        '<button class="nb-close" type="button">Cerrar ✕</button>' +
      '</div>' +
      '<div class="nb-panel__nav">' + links + '</div>' +
      '<div class="nb-panel__foot">' +
        '<a href="mailto:' + EMAIL + '">' + EMAIL + '</a>' +
        '<a href="https://instagram.com/narabacks" target="_blank" rel="noopener">IG · @narabacks</a>' +
        '<a href="https://soundcloud.com/naraback" target="_blank" rel="noopener">SoundCloud →</a>' +
      '</div>' +
      '<div class="nb-marquee" aria-hidden="true"><span>' + marquee + marquee + '</span></div>';

    document.body.appendChild(bar);
    document.body.appendChild(panel);

    burger = bar.querySelector('.nb-burger');
    closeBtn = panel.querySelector('.nb-close');

    burger.addEventListener('click', toggle);
    closeBtn.addEventListener('click', close);
    panel.addEventListener('click', onPanelClick);
    document.addEventListener('keydown', onKey);
  }

  // ── Apertura / cierre ───────────────────────────────────────────────
  function toggle() { open ? close() : openPanel(); }

  function openPanel() {
    lastFocus = document.activeElement;
    open = true;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    // El panel pasa a visible en el siguiente frame; enfocar antes no toma.
    requestAnimationFrame(function () { try { closeBtn.focus(); } catch (e) {} });
  }

  function close() {
    open = false;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onPanelClick(e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    var id = a.getAttribute('href').slice(1);
    close();
    setTimeout(function () { goTo(id); }, reduce ? 0 : 260);
  }

  // El home hereda scroll-behavior:smooth y el scroll suave nativo se
  // interrumpe; un scroll instantáneo (behavior:'auto') aterriza siempre.
  // Hacemos el suave a mano con rAF, forzando 'auto' cada frame para que el
  // CSS no lo cancele.
  function goTo(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var barH = 62;
    var y0 = window.pageYOffset || document.documentElement.scrollTop || 0;
    var dest = Math.max(0, Math.round(el.getBoundingClientRect().top + y0 - barH));
    // Intento suave nativo…
    window.scrollTo({ top: dest, behavior: reduce ? 'auto' : 'smooth' });
    // …con garantía de aterrizaje: el home hereda scroll-behavior:smooth y su
    // parallax puede interrumpir el suave; si no llegó, forzar el destino.
    setTimeout(function () {
      if (Math.abs((window.pageYOffset || 0) - dest) > 4) {
        window.scrollTo({ top: dest, behavior: 'auto' });
      }
    }, 560);
  }

  // Esc cierra; Tab queda atrapado dentro del panel mientras está abierto.
  function onKey(e) {
    if (!open) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    var f = panel.querySelectorAll('a[href], button');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // ── Mostrar la barra al pasar el hero ───────────────────────────────
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      bar.classList.toggle('is-visible', y > 620);
      ticking = false;
    });
  }

  // ── Init ────────────────────────────────────────────────────────────
  function init() {
    build();
    patchHero();
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // El runtime del home re-renderiza: reaplicar los parches del hero.
    var wall = document.getElementById('wall');
    if (wall && typeof MutationObserver !== 'undefined') {
      var t = null;
      new MutationObserver(function () {
        clearTimeout(t);
        t = setTimeout(patchHero, 250);
      }).observe(wall, { childList: true, subtree: true });
    }
  }

  function waitForWall(tries) {
    if (document.getElementById('wall') || tries > 100) { init(); return; }
    setTimeout(function () { waitForWall(tries + 1); }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { waitForWall(0); });
  } else {
    waitForWall(0);
  }
})();
