/*
 * Electro Union — Music Player Module Script
 *
 * Kräver: ../_shared/embed.js (för window.EU_IS_EMBED)
 *
 * Källa: golden/electro-union-module.html rader:
 *   2988-3137 (music player init, autoplay, sound toggle, sticky sound controls)
 *
 * Beteende:
 *   - 4 tracks, autoplay på första user-interaktion (click/scroll)
 *   - Klick på track byter låt + startar uppspelning
 *   - Progress-bar är klickbar för seek
 *   - Ended → nästa track (loop genom alla)
 *   - Fixed sound-controls dyker upp när man scrollat förbi spelaren
 *     (bara i standalone-läge — doldt i embed)
 */

(function () {
  var isEmbed = window.EU_IS_EMBED === true;

  var tracks = [
    { name: 'BASELOAD',    src: "MUSIC/Okay Okay - Pino A'angio.m4a" },
    { name: 'MERIT ORDER', src: 'MUSIC/Dolce Vita - Ryan Murphy.m4a' },
    { name: '50 HERTZ',    src: 'MUSIC/AutoBahn (single version) - Kraftwerk.m4a' },
    { name: 'PEAK DEMAND', src: 'MUSIC/Smack My Bitch Up - Prodigy.m4a' }
  ];

  var audio = new Audio();
  audio.preload = 'auto';
  var ci = 0;
  var playing = false;

  var nowEl = document.getElementById('euPlayerNow');
  var playBtn = document.getElementById('euPlayerPlay');
  var progressEl = document.getElementById('euPlayerProgress');
  var trackEls = document.querySelectorAll('.eu-player__track');
  var barEl = document.querySelector('.eu-player__bar');

  function loadTrack(i) {
    ci = i;
    audio.src = tracks[ci].src;
    nowEl.textContent = tracks[ci].name;
    trackEls.forEach(function (t, idx) {
      t.classList.toggle('is-active', idx === ci);
    });
    progressEl.style.width = '0%';
  }

  function togglePlay() {
    if (playing) {
      audio.pause();
      playing = false;
      playBtn.innerHTML = '&#9654;&#xFE0E;';
    } else {
      audio.play();
      playing = true;
      playBtn.innerHTML = '&#10074;&#10074;';
    }
  }

  playBtn.addEventListener('click', togglePlay);

  document.getElementById('euPlayerNext').addEventListener('click', function () {
    loadTrack((ci + 1) % tracks.length);
    if (playing) { audio.play(); }
  });
  document.getElementById('euPlayerPrev').addEventListener('click', function () {
    loadTrack((ci - 1 + tracks.length) % tracks.length);
    if (playing) { audio.play(); }
  });

  trackEls.forEach(function (el) {
    el.addEventListener('click', function () {
      loadTrack(parseInt(el.getAttribute('data-idx'), 10));
      audio.play();
      playing = true;
      playBtn.innerHTML = '&#10074;&#10074;';
    });
  });

  audio.addEventListener('timeupdate', function () {
    if (audio.duration) {
      progressEl.style.width = (audio.currentTime / audio.duration * 100) + '%';
    }
  });
  audio.addEventListener('ended', function () {
    loadTrack((ci + 1) % tracks.length);
    audio.play();
  });

  barEl.addEventListener('click', function (e) {
    if (audio.duration) {
      var rect = barEl.getBoundingClientRect();
      var pct = (e.clientX - rect.left) / rect.width;
      audio.currentTime = pct * audio.duration;
    }
  });

  loadTrack(0);

  // Autoplay on first user interaction
  function autoplayOnce() {
    audio.play().then(function () {
      playing = true;
      playBtn.innerHTML = '&#10074;&#10074;';
    }).catch(function () {});
    document.removeEventListener('click', autoplayOnce);
    document.removeEventListener('scroll', autoplayOnce);
  }
  document.addEventListener('click', autoplayOnce);
  document.addEventListener('scroll', autoplayOnce);

  // ═══ Sound toggle + next track (fixed controls) ═══
  var soundBtn = document.getElementById('euSoundToggle');
  var soundControls = document.getElementById('euSoundControls');
  var soundNextBtn = document.getElementById('euSoundNext');
  var soundOn = document.getElementById('euSoundOn');
  var soundOff = document.getElementById('euSoundOff');
  var muted = false;

  if (soundBtn) {
    soundBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (muted) {
        audio.muted = false;
        muted = false;
        soundOn.style.display = '';
        soundOff.style.display = 'none';
      } else {
        audio.muted = true;
        muted = true;
        soundOn.style.display = 'none';
        soundOff.style.display = '';
      }
    });
  }
  if (soundNextBtn) {
    soundNextBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      loadTrack((ci + 1) % tracks.length);
      audio.play();
      playing = true;
      playBtn.innerHTML = '&#10074;&#10074;';
    });
  }

  // Show sound controls only after scrolling past the music player (standalone only)
  if (!isEmbed) {
    var playerEl = document.querySelector('.eu-player');
    if (playerEl && soundControls) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            soundControls.classList.add('is-visible');
          } else {
            soundControls.classList.remove('is-visible');
          }
        });
      }, { threshold: 0 });
      obs.observe(playerEl);
    }
  }
})();
