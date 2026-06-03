/*
 * Electro Union — Toolkit Module Script
 *
 * Kräver: ../_shared/embed.js (för window.EU_IS_EMBED)
 *
 * Källa: golden/electro-union-module.html rader:
 *   2983-2987 (sharables foldout toggle)
 *   3140-3182 (EU flag color rotation — cyklar togglerns bakgrund)
 *   3184-3197 (tab navigation)
 *   4127-4170 (sticky toolkit link — standalone only)
 *
 * Knappar per kort:
 *   1. share      — Web Share API, LinkedIn-format (4:5), data-src-share
 *   2. Instagram  — Web Share API, Instagram-format (9:16), data-src
 *   3. copy 4:5   — Clipboard API, LinkedIn-format, data-src-copy
 *   4. copy 9:16  — Clipboard API, Instagram-format, data-src-copy
 *   5. linkedin   — Öppna LinkedIn composer + kopiera bild, data-src-li
 */

(function () {
  var isEmbed = window.EU_IS_EMBED === true;

  // ── Sharables foldout toggle ─────────────────────────────────────────────
  var toggleBtn = document.getElementById('euSharablesBtn');
  var sharables = document.getElementById('euSharables');
  if (toggleBtn && sharables) {
    toggleBtn.addEventListener('click', function () {
      sharables.classList.toggle('is-open');
    });
  }

  // ── EU flag color rotation (toggle button background) ───────────────────
  (function () {
    var flags = [
      { name: 'Italy',       colors: ['#009246', '#fff',    '#CE2B37'] },
      { name: 'France',      colors: ['#002395', '#fff',    '#ED2939'] },
      { name: 'Germany',     colors: ['#000',    '#DD0000', '#FFCC00'] },
      { name: 'Ireland',     colors: ['#169B62', '#fff',    '#FF883E'] },
      { name: 'Belgium',     colors: ['#000',    '#FAE042', '#ED2939'] },
      { name: 'Netherlands', colors: ['#AE1C28', '#fff',    '#21468B'] },
      { name: 'Austria',     colors: ['#ED2939', '#fff',    '#ED2939'] },
      { name: 'Romania',     colors: ['#002B7F', '#FCD116', '#CE1126'] },
      { name: 'Hungary',     colors: ['#CE2939', '#fff',    '#477050'] },
      { name: 'Bulgaria',    colors: ['#fff',    '#00966E', '#D62612'] },
      { name: 'Sweden',      colors: ['#006AA7', '#FECC00', '#006AA7'] },
      { name: 'Finland',     colors: ['#fff',    '#003580', '#fff']    },
      { name: 'Denmark',     colors: ['#C60C30', '#fff',    '#C60C30'] },
      { name: 'Greece',      colors: ['#0D5EAF', '#fff',    '#0D5EAF'] },
      { name: 'Poland',      colors: ['#fff',    '#fff',    '#DC143C'] },
      { name: 'Portugal',    colors: ['#006600', '#FF0000', '#FF0000'] },
      { name: 'Spain',       colors: ['#AA151B', '#F1BF00', '#AA151B'] },
      { name: 'Czechia',     colors: ['#fff',    '#11457E', '#D7141A'] },
      { name: 'Croatia',     colors: ['#FF0000', '#fff',    '#171796'] },
      { name: 'Luxembourg',  colors: ['#ED2939', '#fff',    '#00A1DE'] },
      { name: 'Slovakia',    colors: ['#fff',    '#0B4EA2', '#EE1C25'] },
      { name: 'Slovenia',    colors: ['#fff',    '#003DA5', '#ED1C24'] },
      { name: 'Lithuania',   colors: ['#FDB913', '#006A44', '#C1272D'] },
      { name: 'Latvia',      colors: ['#9E3039', '#fff',    '#9E3039'] },
      { name: 'Estonia',     colors: ['#0072CE', '#000',    '#fff']    },
      { name: 'Cyprus',      colors: ['#fff',    '#D47600', '#fff']    },
      { name: 'Malta',       colors: ['#fff',    '#fff',    '#CF3A3A'] }
    ];
    var btn = document.getElementById('euSharablesBtn');
    if (!btn) return;
    var fi = 0;
    function applyFlag() {
      var f = flags[fi];
      btn.style.background = 'linear-gradient(180deg,' + f.colors[0] + ' 0%,' + f.colors[0] + ' 33%,' + f.colors[1] + ' 33%,' + f.colors[1] + ' 66%,' + f.colors[2] + ' 66%,' + f.colors[2] + ' 100%)';
      var mid = f.colors[1];
      btn.style.color = (mid === '#fff' || mid === '#FECC00' || mid === '#FCD116' || mid === '#FAE042' || mid === '#F1BF00' || mid === '#FDB913' || mid === '#D47600') ? '#000' : '#fff';
      fi = (fi + 1) % flags.length;
    }
    applyFlag();
    setInterval(applyFlag, 4000);
  })();

  // ── Tab navigation ────────────────────────────────────────────────────────
  var navItems = document.querySelectorAll('.eu-pap__nav-item');
  var papSections = document.querySelectorAll('.eu-pap__section');
  navItems.forEach(function (tab) {
    tab.addEventListener('click', function (e) {
      e.stopPropagation();
      navItems.forEach(function (t) { t.classList.remove('is-active'); });
      tab.classList.add('is-active');
      var cat = tab.getAttribute('data-cat');
      papSections.forEach(function (s) {
        s.style.display = s.getAttribute('data-section') === cat ? 'block' : 'none';
      });
    });
  });

  // ── Sticky toolkit link (standalone only) ────────────────────────────────
  if (!isEmbed) {
    var stickyEl = document.getElementById('euToolkitSticky');
    if (stickyEl && sharables) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            var rect = sharables.getBoundingClientRect();
            if (rect.bottom < 0) {
              stickyEl.classList.add('is-visible');
            } else {
              stickyEl.classList.remove('is-visible');
            }
          } else {
            stickyEl.classList.remove('is-visible');
          }
        });
      }, { threshold: 0 });
      obs.observe(sharables);

      stickyEl.addEventListener('click', function (e) {
        e.stopPropagation();
        sharables.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  // ── SVG icons ─────────────────────────────────────────────────────────────
  var CHECKMARK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  // ── Helpers ───────────────────────────────────────────────────────────────

  // Bevarar innerHTML (inklusive SVG) när den flashar och återställer
  function flashBtn(btn, text, ms) {
    if (!btn || btn.tagName !== 'BUTTON') return;
    var orig = btn.innerHTML;
    btn.textContent = text;
    setTimeout(function () { btn.innerHTML = orig; }, ms || 2400);
  }

  // Källfilerna är JPEG trots .png-ändelse — Clipboard API kräver image/png.
  // Konvertera via canvas för att alltid få riktig PNG (full upplösning).
  function ensurePngBlob(blob) {
    if (blob.type === 'image/png') return Promise.resolve(blob);
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var burl = URL.createObjectURL(blob);
      img.onload = function () {
        URL.revokeObjectURL(burl);
        var c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        c.toBlob(function (png) { png ? resolve(png) : reject(); }, 'image/png');
      };
      img.onerror = function () { URL.revokeObjectURL(burl); reject(); };
      img.src = burl;
    });
  }

  function downloadBlob(blob, name) {
    var u = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = u; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(u);
  }

  // Returnerar unikt filnamn från URL (undviker att webbläsaren cachar fel
  // thumbnail vid Web Share när alla filer hette 'electro-union.jpg')
  function filenameFromUrl(absUrl, blobType) {
    var name = decodeURIComponent(absUrl.split('/').pop()) || 'electro-union';
    // Byt ut ändelse mot faktisk MIME-typ (filer kan vara JPEG trots .png-namn)
    var ext = blobType.includes('gif') ? 'gif' : blobType.includes('png') ? 'png' : 'jpg';
    return name.replace(/\.[^/.]+$/, '') + '.' + ext;
  }

  // Desktop: räknar om till mobil/tablet. macOS Arc stöder canShare men
  // har inget LinkedIn i share-sheeten — desktop ska alltid gå via clipboard.
  function isMobileDevice() {
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) return true;
    try { return navigator.maxTouchPoints > 0 && matchMedia('(pointer: coarse)').matches; }
    catch (e) { return false; }
  }

  // Kopiera PNG till clipboard från URL. Returnerar Promise.
  function copyBlobToClipboard(absUrl) {
    return fetch(absUrl)
      .then(function (r) { return r.blob(); })
      .then(ensurePngBlob)
      .then(function (pngBlob) {
        return navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
      });
  }

  // Gemensam feedback-flash med SVG-bevarande innerHTML
  function flashCopyFeedback(btn, successHtml, failHtml) {
    var orig = btn.innerHTML;
    btn.innerHTML = '…';
    return function (ok) {
      btn.innerHTML = ok ? successHtml : failHtml;
      setTimeout(function () { btn.innerHTML = orig; }, 2400);
    };
  }

  // Gemensam "share med file"-funktion.
  // Viktigt: INGEN URL-fallback — då delas bara länktexten istället för bilden.
  // Om file-share inte stöds → kopiera bilden till clipboard.
  function shareFileOrCopy(btn, src) {
    if (!src) return;
    var absUrl = new URL(src, window.location.href).href;
    var origText = btn.textContent;

    fetch(absUrl)
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        var fname = filenameFromUrl(absUrl, blob.type);
        var file = new File([blob], fname, { type: blob.type });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          return navigator.share({ files: [file], title: 'Electro Union' }).catch(function (err) {
            // User cancel → tyst. Annat → clipboard fallback.
            if (err && err.name === 'AbortError') return;
            return copyBlobToClipboard(absUrl).then(function () {
              btn.textContent = 'copied ✓';
              setTimeout(function () { btn.textContent = origText; }, 2400);
            });
          });
        }
        // Ingen file-share → clipboard direkt (INGEN URL-share, INGEN download)
        return copyBlobToClipboard(absUrl).then(function () {
          btn.textContent = 'copied ✓';
          setTimeout(function () { btn.textContent = origText; }, 2400);
        }).catch(function () {
          btn.textContent = 'needs https or mobile';
          setTimeout(function () { btn.textContent = origText; }, 2800);
        });
      })
      .catch(function () {});
  }

  // ── 1. Share button — LinkedIn-format (4:5) ──────────────────────────────
  function shareAsset(btn) {
    var src = btn.getAttribute('data-src-share') || btn.getAttribute('data-src');
    shareFileOrCopy(btn, src);
  }

  // ── 2. Instagram button — Instagram-format (9:16) ────────────────────────
  function shareToInstagram(btn) {
    var src = btn.getAttribute('data-src');
    shareFileOrCopy(btn, src);
  }

  // ── 3+4. Copy buttons — Clipboard, checkmark vid succé, ALDRIG download ──
  function copyImageOnly(btn) {
    var src = btn.getAttribute('data-src-copy') || btn.getAttribute('data-src-li') || btn.getAttribute('data-src');
    if (!src) return;
    var orig = btn.innerHTML;  // spara SVG + eventuell "4:5"/"9:16"-text
    var absUrl = new URL(src, window.location.href).href;
    btn.innerHTML = '…';

    copyBlobToClipboard(absUrl)
      .then(function () {
        btn.innerHTML = CHECKMARK_SVG;
        setTimeout(function () { btn.innerHTML = orig; }, 2400);
      })
      .catch(function (err) {
        // INGEN download-fallback — bara visuell feedback på miss
        console.warn('Copy failed (requires secure context: HTTPS or localhost):', err);
        btn.innerHTML = '✕';
        setTimeout(function () { btn.innerHTML = orig; }, 1800);
      });
  }

  // ── 5. LinkedIn button — öppna composer + kopiera bild ───────────────────
  var LINKEDIN_COMPOSER = 'https://www.linkedin.com/feed/?shareActive=true';

  function desktopLinkedIn(absUrl, btn) {
    // Öppna LinkedIn SYNKRONT (user-gesture-kontext → ingen popup-blockering)
    window.open(LINKEDIN_COMPOSER, '_blank', 'noopener,noreferrer');
    flashBtn(btn, 'opening LinkedIn…');
    // Kopiera bild till clipboard i bakgrunden
    copyBlobToClipboard(absUrl)
      .then(function () { flashBtn(btn, 'copied — paste ⌘V in LinkedIn'); })
      .catch(function () {
        // INGEN download-fallback — be användaren hämta bilden från download-fliken
        flashBtn(btn, 'clipboard blocked — use download tab');
      });
  }

  function shareToLinkedIn(btn) {
    var src = btn.getAttribute('data-src-li');
    if (!src) return;
    var absUrl = new URL(src, window.location.href).href;

    if (isMobileDevice()) {
      // Mobil: prova Web Share med fil → user väljer LinkedIn från OS share sheet.
      // Om det misslyckas (NotAllowedError, canShare false) → kopiera bild till
      // clipboard och be user öppna LinkedIn-appen manuellt. ALDRIG desktopLinkedIn
      // på mobil — window.open öppnar bara LinkedIn-startsidan utan composer.
      fetch(absUrl).then(function (r) { return r.blob(); }).then(function (blob) {
        var file = new File([blob], filenameFromUrl(absUrl, blob.type), { type: blob.type });
        var canShareFile = navigator.share && navigator.canShare && navigator.canShare({ files: [file] });
        if (canShareFile) {
          return navigator.share({ files: [file], title: 'Electro Union' }).catch(function (err) {
            if (err && err.name === 'AbortError') return; // user cancel — tyst
            // Share misslyckades → fallback: clipboard + manuell LinkedIn
            return copyBlobToClipboard(absUrl).then(function () {
              flashBtn(btn, 'copied — paste in LinkedIn app');
            });
          });
        }
        // Web Share stöds inte på denna mobil → clipboard + manuell LinkedIn
        return copyBlobToClipboard(absUrl).then(function () {
          flashBtn(btn, 'copied — paste in LinkedIn app');
        }).catch(function () {
          flashBtn(btn, 'needs https');
        });
      }).catch(function () {});
      return;
    }

    // Desktop: öppna LinkedIn composer + kopiera bild till clipboard
    desktopLinkedIn(absUrl, btn);
  }

  // ── Event delegation ──────────────────────────────────────────────────────
  document.addEventListener('click', function (e) {
    var shareBtn = e.target.closest('.eu-pap-card__row--share');
    if (shareBtn) { e.stopPropagation(); shareAsset(shareBtn); return; }

    var igBtn = e.target.closest('.eu-pap-card__share--ig, .eu-pap-card__split--ig, .eu-pap-card__row--ig');
    if (igBtn) { e.stopPropagation(); shareToInstagram(igBtn); return; }

    var copyBtn = e.target.closest('.eu-pap-card__split--copy, .eu-pap-card__row--copy');
    if (copyBtn) { e.stopPropagation(); copyImageOnly(copyBtn); return; }

    var liBtn = e.target.closest('.eu-pap-card__share--li, .eu-pap-card__split--li, .eu-pap-card__row--li');
    if (liBtn) { e.stopPropagation(); shareToLinkedIn(liBtn); return; }
  });

  // ── Postcard generator iframe resize relay ────────────────────────────────
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'eu-resize' && e.data.height) {
      var frame = document.getElementById('euPostcardFrame');
      if (frame) frame.style.height = e.data.height + 'px';
    }
  });

})();
