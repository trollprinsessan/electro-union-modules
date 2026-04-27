/*
 * Electro Union — animated cursor follower.
 *
 * CSS `cursor: url(*.gif)` only renders the first frame of a gif (and is
 * silently dropped by some browsers when the file is too large). To make the
 * EU cursor actually animate, we render it as a fixed-position <img> that
 * tracks the mouse, and hide the OS cursor on opted-in elements via
 * `cursor: var(--eu-cursor)` → `cursor: none` (see _shared/tokens.css).
 *
 * The follower is only visible while the cursor is over an element whose
 * computed `cursor` is `none` (i.e. one that opted in). Anywhere else —
 * white space, body background, etc. — the user sees their normal OS cursor.
 *
 * Loaded by every module that opts into the EU cursor:
 *   <script src="../_shared/cursor.js" defer></script>
 */
(function () {
  if (window.__euCursorInit) return;
  window.__euCursorInit = true;

  // Resolve the gif path from this script's own src so it works no matter
  // which module loads it (../_shared/cursor.js, /_shared/cursor.js, etc.).
  var thisScript = document.currentScript ||
    Array.prototype.slice.call(document.scripts).filter(function (s) {
      return /\/_shared\/cursor\.js$/.test(s.src);
    })[0];
  var gifSrc = thisScript ? thisScript.src.replace(/cursor\.js.*$/, 'cursor.gif') : '../_shared/cursor.gif';

  function init() {
    var img = document.createElement('img');
    img.src = gifSrc;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.style.cssText = [
      'position:fixed',
      'left:0',
      'top:0',
      'width:32px',
      'height:32px',
      'pointer-events:none',
      'z-index:2147483647',
      'display:none',
      'will-change:transform',
      'transform:translate(-9999px,-9999px)'
    ].join(';');
    document.body.appendChild(img);

    var visible = false;
    function setVisible(v) {
      if (v === visible) return;
      visible = v;
      img.style.display = v ? 'block' : 'none';
    }

    // Cursor types that mean "this is interactive" — show the EU follower.
    // 'none' = explicit opt-in via var(--eu-cursor). 'pointer'/'grab'/'grabbing'
    // = anything else clickable/draggable in any module.
    var INTERACTIVE = { none: 1, pointer: 1, grab: 1, grabbing: 1 };

    // The follower must only appear inside an .eu container — not on the
    // host page's chrome, scrollbars, or other widgets.
    function isInsideEu(el) {
      while (el && el !== document) {
        if (el.classList && el.classList.contains('eu')) return true;
        el = el.parentNode;
      }
      return false;
    }

    document.addEventListener('mousemove', function (e) {
      // Position centered on the pointer
      img.style.transform = 'translate(' + (e.clientX - 16) + 'px,' + (e.clientY - 16) + 'px)';

      var t = e.target;
      if (!t || !(t instanceof Element) || !isInsideEu(t)) { setVisible(false); return; }
      var cs = getComputedStyle(t);
      setVisible(!!INTERACTIVE[cs.cursor]);
    }, { passive: true });

    document.addEventListener('mouseleave', function () { setVisible(false); }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
