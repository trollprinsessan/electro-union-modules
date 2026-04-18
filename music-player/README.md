# Music Player Module

Minimalistisk 4-track m4a-spelare. Autoplay på första user-interaktion,
sticky sound-controls nere till vänster.

## Vad den gör

1. Visar spelar-UI med:
   - Nuvarande låt ("BASELOAD" etc)
   - Prev / Play-Pause / Next
   - Progress-bar (klickbar för seek)
   - Tracklist (4 låtar, klick byter och startar)
2. **Autoplay** på första click eller scroll (browser-gated)
3. **Fixed sound controls** (bottom-left, standalone only) — dyker upp när
   spelaren scrollas ur sight. Mute + next.
4. **Ended** → nästa låt (loopar hela listan)

## Tracklist

| # | Titel | Fil |
|---|-------|-----|
| 01 | BASELOAD | Okay Okay – Pino A'angio.m4a |
| 02 | MERIT ORDER | Dolce Vita – Ryan Murphy.m4a |
| 03 | 50 HERTZ | AutoBahn (single version) – Kraftwerk.m4a |
| 04 | PEAK DEMAND | Smack My Bitch Up – Prodigy.m4a |

## Filer

| Fil | Vad |
|-----|-----|
| `index.html` | Player + fixed sound controls |
| `style.css` | Player + standalone-wrapper + sound-controls |
| `script.js` | Audio-logik, autoplay, sound-toggle, IntersectionObserver |
| `MUSIC/` | 4 m4a-tracks (~15 MB) |

## Beroenden

- `../_shared/fonts.css`
- `../_shared/tokens.css`
- `../_shared/embed.js`

**Ingen Supabase.**

## Hur man använder i Webflow

```html
<iframe
  src="https://<hostas-någonstans>/modules/music-player/index.html?embed=1"
  style="width:100%;border:none;display:block;overflow:hidden"
  allow="autoplay"
  scrolling="no"
  height="500">
</iframe>

<script>
window.addEventListener('message', function(e){
  if(e.data && e.data.type === 'eu-resize' && e.data.height){
    document.querySelector('iframe').style.height = e.data.height + 'px';
  }
});
</script>
```

**Viktigt:** `allow="autoplay"` krävs annars blockerar de flesta browsers
autoplay i iframes.

## Daniels feedback

> "Playlist → possibly widget in article instead"

Daniel föreslår att ersätta den egna spelaren med en Spotify/Apple Music-widget
i artikeln istället. Den här modulen är den **nuvarande** implementationen —
bra som fallback eller för enskild återanvändning.

## Kända quirks

- Browser kan blockera autoplay även efter click om fliken inte har varit aktiv
- I Golden ligger spelaren absolut-positionerad ovanpå ett `.eu-statement`
  (large quote image). Här standalone med egen wrapper.
- Progress-bar `transition:width .3s linear` kan haka sig vid seek — ofarligt
- Sound controls `left:16px bottom:16px fixed` krockar inte med toolkit-stickyn
  (som är `right:16px`)

## Lokal preview

```bash
cd electro-union
npx serve .
# http://localhost:3000/modules/music-player/
# http://localhost:3000/modules/music-player/?embed=1
```

## TODO (framtid)

- [ ] Spotify embed-variant
- [ ] Volume slider
- [ ] Keyboard shortcuts (space = play, ← = prev, → = next)
- [ ] Shuffle-knapp
