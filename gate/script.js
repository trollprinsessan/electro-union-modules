/*
 * Electro Union — Gate Module Script
 *
 * Kräver: ../_shared/embed.js (för window.EU_IS_EMBED)
 *         ../_shared/supabase.js (för window.EU_SUPABASE)
 *
 * Källa: golden/electro-union-module.html rader:
 *   2892-2982 (approvalBase, animateCounter, autoScrollGates, euBtn.onclick)
 *   4008-4048 (gate scroll animation, standalone)
 *
 * Beteende:
 *   - Vid load: hämtar aktuellt approval count från Supabase
 *   - Vid klick på top bar: lägger till .is-open, incrementerar counter,
 *     animerar siffran, visar gate scene med logo/tagline/counter/preamble
 *   - Standalone-läge: scrollar genom gate scene, triggar Roman Gate-
 *     animationen (columns som glider isär, logo + tagline som skalar upp)
 *   - Embed-läge: instant reveal utan scroll-animation
 *   - Ingen toggle off — en gång öppen, alltid öppen
 */

(function () {
  var isEmbed = window.EU_IS_EMBED === true;
  var SB = window.EU_SUPABASE;

  var el = document.getElementById('eu');
  var btn = document.getElementById('euBtn');

  var approvalBase = 0;

  // Fetch live count on load
  if (SB) {
    SB.rpc('get_approval_count').then(function (count) {
      approvalBase = parseInt(count) || 0;
      // Update the static display if already open
      var barCount = document.getElementById('euBarCount');
      if (barCount && el.classList.contains('is-open')) {
        barCount.textContent = approvalBase.toLocaleString();
      }
    }).catch(function () { approvalBase = 0; });
  }

  function animateCounter(target) {
    var countEl = document.getElementById('euBarCount');
    var start = 0;
    var duration = 2000;
    var t0 = performance.now();
    function tick(now) {
      var p = Math.min(1, (now - t0) / duration);
      // ease-in then snap to end — fast acceleration, dramatic landing
      var eased = p < 0.7 ? Math.pow(p / 0.7, 0.4) * 0.92 : 0.92 + (p - 0.7) / 0.3 * 0.08;
      var val = Math.round(start + eased * target);
      countEl.textContent = val.toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
      else countEl.textContent = target.toLocaleString();
    }
    requestAnimationFrame(tick);
  }

  function autoScrollGates() {
    var scene = document.getElementById('euGateScene');
    if (!scene) return;
    var rect = scene.getBoundingClientRect();
    var sceneTop = window.scrollY + rect.top;
    var scrollEnd = sceneTop + rect.height - window.innerHeight;
    var startY = window.scrollY;
    var targetY = scrollEnd;
    var duration = 2500;
    var startDelay = 500;
    setTimeout(function () {
      var t0 = performance.now();
      function scrollStep(now) {
        var elapsed = now - t0;
        var p = Math.min(1, elapsed / duration);
        var eased = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        window.scrollTo(0, startY + (targetY - startY) * eased);
        if (p < 1) requestAnimationFrame(scrollStep);
        else {
          var hint = document.getElementById('euScrollHint');
          if (hint) hint.classList.remove('is-hidden');
        }
      }
      requestAnimationFrame(scrollStep);
    }, startDelay);
  }

  btn.onclick = function (e) {
    if (el.classList.contains('is-open')) return; // no toggle off
    el.classList.add('is-open');

    // Increment counter in Supabase
    if (SB) {
      SB.rpc('increment_and_get_count').then(function (count) {
        var total = parseInt(count) || approvalBase + 1;
        animateCounter(total);
        var num = document.getElementById('euCounterNum');
        if (num) num.textContent = total.toLocaleString();
      }).catch(function () {
        animateCounter(approvalBase + 1);
        var num = document.getElementById('euCounterNum');
        if (num) num.textContent = (approvalBase + 1).toLocaleString();
      });
    } else {
      animateCounter(1);
    }

    // auto-scroll through the gate reveal (standalone only)
    if (!isEmbed) autoScrollGates();

    // In embed mode: instant reveal (no stagger)
    if (isEmbed) {
      ['.eu-gate-scene__logo', '.eu-gate-scene__tagline', '.eu-gate-scene__counter', '.eu-gate-scene__preamble'].forEach(function (sel) {
        var node = document.querySelector(sel);
        if (node) {
          node.style.setProperty('opacity', '1', 'important');
          node.style.setProperty('transform', 'none', 'important');
        }
      });
    }
  };

  // ═══ GATE SCROLL ANIMATION (CSS sticky — no JS pinning) ═══
  var gateScene = document.getElementById('euGateScene');
  var gateLeft = document.getElementById('euGateLeft');
  var gateRight = document.getElementById('euGateRight');
  var gateLogo = gateScene ? gateScene.querySelector('.eu-gate-scene__logo') : null;
  var gateTagline = gateScene ? gateScene.querySelector('.eu-gate-scene__tagline') : null;

  if (gateScene && gateLeft && gateRight && gateLogo && gateTagline) {
    // approval crack — gates start slightly open (5% of max offset)
    var CRACK = 0.05;
    function updateGate() {
      var rect = gateScene.getBoundingClientRect();
      var vh = window.innerHeight;
      var scrollableDistance = rect.height - vh;
      var scrolled = -rect.top;
      var raw = Math.max(0, Math.min(1, scrolled / scrollableDistance));
      var progress = CRACK + raw * (1 - CRACK);
      // gates
      var maxOff = window.innerWidth * 0.6;
      gateLeft.style.transform = 'translateX(' + -(progress * maxOff) + 'px)';
      gateRight.style.transform = 'translateX(' + (progress * maxOff) + 'px)';
      // logo leads — starts slightly visible
      var logoP = Math.min(1, progress * 1.3);
      gateLogo.style.transform = 'scale(' + (0.25 + logoP * 0.85) + ')';
      // tagline lags + fades
      var tagP = Math.max(0, (progress - 0.15) / 0.85);
      gateTagline.style.transform = 'scale(' + (0.3 + tagP * 0.7) + ')';
      gateTagline.style.opacity = Math.min(1, tagP * 1.5);
      // hide scroll hint after 30% progress
      if (raw > 0.3) {
        var hint = document.getElementById('euScrollHint');
        if (hint) hint.classList.add('is-hidden');
      }
    }
    // Scroll-driven gate animation only in standalone mode
    if (!isEmbed) {
      window.addEventListener('scroll', function () { requestAnimationFrame(updateGate); }, { passive: true });
      updateGate();
    }
  }
})();
