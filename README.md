
## Struktur

```
electro-union-modules/
├── .nojekyll             # KRITISK — utan denna servar GitHub Pages inte _shared/
├── index.html            # Landningssida med iframe-preview + "Copy iframe"-knappar
├── _shared/              # Delade filer (fonter, tokens, embed.js, supabase.js)
├── gate/                 # "I approve this message"-counter, Roman columns
├── toolkit/              # 27-länders flag-cykel, 3 tabbar (sharables/paper/social)
├── postcard-generator/   # Canvas-baserad 1080×1350 postcard-generator
├── music-player/         # 4 tracks, autoplay, player ovanpå citatbild
├── merch/                # 2000s web-badge + 9-produkt-grid (ingen backend)
├── drawing/              # Canvas + stamps + GIF/PNG-export
└── guestbook/            # Gallery + submit via Supabase
```



I Webflow CMS, lägg till ett **Embed-block** där du vill ha modulen,
och klistra in:

```html
<iframe
  src="https://trollprinsessan.github.io/electro-union-modules/gate/?embed=1"
  title="Electro Union — Gate"
  style="width:100%;border:none;display:block;overflow:hidden"
  scrolling="no"
  height="800"
  loading="lazy"></iframe>
<script>
window.addEventListener('message', function(e){
  if(e.data && e.data.type === 'eu-resize' && e.data.height){
    document.querySelectorAll('iframe').forEach(function(f){
      if(f.src.indexOf('/gate/') > -1) f.style.height = e.data.height + 'px';
    });
  }
});
</script>
```

Byt `/gate/` till vilken modul du vill: `/toolkit/`, `/postcard-generator/`,
`/music-player/`, `/merch/`, `/drawing/`, `/guestbook/`.

Enklast: öppna `index.html` live på `https://trollprinsessan.github.io/electro-union-modules/`
och klicka "📋 Copy iframe" på respektive modul.

## Hur modulerna pratar med parent (Webflow)

Varje modul inkluderar `_shared/embed.js` som:

1. Detekterar om sidan körs i iframe (`?embed=1` eller `window !== window.top`)
2. Sätter `is-embed`-klass på `<html>` (moduler kan dölja sticky element osv)
3. Postar sin höjd till parent var 300ms + vid DOM-ändring:
   `postMessage({ type: 'eu-resize', height: N }, '*')`

Webflow-scriptet i iframe-snippen lyssnar på `'eu-resize'` och justerar iframens
höjd. Resultatet: iframen ser inte ut som en iframe — den flyter med innehållet.

## Lokalt utvecklingsflöde

```bash
cd electro-union-modules
npx serve . -l 3000
# Öppna http://localhost:3000/
```

Ändra en fil → refresh browser → du ser ändringen. Ingen build-step.
Push till GitHub → live inom ~60 sekunder på GitHub Pages-URL:en.

## Uppdatera en modul

1. Redigera filer i modulen (t.ex. `music-player/script.js`)
2. Testa lokalt med `npx serve . -l 3000`
3. `git add .` → `git commit -m "describe change"` → `git push`
4. Vänta ~60s
5. Hard-refresh (Cmd+Shift+R) Webflow-sidan → ny version

Inget i Webflow behöver röras. Inget annat modul påverkas.

## Framtid: flytta till Annan-server

Om/när du vill hosta modulerna på egen CDN:

1. Ladda upp hela mappen till den servern
2. Peka en subdomän dit, t.ex. `electro-union.valfridomän.org`
3. I Webflow CMS — söka-och-ersätt `trollprinsessan.github.io/electro-union-modules` med nya domänen i alla Embed-block

Inga kodändringar. Koden inuti modulerna är host-agnostisk.

## Beroenden

- **Ingen build**, inga frameworks, vanilla HTML/CSS/JS
- **Finsweet Copyclip** (inline): redan bundlat om det används
- **GSAP/ScrollSmoother**: används INTE i modulerna (bara i Webflow-artikeln)

