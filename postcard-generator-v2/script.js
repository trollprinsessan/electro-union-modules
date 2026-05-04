/*
 * Electro Union — Postcard Generator (v2)
 *
 * "Greetings from the Electro Union" — a postcard generator that lives
 * in a Webflow article calling on the EU to become the world's first
 * electro-continent. Every postcard sent = a campaign impression.
 *
 * THE FLOW
 *   1. Boot rack — full-bleed image cycler (~4s). Hard cut to generator.
 *   2. Pick a pastry/sticker → stamp the postcard front.
 *   3. Auto-tagline ("SAME BAGUETTE. OWN POWER.") renders on the card;
 *      user can override via the input below the workspace.
 *   4. SEND or SAVE → export carries the tagline + a non-removable
 *      campaign footer line ("MAKE EUROPE THE ELECTRO UNION · …").
 *      Counter increments via Supabase.
 *
 * IFRAME CONSTRAINT
 *   This module embeds cross-origin in Webflow. Chrome kills CSS
 *   `transition` and `@keyframes` inside cross-origin iframes. So:
 *     - No CSS transitions anywhere — every state change is instant.
 *     - The sticker @keyframes survive only as a non-iframe enhancement
 *       (the export uses canvas-rendered animations driven by JS, so
 *       iframe consumers still get the right exported MP4/GIF).
 *     - The boot rack swaps `<img>.src` instantly; the ticker swaps
 *       `textContent`; the multilingual switch label swaps `textContent`.
 *       All instant. None of them need transitions to feel right —
 *       per the brief, "every state change is instant, like flipping
 *       through postcards in a rack."
 */
(function(){

  // ═══ CAMPAIGN METADATA ═══
  var CAMPAIGN_URL_LABEL = 'norrsken.org/goodnews';
  var CAMPAIGN_FOOTER    = 'MAKE EUROPE THE ELECTRO UNION · ' + CAMPAIGN_URL_LABEL.toUpperCase();

  // Auto-taglines per pastry index. Mixed-case display, but the canvas
  // export forces uppercase to read like a poster.
  var PASTRY_TAGLINES = [
    'SAME BAGUETTE.\nOWN POWER.',
    'SAME STROOPWAFEL.\nOWN POWER.',
    'SAME FIKA.\nOWN POWER.',
    'SAME BAKLAVA.\nOWN POWER.',
    'SAME KÜRTŐS.\nOWN POWER.',
    'SAME CROISSANT.\nOWN POWER.',
    'SAME DANISH.\nOWN POWER.',
    'SAME PASTEL.\nOWN POWER.',
    'SAME SERNIK.\nOWN POWER.'
  ];

  // Lines for the bottom ticker — campaign manifesto fragments mixed with
  // classic postcard language. Rotates every ~3 seconds via instant swap.
  var TICKER_LINES = [
    'Greetings from the Electro Union',
    'Same pasta, own power',
    'Wish you were here',
    'The good life deserves to be resilient',
    'From Lisbon to Tallinn',
    'Weather: sunny, 50 Hz, grid stable',
    'Sending postcards since 1957',
    'Plug it in',
    'Having a wonderful time'
  ];

  // Multilingual translations of the lightswitch label. Cycles every
  // few seconds — postcard-rack souvenir-shop detail.
  var SWITCH_LABELS = [
    'Push for a treat',
    'Premi per una sorpresa',
    'Tryck för en överraskning',
    'Appuyez pour une surprise',
    'Drück für eine Überraschung',
    'Pulsa para una sorpresa',
    'Naciśnij na niespodziankę'
  ];

  // Tagline state — drawn by drawPostcardTagline on every export.
  // Auto-set on pastry pick, overridable via the input below the workspace.
  var currentTagline = '';
  var taglineUserOverridden = false;

  // ═══ ASSETS ═══
  // Indices 0-8 = pastries, 9-17 = EU stickers. data-sticker on each tile
  // matches this combined index.
  var STICKER_SRCS = [
    '../drawing/Updated Imagery/ai-generated-baguette-on-transparent-background-image-png.webp',
    '../drawing/Updated Imagery/DSC_0410-a.png',
    '../drawing/Updated Imagery/045.png',
    '../drawing/Updated Imagery/baklava_udate.png',
    '../drawing/Updated Imagery/kürtőskalács.png',
    '../drawing/Updated Imagery/pngimg.com - croissant_PNG46722.png',
    '../drawing/Updated Imagery/danish.png',
    '../drawing/Updated Imagery/pastelnata.webp',
    '../drawing/Updated Imagery/sernik.png',
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
  var EU_STICKER_OFFSET = 9;
  var EU_STICKER_BOOST  = 1.4;

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

  var stickerImgs = STICKER_SRCS.map(function(src){ var i=new Image(); i.src=src; return i; });
  BG_SRCS.forEach(function(src){ var i=new Image(); i.src=src; });

  // ═══ DOM REFS ═══
  var photo      = document.getElementById('euPg2Photo');
  var bgEl       = document.getElementById('euPg2Bg');
  var itemsEl    = document.getElementById('euPg2Items');
  var animBtns   = document.querySelectorAll('[data-anim]');
  var bgShow     = document.getElementById('euPg2BgShow');
  var bgShowImg  = bgShow.querySelector('img');
  var bgModal    = document.getElementById('euPg2BgModal');
  var bgColorEl  = document.getElementById('euPg2BgColor');
  var bgPicker   = document.getElementById('euPg2BgPicker');
  var bgSwatch   = document.getElementById('euPg2BgSwatch');
  var sizeSlider = document.getElementById('euPg2Size');
  var switchInput = document.getElementById('euPg2Switch');
  var pencilBtn  = document.getElementById('euPg2Pencil');
  var grabBtn    = document.getElementById('euPg2Grab');
  var undoBtn    = document.getElementById('euPg2Undo');
  var clearBtn   = document.getElementById('euPg2Clear');
  var shareBtn   = document.getElementById('euPg2Share');
  var dlBtn      = document.getElementById('euPg2Download');
  // OS chrome refs
  var bootEl     = document.getElementById('euOsBoot');
  var bootFill   = document.getElementById('euOsBootFill');
  var bootPct    = document.getElementById('euOsBootPct');
  var bootLabel  = document.getElementById('euOsBootLabel');
  var menubarEl  = document.getElementById('euOsMenubar');
  var windowEl   = document.getElementById('euOsWindow');
  var osInfoEl   = document.getElementById('euOsInfo');
  var clockEl    = document.getElementById('euOsClock');
  var dateEl     = document.getElementById('euOsDate');
  var soundBtn   = document.getElementById('euOsSound');
  var soundIcon  = document.getElementById('euOsSoundIcon');
  // Postcard generator chrome refs
  var tagInput   = document.getElementById('euPg2TaglineInput');
  var tagOverlay = document.getElementById('euPg2TaglineOverlay');
  var switchLbl  = document.getElementById('euPg2SwitchLabel');
  var tickerEl   = document.getElementById('euPg2TickerLine');
  var counterEl  = document.getElementById('euPg2CounterNum');
  var approveBox = document.getElementById('euPg2ApproveBox');
  var approveLbl = document.getElementById('euPg2Approve');
  var approveMark= approveLbl ? approveLbl.querySelector('.eu-pg2__chip-mark') : null;
  var closeBtn   = document.querySelector('.eu-os__window-close');

  // ═══ STATE ═══
  var currentFormat = 'feed'; // 'feed' (4:5) | 'story' (9:16)
  // each placement: { el, si, xPct, yPct, sizePct, rot, strokeId, isTreat }
  // A "stroke" is a group of stamps placed in one continuous draw action,
  // OR a single treat-dropped sticker. Grab mode drags the entire latest
  // stroke as one unit (no per-item selection).
  var placements = [];
  var undoStack  = [];
  var animMode   = 'none';
  var activeSticker = 0;
  var toolMode = 'draw';
  var strokeCounter = 0;
  var lastStrokeId = null;
  var bgMode = 'color';
  var bgColor = '#ffffff';
  var bgPhotoSrc = '';
  var bgPhotoImg = new Image();

  // ═══ STICKER PALETTE ═══
  function setActiveTile(idx){
    activeSticker = idx;
    document.querySelectorAll('[data-sticker]').forEach(function(t){
      t.classList.toggle('is-active', parseInt(t.getAttribute('data-sticker'),10)===idx);
    });
  }
  document.querySelectorAll('[data-sticker]').forEach(function(tile){
    var idx = parseInt(tile.getAttribute('data-sticker'),10) || 0;
    tile.addEventListener('click', function(){ setActiveTile(idx); });
  });

  // ═══ PLACE ═══
  function effectiveSizePct(p){
    if (p.isTreat) return p.sizePct;
    return p.si >= EU_STICKER_OFFSET ? p.sizePct * EU_STICKER_BOOST : p.sizePct;
  }
  function addPlacement(si, xPct, yPct, sizePct, rot, strokeId){
    var el = document.createElement('div');
    el.className = 'eu-pg2__item';
    el.style.left = xPct + '%';
    el.style.top  = yPct + '%';
    var visualSize = (si >= EU_STICKER_OFFSET) ? sizePct * EU_STICKER_BOOST : sizePct;
    el.style.width = visualSize + '%';
    if (rot) el.style.transform = 'translate(-50%,-50%) rotate(' + rot + 'deg)';
    if (strokeId != null) el.dataset.strokeId = String(strokeId);

    var anim = document.createElement('div');
    anim.className = 'eu-pg2__item-anim';
    var img = document.createElement('img');
    img.src = STICKER_SRCS[si];
    img.draggable = false;
    anim.appendChild(img);
    el.appendChild(anim);
    itemsEl.appendChild(el);

    var p = {
      el:el, si:si, xPct:xPct, yPct:yPct, sizePct:sizePct, rot:rot||0,
      strokeId: strokeId != null ? strokeId : null,
      isTreat:false
    };
    placements.push(p);
    el.style.setProperty('--i', String(placements.length - 1));
    updateGate();
    return p;
  }

  function clearAllPlacements(){
    placements.forEach(function(p){ p.el.remove(); });
    placements = [];
    undoStack = [];
    lastStrokeId = null;
    updateGate();
  }

  // ═══ PHOTO POINTER HANDLER ═══
  // 'draw' mode → pointerdown→up draws a stroke (stamps along the path).
  //   All stamps in the stroke share one strokeId; once the stroke ends,
  //   that id becomes lastStrokeId — the target for grab.
  // 'grab' mode → pointerdown→up drags the latest stroke as a unit;
  //   every stamp in that stroke translates by the same pointer delta.
  var drawing = false, strokeStartIdx = 0, lastDrawTime = 0, currentStrokeId = null;
  var grabbing = false, grabStartX = 0, grabStartY = 0, grabSnapshot = [];

  function dropAt(clientX, clientY){
    var rect = photo.getBoundingClientRect();
    var xPct = ((clientX - rect.left) / rect.width)  * 100;
    var yPct = ((clientY - rect.top)  / rect.height) * 100;
    addPlacement(activeSticker, xPct, yPct, parseFloat(sizeSlider.value), 0, currentStrokeId);
  }

  photo.addEventListener('pointerdown', function(e){
    if (toolMode === 'draw'){
      currentStrokeId = ++strokeCounter;
      drawing = true;
      strokeStartIdx = placements.length;
      lastDrawTime = Date.now();
      dropAt(e.clientX, e.clientY);
      try { photo.setPointerCapture(e.pointerId); } catch(_){}
      e.preventDefault();
      return;
    }
    if (toolMode === 'grab'){
      if (lastStrokeId == null) return;
      grabbing = true;
      grabStartX = e.clientX;
      grabStartY = e.clientY;
      grabSnapshot = placements
        .filter(function(p){ return p.strokeId === lastStrokeId; })
        .map(function(p){ return { p:p, x0:p.xPct, y0:p.yPct }; });
      photo.style.cursor = 'grabbing';
      try { photo.setPointerCapture(e.pointerId); } catch(_){}
      e.preventDefault();
    }
  });

  photo.addEventListener('pointermove', function(e){
    if (drawing){
      var now = Date.now();
      if (now - lastDrawTime < 35) return;
      lastDrawTime = now;
      dropAt(e.clientX, e.clientY);
      return;
    }
    if (grabbing){
      var rect = photo.getBoundingClientRect();
      var dxPct = ((e.clientX - grabStartX) / rect.width)  * 100;
      var dyPct = ((e.clientY - grabStartY) / rect.height) * 100;
      grabSnapshot.forEach(function(s){
        var nx = Math.max(0, Math.min(100, s.x0 + dxPct));
        var ny = Math.max(0, Math.min(100, s.y0 + dyPct));
        s.p.xPct = nx;
        s.p.yPct = ny;
        s.p.el.style.left = nx + '%';
        s.p.el.style.top  = ny + '%';
      });
    }
  });

  function endPhotoPointer(e){
    if (drawing){
      drawing = false;
      var n = placements.length - strokeStartIdx;
      if (n > 0){
        undoStack.push(n);
        lastStrokeId = currentStrokeId;
      }
      currentStrokeId = null;
    }
    if (grabbing){
      grabbing = false;
      grabSnapshot = [];
      photo.style.cursor = '';
    }
    try { photo.releasePointerCapture(e.pointerId); } catch(_){}
  }
  photo.addEventListener('pointerup', endPhotoPointer);
  photo.addEventListener('pointercancel', endPhotoPointer);

  // ═══ TOOL TOGGLE: pencil ↔ grab ═══
  function setToolMode(mode){
    toolMode = mode;
    pencilBtn.classList.toggle('is-active', mode === 'draw');
    grabBtn.classList.toggle('is-active', mode === 'grab');
    pencilBtn.setAttribute('aria-pressed', String(mode === 'draw'));
    grabBtn.setAttribute('aria-pressed', String(mode === 'grab'));
  }
  pencilBtn.addEventListener('click', function(){ setToolMode('draw'); });
  grabBtn.addEventListener('click',   function(){ setToolMode('grab'); });

  // ═══ ANIMATIONS ═══
  function setAnimMode(mode){
    animMode = mode;
    var classes = ['is-anim-bounce','is-anim-beat','is-anim-rotate','is-anim-wiggle','is-anim-orbit'];
    classes.forEach(function(c){ itemsEl.classList.remove(c); });
    if (mode !== 'none') itemsEl.classList.add('is-anim-' + mode);
    animBtns.forEach(function(b){
      b.classList.toggle('is-active', b.getAttribute('data-anim')===mode);
    });
  }
  animBtns.forEach(function(b){
    b.addEventListener('click', function(){
      setAnimMode(b.getAttribute('data-anim'));
    });
  });

  // ═══ BACKGROUND ═══
  function setBgImage(src){
    bgMode = 'image';
    bgPhotoSrc = src;
    bgPhotoImg = new Image();
    bgPhotoImg.src = src;
    bgEl.style.backgroundImage = 'url("' + src.replace(/"/g,'\\"') + '")';
    bgEl.style.backgroundColor = '';
    bgShowImg.src = src;
    bgShow.classList.add('is-active');
    bgColorEl.classList.remove('is-active');
    updateGate();
  }
  function setBgColor(col){
    bgMode = 'color';
    bgColor = col;
    bgEl.style.backgroundImage = '';
    bgEl.style.backgroundColor = col;
    bgSwatch.style.background = col;
    bgColorEl.classList.add('is-active');
    bgShow.classList.remove('is-active');
    updateGate();
  }
  setBgColor(bgColor);

  bgShow.addEventListener('click', function(){ bgModal.hidden = false; });
  bgModal.addEventListener('click', function(e){
    if (e.target.matches('[data-close]')) bgModal.hidden = true;
  });
  document.querySelectorAll('#euPg2BgSource [data-bg]').forEach(function(item){
    item.addEventListener('click', function(){
      setBgImage(item.getAttribute('data-bg'));
      bgModal.hidden = true;
    });
  });
  bgPicker.addEventListener('input', function(){ setBgColor(bgPicker.value); });

  // ═══ PUSH FOR A TREAT (lightswitch) ═══
  // Identical to the original postcard-generator's `sh()`: 10 rapid swaps
  // of a photographic background + a single full-size centered EU sticker,
  // then settles. No colour backgrounds, no animation.
  var treatTimer = null;
  function pushForTreat(){
    if (treatTimer) clearInterval(treatTimer);
    placements.forEach(function(p){ p.el.remove(); });
    placements = [];
    setAnimMode('none');
    setToolMode('draw');
    var treatStrokeId = ++strokeCounter;
    var p = addPlacement(EU_STICKER_OFFSET, 50, 50, 100, 0, treatStrokeId);
    p.isTreat = true;
    p.el.classList.add('is-treat');
    p.el.style.width = '100%'; // undo the EU-sticker boost addPlacement applied
    lastStrokeId = treatStrokeId;
    var c = 0, total = 10;
    var euCount = STICKER_SRCS.length - EU_STICKER_OFFSET;
    treatTimer = setInterval(function(){
      var si = EU_STICKER_OFFSET + Math.floor(Math.random() * euCount);
      setBgImage(BG_SRCS[Math.floor(Math.random()*BG_SRCS.length)]);
      p.si = si;
      p.el.querySelector('img').src = STICKER_SRCS[si];
      if (++c >= total){
        clearInterval(treatTimer);
        treatTimer = null;
      }
    }, 70);
    undoStack.push(1);
  }
  switchInput.addEventListener('change', function(){
    if (switchInput.checked){
      pushForTreat();
      setTimeout(function(){ switchInput.checked = false; }, 500);
    }
  });

  // ═══ UNDO / CLEAR ═══
  undoBtn.addEventListener('click', function(){
    if (undoStack.length > 0){
      var n = undoStack.pop();
      for (var i=0; i<n && placements.length>0; i++){
        var p = placements.pop();
        p.el.remove();
      }
      placements.forEach(function(x, i){ x.el.style.setProperty('--i', String(i)); });
      // recompute lastStrokeId
      lastStrokeId = placements.length ? placements[placements.length-1].strokeId : null;
      updateGate();
    }
  });
  clearBtn.addEventListener('click', function(){
    clearAllPlacements();
    setBgColor('#ffffff');
    setAnimMode('none');
  });

  // ═══ READY-STATE GATE ═══
  function updateGate(){
    var ready = placements.length > 0 || bgMode === 'image';
    [shareBtn, dlBtn].forEach(function(b){
      b.classList.toggle('is-disabled', !ready);
    });
  }
  updateGate();

  // ═══ EXPORT ═══
  function getExportDims(){
    return currentFormat === 'story' ? { w:1080, h:1920 } : { w:1080, h:1350 };
  }

  function renderExportFrame(c, mode, t, ew, eh){
    c.clearRect(0,0,ew,eh);
    c.fillStyle = bgColor || '#ffffff';
    c.fillRect(0,0,ew,eh);
    if (bgMode === 'image' && bgPhotoImg.complete && bgPhotoImg.naturalWidth > 0){
      var scale = Math.max(ew / bgPhotoImg.naturalWidth, eh / bgPhotoImg.naturalHeight);
      var bw = bgPhotoImg.naturalWidth * scale;
      var bh = bgPhotoImg.naturalHeight * scale;
      c.drawImage(bgPhotoImg, (ew-bw)/2, (eh-bh)/2, bw, bh);
    }
    for (var i=0; i<placements.length; i++){
      var p = placements[i];
      var img = stickerImgs[p.si];
      if (!img || !img.complete) continue;
      var cx = (p.xPct/100) * ew;
      var cy = (p.yPct/100) * eh;
      var s  = (effectiveSizePct(p) / 100) * ew;
      var phase = i * 0.45;
      var dx = 0, dy = 0, sc = 1, rot = (p.rot || 0) * Math.PI / 180;
      // Treat stickers never animate — they were dropped by Push for a Treat
      // and stay anchored regardless of animation mode.
      var effectiveMode = p.isTreat ? 'none' : mode;
      // Frequencies derived from animationPeriod() so MP4/GIF match the
      // live CSS preview exactly. Amplitudes match the CSS keyframes.
      var TWO_PI = Math.PI * 2;
      if (effectiveMode === 'bounce'){
        dy = Math.sin(t * (TWO_PI / 1.2) + phase) * s * 0.22;
      } else if (effectiveMode === 'beat'){
        sc = 1 + Math.sin(t * (TWO_PI / 1.0) + phase) * 0.18;
      } else if (effectiveMode === 'rotate'){
        // Continuous full rotation, period 1.6s
        rot += (t / 1.6) * TWO_PI + phase;
      } else if (effectiveMode === 'wiggle'){
        rot += Math.sin(t * (TWO_PI / 0.5) + phase) * 0.21; // ~12°
      } else if (effectiveMode === 'orbit'){
        dx = Math.cos(t * (TWO_PI / 1.4) + phase) * s * 0.25;
        dy = Math.sin(t * (TWO_PI / 1.4) + phase) * s * 0.25;
        rot += (t / 1.4) * TWO_PI + phase;
      }
      c.save();
      c.translate(cx + dx, cy + dy);
      if (rot) c.rotate(rot);
      if (sc !== 1) c.scale(sc, sc);
      var iw = img.naturalWidth || 1, ih = img.naturalHeight || 1;
      var ar = iw / ih;
      var dw = ar >= 1 ? s : s * ar;
      var dh = ar >= 1 ? s / ar : s;
      c.drawImage(img, -dw/2, -dh/2, dw, dh);
      c.restore();
    }
    drawPostcardTagline(c, ew, eh);
    drawCampaignFooter(c, ew, eh);
  }

  // ═══ POSTCARD TAGLINE ═══
  // Renders the active tagline as a Times Eighteen Bold overlay near the
  // bottom of the postcard. Auto-set by pastry pick, overridable by the
  // user input. Two-line max ("SAME BAGUETTE.\nOWN POWER."). White with a
  // text-shadow drop so it stays legible over any background.
  function drawPostcardTagline(c, ew, eh){
    var line = (currentTagline || '').toString().trim();
    if (!line) return;
    c.save();
    c.fillStyle = '#fff';
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    c.shadowColor = 'rgba(0,0,0,.55)';
    c.shadowBlur = Math.max(2, Math.round(ew * 0.005));
    c.shadowOffsetY = Math.max(1, Math.round(ew * 0.001));
    var lines = line.toUpperCase().split('\n');
    // Auto-size to fit the longest line within 88% of card width.
    var maxLineWidth = ew * 0.88;
    var fs = Math.round(eh * 0.075);
    while (fs > 14){
      c.font = 'bold ' + fs + 'px "Times Eighteen", Georgia, serif';
      var w = 0;
      for (var i=0; i<lines.length; i++){
        var lw = c.measureText(lines[i]).width;
        if (lw > w) w = lw;
      }
      if (w <= maxLineWidth) break;
      fs -= 2;
    }
    var lh = fs * 1.02;
    var blockH = lh * lines.length;
    // Sit ~10% up from the bottom edge of the card (above the campaign strip).
    var bottomMargin = Math.round(eh * 0.10);
    var startY = eh - bottomMargin - blockH/2 + lh/2;
    for (var j=0; j<lines.length; j++){
      c.fillText(lines[j], ew/2, startY + lh*j - lh/2);
    }
    c.restore();
  }

  // ═══ CAMPAIGN FOOTER ═══
  // A single non-removable line at the bottom edge — turns every export
  // into a campaign asset. No band, no microprint, no postmark; the brief
  // is explicit: one line, mono, white at 70% opacity.
  function drawCampaignFooter(c, ew, eh){
    c.save();
    var fs = Math.max(13, Math.round(eh * 0.013));
    c.fillStyle = 'rgba(255,255,255,.78)';
    c.shadowColor = 'rgba(0,0,0,.45)';
    c.shadowBlur = Math.max(2, Math.round(ew * 0.004));
    c.font = '500 ' + fs + 'px "ABC Schengen Mono", "Courier New", monospace';
    c.textBaseline = 'bottom';
    c.textAlign = 'center';
    var pad = Math.round(eh * 0.022);
    c.fillText(CAMPAIGN_FOOTER, ew/2, eh - pad);
    c.restore();
  }

  // Animation period in seconds — must match the CSS animation durations
  // above so the exported MP4/GIF loops the same as the live preview.
  function animationPeriod(mode){
    switch(mode){
      case 'bounce': return 1.2;
      case 'beat':   return 1.0;
      case 'rotate': return 1.6;
      case 'wiggle': return 0.5;
      case 'orbit':  return 1.4;
      default:       return 2;
    }
  }
  var EXPORT_LOOPS = 3;
  var EXPORT_FPS   = 30;

  // ── MP4 via WebCodecs (modern browsers / iOS 17.4+) ──
  function renderToMp4Blob(mode, ew, eh, numFrames, cycleDur){
    if (typeof window.VideoEncoder === 'undefined' || typeof window.Mp4Muxer === 'undefined'){
      return renderToMp4ViaMediaRecorder(mode, ew, eh, cycleDur);
    }
    return new Promise(function(resolve, reject){
      try {
        var Muxer = window.Mp4Muxer.Muxer;
        var ArrayBufferTarget = window.Mp4Muxer.ArrayBufferTarget;
        var fps = numFrames / cycleDur;
        var muxer = new Muxer({
          target: new ArrayBufferTarget(),
          video: { codec:'avc', width:ew, height:eh, frameRate:fps },
          fastStart:'in-memory'
        });
        var encoder = new VideoEncoder({
          output: function(chunk, meta){ muxer.addVideoChunk(chunk, meta); },
          error: reject
        });
        encoder.configure({ codec:'avc1.42E01E', width:ew, height:eh, bitrate:4_000_000, framerate:fps });
        var tmp = document.createElement('canvas');
        tmp.width = ew; tmp.height = eh;
        var tctx = tmp.getContext('2d');
        var frameUs = Math.round(1_000_000 / fps);
        for (var f=0; f<numFrames; f++){
          var t = f * (cycleDur / numFrames);
          renderExportFrame(tctx, mode, t, ew, eh);
          var frame = new VideoFrame(tmp, { timestamp: f*frameUs, duration: frameUs });
          encoder.encode(frame, { keyFrame: f%30===0 });
          frame.close();
        }
        encoder.flush().then(function(){
          muxer.finalize();
          resolve(new Blob([muxer.target.buffer], { type:'video/mp4' }));
        }).catch(reject);
      } catch(e){ reject(e); }
    });
  }

  // ── MP4 via MediaRecorder (iOS Safari fallback) ──
  function renderToMp4ViaMediaRecorder(mode, ew, eh, cycleDur){
    return new Promise(function(resolve, reject){
      if (typeof MediaRecorder === 'undefined') return reject(new Error('no MediaRecorder'));
      var mp4Mimes = ['video/mp4;codecs=avc1.42E01E','video/mp4;codecs=avc1','video/mp4'];
      var mime = null;
      for (var i=0; i<mp4Mimes.length; i++){
        if (MediaRecorder.isTypeSupported(mp4Mimes[i])){ mime = mp4Mimes[i]; break; }
      }
      if (!mime) return reject(new Error('no mp4 mime'));
      var c = document.createElement('canvas');
      c.width = ew; c.height = eh;
      var cx = c.getContext('2d');
      renderExportFrame(cx, mode, 0, ew, eh);
      var stream = c.captureStream(24);
      var rec;
      try { rec = new MediaRecorder(stream, { mimeType:mime, videoBitsPerSecond:4_000_000 }); }
      catch(e){ return reject(e); }
      var chunks = [];
      rec.ondataavailable = function(e){ if (e.data && e.data.size>0) chunks.push(e.data); };
      rec.onerror = function(e){ reject(e.error || new Error('recorder error')); };
      rec.onstop = function(){ resolve(new Blob(chunks, { type:'video/mp4' })); };
      var totalMs = cycleDur * 1000;
      var start = performance.now();
      function tick(){
        var elapsed = performance.now() - start;
        var t = (elapsed % totalMs) / 1000;
        renderExportFrame(cx, mode, t, ew, eh);
        if (elapsed < totalMs) requestAnimationFrame(tick);
        else try { rec.stop(); } catch(e){ reject(e); }
      }
      rec.start();
      requestAnimationFrame(tick);
    });
  }

  // ─── GIF encoder (lifted from generator/script.js, verbatim) ───
  function lzwEncode(pixels, minCode){
    var clr = 1 << minCode, eoi = clr + 1, cs = minCode + 1, nx = eoi + 1;
    var dict = {}, bits = 0, bc = 0, out = [];
    function emit(c){ bits |= (c << bc); bc += cs; while (bc >= 8){ out.push(bits & 0xff); bits >>= 8; bc -= 8; } }
    function reset(){ dict = {}; for (var i=0; i<clr; i++) dict[String.fromCharCode(i)] = i; nx = eoi + 1; cs = minCode + 1; }
    reset(); emit(clr);
    var w = String.fromCharCode(pixels[0]);
    for (var i=1; i<pixels.length; i++){
      var c = String.fromCharCode(pixels[i]), wc = w + c;
      if (dict[wc] !== undefined){ w = wc; }
      else { emit(dict[w]); if (nx < 4096){ dict[wc] = nx++; if (nx > (1 << cs) && cs < 12) cs++; } else { emit(clr); reset(); } w = c; }
    }
    emit(dict[w]); emit(eoi);
    if (bc > 0) out.push(bits & 0xff);
    return out;
  }
  function buildGIF(frames, w, h, delay, palette){
    var buf = [];
    function ws(s){ for (var i=0; i<s.length; i++) buf.push(s.charCodeAt(i)); }
    function w16(v){ buf.push(v & 0xff, (v >> 8) & 0xff); }
    function wb(v){ buf.push(v & 0xff); }
    var pal = [];
    for (var i=0; i<256; i++){ pal.push(palette[i][0], palette[i][1], palette[i][2]); }
    ws('GIF89a'); w16(w); w16(h); wb(0xf7); wb(0); wb(0);
    for (var i=0; i<768; i++) wb(pal[i]);
    wb(0x21); wb(0xff); wb(11); ws('NETSCAPE2.0'); wb(3); wb(1); w16(0); wb(0);
    for (var f=0; f<frames.length; f++){
      wb(0x21); wb(0xf9); wb(4); wb(0x00); w16(delay); wb(0); wb(0);
      wb(0x2c); w16(0); w16(0); w16(w); w16(h); wb(0); wb(8);
      var comp = lzwEncode(frames[f], 8);
      var p = 0;
      while (p < comp.length){ var bl = Math.min(255, comp.length - p); wb(bl); for (var j=0; j<bl; j++) wb(comp[p++]); }
      wb(0);
    }
    wb(0x3b);
    return new Blob([new Uint8Array(buf)], { type:'image/gif' });
  }
  function buildAdaptivePalette(imgData, maxColors){
    maxColors = maxColors || 256;
    var data = imgData.data, n = data.length / 4;
    var pixels = [];
    for (var i=0; i<n; i+=2){ pixels.push([data[i*4], data[i*4+1], data[i*4+2]]); }
    var uniq = {}, uniqArr = [];
    for (var i=0; i<pixels.length; i++){
      var key = ((pixels[i][0] >> 3) << 10) | ((pixels[i][1] >> 3) << 5) | (pixels[i][2] >> 3);
      if (!uniq[key]){ uniq[key] = { r:0,g:0,b:0,n:0 }; uniqArr.push(uniq[key]); }
      uniq[key].r += pixels[i][0]; uniq[key].g += pixels[i][1]; uniq[key].b += pixels[i][2]; uniq[key].n++;
    }
    var dedup = [];
    for (var i=0; i<uniqArr.length; i++){
      var u = uniqArr[i];
      dedup.push([Math.round(u.r/u.n), Math.round(u.g/u.n), Math.round(u.b/u.n)]);
    }
    function vol(box){ return (box.rMax-box.rMin) * (box.gMax-box.gMin) * (box.bMax-box.bMin); }
    function makeBox(px){
      var rMin=255,rMax=0,gMin=255,gMax=0,bMin=255,bMax=0;
      for (var i=0; i<px.length; i++){
        var p = px[i];
        if (p[0]<rMin) rMin=p[0]; if (p[0]>rMax) rMax=p[0];
        if (p[1]<gMin) gMin=p[1]; if (p[1]>gMax) gMax=p[1];
        if (p[2]<bMin) bMin=p[2]; if (p[2]>bMax) bMax=p[2];
      }
      return { px:px,rMin:rMin,rMax:rMax,gMin:gMin,gMax:gMax,bMin:bMin,bMax:bMax };
    }
    function splitBox(box){
      var rr=box.rMax-box.rMin, gr=box.gMax-box.gMin, br=box.bMax-box.bMin;
      var ch = rr>=gr && rr>=br ? 0 : (gr>=br ? 1 : 2);
      box.px.sort(function(a,b){ return a[ch]-b[ch]; });
      var mid = Math.floor(box.px.length / 2);
      return [makeBox(box.px.slice(0, mid)), makeBox(box.px.slice(mid))];
    }
    var boxes = [makeBox(dedup)];
    while (boxes.length < maxColors){
      var best=-1, bestVol=-1;
      for (var i=0; i<boxes.length; i++){ if (boxes[i].px.length > 1){ var v = vol(boxes[i]); if (v > bestVol){ bestVol = v; best = i; } } }
      if (best < 0) break;
      var pair = splitBox(boxes[best]);
      boxes.splice(best, 1, pair[0], pair[1]);
    }
    var palette = [];
    for (var i=0; i<boxes.length; i++){
      var bx = boxes[i], rs=0, gs=0, bs=0;
      for (var j=0; j<bx.px.length; j++){ rs += bx.px[j][0]; gs += bx.px[j][1]; bs += bx.px[j][2]; }
      var c = bx.px.length;
      palette.push([Math.round(rs/c), Math.round(gs/c), Math.round(bs/c)]);
    }
    while (palette.length < 256) palette.push([0,0,0]);
    return palette;
  }
  function quantizeFrameAdaptive(c, w, h, palette){
    var data = c.getImageData(0, 0, w, h).data;
    var idx = new Uint8Array(w * h);
    var cache = {};
    for (var i=0; i<w*h; i++){
      var r = data[i*4], g = data[i*4+1], b = data[i*4+2];
      var key = ((r>>3) << 10) | ((g>>3) << 5) | (b>>3);
      if (cache[key] !== undefined){ idx[i] = cache[key]; continue; }
      var bestD = Infinity, bestJ = 0;
      for (var j=0; j<256; j++){
        var dr = r - palette[j][0], dg = g - palette[j][1], db = b - palette[j][2];
        var d = dr*dr + dg*dg + db*db;
        if (d < bestD){ bestD = d; bestJ = j; }
      }
      cache[key] = bestJ; idx[i] = bestJ;
    }
    return idx;
  }

  // GIFs loop natively (NETSCAPE2.0 with count=0), so encoding one full
  // animation period is enough — playback repeats forever. Capped to 720px
  // wide so encoding stays inside iOS's user-gesture window during share.
  function renderToGifBlob(mode){
    var d = getExportDims();
    var ew = Math.min(720, d.w);
    var eh = Math.round(ew * d.h / d.w);
    var tmp = document.createElement('canvas');
    tmp.width = ew; tmp.height = eh;
    var tctx = tmp.getContext('2d');
    var cycleDur = animationPeriod(mode);
    var numFrames = Math.max(12, Math.round(cycleDur * 18));
    renderExportFrame(tctx, mode, 0, ew, eh);
    var palette = buildAdaptivePalette(tctx.getImageData(0, 0, ew, eh), 256);
    var gifFrames = [];
    for (var f=0; f<numFrames; f++){
      var t = f * (cycleDur / numFrames);
      renderExportFrame(tctx, mode, t, ew, eh);
      gifFrames.push(quantizeFrameAdaptive(tctx, ew, eh, palette));
    }
    var delay = Math.round((cycleDur / numFrames) * 100);
    return buildGIF(gifFrames, ew, eh, delay, palette);
  }

  function downloadBlob(blob, name){
    var a = document.createElement('a');
    a.download = name;
    a.href = URL.createObjectURL(blob);
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 5000);
  }
  function renderStillPng(cb){
    var d = getExportDims(), ew = d.w, eh = d.h;
    var c = document.createElement('canvas');
    c.width = ew; c.height = eh;
    var cx = c.getContext('2d');
    renderExportFrame(cx, 'none', 0, ew, eh);
    c.toBlob(cb, 'image/png');
  }

  // SAVE POSTCARD: animated → MP4 (3 loops); still → PNG.
  // Counter ticks on every successful export — every postcard sent is a
  // campaign impression.
  dlBtn.addEventListener('click', function(){
    if (dlBtn.classList.contains('is-disabled') || dlBtn.classList.contains('is-busy')) return;
    if (animMode === 'none'){
      renderStillPng(function(blob){
        if (blob){
          downloadBlob(blob, 'electro-union-postcard.png');
          incrementCounter();
        }
      });
      return;
    }
    var d = getExportDims(), ew = d.w, eh = d.h;
    var cycleDur = animationPeriod(animMode) * EXPORT_LOOPS;
    var numFrames = Math.round(cycleDur * EXPORT_FPS);
    dlBtn.classList.add('is-busy');
    var orig = dlBtn.textContent;
    dlBtn.textContent = 'ENCODING…';
    renderToMp4Blob(animMode, ew, eh, numFrames, cycleDur)
      .catch(function(){ return renderToMp4ViaMediaRecorder(animMode, ew, eh, cycleDur); })
      .then(function(blob){
        downloadBlob(blob, 'electro-union-postcard.mp4');
        incrementCounter();
      })
      .catch(function(){
        dlBtn.textContent = 'SAVE FAILED';
      })
      .then(function(){
        dlBtn.classList.remove('is-busy');
        if (dlBtn.textContent === 'ENCODING…') dlBtn.textContent = orig;
        setTimeout(function(){ dlBtn.textContent = orig; }, 2200);
      });
  });

  // SEND POSTCARD: animated → GIF (loops natively); still → PNG. Web Share
  // API on mobile, downloadBlob fallback on desktop.
  shareBtn.addEventListener('click', function(){
    if (shareBtn.classList.contains('is-disabled') || shareBtn.classList.contains('is-busy')) return;
    function share(file){
      var shareData = { files:[file] };
      // Best-effort: include a text payload so the share sheet pre-fills
      // a caption when the target supports it (iOS Messages, WhatsApp,
      // some browsers' LinkedIn share). Many platforms ignore it.
      try {
        var line = (currentTagline || '').replace(/\n/g, ' ').trim();
        shareData.text = 'Greetings from the Electro Union. 🇪🇺' +
                         (line ? ' ' + line : '') +
                         '\nnorrsken.org/goodnews/make-europe-the-electro-union';
      } catch(_){}
      if (navigator.canShare && navigator.canShare({ files:[file] })){
        navigator.share(shareData).then(incrementCounter).catch(function(){});
      } else {
        downloadBlob(file, file.name);
        incrementCounter();
      }
    }
    if (animMode === 'none'){
      renderStillPng(function(blob){
        if (!blob) return;
        share(new File([blob], 'electro-union-postcard.png', { type:'image/png' }));
      });
      return;
    }
    shareBtn.classList.add('is-busy');
    var orig = shareBtn.textContent;
    shareBtn.textContent = 'ENCODING…';
    setTimeout(function(){
      try {
        var gif = renderToGifBlob(animMode);
        share(new File([gif], 'electro-union-postcard.gif', { type:'image/gif' }));
      } catch(e){
        shareBtn.textContent = 'SEND FAILED';
      }
      shareBtn.classList.remove('is-busy');
      setTimeout(function(){ shareBtn.textContent = orig; }, 2200);
    }, 30);
  });

  // Pre-select the baguette pastry and seed its tagline.
  setActiveTile(0);
  setTagline(PASTRY_TAGLINES[0]);

  // ═══════════════════════════════════════════════════════════════════════
  // BOOT — fake-OS startup splash.
  // Animates the segmented progress bar from 0→98% over ~3s while
  // rotating a stage label ("Requesting postcard.psf" → "Connecting to
  // continental relay" → "Decoding postal manifest"). Hard-cuts to the
  // desktop, revealing menubar + window + os-info strip.
  // ═══════════════════════════════════════════════════════════════════════
  var BOOT_LABELS = [
    'Requesting postcard.psf',
    'Connecting to continental relay',
    'Verifying member credentials',
    'Decoding postal manifest',
    'Loading rack imagery',
    'Establishing FM channel'
  ];
  (function bootSplash(){
    if (!bootEl || !bootFill || !bootPct) return;
    var BOOT_DURATION = 3200;
    var TARGET = 98; // % to settle at, like a real fake-OS splash
    var start = performance.now();
    var lastLabelIdx = -1;
    function tick(now){
      var t = Math.min(1, (now - start) / BOOT_DURATION);
      // Mild ease-out so the bar fills fast then slows — feels like a
      // real connection establishing, not a uniform timer.
      var eased = 1 - Math.pow(1 - t, 1.6);
      var pct = Math.round(eased * TARGET);
      bootFill.style.width = pct + '%';
      bootPct.textContent = pct + '%';
      // Rotate the stage label every ~600ms.
      var labelIdx = Math.min(BOOT_LABELS.length - 1, Math.floor((now - start) / 600));
      if (labelIdx !== lastLabelIdx){
        lastLabelIdx = labelIdx;
        if (bootLabel) bootLabel.textContent = BOOT_LABELS[labelIdx];
      }
      if (t < 1){
        requestAnimationFrame(tick);
      } else {
        // Hold a beat at 98%, then dismiss instantly. No transitions.
        setTimeout(function(){
          if (bootEl) bootEl.hidden = true;
          if (menubarEl) menubarEl.hidden = false;
          if (windowEl)  windowEl.hidden  = false;
          if (osInfoEl)  osInfoEl.hidden  = false;
        }, 320);
      }
    }
    requestAnimationFrame(tick);
  })();

  // ═══════════════════════════════════════════════════════════════════════
  // CET CLOCK + APERITIVO HOUR
  // Ticks every second. The aperitivo class flips on between 18:00–20:00
  // CET — the desktop tints, the ticker shifts to aperitivo lines, and
  // the SEND button leans warm. Italo disco hours.
  // ═══════════════════════════════════════════════════════════════════════
  function getCETParts(){
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Brussels',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(new Date());
      var get = function(t){
        var p = parts.find(function(x){ return x.type === t; });
        return p ? p.value : '';
      };
      return {
        weekday: get('weekday').toUpperCase().slice(0,3),
        day: parseInt(get('day'),10) || 0,
        month: get('month').toUpperCase().slice(0,3),
        year: get('year'),
        hour: parseInt(get('hour'),10) || 0,
        minute: get('minute')
      };
    } catch(_) {
      var d = new Date();
      var DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
      var MO = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      return {
        weekday: DAYS[d.getDay()], day: d.getDate(), month: MO[d.getMonth()],
        year: String(d.getFullYear()),
        hour: d.getHours(), minute: ('0'+d.getMinutes()).slice(-2)
      };
    }
  }
  function tickClock(){
    var p = getCETParts();
    if (clockEl) clockEl.textContent = ('0'+p.hour).slice(-2) + ':' + p.minute;
    if (dateEl)  dateEl.textContent  = p.weekday + ' ' + p.day + ' ' + p.month + ' ' + p.year;
    var aperitivo = (p.hour >= 18 && p.hour < 20);
    document.body.classList.toggle('is-aperitivo', aperitivo);
  }
  tickClock();
  setInterval(tickClock, 1000);

  // Swap the ticker line set when aperitivo is on.
  var APERITIVO_TICKER_LINES = [
    'Aperitivo hour · 18:00 to 20:00 CET',
    'Negroni, sbagliato, with prosecco in it',
    'Olives, taralli, the day winding down',
    'Same spritz, own power',
    'Italo disco from now until the streetlights come on',
    'Greetings from the Electro Union'
  ];

  // ═══════════════════════════════════════════════════════════════════════
  // KONAMI CODE — golden-hour palette unlocks on ↑↑↓↓←→←→BA
  // ═══════════════════════════════════════════════════════════════════════
  (function konami(){
    var seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    var i = 0;
    document.addEventListener('keydown', function(e){
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === seq[i]){
        i++;
        if (i === seq.length){
          document.body.classList.toggle('is-golden');
          i = 0;
        }
      } else {
        i = (k === seq[0]) ? 1 : 0;
      }
    });
  })();

  // ═══════════════════════════════════════════════════════════════════════
  // WEBAUDIO SWITCH-CLICK + GLOBAL SOUND TOGGLE
  // Wall-switch click is a brief filtered noise burst, synthesised on the
  // fly via WebAudio. Sound toggle in the menubar mutes everything; state
  // persists in localStorage.
  // ═══════════════════════════════════════════════════════════════════════
  var soundMuted = (function(){
    try { return localStorage.getItem('eu_sound_muted') === '1'; } catch(_){ return false; }
  })();
  function applySoundUi(){
    if (!soundBtn) return;
    soundBtn.setAttribute('aria-pressed', soundMuted ? 'true' : 'false');
    if (soundIcon) soundIcon.textContent = soundMuted ? '🔇' : '🔊';
  }
  applySoundUi();
  if (soundBtn){
    soundBtn.addEventListener('click', function(){
      soundMuted = !soundMuted;
      try { localStorage.setItem('eu_sound_muted', soundMuted ? '1' : '0'); } catch(_){}
      applySoundUi();
    });
  }

  var audioCtx = null;
  function getAudioCtx(){
    if (!audioCtx){
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx){
        try { audioCtx = new Ctx(); } catch(_){ audioCtx = null; }
      }
    }
    if (audioCtx && audioCtx.state === 'suspended'){
      try { audioCtx.resume(); } catch(_){}
    }
    return audioCtx;
  }
  function playSwitchClick(){
    if (soundMuted) return;
    var ctx = getAudioCtx();
    if (!ctx) return;
    try {
      // Brief filtered noise burst with a sharp envelope — reads as a
      // mechanical wall-switch click.
      var dur = 0.05;
      var bufferSize = Math.max(64, Math.round(ctx.sampleRate * dur));
      var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i=0; i<bufferSize; i++){
        // Decaying noise — sharper attack, exponential tail.
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/bufferSize, 3);
      }
      var src = ctx.createBufferSource();
      src.buffer = buffer;
      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2400;
      filter.Q.value = 0.7;
      var gain = ctx.createGain();
      gain.gain.value = 0.45;
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start();
    } catch(_){}
  }
  // Trigger on every lightswitch toggle (both directions).
  if (switchInput){
    switchInput.addEventListener('change', playSwitchClick);
  }
  // Also wire to the close button (decorative — plays click but doesn't
  // actually close anything).
  if (closeBtn){
    closeBtn.addEventListener('click', function(){
      playSwitchClick();
      // Visually flash the title bar so the click feels acknowledged.
      var tb = closeBtn.parentElement;
      if (tb){
        var prev = tb.style.background;
        tb.style.background = '#1a1a1a';
        var prevColor = '';
        var titleEl = tb.querySelector('.eu-os__window-title');
        if (titleEl){ prevColor = titleEl.style.color; titleEl.style.color = '#fdfaf4'; }
        setTimeout(function(){
          tb.style.background = prev;
          if (titleEl) titleEl.style.color = prevColor;
        }, 110);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TICKER — instant line swap every ~3 seconds. Reads from APERITIVO_*
  // lines when the body has .is-aperitivo, otherwise the default set.
  // ═══════════════════════════════════════════════════════════════════════
  (function tickerRotation(){
    if (!tickerEl) return;
    var i = 0;
    function currentLines(){
      return document.body.classList.contains('is-aperitivo')
        ? APERITIVO_TICKER_LINES
        : TICKER_LINES;
    }
    tickerEl.textContent = currentLines()[0];
    setInterval(function(){
      var lines = currentLines();
      i = (i + 1) % lines.length;
      tickerEl.textContent = lines[i];
    }, 3000);
  })();

  // ═══════════════════════════════════════════════════════════════════════
  // MULTILINGUAL SWITCH LABEL — instant translation swap every 5 seconds.
  // ═══════════════════════════════════════════════════════════════════════
  (function switchLabelRotation(){
    if (!switchLbl) return;
    var i = 0;
    setInterval(function(){
      i = (i + 1) % SWITCH_LABELS.length;
      switchLbl.textContent = SWITCH_LABELS[i];
    }, 5000);
  })();

  // ═══════════════════════════════════════════════════════════════════════
  // TAGLINE — auto-set from active pastry, override via input.
  // The DOM overlay shows it live on the postcard; the canvas export
  // draws it on every PNG/GIF/MP4 via drawPostcardTagline().
  // ═══════════════════════════════════════════════════════════════════════
  function setTagline(text){
    currentTagline = (text || '').toString();
    if (tagOverlay) tagOverlay.textContent = currentTagline.toUpperCase();
  }
  // Wrap setActiveTile so picking a pastry seeds its tagline (unless the
  // user has already typed a custom one).
  var origSetActiveTile = setActiveTile;
  setActiveTile = function(idx){
    origSetActiveTile(idx);
    if (idx >= 0 && idx < EU_STICKER_OFFSET && !taglineUserOverridden){
      setTagline(PASTRY_TAGLINES[idx]);
      if (tagInput) tagInput.value = PASTRY_TAGLINES[idx].replace(/\n/g, ' ');
    }
  };
  // Re-bind tile click handlers to the wrapped fn (the originals were
  // bound earlier, so we attach again — duplicate listener is fine, both
  // call setActiveTile and the wrapped version handles tagline).
  document.querySelectorAll('[data-sticker]').forEach(function(tile){
    var idx = parseInt(tile.getAttribute('data-sticker'),10) || 0;
    tile.addEventListener('click', function(){ setActiveTile(idx); });
  });
  // Custom override
  if (tagInput){
    tagInput.value = PASTRY_TAGLINES[0].replace(/\n/g, ' ');
    tagInput.addEventListener('input', function(){
      taglineUserOverridden = tagInput.value.trim().length > 0 &&
                              tagInput.value.trim() !== PASTRY_TAGLINES[activeSticker].replace(/\n/g, ' ');
      // Treat user input as one or two lines: split on " . " or full stop
      // followed by space, otherwise show as one line.
      var v = tagInput.value;
      var parts = v.split(/\.\s+/);
      if (parts.length === 2 && parts[0] && parts[1]){
        setTagline(parts[0].trim() + '.\n' + parts[1].trim());
      } else {
        setTagline(v);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // I APPROVE checkbox — visual checkmark only. The brief leaves the
  // counter increment on actual export, not on this checkbox.
  // ═══════════════════════════════════════════════════════════════════════
  if (approveBox && approveLbl && approveMark){
    approveBox.addEventListener('change', function(){
      var on = approveBox.checked;
      approveLbl.classList.toggle('is-checked', on);
      approveMark.textContent = on ? '☑' : '☐';
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // POSTCARD COUNTER — pulls count from Supabase on load and increments
  // on every successful export. Reuses the same `get_approval_count` /
  // `increment_and_get_count` RPCs the gate module uses, so a postcard
  // sent counts as a public approval of the open letter.
  // ═══════════════════════════════════════════════════════════════════════
  var counterValue = 0;
  function setCounterDisplay(n){
    counterValue = n || 0;
    if (counterEl) counterEl.textContent = counterValue.toLocaleString();
  }
  (function loadCounter(){
    if (!window.EU_SUPABASE) return;
    window.EU_SUPABASE.rpc('get_approval_count').then(function(count){
      var n = parseInt(count) || 0;
      setCounterDisplay(n);
    }).catch(function(){ setCounterDisplay(0); });
  })();
  function incrementCounter(){
    // Optimistic update — bump local counter immediately, then sync.
    setCounterDisplay(counterValue + 1);
    if (!window.EU_SUPABASE) return;
    window.EU_SUPABASE.rpc('increment_and_get_count').then(function(count){
      var n = parseInt(count);
      if (!isNaN(n) && n > 0) setCounterDisplay(n);
    }).catch(function(){});
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FM PLAYER — new behaviours for the Poolsuite-style layout.
  // All instant (no CSS transitions — iframe constraint).
  // ═══════════════════════════════════════════════════════════════════════

  // ─── FM TAB SWITCHING ────────────────────────────────────────────────
  (function fmTabs(){
    var tabs = document.querySelectorAll('[data-fm-tab]');
    var panels = document.querySelectorAll('[data-fm-panel]');
    if (!tabs.length) return;
    tabs.forEach(function(tab){
      tab.addEventListener('click', function(){
        var target = tab.getAttribute('data-fm-tab');
        tabs.forEach(function(t){
          t.classList.toggle('is-active', t.getAttribute('data-fm-tab') === target);
          t.setAttribute('aria-selected', String(t.getAttribute('data-fm-tab') === target));
        });
        panels.forEach(function(p){
          p.hidden = p.getAttribute('data-fm-panel') !== target;
        });
      });
    });
  })();

  // ─── SUB-TABS (Pastry / Stickers) ────────────────────────────────────
  (function subTabs(){
    var tabs = document.querySelectorAll('[data-tab]');
    if (!tabs.length) return;
    tabs.forEach(function(tab){
      tab.addEventListener('click', function(){
        var target = tab.getAttribute('data-tab');
        var parent = tab.closest('[data-fm-panel]') || document;
        parent.querySelectorAll('[data-tab]').forEach(function(t){
          t.classList.toggle('is-active', t.getAttribute('data-tab') === target);
        });
        parent.querySelectorAll('[data-tab-panel]').forEach(function(p){
          p.hidden = p.getAttribute('data-tab-panel') !== target;
        });
      });
    });
  })();

  // ─── HEART FAVOURITE ─────────────────────────────────────────────────
  (function heartFav(){
    var heartBtn = document.getElementById('euFmHeart');
    if (!heartBtn) return;
    var key = 'eu_heart_fav';
    var on = (function(){ try { return localStorage.getItem(key) === '1'; } catch(_){ return false; } })();
    function applyHeart(){
      heartBtn.setAttribute('aria-pressed', String(on));
      heartBtn.textContent = on ? '♥' : '♡';
      heartBtn.classList.toggle('is-active', on);
    }
    applyHeart();
    heartBtn.addEventListener('click', function(){
      on = !on;
      try { localStorage.setItem(key, on ? '1' : '0'); } catch(_){}
      applyHeart();
    });
  })();

  // ─── FM TRACK TITLE SYNC ─────────────────────────────────────────────
  // Mirrors the postcard tagline into the FM track-title element.
  (function trackTitleSync(){
    var trackTitleEl = document.getElementById('euFmTrackTitle');
    if (!trackTitleEl) return;
    var origSetTagline = setTagline;
    setTagline = function(text){
      origSetTagline(text);
      var display = (text || '').toUpperCase().replace(/\n/g, ' ');
      trackTitleEl.textContent = display || 'GREETINGS FROM THE ELECTRO UNION';
    };
    // Seed on init
    var t = (currentTagline || '').toUpperCase().replace(/\n/g, ' · ');
    if (t) trackTitleEl.textContent = t;
  })();

  // ─── SIZE SLIDER — halftone fill + readout ────────────────────────────
  (function sizeSliderUI(){
    var slider  = document.getElementById('euPg2Size');
    var fill    = document.getElementById('euPg2SizeFill');
    var readout = document.getElementById('euPg2SizeReadout');
    if (!slider) return;
    function update(){
      var pct = (slider.value - slider.min) / (slider.max - slider.min) * 100;
      if (fill)    fill.style.width = pct + '%';
      if (readout) readout.textContent = slider.value;
    }
    update();
    slider.addEventListener('input', update);
  })();

  // ─── FORMAT TOGGLE ────────────────────────────────────────────────────
  (function formatToggle(){
    var btns       = document.querySelectorAll('[data-format]');
    var fileDimsEl = document.getElementById('euFmFileDims');
    var fileRatioEl= document.getElementById('euFmFileRatio');
    var framedEl   = document.getElementById('euPg2Framed');
    var frameImg   = framedEl ? framedEl.querySelector('.eu-pg2__frame') : null;
    var FRAME_FEED  = '../postcard-generator/Updated Imagery/FRAME1 UPDATED.png';
    var FRAME_STORY = '../postcard-generator/Updated Imagery/Frame_drawing pad_mobile.png';
    if (!btns.length) return;
    function applyFormat(fmt){
      currentFormat = fmt;
      btns.forEach(function(b){
        b.classList.toggle('is-active', b.getAttribute('data-format') === fmt);
      });
      if (fileDimsEl)  fileDimsEl.textContent  = fmt === 'story' ? '1080 × 1920' : '1080 × 1350';
      if (fileRatioEl) fileRatioEl.textContent = fmt === 'story' ? '9:16' : '4:5';
      if (framedEl)    framedEl.style.aspectRatio = fmt === 'story' ? '1063/1742' : '';
      if (frameImg)    frameImg.src = fmt === 'story' ? FRAME_STORY : FRAME_FEED;
    }
    btns.forEach(function(btn){
      btn.addEventListener('click', function(){
        applyFormat(btn.getAttribute('data-format'));
      });
    });
  })();

  // ─── DISPLAY MODE (Normal / Invert) ──────────────────────────────────
  (function displayMode(){
    var btns    = document.querySelectorAll('[data-display]');
    var photoEl = document.getElementById('euPg2Photo');
    if (!btns.length || !photoEl) return;
    btns.forEach(function(btn){
      btn.addEventListener('click', function(){
        var mode = btn.getAttribute('data-display');
        btns.forEach(function(b){
          b.classList.toggle('is-active', b.getAttribute('data-display') === mode);
        });
        photoEl.classList.toggle('is-inverted', mode === 'invert');
      });
    });
  })();

  // ─── CURSOR / POINTER SWAP ───────────────────────────────────────────
  (function cursorSwap(){
    var btns = document.querySelectorAll('[data-pointer]');
    if (!btns.length) return;
    var CURSORS = {
      bolt:   'default',
      pencil: 'crosshair',
      stamp:  'copy'
    };
    btns.forEach(function(btn){
      btn.addEventListener('click', function(){
        var p = btn.getAttribute('data-pointer');
        btns.forEach(function(b){
          b.classList.toggle('is-active', b.getAttribute('data-pointer') === p);
        });
        try {
          document.documentElement.style.setProperty('--eu-cursor', CURSORS[p] || 'auto');
        } catch(_){}
      });
    });
  })();

})();
