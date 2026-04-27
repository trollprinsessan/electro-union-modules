/*
 * Electro Union — Combined Generator Module Script
 *
 * Combines drawing module (stamp/sticker placement, animation, GIF/PNG export)
 * with postcard-generator module (photo backgrounds, frame toggle, byline, share).
 *
 * All class names and IDs prefixed eu-gen2__.
 * GIF encoder (lzwEncode, buildGIF, buildAdaptivePalette, quantizeFrameAdaptive)
 * copied verbatim from drawing/script.js.
 */

(function () {

  // ═══ EXPORT DIMENSIONS ═══
  // Mobile viewport → 9:16 (1080×1920 for Instagram/LinkedIn Stories).
  // Desktop viewport → 4:5 (1080×1350 for feed posts).
  // Matches the frame loaded via <picture>, so export isn't distorted.
  var MOBILE_MEDIA = '(max-width: 767.98px)';
  function getExportDims() {
    if (typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_MEDIA).matches) {
      return { w: 1080, h: 1920 };
    }
    return { w: 1080, h: 1350 };
  }

  // ═══ DOM REFS ═══
  var canvas    = document.getElementById('euGen2Canvas');
  if (!canvas) return; // silent exit if module not mounted
  var canvasWrap = document.getElementById('euGen2CanvasWrap');
  var sizeSlider = document.getElementById('euGen2Size');
  var ctx = canvas.getContext('2d');

  // ═══ STATE ═══
  var activeStamp = 0;    // index into allSrcs[]
  var animMode = 'none';
  var placements = [];    // [{x, y, sz, si}]
  var undoStack  = [];    // each entry = count of placements in that stroke
  var animRAF    = null;
  var drawing    = false;
  var strokeStartIdx = 0;
  var lastPlaceTime  = 0;

  // Background state — start blank (white canvas, no photo)
  var bgColor      = '#ffffff';
  var bgPhotoSrc   = '';
  var bgPhotoImg   = new Image();
  var bgPhotoActive = false;  // whether a photo bg is active

  // ═══ STAMP + STICKER SOURCES ═══
  var stampSrcs = [
    '../drawing/Updated Imagery/ai-generated-baguette-on-transparent-background-image-png.webp',
    '../drawing/Updated Imagery/DSC_0410-a.png',
    '../drawing/Updated Imagery/045.png',
    '../drawing/Updated Imagery/baklava_udate.png',
    '../drawing/Updated Imagery/kürtőskalács.png',
    '../drawing/Updated Imagery/pngimg.com - croissant_PNG46722.png',
    '../drawing/Updated Imagery/danish.png',
    '../drawing/Updated Imagery/pastelnata.webp',
    '../drawing/Updated Imagery/sernik.png'
  ];

  var stickerSrcs = [
    '../drawing/STICKERS/EU_Stickers_1080x1350_01.png',
    '../drawing/STICKERS/EU_Stickers_1080x1350_02.png',
    '../drawing/STICKERS/EU_Stickers_1080x1350_03.png',
    '../drawing/STICKERS/EU_Stickers_1080x1350_04.png',
    '../drawing/STICKERS/EU_Stickers_1080x1350_08.png',
    '../drawing/STICKERS/EU_Stickers_1080x1350_09.png',
    '../drawing/STICKERS/EU_Stickers_1080x1350_12.png',
    '../drawing/STICKERS/EU_Stickers_1080x1350_13.png',
    '../drawing/STICKERS/EU_Stickers_1080x1350_14.png'
  ];

  var stickerStartIdx = stampSrcs.length;
  var allSrcs = stampSrcs.concat(stickerSrcs);

  var stampImgs = [];
  allSrcs.forEach(function (src) {
    var img = new Image();
    img.src = src;
    stampImgs.push(img);
  });

  // ═══ BACKGROUND PHOTO SOURCES ═══
  var BG_SRCS = [
    '../postcard-generator/BACKGROUNDS/Image_1.png',
    '../postcard-generator/BACKGROUNDS/Image_3.png',
    '../postcard-generator/BACKGROUNDS/Image_4.png',
    '../postcard-generator/BACKGROUNDS/Image_6.png',
    '../postcard-generator/BACKGROUNDS/Plage 1 copy.jpg',
    '../postcard-generator/BACKGROUNDS/butter.jpg',
    '../postcard-generator/BACKGROUNDS/fc7c5841b4c129d0408f9ba2e7c46c1e.jpg',
    '../postcard-generator/BACKGROUNDS/original_13fd824f7a714b157c38b1c74874c102.jpg',
    '../postcard-generator/BACKGROUNDS/original_229e9d187d588a7fee6e7ea2930b5f12.png',
    '../postcard-generator/BACKGROUNDS/original_2402ef13beb9b704f676c00af5eb7d72 (1).jpg',
    '../postcard-generator/BACKGROUNDS/original_24386db4bdc673a8e2c127178587ce68.jpg',
    '../postcard-generator/BACKGROUNDS/original_314002582b30e1f59d60f6cc449c4893 (2).jpg',
    '../postcard-generator/BACKGROUNDS/original_370d3cb96067f4e231797ed5beb3a6cf.jpg',
    '../postcard-generator/BACKGROUNDS/original_40029e1f1ca3d8edb74a4a76d6898690.jpg',
    '../postcard-generator/BACKGROUNDS/original_4bdc51e802b02410cc5d4aa472900c38.jpg',
    '../postcard-generator/BACKGROUNDS/original_7ca01b4f8b02fa3ab601c9341bfd60d6.jpg',
    '../postcard-generator/BACKGROUNDS/original_827931d0025519cb087cb567ddbc1e31.png',
    '../postcard-generator/BACKGROUNDS/original_8d84e36822d69f3babb8a64f86366b97.jpg',
    '../postcard-generator/BACKGROUNDS/original_da6863c3bb938276289d0e850bb17375.jpg'
  ];

  // Preload all backgrounds
  BG_SRCS.forEach(function (src) { var i = new Image(); i.src = src; });

  // ═══ CANVAS RESIZE ═══
  function resizeCanvas() {
    canvas.width  = canvasWrap.clientWidth;
    canvas.height = canvasWrap.clientHeight;
    renderAll();
  }

  window.addEventListener('resize', resizeCanvas);

  // ═══ RENDER ═══
  function drawBgToCtx(c, w, h) {
    c.fillStyle = bgColor;
    c.fillRect(0, 0, w, h);
    if (bgPhotoActive && bgPhotoImg.complete && bgPhotoImg.naturalWidth > 0) {
      var scale = Math.max(w / bgPhotoImg.naturalWidth, h / bgPhotoImg.naturalHeight);
      var bw = bgPhotoImg.naturalWidth  * scale;
      var bh = bgPhotoImg.naturalHeight * scale;
      c.drawImage(bgPhotoImg, (w - bw) / 2, (h - bh) / 2, bw, bh);
    }
  }

  function renderAll(timeOverride) {
    var t = (timeOverride !== undefined) ? timeOverride : Date.now() / 1000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBgToCtx(ctx, canvas.width, canvas.height);
    drawPlacements(ctx, canvas.width, canvas.height, animMode, t, 1);
  }

  function drawPlacements(c, w, h, mode, t, scale) {
    for (var i = 0; i < placements.length; i++) {
      var p   = placements[i];
      var img = stampImgs[p.si];
      if (!img || !img.complete) continue;
      var cx = p.x * scale, cy = p.y * scale, s = p.sz * scale;
      var rot = 0, sc = 1;
      var phase = i * 0.4;
      if (mode === 'bounce') {
        cy += Math.sin(t * 4 + phase) * s * 0.3;
      } else if (mode === 'beat') {
        sc = 1 + Math.sin(t * 5 + phase) * 0.25;
      } else if (mode === 'rotate') {
        rot = Math.sin(t * 3 + phase) * 0.5;
      }
      c.save();
      c.translate(cx, cy);
      if (rot) c.rotate(rot);
      if (sc !== 1) c.scale(sc, sc);
      var iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
      var ar = iw / ih;
      var dw = ar >= 1 ? s : s * ar;
      var dh = ar >= 1 ? s / ar : s;
      c.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      c.restore();
    }
  }

  function startAnimLoop() {
    function tick() {
      renderAll();
      animRAF = requestAnimationFrame(tick);
    }
    animRAF = requestAnimationFrame(tick);
  }

  // ═══ PASTRY + STICKER GRIDS ═══
  // Each tile is clickable (selects as active stamp) and draggable (drop on canvas).
  function wireTile(el, globalIdx, deselectSelector) {
    el.setAttribute('draggable', 'true');
    el.classList.add('eu-gen2__draggable');
    var innerImg = el.querySelector('img');
    if (innerImg) innerImg.setAttribute('draggable', 'false');

    function activate() {
      document.querySelectorAll('.eu-gen2__tile').forEach(function (x) { x.classList.remove('is-active'); });
      el.classList.add('is-active');
      activeStamp = globalIdx;
    }

    el.addEventListener('click', activate);
    el.addEventListener('dragstart', function (e) {
      activate();
      el.classList.add('is-dragging');
      try { e.dataTransfer.effectAllowed = 'copy'; } catch (_) {}
      try { e.dataTransfer.setData('text/plain', 'tile:' + globalIdx); } catch (_) {}
      if (innerImg && e.dataTransfer.setDragImage) {
        var r = innerImg.getBoundingClientRect();
        e.dataTransfer.setDragImage(innerImg, r.width / 2, r.height / 2);
      }
    });
    el.addEventListener('dragend', function () {
      el.classList.remove('is-dragging');
    });
  }

  document.querySelectorAll('.eu-gen2__stamp').forEach(function (el) {
    var i = parseInt(el.getAttribute('data-stamp'), 10) || 0;
    wireTile(el, i);
  });
  document.querySelectorAll('.eu-gen2__sticker-opt').forEach(function (el) {
    var i = parseInt(el.getAttribute('data-sticker'), 10) || 0;
    wireTile(el, stickerStartIdx + i);
  });

  // ═══ BACKGROUND: refs ═══
  var bgSourceItems = document.querySelectorAll('#euGen2BgSource [data-bg]');
  var bgShow        = document.getElementById('euGen2BgShow');
  var bgShowImg     = bgShow ? bgShow.querySelector('img') : null;
  var bgModal       = document.getElementById('euGen2BgModal');
  var bgColorEl     = document.getElementById('euGen2BgColor');
  var bgColorPicker = document.getElementById('euGen2BgColorPicker');
  var bgSwatch      = document.getElementById('euGen2BgSwatch');
  var uploadBgInput = document.getElementById('euGen2UploadBgInput');
  var uploadBgLabel = document.getElementById('euGen2UploadBgLabel');

  function clearAllBgActive() {
    if (bgShow)        bgShow.classList.remove('is-active');
    if (bgColorEl)     bgColorEl.classList.remove('is-active');
    if (uploadBgLabel) uploadBgLabel.classList.remove('is-active');
  }

  // ═══ BACKGROUND: IMAGE PICKER MODAL ═══
  function openBgModal()  { if (bgModal) bgModal.hidden = false; }
  function closeBgModal() { if (bgModal) bgModal.hidden = true; }

  function applyBgImage(src) {
    if (!src) return;
    if (bgShowImg) bgShowImg.src = src;
    clearAllBgActive();
    if (bgShow) bgShow.classList.add('is-active');
    bgPhotoSrc    = src;
    bgPhotoActive = true;
    bgPhotoImg    = new Image();
    bgPhotoImg.src = src;
    bgPhotoImg.onload = function () {
      renderAll();
    };
  }

  if (bgShow) bgShow.onclick = openBgModal;
  if (bgModal) {
    bgModal.addEventListener('click', function (e) {
      if (e.target.matches('[data-close]')) closeBgModal();
    });
    bgSourceItems.forEach(function (item) {
      item.addEventListener('click', function () {
        applyBgImage(item.getAttribute('data-bg'));
        closeBgModal();
      });
    });
  }

  // ═══ BACKGROUND: COLOR TILE (+ opens native colorpicker) ═══
  if (bgColorPicker) {
    bgColorPicker.addEventListener('input', function () {
      bgColor       = bgColorPicker.value;
      bgPhotoActive = false;
      if (bgSwatch) {
        bgSwatch.style.animation = 'none'; // freeze the cycling once user picks
        bgSwatch.style.background = bgColor;
      }
      clearAllBgActive();
      if (bgColorEl) bgColorEl.classList.add('is-active');
      renderAll();
    });
  }

  // ═══ BACKGROUND: UPLOAD TILE ═══
  if (uploadBgInput) {
    uploadBgInput.onchange = function (e) {
      var file = e.target.files[0];
      if (!file) return;
      if (!validateUpload(file)) { e.target.value = ''; return; }
      var reader = new FileReader();
      reader.onload = function (ev) {
        var img = new Image();
        img.onload = function () {
          bgPhotoImg    = img;
          bgPhotoSrc    = ev.target.result;
          bgPhotoActive = true;
          clearAllBgActive();
          if (uploadBgLabel) uploadBgLabel.classList.add('is-active');
          renderAll();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    };
  }

  // ═══ ANIMATE BUTTONS ═══
  var animBtns = document.querySelectorAll('.eu-gen2__anim');
  animBtns.forEach(function (b) {
    b.onclick = function () {
      animBtns.forEach(function (x) { x.classList.remove('is-active'); });
      b.classList.add('is-active');
      animMode = b.getAttribute('data-anim');
      if (animMode !== 'none' && !animRAF) startAnimLoop();
      if (animMode === 'none') {
        cancelAnimationFrame(animRAF);
        animRAF = null;
        renderAll();
      }
    };
  });

  // ═══ PLACEMENT (click/drag on canvas) ═══
  function addPlacement(x, y) {
    var now = Date.now();
    if (drawing && now - lastPlaceTime < 30) return;
    lastPlaceTime = now;
    var baseSize = Math.max(30, canvas.width * 0.06);
    var size = baseSize * parseFloat(sizeSlider.value);
    placements.push({ x: x, y: y, sz: size, si: activeStamp });
    if (animMode === 'none') renderAll();
  }

  function startStroke() {
    strokeStartIdx = placements.length;
    drawing = true;
  }

  function endStroke() {
    if (!drawing) return;
    drawing = false;
    var count = placements.length - strokeStartIdx;
    if (count > 0) undoStack.push(count);
  }

  canvas.addEventListener('mousedown', function (e) {
    resizeCanvas();
    startStroke();
    var r = canvas.getBoundingClientRect();
    addPlacement(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('mousemove', function (e) {
    if (!drawing) return;
    var r = canvas.getBoundingClientRect();
    addPlacement(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('mouseup',    function () { endStroke(); });
  canvas.addEventListener('mouseleave', function () { endStroke(); });

  // ═══ DRAG-TO-STAMP (drop handlers on canvas; dragstart wiring is inside each carousel IIFE) ═══
  (function () {
    canvas.addEventListener('dragover', function (e) {
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'copy'; } catch (_) {}
      canvas.classList.add('is-drop-target');
    });
    canvas.addEventListener('dragleave', function () {
      canvas.classList.remove('is-drop-target');
    });
    canvas.addEventListener('drop', function (e) {
      e.preventDefault();
      canvas.classList.remove('is-drop-target');
      resizeCanvas();
      var r = canvas.getBoundingClientRect();
      var scaleX = canvas.width / r.width;
      var scaleY = canvas.height / r.height;
      var x = (e.clientX - r.left) * scaleX;
      var y = (e.clientY - r.top)  * scaleY;
      strokeStartIdx = placements.length;
      addPlacement(x, y);
      var added = placements.length - strokeStartIdx;
      if (added > 0) undoStack.push(added);
    });
  })();

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    resizeCanvas();
    startStroke();
    var r = canvas.getBoundingClientRect();
    var t = e.touches[0];
    addPlacement(t.clientX - r.left, t.clientY - r.top);
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    if (!drawing) return;
    var r = canvas.getBoundingClientRect();
    var t = e.touches[0];
    addPlacement(t.clientX - r.left, t.clientY - r.top);
  }, { passive: false });
  canvas.addEventListener('touchend', function () { endStroke(); });

  // ═══ UNDO / CLEAR ═══
  // Undo steps through stamp strokes first. When no strokes remain, the
  // next undo removes the background (photo → colour → default white).
  // Clear resets everything: placements, undo history, and background.
  var DEFAULT_BG_COLOR = '#ffffff';

  function resetBackground() {
    bgPhotoActive = false;
    bgPhotoSrc    = '';
    bgPhotoImg    = new Image();
    bgColor       = DEFAULT_BG_COLOR;
    if (bgSwatch) {
      // Restart the cycling animation so the tile reads as "pick a color" again
      bgSwatch.style.animation = '';
      bgSwatch.style.background = '';
    }
    if (bgColorPicker) {
      try { bgColorPicker.value = DEFAULT_BG_COLOR; } catch (e) {}
    }
    clearAllBgActive();
  }

  document.getElementById('euGen2Undo').onclick = function () {
    if (undoStack.length > 0) {
      var count = undoStack.pop();
      placements.splice(placements.length - count, count);
      renderAll();
      return;
    }
    // No strokes left — step back through background state
    if (bgPhotoActive || bgColor !== DEFAULT_BG_COLOR) {
      resetBackground();
      renderAll();
    }
  };

  document.getElementById('euGen2Clear').onclick = function () {
    placements = [];
    undoStack  = [];
    resetBackground();
    renderAll();
  };

  // ═══ UPLOAD VALIDATION ═══
  var ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  var MAX_UPLOAD_KB = 1024;

  function validateUpload(file) {
    if (ALLOWED_TYPES.indexOf(file.type) < 0) {
      alert('Only PNG, JPEG, GIF, and WebP images are allowed.');
      return false;
    }
    if (file.size > MAX_UPLOAD_KB * 1024) {
      alert('File is too large (max 1 MB).');
      return false;
    }
    return true;
  }

  // ═══ GIF ENCODER (verbatim from drawing/script.js) ═══

  function lzwEncode(pixels, minCode) {
    var clr = 1 << minCode, eoi = clr + 1, cs = minCode + 1, nx = eoi + 1;
    var dict = {}, bits = 0, bc = 0, out = [];
    function emit(c) { bits |= (c << bc); bc += cs; while (bc >= 8) { out.push(bits & 0xff); bits >>= 8; bc -= 8; } }
    function reset() { dict = {}; for (var i = 0; i < clr; i++) dict[String.fromCharCode(i)] = i; nx = eoi + 1; cs = minCode + 1; }
    reset(); emit(clr);
    var w = String.fromCharCode(pixels[0]);
    for (var i = 1; i < pixels.length; i++) {
      var c = String.fromCharCode(pixels[i]), wc = w + c;
      if (dict[wc] !== undefined) { w = wc; }
      else { emit(dict[w]); if (nx < 4096) { dict[wc] = nx++; if (nx > (1 << cs) && cs < 12) cs++; } else { emit(clr); reset(); } w = c; }
    }
    emit(dict[w]); emit(eoi);
    if (bc > 0) out.push(bits & 0xff);
    return out;
  }

  function buildGIF(frames, w, h, delay, palette) {
    var buf = [];
    function ws(s) { for (var i = 0; i < s.length; i++) buf.push(s.charCodeAt(i)); }
    function w16(v) { buf.push(v & 0xff, (v >> 8) & 0xff); }
    function wb(v) { buf.push(v & 0xff); }
    var pal = [];
    for (var i = 0; i < 256; i++) { pal.push(palette[i][0], palette[i][1], palette[i][2]); }
    ws('GIF89a'); w16(w); w16(h); wb(0xf7); wb(0); wb(0);
    for (var i = 0; i < 768; i++) wb(pal[i]);
    wb(0x21); wb(0xff); wb(11); ws('NETSCAPE2.0'); wb(3); wb(1); w16(0); wb(0);
    for (var f = 0; f < frames.length; f++) {
      wb(0x21); wb(0xf9); wb(4); wb(0x00); w16(delay); wb(0); wb(0);
      wb(0x2c); w16(0); w16(0); w16(w); w16(h); wb(0);
      wb(8);
      var comp = lzwEncode(frames[f], 8);
      var p = 0;
      while (p < comp.length) { var bl = Math.min(255, comp.length - p); wb(bl); for (var j = 0; j < bl; j++) wb(comp[p++]); }
      wb(0);
    }
    wb(0x3b);
    return new Blob([new Uint8Array(buf)], { type: 'image/gif' });
  }

  function buildAdaptivePalette(imgData, maxColors) {
    maxColors = maxColors || 256;
    var data = imgData.data, n = data.length / 4;
    var pixels = [];
    for (var i = 0; i < n; i += 2) {
      var r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      pixels.push([r, g, b]);
    }
    var uniq = {}, uniqArr = [];
    for (var i = 0; i < pixels.length; i++) {
      var key = ((pixels[i][0] >> 3) << 10) | ((pixels[i][1] >> 3) << 5) | (pixels[i][2] >> 3);
      if (!uniq[key]) { uniq[key] = { r: 0, g: 0, b: 0, n: 0 }; uniqArr.push(uniq[key]); }
      uniq[key].r += pixels[i][0]; uniq[key].g += pixels[i][1]; uniq[key].b += pixels[i][2]; uniq[key].n++;
    }
    var dedupPixels = [];
    for (var i = 0; i < uniqArr.length; i++) {
      var u = uniqArr[i];
      dedupPixels.push([Math.round(u.r / u.n), Math.round(u.g / u.n), Math.round(u.b / u.n)]);
    }
    function vol(box) {
      var rn = box.rMax - box.rMin, gn = box.gMax - box.gMin, bn = box.bMax - box.bMin;
      return rn * gn * bn;
    }
    function makeBox(px) {
      var rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
      for (var i = 0; i < px.length; i++) {
        var p = px[i];
        if (p[0] < rMin) rMin = p[0]; if (p[0] > rMax) rMax = p[0];
        if (p[1] < gMin) gMin = p[1]; if (p[1] > gMax) gMax = p[1];
        if (p[2] < bMin) bMin = p[2]; if (p[2] > bMax) bMax = p[2];
      }
      return { px: px, rMin: rMin, rMax: rMax, gMin: gMin, gMax: gMax, bMin: bMin, bMax: bMax };
    }
    function splitBox(box) {
      var rr = box.rMax - box.rMin, gr = box.gMax - box.gMin, br = box.bMax - box.bMin;
      var ch = rr >= gr && rr >= br ? 0 : (gr >= br ? 1 : 2);
      box.px.sort(function (a, b) { return a[ch] - b[ch]; });
      var mid = Math.floor(box.px.length / 2);
      return [makeBox(box.px.slice(0, mid)), makeBox(box.px.slice(mid))];
    }
    var boxes = [makeBox(dedupPixels)];
    while (boxes.length < maxColors) {
      var best = -1, bestVol = -1;
      for (var i = 0; i < boxes.length; i++) {
        if (boxes[i].px.length > 1) {
          var v = vol(boxes[i]);
          if (v > bestVol) { bestVol = v; best = i; }
        }
      }
      if (best < 0) break;
      var pair = splitBox(boxes[best]);
      boxes.splice(best, 1, pair[0], pair[1]);
    }
    var palette = [];
    for (var i = 0; i < boxes.length; i++) {
      var bx = boxes[i], rs = 0, gs = 0, bs = 0;
      for (var j = 0; j < bx.px.length; j++) { rs += bx.px[j][0]; gs += bx.px[j][1]; bs += bx.px[j][2]; }
      var c = bx.px.length;
      palette.push([Math.round(rs / c), Math.round(gs / c), Math.round(bs / c)]);
    }
    while (palette.length < 256) palette.push([0, 0, 0]);
    return palette;
  }

  function quantizeFrameAdaptive(c, w, h, palette) {
    var data = c.getImageData(0, 0, w, h).data;
    var idx = new Uint8Array(w * h);
    var cache = {};
    for (var i = 0; i < w * h; i++) {
      var r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
      var key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      if (cache[key] !== undefined) { idx[i] = cache[key]; continue; }
      var bestD = Infinity, bestJ = 0;
      for (var j = 0; j < 256; j++) {
        var dr = r - palette[j][0], dg = g - palette[j][1], db = b - palette[j][2];
        var d = dr * dr + dg * dg + db * db;
        if (d < bestD) { bestD = d; bestJ = j; }
      }
      cache[key] = bestJ;
      idx[i] = bestJ;
    }
    return idx;
  }

  // ═══ EXPORT RENDER ═══
  function renderExportFrame(tmpCtx, mode, t, ew, eh) {
    var scx = ew / canvas.width;
    var scy = eh / canvas.height;
    tmpCtx.clearRect(0, 0, ew, eh);
    // Background: fill + photo cover-fit
    tmpCtx.fillStyle = bgColor;
    tmpCtx.fillRect(0, 0, ew, eh);
    if (bgPhotoActive && bgPhotoImg.complete && bgPhotoImg.naturalWidth > 0) {
      var scale = Math.max(ew / bgPhotoImg.naturalWidth, eh / bgPhotoImg.naturalHeight);
      var bw = bgPhotoImg.naturalWidth  * scale;
      var bh = bgPhotoImg.naturalHeight * scale;
      tmpCtx.drawImage(bgPhotoImg, (ew - bw) / 2, (eh - bh) / 2, bw, bh);
    }
    // Placements — scale pixel coords to export dims
    for (var i = 0; i < placements.length; i++) {
      var p   = placements[i];
      var img = stampImgs[p.si];
      if (!img || !img.complete) continue;
      var cx = p.x * scx, cy = p.y * scy, s = p.sz * scx;
      var rot = 0, sc = 1;
      var phase = i * 0.4;
      if (mode === 'bounce') { cy += Math.sin(t * 4 + phase) * s * 0.3; }
      else if (mode === 'beat') { sc = 1 + Math.sin(t * 5 + phase) * 0.25; }
      else if (mode === 'rotate') { rot = Math.sin(t * 3 + phase) * 0.5; }
      tmpCtx.save();
      tmpCtx.translate(cx, cy);
      if (rot) tmpCtx.rotate(rot);
      if (sc !== 1) tmpCtx.scale(sc, sc);
      var iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
      var ar = iw / ih;
      var dw = ar >= 1 ? s : s * ar;
      var dh = ar >= 1 ? s / ar : s;
      tmpCtx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      tmpCtx.restore();
    }
  }

  // ═══ READY-STATE (grey out download/share until user has created something) ═══
  // "Created something" = placed at least one stamp/sticker OR chosen a bg photo.
  var dlGifBtn  = document.getElementById('euGen2DlGif');
  var shareIgBtn = document.getElementById('euGen2ShareIg');
  var gatedBtns = [dlGifBtn, shareIgBtn].filter(Boolean);
  function isReady() {
    return placements.length > 0 || bgPhotoActive;
  }
  function updateGateState() {
    var ready = isReady();
    gatedBtns.forEach(function (b) {
      if (ready) b.classList.remove('is-disabled');
      else       b.classList.add('is-disabled');
    });
  }
  // Initial state
  updateGateState();
  // Re-evaluate after every user action that could enable the buttons.
  // renderAll runs after placements push / bg change so we hook that path.
  var _prevPlacementCount = 0;
  var _prevBgActive = bgPhotoActive;
  setInterval(function () {
    if (placements.length !== _prevPlacementCount || bgPhotoActive !== _prevBgActive) {
      _prevPlacementCount = placements.length;
      _prevBgActive = bgPhotoActive;
      updateGateState();
    }
  }, 250);

  // ═══ Rate limit / abuse guard ═══
  // Static site on GitHub Pages — no server to overwhelm, but heavy ops
  // (GIF encoding especially) can freeze the tab if spammed. Per-button
  // cooldown + session cap.
  var CLICK_COOLDOWN_MS = 2000;
  var GIF_COOLDOWN_MS   = 5000;
  var SESSION_CAP = 60;  // generator ops are heavier; lower than toolkit's 120
  function getSessionCount() {
    try { return parseInt(sessionStorage.getItem('eu_gen_count') || '0', 10) || 0; }
    catch (e) { return 0; }
  }
  function incSessionCount() {
    try { sessionStorage.setItem('eu_gen_count', String(getSessionCount() + 1)); } catch (e) {}
  }
  function flashBtn(btn, msg, ms) {
    var orig = btn.textContent;
    btn.textContent = msg;
    setTimeout(function () { btn.textContent = orig; }, ms || 2200);
  }
  function gatePass(btn, cooldownMs) {
    if (btn.classList.contains('is-disabled')) return false;
    if (btn.classList.contains('is-busy')) return false;
    var now = Date.now();
    var last = parseInt(btn.getAttribute('data-last-click') || '0', 10);
    if (now - last < cooldownMs) return false;
    if (getSessionCount() >= SESSION_CAP) {
      flashBtn(btn, 'slow down');
      return false;
    }
    btn.setAttribute('data-last-click', String(now));
    incSessionCount();
    return true;
  }

  // ═══ DOWNLOAD GIF ═══
  // ─── MP4 encoder via WebCodecs + mp4-muxer ───
  // Records `cycleDur` seconds of the animation at `numFrames` frames,
  // returns a Promise<Blob> of an MP4 (H.264). Falls back to null if
  // WebCodecs isn't available (older browsers).
  // MediaRecorder MP4 encoder — fallback for iOS Safari < 17.4 (no WebCodecs).
  // iOS Safari supports MediaRecorder with mimeType 'video/mp4' since 14.5.
  // Records canvas in real-time so duration ≈ wall-clock duration.
  function renderToMp4ViaMediaRecorder(animModeForExport, ew, eh, cycleDur) {
    return new Promise(function (resolve, reject) {
      if (typeof MediaRecorder === 'undefined') {
        return reject(new Error('MediaRecorder not supported'));
      }
      // Find a supported mp4 mime; reject if only webm is available (webm
      // doesn't help — IG/LinkedIn won't accept it either).
      var mp4Mimes = [
        'video/mp4;codecs=avc1.42E01E',
        'video/mp4;codecs=avc1',
        'video/mp4'
      ];
      var mime = null;
      for (var i = 0; i < mp4Mimes.length; i++) {
        if (MediaRecorder.isTypeSupported(mp4Mimes[i])) { mime = mp4Mimes[i]; break; }
      }
      if (!mime) return reject(new Error('No MP4 mime supported by MediaRecorder'));

      var c = document.createElement('canvas');
      c.width = ew; c.height = eh;
      var cx = c.getContext('2d');
      // Initial frame so the stream has something
      renderExportFrame(cx, animModeForExport, 0, ew, eh);
      var stream = c.captureStream(24);
      var rec;
      try {
        rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4000000 });
      } catch (e) { return reject(e); }
      var chunks = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size > 0) chunks.push(e.data); };
      rec.onerror = function (e) { reject(e.error || new Error('MediaRecorder error')); };
      rec.onstop = function () {
        resolve(new Blob(chunks, { type: 'video/mp4' }));
      };

      var totalMs = cycleDur * 1000;
      var startTime = performance.now();
      function tick() {
        var elapsed = performance.now() - startTime;
        var t = (elapsed % totalMs) / 1000;
        renderExportFrame(cx, animModeForExport, t, ew, eh);
        if (elapsed < totalMs) {
          requestAnimationFrame(tick);
        } else {
          try { rec.stop(); } catch (e) { reject(e); }
        }
      }
      rec.start();
      requestAnimationFrame(tick);
    });
  }

  function renderToMp4Blob(animModeForExport, ew, eh, numFrames, cycleDur) {
    if (typeof window.VideoEncoder === 'undefined' || typeof window.Mp4Muxer === 'undefined') {
      // WebCodecs missing — try MediaRecorder
      return renderToMp4ViaMediaRecorder(animModeForExport, ew, eh, cycleDur);
    }
    return new Promise(function (resolve, reject) {
      try {
        var Muxer = window.Mp4Muxer.Muxer;
        var ArrayBufferTarget = window.Mp4Muxer.ArrayBufferTarget;
        var fps = numFrames / cycleDur;
        var muxer = new Muxer({
          target: new ArrayBufferTarget(),
          video: { codec: 'avc', width: ew, height: eh, frameRate: fps },
          fastStart: 'in-memory'
        });
        var encoder = new VideoEncoder({
          output: function (chunk, meta) { muxer.addVideoChunk(chunk, meta); },
          error: function (e) { reject(e); }
        });
        // avc1.42E01E = H.264 Baseline 3.0 — broadest playback compatibility
        encoder.configure({
          codec: 'avc1.42E01E',
          width: ew,
          height: eh,
          bitrate: 4_000_000,
          framerate: fps
        });

        var tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = ew; tmpCanvas.height = eh;
        var tmpCtx = tmpCanvas.getContext('2d');
        var frameDurationUs = Math.round(1_000_000 / fps);

        for (var f = 0; f < numFrames; f++) {
          var t = f * (cycleDur / numFrames);
          renderExportFrame(tmpCtx, animModeForExport, t, ew, eh);
          var frame = new VideoFrame(tmpCanvas, {
            timestamp: f * frameDurationUs,
            duration: frameDurationUs
          });
          // Force keyframe every 30 frames so seeking works
          encoder.encode(frame, { keyFrame: f % 30 === 0 });
          frame.close();
        }
        encoder.flush().then(function () {
          muxer.finalize();
          var buf = muxer.target.buffer;
          resolve(new Blob([buf], { type: 'video/mp4' }));
        }).catch(reject);
      } catch (e) { reject(e); }
    });
  }

  dlGifBtn.onclick = function () {
    if (!gatePass(this, GIF_COOLDOWN_MS)) return;
    var btn = this;
    var dims = getExportDims(), ew = dims.w, eh = dims.h;
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = ew; tmpCanvas.height = eh;
    var tmpCtx = tmpCanvas.getContext('2d');

    if (animMode === 'none') {
      // Export still as PNG when no animation
      renderExportFrame(tmpCtx, 'none', 0, ew, eh);
      var link = document.createElement('a');
      link.download = 'electro-union-generator.png';
      link.href = tmpCanvas.toDataURL('image/png');
      link.click();
      return;
    }

    btn.classList.add('is-busy');
    var origText = btn.textContent;
    btn.textContent = 'encoding…';

    var savedMode = animMode;
    var numFrames = 60, cycleDur = 2;

    function downloadBlob(blob, filename) {
      var link = document.createElement('a');
      link.download = filename;
      link.href = URL.createObjectURL(blob);
      link.click();
      setTimeout(function () { URL.revokeObjectURL(link.href); }, 5000);
    }

    // 1) WebCodecs MP4 (fastest, modern browsers + iOS 17.4+)
    // 2) MediaRecorder MP4 (iOS Safari 14.5+)
    // 3) GIF (last resort — IG flattens to a still)
    renderToMp4Blob(savedMode, ew, eh, numFrames, cycleDur)
      .catch(function () { return renderToMp4ViaMediaRecorder(savedMode, ew, eh, cycleDur); })
      .then(function (blob) {
        downloadBlob(blob, 'electro-union-generator.mp4');
      })
      .catch(function () {
        // Both MP4 paths failed — fall back to GIF
        try {
          renderExportFrame(tmpCtx, savedMode, 0, ew, eh);
          var palette = buildAdaptivePalette(tmpCtx.getImageData(0, 0, ew, eh), 256);
          var gifFrames = [];
          for (var f = 0; f < 36; f++) {
            var t = f * (cycleDur / 36);
            renderExportFrame(tmpCtx, savedMode, t, ew, eh);
            gifFrames.push(quantizeFrameAdaptive(tmpCtx, ew, eh, palette));
          }
          var blob = buildGIF(gifFrames, ew, eh, Math.round(cycleDur / 36 * 100), palette);
          downloadBlob(blob, 'electro-union-generator.gif');
        } catch (e2) {
          flashBtn(btn, 'encode failed');
        }
      })
      .then(function () {
        btn.classList.remove('is-busy');
        btn.textContent = origText;
      });
  };

  // ═══ SHARE / COPY HELPERS ═══
  // NOTE: no title, no text, no url passed to navigator.share — KP's rule
  // is that only the image/GIF file may leave the toolkit, never any
  // metadata that share targets (Telegram, Mail, SMS) can extract as text.

  // Render current composition to a still PNG blob (4:5).
  function renderToPngBlob(cb) {
    var dims = getExportDims(), ew = dims.w, eh = dims.h;
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = ew; tmpCanvas.height = eh;
    var tmpCtx = tmpCanvas.getContext('2d');
    renderExportFrame(tmpCtx, 'none', 0, ew, eh);
    tmpCanvas.toBlob(cb, 'image/png');
  }

  // Render current composition to an animated GIF blob.
  // SHARE-specific: smaller (720×1280) and 24 frames so encoding finishes
  // inside iOS's user-gesture window (~1s on phone). Quality is fine for
  // social previews; full-size 1080×1920 is reserved for the download path.
  function renderToGifBlob() {
    var dims = getExportDims();
    // Cap share GIF to 720px wide regardless of platform — keeps encode <1s on phone
    var ew = Math.min(720, dims.w);
    var eh = Math.round(ew * dims.h / dims.w);
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = ew; tmpCanvas.height = eh;
    var tmpCtx = tmpCanvas.getContext('2d');
    var numFrames = 24, cycleDur = 2;
    var savedMode = animMode;
    renderExportFrame(tmpCtx, savedMode, 0, ew, eh);
    var palette = buildAdaptivePalette(tmpCtx.getImageData(0, 0, ew, eh), 256);
    var gifFrames = [];
    for (var f = 0; f < numFrames; f++) {
      var t = f * (cycleDur / numFrames);
      renderExportFrame(tmpCtx, savedMode, t, ew, eh);
      gifFrames.push(quantizeFrameAdaptive(tmpCtx, ew, eh, palette));
    }
    var delay = Math.round(cycleDur / numFrames * 100);
    return buildGIF(gifFrames, ew, eh, delay, palette);
  }

  // Actually share a File via Web Share API. Only the file — no title, no
  // text, no url — to prevent share targets from pulling those out as
  // the message body.
  function shareFile(btn, file) {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file] }).catch(function () {});
    } else {
      flashBtn(btn, 'not supported here');
    }
  }

  // Share current composition. Static → PNG, animated → GIF (LinkedIn
  // accepts animated GIF in the feed; for IG Stories the user goes through
  // the Download button → MP4 instead).
  function sharePostcard(btn) {
    if (animMode === 'none') {
      renderToPngBlob(function (blob) {
        if (!blob) return;
        var file = new File([blob], 'electro-union-generator.png', { type: 'image/png' });
        shareFile(btn, file);
      });
      return;
    }
    btn.classList.add('is-busy');
    var origText = btn.textContent;
    btn.textContent = 'encoding…';
    try {
      var gifBlob = renderToGifBlob();
      var file = new File([gifBlob], 'electro-union-generator.gif', { type: 'image/gif' });
      shareFile(btn, file);
    } finally {
      btn.classList.remove('is-busy');
      btn.textContent = origText;
    }
  }

  // Copy button behaviour:
  //   • Static (animMode === 'none'): copy PNG to clipboard (paste anywhere).
  //   • Animated: clipboard can't hold GIFs, so trigger a GIF download
  //     instead — user gets the animated asset and a clear feedback.
  function copyPostcard(btn) {
    if (animMode !== 'none') {
      // Animated → encode GIF + trigger download
      btn.classList.add('is-busy');
      var origText = btn.textContent;
      btn.textContent = 'encoding…';
      setTimeout(function () {
        try {
          var gifBlob = renderToGifBlob();
          var url = URL.createObjectURL(gifBlob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'electro-union-generator.gif';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
          btn.classList.remove('is-busy');
          btn.textContent = origText;
          flashBtn(btn, 'GIF downloaded', 2400);
        } catch (e) {
          btn.classList.remove('is-busy');
          btn.textContent = origText;
          flashBtn(btn, 'encode failed');
        }
      }, 30);
      return;
    }
    // Static → copy PNG to clipboard
    renderToPngBlob(function (blob) {
      if (!blob) {
        flashBtn(btn, 'copy failed');
        return;
      }
      if (!navigator.clipboard || !window.ClipboardItem) {
        flashBtn(btn, 'needs https');
        return;
      }
      navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]).then(function () {
        flashBtn(btn, 'copied ✓');
      }).catch(function () {
        flashBtn(btn, 'copy failed');
      });
    });
  }

  // Share button. Shares GIF when animated, PNG when static.
  shareIgBtn.onclick = function () {
    // Use GIF cooldown when animated (heavier op), otherwise standard.
    var cd = (animMode === 'none') ? CLICK_COOLDOWN_MS : GIF_COOLDOWN_MS;
    if (!gatePass(this, cd)) return;
    sharePostcard(this);
  };

  // ═══ INIT ═══
  // Defer resizeCanvas until layout is painted
  requestAnimationFrame(function () {
    resizeCanvas();
  });

})();
