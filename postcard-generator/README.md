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
