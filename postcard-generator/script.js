/*
 * Electro Union — Postcard Generator Module Script
 *
 * Kräver: ../_shared/embed.js (för window.EU_IS_EMBED)
 *
 * Källa: golden/electro-union-module.html rader:
 *   2879-2890 (BG/ST arrays + refs + default bg)
 *   3199-3232 (preload, shuffle sh(), byline preview, light switch)
 *   3234-3262 (download PNG via canvas)
 *
 * Beteende:
 *   - Klick på fotot eller på light-switchen → shuffle (10 snabba byten)
 *   - Byline-input uppdaterar live preview
 *   - Download renderar 1080x1350 PNG via offscreen-canvas med byline-overlay
 */

(function () {
  var BG = [
    'BACKGROUNDS/Image_1.png',
    'BACKGROUNDS/Image_3.png',
    'BACKGROUNDS/Image_4.png',
    'BACKGROUNDS/Image_6.png',
    'BACKGROUNDS/Plage 1 copy.jpg',
    'BACKGROUNDS/butter.jpg',
    'BACKGROUNDS/ezgif-385a4b8503da6341.gif',
    'BACKGROUNDS/fc7c5841b4c129d0408f9ba2e7c46c1e.jpg',
    'BACKGROUNDS/original_13fd824f7a714b157c38b1c74874c102.jpg',
    'BACKGROUNDS/original_229e9d187d588a7fee6e7ea2930b5f12.png',
    'BACKGROUNDS/original_2402ef13beb9b704f676c00af5eb7d72 (1).jpg',
    'BACKGROUNDS/original_24386db4bdc673a8e2c127178587ce68.jpg',
    'BACKGROUNDS/original_314002582b30e1f59d60f6cc449c4893 (2).jpg',
    'BACKGROUNDS/original_370d3cb96067f4e231797ed5beb3a6cf.jpg',
    'BACKGROUNDS/original_40029e1f1ca3d8edb74a4a76d6898690.jpg',
    'BACKGROUNDS/original_4bdc51e802b02410cc5d4aa472900c38.jpg',
    'BACKGROUNDS/original_7ca01b4f8b02fa3ab601c9341bfd60d6.jpg',
    'BACKGROUNDS/original_827931d0025519cb087cb567ddbc1e31.png',
    'BACKGROUNDS/original_8d84e36822d69f3babb8a64f86366b97.jpg',
    'BACKGROUNDS/original_da6863c3bb938276289d0e850bb17375.jpg'
  ];
  var ST = [
    'STICKERS/EU_Stickers_1080x1350_01.png',
    'STICKERS/EU_Stickers_1080x1350_02.png',
    'STICKERS/EU_Stickers_1080x1350_03.png',
    'STICKERS/EU_Stickers_1080x1350_04.png',
    'STICKERS/EU_Stickers_1080x1350_08.png',
    'STICKERS/EU_Stickers_1080x1350_09.png',
    'STICKERS/EU_Stickers_1080x1350_12.png',
    'STICKERS/EU_Stickers_1080x1350_13.png',
    'STICKERS/EU_Stickers_1080x1350_14.png'
  ];
  var bi = 0, si = 0;

  var pv = document.getElementById('euPv');
  var bg = document.getElementById('euBg');
  var st = document.getElementById('euSt');
  var cv = document.getElementById('euC');
  var cx = cv.getContext('2d');

  bg.style.backgroundImage = 'url(' + BG[0] + ')';

  // Preload images
  BG.forEach(function (src) { var i = new Image(); i.src = src; });
  ST.forEach(function (src) { var i = new Image(); i.src = src; });

  // Shuffle
  var shuffling = false;
  function sh() {
    if (shuffling) return;
    shuffling = true;
    var c = 0, total = 10;
    var iv = setInterval(function () {
      bi = Math.floor(Math.random() * BG.length);
      si = Math.floor(Math.random() * ST.length);
      bg.style.backgroundImage = 'url(' + BG[bi] + ')';
      st.src = ST[si];
      if (++c >= total) { clearInterval(iv); shuffling = false; }
    }, 70);
  }

  // Byline live preview
  var bylineInput = document.getElementById('euBylineInput');
  var bylinePreview = document.getElementById('euBylinePreview');
  bylineInput.addEventListener('input', function () {
    bylinePreview.textContent = bylineInput.value;
  });

  // Click preview → shuffle
  pv.onclick = sh;

  // Light switch triggers shuffle + auto-resets
  var lightSwitch = document.getElementById('euLightSwitch');
  lightSwitch.addEventListener('change', function () {
    if (lightSwitch.checked) {
      sh();
      setTimeout(function () { lightSwitch.checked = false; }, 500);
    }
  });

  // Download PNG
  document.getElementById('euDl').onclick = function (e) {
    e.preventDefault();
    var W = 1080, H = 1350, im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = function () {
      var r = Math.max(W / im.width, H / im.height);
      cx.drawImage(im, (W - im.width * r) / 2, (H - im.height * r) / 2, im.width * r, im.height * r);
      var s = new Image(); s.crossOrigin = 'anonymous';
      s.onload = function () {
        cx.drawImage(s, 0, 0, W, H);
        // Render byline
        var byline = bylineInput.value.trim();
        if (byline) {
          cx.save();
          cx.font = '32px "Times Eighteen", Georgia, serif';
          cx.fillStyle = '#ffffff';
          cx.shadowColor = 'rgba(0,0,0,0.6)';
          cx.shadowBlur = 6;
          cx.shadowOffsetY = 2;
          cx.textAlign = 'center';
          cx.fillText(byline, W / 2, H - 80);
          cx.restore();
        }
        var a = document.createElement('a');
        a.download = 'electro-union-postcard.png';
        a.href = cv.toDataURL('image/png');
        a.click();
      };
      s.src = ST[si];
    };
    im.src = BG[bi];
  };
})();
