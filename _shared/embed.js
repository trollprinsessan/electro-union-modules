/*
 * Electro Union — Embed Detection + Auto-Resize
 *
 * Inkludera tidigt i varje modul:
 *   <script src="../_shared/embed.js"></script>
 *
 * Vad det gör:
 *   1. Detekterar om modulen körs i iframe (via `?embed=1` eller window != top)
 *   2. Sätter `is-embed`-klass på <html> (moduler kan style:a annorlunda i
 *      embed-läge, t.ex. dölja sticky element)
 *   3. Postar modulens höjd till parent var 300ms + vid DOM-mutation
 *      via `postMessage({type:'eu-resize', height: N}, '*')`
 *
 * Parent (Webflow) lyssnar med:
 *   window.addEventListener('message', function(e){
 *     if(e.data && e.data.type === 'eu-resize' && e.data.height){
 *       iframe.style.height = e.data.height + 'px';
 *     }
 *   });
 *
 * Exponerar `window.EU_IS_EMBED` (boolean) så andra scripts kan kolla.
 */

(function () {
  var isEmbed =
    window.location.search.indexOf('embed=1') > -1 ||
    window !== window.top;

  window.EU_IS_EMBED = isEmbed;

  if (!isEmbed) return;

  document.documentElement.classList.add('is-embed');

  var lastH = 0;
  var postTimer = 0;

  function postHeight() {
    clearTimeout(postTimer);
    postTimer = setTimeout(function () {
      // Mät modulens innehållshöjd. Utmaningar:
      //   1. documentElement.scrollHeight returnerar max(content, viewport),
      //      och iframe-viewportens höjd sätts av host → self-fulfilling
      //      loop där modulen aldrig krymper.
      //   2. .eu-containerns getBoundingClientRect kan vara för liten när
      //      lazy-loaded images inte har laddat (reserverar 0 plats utan
      //      width/height-attribut).
      // Lösning: mät flera candidates och ta max av de content-baserade.
      var eu = document.querySelector('.eu');
      var measures = [];
      if (eu) {
        measures.push(Math.ceil(eu.getBoundingClientRect().bottom + window.scrollY));
        measures.push(eu.scrollHeight);
        measures.push(eu.offsetHeight);
      }
      if (document.body) {
        // Summera alla direkta body-children's bottom-kant — undviker att
        // body ärver viewport-höjd via default html/body-stylen.
        var maxBottom = 0;
        var kids = document.body.children;
        for (var i = 0; i < kids.length; i++) {
          var r = kids[i].getBoundingClientRect();
          if (r.bottom > maxBottom) maxBottom = r.bottom;
        }
        measures.push(Math.ceil(maxBottom + window.scrollY));
      }
      var h = Math.max.apply(null, measures.filter(function(n){ return n > 0; }));
      if (!h || !isFinite(h)) h = document.documentElement.scrollHeight;
      if (Math.abs(h - lastH) > 10) {
        lastH = h;
        window.parent.postMessage({ type: 'eu-resize', height: h }, '*');
      }
    }, 50);
  }

  // Tvinga lazy images att laddas ivrigt i embed-läge + re-posta höjd
  // när varje bild laddar klart (bilder reserverar ingen plats utan
  // width/height-attribut, så .eu-containern växer när bilden laddar).
  function eagerizeAndTrackImages() {
    var imgs = document.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      if (img.loading === 'lazy') img.loading = 'eager';
      if (!img.complete) {
        img.addEventListener('load', postHeight);
        img.addEventListener('error', postHeight);
      }
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', eagerizeAndTrackImages);
  } else {
    eagerizeAndTrackImages();
  }

  // Poll för height-ändringar (gate-open, gallery-load, etc.)
  setInterval(postHeight, 300);
  window.addEventListener('load', postHeight);

  // Lyssna på DOM-ändringar också
  new MutationObserver(postHeight).observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true
  });
})();
