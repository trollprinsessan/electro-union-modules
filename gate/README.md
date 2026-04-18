# Gate Module

"☐ I approve this message"-knapp med counter + Roman Gate-animation.

## Vad den gör

1. Visar en stor knapp: "☐ I approve this message"
2. Klick → `.eu.is-open` läggs till, foldout öppnas
3. Incrementerar counter i Supabase (`increment_and_get_count` RPC)
4. Animerar siffran från 0 → aktuellt värde
5. Visar "gate scene" med Hero-logo, tagline, counter, preamble-text + nedladdnings-CTA
6. **Standalone:** Roman Gate-animation (kolumner som glider isär, logo + tagline skalar upp baserat på scroll)
7. **Embed:** Instant reveal, ingen scroll-animation (CSS transitions batchas i cross-origin iframe)

## Filer

| Fil | Vad |
|-----|-----|
| `index.html` | HTML-strukturen |
| `style.css` | Gate-specifika stilar |
| `script.js` | Counter + klick-handler + scroll-animation |
| `GIFS/` | EU-flagga i checkbox |
| `Updated Imagery/` | Hero-logo, animated-text-zoom CTA, Roman columns |

## Beroenden

- `../_shared/fonts.css` — Times Eighteen + ABC Schengen Mono
- `../_shared/tokens.css` — design tokens + `.eu` container
- `../_shared/embed.js` — detekterar iframe + postar height till parent
- `../_shared/supabase.js` — counter-funktioner (`get_approval_count`, `increment_and_get_count`)

## Hur man använder i Webflow

**Iframe-inbäddning** (som nuvarande Electro Union-modul):

```html
<iframe
  src="https://<hostas-någonstans>/modules/gate/index.html?embed=1"
  style="width:100%;border:none;display:block;overflow:hidden"
  allow="autoplay"
  scrolling="no"
  height="300">
</iframe>

<script>
window.addEventListener('message', function(e){
  if(e.data && e.data.type === 'eu-resize' && e.data.height){
    document.querySelector('iframe').style.height = e.data.height + 'px';
  }
});
</script>
```

## Lokal preview

Servera `modules/`-mappen från `electro-union/`-roten:

```bash
cd electro-union
npx serve .
# Öppna: http://localhost:3000/modules/gate/
# Embed-läge: http://localhost:3000/modules/gate/?embed=1
```

Eller använd `.claude/launch.json`-konfigurationen `eu-module` på port 8899.

## Daniels feedback om denna modul

Daniel föreslår att **ta bort** "I approve this message"-gaten helt, eftersom folk
kan missa innehållet under. Modulen extraheras ändå så den finns kvar för
framtida bruk (bronze-variant eller standalone på egen sida).

Se `silver/` för variant utan gate och `bronze/` för alternativt förslag.

## Kända quirks

- `sbRpc('get_approval_count')` tar några ms — counter börjar på `0` och
  fyller sig retroaktivt om klick sker innan fetchen är klar
- Scroll-animationen kräver att gate-scenen är ~200vh hög i standalone; i
  embed-läge flattas den till sitt innehåll
- Google Drive-länken i preamble pekar på Ninas delade mapp — uppdatera vid
  behov i `index.html`
