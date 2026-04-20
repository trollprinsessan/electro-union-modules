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

  // ═══ EXPORT DIMENSIONS (fixed 4:5) ═══
  var EXPORT_W = 1080, EXPORT_H = 1350;

  // ═══ DOM REFS ═══
  var canvas    = document.getElementById('euGen2Canvas');
  if (!canvas) return; // silent exit if module not mounted
  var canvasWrap = document.getElementById('euGen2CanvasWrap');
  var bylineInput  = document.getElementById('euGen2Byline');
  var bylinePreview = document.getElementById('euGen2BylinePreview');
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
    // Byline on canvas preview
    var byline = bylineInput ? bylineInput.value.trim() : '';
    if (byline) {
      var fs = Math.max(10, canvas.height * 0.028);
      ctx.save();
      ctx.font = fs + 'px "Times Eighteen", Georgia, serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;
      ctx.textAlign = 'center';
      ctx.fillText(byline, canvas.width / 2, canvas.height * 0.92);
      ctx.restore();
    }
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

  // ═══ BYLINE PREVIEW ═══
  // Text is drawn on canvas (renderAll) — also mirror to overlay div for visual feedback
  bylineInput.addEventListener('input', function () {
    if (bylinePreview) bylinePreview.textContent = bylineInput.value;
    if (animMode === 'none') renderAll();
  });

  // ═══ STAMP CAROUSEL ═══
  (function () {
    var stampItems = document.querySelectorAll('.eu-gen2__stamp');
    var stampShow  = document.getElementById('euGen2StampShow');
    var stampIdx   = 0;

    function showStamp(i) {
      stampIdx = i;
      var stampEl = stampItems[i];
      if (!stampEl) return;
      stampShow.querySelector('img').src = stampEl.querySelector('img').src;
      activeStamp = i;
      // Deselect stickers
      document.querySelectorAll('.eu-gen2__sticker-opt').forEach(function (x) { x.classList.remove('is-active'); });
    }

    document.getElementById('euGen2StampPrev').onclick = function () {
      showStamp((stampIdx - 1 + stampItems.length) % stampItems.length);
    };
    document.getElementById('euGen2StampNext').onclick = function () {
      showStamp((stampIdx + 1) % stampItems.length);
    };
    stampShow.onclick = function () { showStamp(stampIdx); };
  })();

  // ═══ STICKER CAROUSEL ═══
  (function () {
    var stickerItems = document.querySelectorAll('.eu-gen2__sticker-opt');
    var stickerShow  = document.getElementById('euGen2StickerShow');
    var stickerIdx   = 0;

    function showSticker(i) {
      stickerIdx = i;
      var el = stickerItems[i];
      if (!el) return;
      stickerItems.forEach(function (x) { x.classList.remove('is-active'); });
      el.classList.add('is-active');
      stickerShow.querySelector('img').src = el.querySelector('img').src;
      // Sticker click sets active stamp to that sticker
      activeStamp = stickerStartIdx + i;
      // Deselect pastry stamps from UI perspective (stamp carousel doesn't show active state, but clean anyway)
    }

    document.getElementById('euGen2StickerPrev').onclick = function () {
      showSticker((stickerIdx - 1 + stickerItems.length) % stickerItems.length);
    };
    document.getElementById('euGen2StickerNext').onclick = function () {
      showSticker((stickerIdx + 1) % stickerItems.length);
    };
    stickerShow.onclick = function () { showSticker(stickerIdx); };
  })();

  // ═══ BACKGROUND: refs ═══
  // Preset photo thumbs: exclude the upload + color tiles (they share the
  // .eu-gen2__photo-thumb base class but have no data-bg).
  var photoThumbs = document.querySelectorAll(
    '.eu-gen2__photo-thumb:not(.eu-gen2__photo-thumb--upload):not(.eu-gen2__photo-thumb--color)'
  );
  var bgColorEl     = document.getElementById('euGen2BgColor');       // color tile (+)
  var bgColorPicker = document.getElementById('euGen2BgColorPicker'); // native <input type="color">
  var bgSwatch      = document.getElementById('euGen2BgSwatch');      // swatch behind the +
  var uploadBgInput = document.getElementById('euGen2UploadBgInput');
  var uploadBgLabel = document.getElementById('euGen2UploadBgLabel'); // upload tile (↑)

  function clearAllBgActive() {
    photoThumbs.forEach(function (x) { x.classList.remove('is-active'); });
    if (bgColorEl)     bgColorEl.classList.remove('is-active');
    if (uploadBgLabel) uploadBgLabel.classList.remove('is-active');
  }

  // ═══ BACKGROUND: PHOTO GRID ═══
  photoThumbs.forEach(function (thumb) {
    thumb.onclick = function () {
      clearAllBgActive();
      thumb.classList.add('is-active');
      bgPhotoSrc    = thumb.getAttribute('data-bg');
      bgPhotoActive = true;
      bgPhotoImg    = new Image();
      bgPhotoImg.src = bgPhotoSrc;
      bgPhotoImg.onload = function () { renderAll(); };
    };
  });

  // ═══ BACKGROUND: COLOR TILE (+ opens native colorpicker) ═══
  if (bgColorPicker) {
    bgColorPicker.addEventListener('input', function () {
      bgColor       = bgColorPicker.value;
      bgPhotoActive = false;
      if (bgSwatch) bgSwatch.style.background = bgColor;
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
  document.getElementById('euGen2Undo').onclick = function () {
    if (undoStack.length > 0) {
      var count = undoStack.pop();
      placements.splice(placements.length - count, count);
      renderAll();
    }
  };

  document.getElementById('euGen2Clear').onclick = function () {
    placements = [];
    undoStack  = [];
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
    // Byline text
    var byline = bylineInput ? bylineInput.value.trim() : '';
    if (byline) {
      tmpCtx.save();
      tmpCtx.font = '32px "Times Eighteen", Georgia, serif';
      tmpCtx.fillStyle = '#ffffff';
      tmpCtx.shadowColor = 'rgba(0,0,0,0.6)';
      tmpCtx.shadowBlur = 6;
      tmpCtx.shadowOffsetY = 2;
      tmpCtx.textAlign = 'center';
      tmpCtx.fillText(byline, ew / 2, eh * 0.94);
      tmpCtx.restore();
    }
  }

  // ═══ READY-STATE (grey out download/share until user has created something) ═══
  // "Created something" = placed at least one stamp/sticker OR chosen a bg photo.
  var dlGifBtn  = document.getElementById('euGen2DlGif');
  var dlPngBtn  = document.getElementById('euGen2DlPng');
  var shareLiBtn = document.getElementById('euGen2ShareLi');
  var shareIgBtn = document.getElementById('euGen2ShareIg');
  var gatedBtns = [dlGifBtn, dlPngBtn, shareLiBtn, shareIgBtn].filter(Boolean);
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
  dlGifBtn.onclick = function () {
    if (!gatePass(this, GIF_COOLDOWN_MS)) return;
    var btn = this;
    var ew = EXPORT_W, eh = EXPORT_H;
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
    // Defer heavy work so UI can paint
    setTimeout(function () {
      try {
        var numFrames = 36, cycleDur = 2;
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
        var blob = buildGIF(gifFrames, ew, eh, delay, palette);
        var link = document.createElement('a');
        link.download = 'electro-union-generator.gif';
        link.href = URL.createObjectURL(blob);
        link.click();
        setTimeout(function () { URL.revokeObjectURL(link.href); }, 5000);
      } finally {
        btn.classList.remove('is-busy');
        btn.textContent = origText;
      }
    }, 30);
  };

  // ═══ DOWNLOAD PNG ═══
  dlPngBtn.onclick = function () {
    if (!gatePass(this, CLICK_COOLDOWN_MS)) return;
    var ew = EXPORT_W, eh = EXPORT_H;
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = ew; tmpCanvas.height = eh;
    var tmpCtx = tmpCanvas.getContext('2d');
    renderExportFrame(tmpCtx, 'none', 0, ew, eh);
    var link = document.createElement('a');
    link.download = 'electro-union-generator.png';
    link.href = tmpCanvas.toDataURL('image/png');
    link.click();
  };

  // ═══ SHARE / COPY HELPERS ═══
  // NOTE: no title, no text, no url passed to navigator.share — KP's rule
  // is that only the image/GIF file may leave the toolkit, never any
  // metadata that share targets (Telegram, Mail, SMS) can extract as text.

  // Render current composition to a still PNG blob (4:5).
  function renderToPngBlob(cb) {
    var ew = EXPORT_W, eh = EXPORT_H;
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = ew; tmpCanvas.height = eh;
    var tmpCtx = tmpCanvas.getContext('2d');
    renderExportFrame(tmpCtx, 'none', 0, ew, eh);
    tmpCanvas.toBlob(cb, 'image/png');
  }

  // Render current composition to an animated GIF blob (4:5). Reuses the
  // same encoder as the GIF download button.
  function renderToGifBlob() {
    var ew = EXPORT_W, eh = EXPORT_H;
    var tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = ew; tmpCanvas.height = eh;
    var tmpCtx = tmpCanvas.getContext('2d');
    var numFrames = 36, cycleDur = 2;
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

  // Share current composition. If animated: encode GIF and share GIF file.
  // If static: share PNG.
  function sharePostcard(btn) {
    if (animMode === 'none') {
      renderToPngBlob(function (blob) {
        if (!blob) return;
        var file = new File([blob], 'electro-union-generator.png', { type: 'image/png' });
        shareFile(btn, file);
      });
      return;
    }
    // Animated — encode GIF synchronously inside the user-gesture window.
    // GIF encoding at 4:5 1080x1350 / 36 frames takes ~1-3s on desktop,
    // longer on mobile. Show busy state.
    btn.classList.add('is-busy');
    var origText = btn.textContent;
    btn.textContent = 'encoding…';
    // Defer one tick so UI can paint busy state
    setTimeout(function () {
      try {
        var gifBlob = renderToGifBlob();
        var file = new File([gifBlob], 'electro-union-generator.gif', { type: 'image/gif' });
        shareFile(btn, file);
      } finally {
        btn.classList.remove('is-busy');
        btn.textContent = origText;
      }
    }, 30);
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

  // Copy button (was LinkedIn). When animated, triggers GIF download
  // (heavier op → longer cooldown), otherwise writes PNG to clipboard.
  shareLiBtn.onclick = function () {
    var cd = (animMode === 'none') ? CLICK_COOLDOWN_MS : GIF_COOLDOWN_MS;
    if (!gatePass(this, cd)) return;
    copyPostcard(this);
  };

  // Share button (was Instagram). Shares GIF when animated, PNG when static.
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
