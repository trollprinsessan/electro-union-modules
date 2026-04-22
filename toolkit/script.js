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
 * Beteende:
 *   - Toolkit börjar stängd; klick på togglern öppnar/stänger
 *   - Togglerns bakgrund cyklar genom 27 EU-länders flaggfärger var 4s
 *   - Tre tabbar (social / stickers / messaging) — klick byter visad sektion
 *   - Meddelanden kan kopieras till urklipp via klick (inline onclick)
 *   - Standalone: "back to toolkit"-länk visas bottom-right när användare
 *     scrollat förbi toolkit
 */

(function () {
  var isEmbed = window.EU_IS_EMBED === true;

  // Sharables foldout toggle
  var toggleBtn = document.getElementById('euSharablesBtn');
  var sharables = document.getElementById('euSharables');
  if (toggleBtn && sharables) {
    toggleBtn.addEventListener('click', function () {
      sharables.classList.toggle('is-open');
    });
  }

  // EU flag color rotation (toggle button background)
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
      // pick text color that contrasts with middle stripe
      var mid = f.colors[1];
      btn.style.color = (mid === '#fff' || mid === '#FECC00' || mid === '#FCD116' || mid === '#FAE042' || mid === '#F1BF00' || mid === '#FDB913' || mid === '#D47600') ? '#000' : '#fff';
      fi = (fi + 1) % flags.length;
    }
    applyFlag();
    setInterval(applyFlag, 4000);
  })();

  // Tab navigation
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

  // Sticky toolkit link (standalone only)
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

  // Hide "CLICK HERE" text after open (CSS handles it, but also set via class)
  // (handled via CSS .eu-sharables.is-open .eu-clickhere{display:none})

  // ═══ Rate limit / abuse guard ═══
  // Per-button cooldown + session cap. Static site on GitHub Pages has no
  // server to overwhelm, but this prevents a single user from spamming
  // the Clipboard/Web Share APIs or freezing their own tab.
  var CLICK_COOLDOWN_MS = 1500;
  var SESSION_CAP = 120;
  function getSessionCount() {
    try { return parseInt(sessionStorage.getItem('eu_action_count') || '0', 10) || 0; }
    catch (e) { return 0; }
  }
  function incSessionCount() {
    try { sessionStorage.setItem('eu_action_count', String(getSessionCount() + 1)); } catch (e) {}
  }
  function rateLimited(btn) {
    var now = Date.now();
    var last = parseInt(btn.getAttribute('data-last-click') || '0', 10);
    if (now - last < CLICK_COOLDOWN_MS) return true;
    if (getSessionCount() >= SESSION_CAP) {
      flashBtn(btn, 'slow down');
      return true;
    }
    btn.setAttribute('data-last-click', String(now));
    incSessionCount();
    return false;
  }
  function flashBtn(btn, msg) {
    var orig = btn.textContent;
    btn.textContent = msg;
    setTimeout(function () { btn.textContent = orig; }, 2200);
  }

  // ═══ Share to Instagram / native share sheet ═══
  // Renamed to "share" in UI. Shares ONLY the image file — no title, no
  // text, no URL — so that apps like Telegram can't pull out a text/link
  // field and send that instead of the image.
  function shareToInstagram(btn) {
    var src = btn.getAttribute('data-src');
    if (!src) return;
    var absUrl = new URL(src, window.location.href).href;
    fetch(absUrl)
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        var ext = blob.type.includes('gif') ? 'gif'
          : blob.type.includes('png') ? 'png'
          : blob.type.includes('mp4') ? 'mp4'
          : blob.type.indexOf('video/') === 0 ? blob.type.split('/')[1]
          : 'jpg';
        var file = new File([blob], 'electro-union.' + ext, { type: blob.type });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          return navigator.share({ files: [file] }).catch(function (err) {
            if (err && err.name === 'AbortError') return; // user cancelled
            flashBtn(btn, 'share: ' + (err && err.name || 'failed'));
          });
        }
        // Explicitly no URL fallback — KP's rule: only the image, nothing else.
        flashBtn(btn, 'share not supported');
      })
      .catch(function (err) {
        flashBtn(btn, 'fetch: ' + (err && err.name || 'failed'));
      });
  }

  // ═══ Copy 4:5 image to clipboard ═══
  // Fetches the 4:5 asset (data-src-li), converts to PNG via canvas
  // (Clipboard API only reliably supports image/png), writes to clipboard.
  function copyToClipboard(btn) {
    var src = btn.getAttribute('data-src-li');
    if (!src) return;
    var absUrl = new URL(src, window.location.href).href;

    // Convert any blob to a PNG blob via canvas (works for png/jpeg/webp sources)
    function toPngBlob(srcBlob) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
          var c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          c.toBlob(function (pngBlob) {
            if (pngBlob) resolve(pngBlob); else reject(new Error('no blob'));
          }, 'image/png');
        };
        img.onerror = function () { reject(new Error('img load')); };
        img.src = URL.createObjectURL(srcBlob);
      });
    }

    fetch(absUrl)
      .then(function (r) { return r.blob(); })
      .then(function (blob) {
        // Always re-encode through canvas. Firefox (especially Android)
        // rejects fetched PNG blobs with DataError; a canvas-generated PNG
        // is accepted reliably across Safari/Chrome/Firefox.
        return toPngBlob(blob);
      })
      .then(function (pngBlob) {
        if (!navigator.clipboard || !window.ClipboardItem) {
          flashBtn(btn, 'clipboard unavailable');
          return;
        }
        return navigator.clipboard.write([
          new ClipboardItem({ 'image/png': pngBlob })
        ]).then(function () {
          flashBtn(btn, 'copied ✓');
        }).catch(function (err) {
          flashBtn(btn, 'copy: ' + (err && err.name || 'failed'));
        });
      })
      .catch(function (err) {
        flashBtn(btn, 'copy: ' + (err && err.name || 'failed'));
      });
  }

  // Event delegation on document for share/copy/download buttons.
  // --ig → share (Web Share API)
  // --li → copy-to-clipboard (4:5)
  // .eu-pap-card__btn[download] → direct download link (rate-limited too)
  document.addEventListener('click', function (e) {
    var igBtn = e.target.closest('.eu-pap-card__share--ig, .eu-pap-card__split--ig, .eu-pap-card__row--ig');
    if (igBtn) {
      e.stopPropagation();
      if (rateLimited(igBtn)) return;
      shareToInstagram(igBtn);
      return;
    }
    var liBtn = e.target.closest('.eu-pap-card__share--li, .eu-pap-card__split--li, .eu-pap-card__row--li');
    if (liBtn) {
      e.stopPropagation();
      if (rateLimited(liBtn)) return;
      copyToClipboard(liBtn);
      return;
    }
    // Rate-limit direct download <a> links in the downloads tab
    var dlLink = e.target.closest('.eu-pap-card__btn[download]');
    if (dlLink) {
      if (rateLimited(dlLink)) {
        e.preventDefault();
        return;
      }
      // Let the browser handle the download normally.
    }
  });

  // Postcard generator iframe resize relay
  window.addEventListener('message', function(e){
    if(e.data && e.data.type === 'eu-resize' && e.data.height){
      var frame = document.getElementById('euPostcardFrame');
      if(frame) frame.style.height = e.data.height + 'px';
    }
  });

})();
