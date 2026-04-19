
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
