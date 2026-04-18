# Postcard Generator Module

Generera ett eget Electro Union-postkort: slumpa bakgrund + sticker, skriv
in din byline, ladda ner som PNG (1080×1350).

## Vad den gör

1. Visar en framed preview (FRAME1 UPDATED.png + foto + sticker)
2. **Light switch** till vänster: klick = shuffle av bg/sticker
3. Klick på själva fotot = shuffle (samma funktion)
4. Byline-input uppdaterar live preview och renderas på PNG-export
5. Download-knappen renderar 1080×1350 PNG via offscreen canvas

## Filer

| Fil | Vad |
|-----|-----|
| `index.html` | Stage + framed preview + kontroller (byline + download) |
| `style.css` | Generator-CSS inkl. light-switch-skelett |
| `script.js` | BG/ST-arrays, shuffle, byline-preview, canvas-export |
| `BACKGROUNDS/` | 20 bakgrunds-JPG/PNG/GIF |
| `STICKERS/` | 9 EU-stickers (samma set som toolkit) |
| `Updated Imagery/postcard.gif` | Hero-animation ovanför |
| `Updated Imagery/FRAME1 UPDATED.png` | Foto-ram |
| `Updated Imagery/mailput.gif` | Liten dekorativ GIF högst upp |
| `Updated Imagery/animated-text-zoom.gif` | (Reserverad för CTA-varianter) |

Total storlek: ~54 MB (mestadels bakgrunder)

## Beroenden

- `../_shared/fonts.css`
- `../_shared/tokens.css`
- `../_shared/embed.js`

**Ingen Supabase** — postkortet sparas aldrig på servern, bara lokal download.

## Hur man använder i Webflow

```html
<iframe
  src="https://<hostas-någonstans>/modules/postcard-generator/index.html?embed=1"
  style="width:100%;border:none;display:block;overflow:hidden"
  scrolling="no"
  height="800">
</iframe>

<script>
window.addEventListener('message', function(e){
  if(e.data && e.data.type === 'eu-resize' && e.data.height){
    document.querySelector('iframe').style.height = e.data.height + 'px';
  }
});
</script>
```

## Daniels feedback — prioritera INTE denna nu

> "Postcard generator → save for later"

Daniel rekommenderar att pausa postcard-generatorn i silver-versionen.
Modulen extraheras ändå så den finns kvar för framtida bruk eller för
att återinföras i bronze-varianten.

## Kända quirks

- Canvas-export kräver att `BG`/`ST`-bilderna ligger på samma origin (eller har
  CORS-headers). I embed-läge fungerar det så länge iframe:n och assets:en
  servas från samma domän.
- GIF-bakgrunden (`ezgif-385a4b8503da6341.gif`) renderas som första-frame på
  PNG-export (canvas har ingen animation).
- Light-switchen är en inbyggd `<label for>` på en dold checkbox — auto-resettar
  efter 500ms så den alltid står "uppe".
- Byline max 40 tecken (HTML `maxlength`). Renderas på y=H-80 (270px från
  botten).

## Lokal preview

```bash
cd electro-union
npx serve .
# http://localhost:3000/modules/postcard-generator/
# http://localhost:3000/modules/postcard-generator/?embed=1
```

## TODO (för silver/bronze)

- [ ] Egen uppladdad bakgrund (drag-n-drop eller file picker)
- [ ] Fler byline-positioner (top/bottom/corners)
- [ ] Direkt-share via Web Share API (iOS/Android native sheet)
- [ ] Beskära foto innan export (crop tool)
