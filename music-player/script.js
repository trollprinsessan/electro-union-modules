/*
 * Electro Union — Music Player Module Script
 *
 * Plays tracks via the Spotify IFrame API instead of hosting MP3s. Spotify
 * holds the licenses; free users get 30-second previews, Premium users get
 * full tracks. Custom EU player UI controls the hidden Spotify iframe via
 * the IFrame API (play/pause, prev/next, progress, seek).
 *
 * Source playlist: https://open.spotify.com/playlist/6rZzfrP9Axg64qBMmKxI2u
 */

(function () {
  var isEmbed = window.EU_IS_EMBED === true;

  // EU-themed display name + Spotify track URI for each slot
  var tracks = [
    { name: 'BASELOAD',    uri: 'spotify:track:6W0PqAtbW7fkTRBtmwOwfM' }, // Pino D'Angiò — Okay Okay
    { name: 'MERIT ORDER', uri: 'spotify:track:2eQomd6Smp8EGRjvvkIs56' }, // Ryan Paris — Dolce Vita
    { name: '50 HERTZ',    uri: 'spotify:track:0Ytxje4D5iXTHN3MOCC5jS' }, // Phil Oakey — Together In Electric Dreams
    { name: 'PEAK DEMAND', uri: 'spotify:track:48vDCZIRmrFO33fH4QU4ij' }  // The Prodigy — Smack My Bitch Up
  ];

  var ci = 0;
  var playing = false;
  var controller = null;          // Spotify EmbedController, set when ready
  var pendingPlay = false;         // play requested before controller was ready

  var nowEl = document.getElementById('euPlayerNow');
  var playBtn = document.getElementById('euPlayerPlay');
  var progressEl = document.getElementById('euPlayerProgress');
  var trackEls = document.querySelectorAll('.eu-player__track');
  var barEl = document.querySelector('.eu-player__bar');

  function setPlayIcon(isPlaying) {
    playBtn.innerHTML = isPlaying ? '&#10074;&#10074;' : '&#9654;&#xFE0E;';
  }

  function setActiveTrack(i) {
    ci = i;
    nowEl.textContent = tracks[ci].name;
    trackEls.forEach(function (t, idx) {
      t.classList.toggle('is-active', idx === ci);
    });
    progressEl.style.width = '0%';
  }

  function loadTrack(i, autoPlay) {
    setActiveTrack(i);
    if (controller) {
      controller.loadUri(tracks[ci].uri);
      if (autoPlay) controller.resume();
    } else {
      pendingPlay = !!autoPlay;
    }
  }

  function togglePlay() {
    if (!controller) { pendingPlay = !pendingPlay; return; }
    controller.togglePlay();
  }

  // ═══ Wire EU UI buttons ═══
  playBtn.addEventListener('click', togglePlay);

  document.getElementById('euPlayerNext').addEventListener('click', function () {
    loadTrack((ci + 1) % tracks.length, playing);
  });
  document.getElementById('euPlayerPrev').addEventListener('click', function () {
    loadTrack((ci - 1 + tracks.length) % tracks.length, playing);
  });

  trackEls.forEach(function (el) {
    el.addEventListener('click', function () {
      loadTrack(parseInt(el.getAttribute('data-idx'), 10), true);
    });
  });

  barEl.addEventListener('click', function (e) {
    if (!controller || !lastDuration) return;
    var rect = barEl.getBoundingClientRect();
    var pct = (e.clientX - rect.left) / rect.width;
    controller.seek(pct * (lastDuration / 1000)); // seek expects seconds
  });

  setActiveTrack(0);

  // ═══ Spotify IFrame API setup ═══
  var lastDuration = 0;
  var lastPosition = 0;

  window.onSpotifyIframeApiReady = function (IFrameAPI) {
    var element = document.getElementById('euSpotifyEmbed');
    if (!element) return;

    IFrameAPI.createController(element, {
      uri: tracks[0].uri,
      width: '100%',
      height: '80'
    }, function (ctrl) {
      controller = ctrl;

      // Track ended — advance to next
      ctrl.addListener('playback_update', function (e) {
        if (!e || !e.data) return;
        lastDuration = e.data.duration || 0;
        lastPosition = e.data.position || 0;
        playing = !e.data.isPaused;
        setPlayIcon(playing);
        if (lastDuration) {
          progressEl.style.width = (lastPosition / lastDuration * 100) + '%';
        }
        // Auto-advance: position resets to 0 + isPaused → likely ended
        if (lastDuration > 0 && lastPosition >= lastDuration - 250 && e.data.isPaused) {
          loadTrack((ci + 1) % tracks.length, true);
        }
      });

      ctrl.addListener('ready', function () {
        if (pendingPlay) {
          ctrl.resume();
          pendingPlay = false;
        }
      });
    });
  };

  // ═══ Autoplay on first user interaction ═══
  function autoplayOnce() {
    if (controller) controller.resume(); else pendingPlay = true;
    document.removeEventListener('click', autoplayOnce);
    document.removeEventListener('scroll', autoplayOnce);
  }
  document.addEventListener('click', autoplayOnce);
  document.addEventListener('scroll', autoplayOnce);

  // ═══ Sound toggle + next track (fixed controls) ═══
  // The Spotify IFrame API doesn't expose a mute method — best we can do is
  // pause / resume. So the toggle becomes a play/pause shortcut.
  var soundBtn = document.getElementById('euSoundToggle');
  var soundControls = document.getElementById('euSoundControls');
  var soundNextBtn = document.getElementById('euSoundNext');
  var soundOn = document.getElementById('euSoundOn');
  var soundOff = document.getElementById('euSoundOff');

  if (soundBtn) {
    soundBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      togglePlay();
      soundOn.style.display = playing ? '' : 'none';
      soundOff.style.display = playing ? 'none' : '';
    });
  }
  if (soundNextBtn) {
    soundNextBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      loadTrack((ci + 1) % tracks.length, true);
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
