# Drawing Module

Canvas-baserad "stamp placement"-drawing tool: välj en pastry eller EU-sticker,
klicka/dra på canvasen för att placera den, välj animation (still / bounce /
beat / spin), ladda ner som **GIF** (36 frames, 1080×1080) eller **PNG**.

## Vad den gör

1. **Marquee** högst upp: horisontellt scrollande pastry-bilder + italic citat
2. **Workspace**:
   - Vänster: framed canvas (FRAME2_UPDATED.png + live canvas i mitten)
   - Höger: panel med carousels, kontroller
3. **Stamp carousel** (9 pastries): baguette → stroopwafel → kanelbulle → baklava →
   kürtőskalács → croissant → danish → pastel de nata → sernik
4. **Storleks-slider** (0.3–7.5× av baseline)
5. **Sticker carousel** (9 EU stickers) — första klicket sätter också bg-watermark
   (`bgStickerLocked`-flag: stämpar efter det ändrar inte watermark längre)
6. **Custom upload** för sticker (max 1 MB, PNG/JPEG/GIF/WebP)
7. **Background picker**: 7 preset-färger + custom hex + bg-image-upload
8. **Animation modes**: still, bounce, beat, spin (requestAnimationFrame-loop)
9. **Undo** (per stroke) + **Clear all**
10. **Download GIF** (animerad, 1080×1080, 36 frames, adaptiv palette + custom LZW)
    eller **PNG** (1080×1080, alltid stilla)

## Filer

| Fil | Vad |
|-----|-----|
| `index.html` | Drawing-sektionens markup (marquee + workspace + panel + actions) |
| `style.css` | Alla `.eu-draw*`-regler + responsive breakpoints (tablet/mobile/small) |
| `script.js` | Drawing-tool-logiken (stamps, bg, anim, upload, render, undo, GIF/PNG-export) |
| `STICKERS/` | 9 EU-stickers (01, 02, 03, 04, 08, 09, 12, 13, 14) |
| `Updated Imagery/` | Frame + 9 pastry stamps + marquee-bilder (samma 9 filer) |

**Totalt: ~16 MB** (mest pastry-PNG:er och stickers)

## Beroenden

- `../_shared/fonts.css` — Times Eighteen + ABC Schengen Mono
- `../_shared/tokens.css` — CSS-variabler (--blue, --red, --ink, --eu-cursor m.fl.)
- `../_shared/embed.js` — `window.EU_IS_EMBED` + postMessage-resize

**Ingen Supabase** i själva drawing-modulen — `Add to gallery`-knappen
(#euDrawGuestbook) finns med i markup men klickhandlern ligger i
`../guestbook/script.js` (om guestbook-modulen också inkluderas i sidan).

## Hur man använder i Webflow

Standalone iframe:

```html
<iframe
  src="https://<host>/modules/drawing/index.html?embed=1"
  style="width:100%;border:none;display:block;overflow:hidden"
  scrolling="no"
  height="1200">
</iframe>

<script>
window.addEventListener('message', function(e){
  if(e.data && e.data.type === 'eu-resize' && e.data.height){
    document.querySelector('iframe').style.height = e.data.height + 'px';
  }
});
</script>
```

## Kända quirks

- **Canvas cropping**: `.eu-draw__canvas-wrap` är positionerad `top:49.1%;left:48.9%`
  med `width:80%;height:80%`. Absoluta värden är uppmätta från `FRAME2_UPDATED.png`
  (1063×1052 aspect ratio). Ändrar du ramen måste du justera dessa.
- **Background sticker lock**: första gången du placerar en stämpel låses
  bg-watermark (via `bgStickerLocked=true`). Du kan bara byta watermark innan
  första placeringen. Clear återställer låset.
- **Canvas resize**: `resizeDrawCanvas()` triggas per mousedown/touchstart.
  I embed-läge där containern kan ändra storlek dynamiskt finns en
  MutationObserver i golden (ligger i guestbook-modulen eftersom den är
  kopplad till foldout-öppning). Utan den kan canvas vara 0×0 första gången.
- **Adaptiv GIF-palette** (`buildAdaptivePalette`) samplar varannan pixel,
  deduperar till 5-bit per kanal, kör median-cut — hanterar pastry-färger mot
  ensfärgad bakgrund bra men kan ta några hundra ms på 1080×1080.
- **GIF-encoder är hemmasnickrad LZW** — inga externa deps, men den är inte
  världens snabbaste. 36 frames × 1080² ≈ 2-4 sek på M1.
- **Guestbook-knappen** (`#euDrawGuestbook`) ligger i markup här men får ingen
  klickhandler i `script.js`. Den kopplas av `../guestbook/script.js` om
  guestbook-modulen bundlas tillsammans med drawing.

## Beroenden mellan drawing och guestbook

Drawing-modulen exponerar `window.EU_DRAWING` med:

```js
{
  placements,              // getter, array av {x,y,sz,si}
  animMode,                // getter, 'none' | 'bounce' | 'beat' | 'rotate'
  renderExportFrame,       // (ctx, mode, t, size?) → void
  buildAdaptivePalette,    // (imgData, maxColors) → palette[]
  quantizeFrameAdaptive,   // (ctx, w, h, palette) → Uint8Array
  buildGIF,                // (frames, w, h, delay, palette) → Blob
  canvas                   // HTMLCanvasElement
}
```

Guestbook-modulen använder dessa för att generera sin 540×540 20-frame GIF.
I standalone drawing (utan guestbook bundlat) blir "Add to gallery"-knappen
inaktiv — det är det önskade beteendet.

## Lokal preview

```bash
cd electro-union
npx serve .
# http://localhost:3000/modules/drawing/
# http://localhost:3000/modules/drawing/?embed=1
```

## TODO (för silver/bronze)

- [ ] Throttle stamp-placering bättre på trackpad (nuvarande 30 ms minsta delta)
- [ ] Zoom/pan på canvas (i nuläget fixed aspect ratio)
- [ ] Ångra-historik bredvid undo-knappen
- [ ] Presets för anim-speed (bounce/beat/rotate har hårdkodat `t*4`, `t*5`, `t*3`)
