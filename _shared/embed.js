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
      // Mät .eu-containerns faktiska innehållshöjd istället för
      // documentElement.scrollHeight — den senare återspeglar iframe-
      // viewportens höjd (satt av host) och skapar en self-fulfilling
      // loop där modulen aldrig rapporterar en mindre höjd än nuvarande
      // iframe. .eu-containern innehåller all modulinnehåll (se
      // _shared/tokens.css) och ger en viewport-oberoende mätning.
      var eu = document.querySelector('.eu');
      var h = eu
        ? Math.ceil(eu.getBoundingClientRect().bottom + window.scrollY)
        : document.documentElement.scrollHeight;
      if (Math.abs(h - lastH) > 10) {
        lastH = h;
        window.parent.postMessage({ type: 'eu-resize', height: h }, '*');
      }
    }, 50);
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
