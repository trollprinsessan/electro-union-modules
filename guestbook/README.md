
## Filer

| Fil | Vad |
|-----|-----|
| `index.html` | Gallery-grid + modal-markup |
| `style.css` | `.eu-guestbook*` + `.eu-gb-modal*` inkl. mobil breakpoints |
| `script.js` | `loadGallery`, `renderGuestbook`, submit-flow, `EU_GUESTBOOK_SUBMIT` |
| `Updated Imagery/welcome.png` | Svajande welcome-banner i headern |

**Totalt: ~32 KB** — modulen är i princip bara logik + en bild.

## Beroenden

- `../_shared/fonts.css` — Times Eighteen + ABC Schengen Mono
- `../_shared/tokens.css` — CSS-variabler
- `../_shared/embed.js` — `window.EU_IS_EMBED` + resize
- `../_shared/supabase.js` — `window.EU_SUPABASE` (fetch/upload/publicUrl)
- **Drawing-modulen** (`../drawing/`) — valfri, men submit-knappen (#euDrawGuestbook)
  kommer bara trigga om drawing-modulen är bundlad i samma sida och exponerar
  `window.EU_DRAWING` med sina render-helpers.

## Hur man använder i Webflow

### Enbart gallery (read-only view)

```html
<iframe
  src="https://<host>/modules/guestbook/index.html?embed=1"
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
