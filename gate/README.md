
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
