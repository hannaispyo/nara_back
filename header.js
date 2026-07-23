/* NARA BACK — etiquetado del tope para el rediseño móvil.
   El home es un artefacto compilado: acá solo se agregan clases (y se reubica
   SoundCloud dentro de la tira de nav). Todo el diseño vive en header.css.
   Idempotente y se reaplica si el runtime vuelve a renderizar. */
(function () {
  'use strict';

  function tag() {
    var nav = document.querySelector('.nb-heronav');   // la crea menu.js
    if (!nav) return false;

    var bar = nav.parentElement;
    if (bar && !bar.classList.contains('nbh-bar')) bar.classList.add('nbh-bar');

    // Wordmark: el hermano que contiene NARA + BACK
    if (bar) {
      for (var i = 0; i < bar.children.length; i++) {
        var c = bar.children[i];
        if (c !== nav && /NARA\s*BACK/i.test((c.textContent || '').replace(/\s+/g, ' '))) {
          c.classList.add('nbh-mark');
          break;
        }
      }
    }

    // Botonera: el contenedor de SoundCloud + los dos CTA
    var links = document.querySelectorAll('#wall a');
    var sc = null, primary = null, ghost = null;
    for (var j = 0; j < links.length; j++) {
      var a = links[j], t = (a.textContent || '').trim();
      if (t === 'SoundCloud' && !sc) sc = a;
      else if (/^Agendar evento/.test(t) && !primary) primary = a;
      else if (t === 'Media Kit ↓' && !ghost) ghost = a;
    }

    if (primary) {
      primary.classList.add('nbh-cta', 'nbh-cta--primary');
      var actions = primary.parentElement;
      if (actions && !actions.classList.contains('nbh-actions')) actions.classList.add('nbh-actions');
    }
    if (ghost) ghost.classList.add('nbh-cta', 'nbh-cta--ghost');

    // SoundCloud pasa a ser un ítem más de la tira de nav: así deja de ser
    // una fila suelta y el bloque baja de 4 filas a 3.
    if (sc) {
      sc.classList.add('nbh-sc');
      if (sc.parentElement !== nav) nav.appendChild(sc);
    }
    return true;
  }

  function boot(tries) {
    if (tag() || tries > 120) {
      var wall = document.getElementById('wall');
      if (wall && typeof MutationObserver !== 'undefined') {
        var t = null;
        new MutationObserver(function () { clearTimeout(t); t = setTimeout(tag, 250); })
          .observe(wall, { childList: true, subtree: true });
      }
      return;
    }
    setTimeout(function () { boot(tries + 1); }, 100);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { boot(0); });
  } else { boot(0); }
})();
