## Filer

| Fil | Vad |
|-----|-----|
| `index.html` | Widget-badge + shop-header + 9 produkt-items |
| `style.css` | Merch CSS + 2000s-badge + ansvarig grid + mobile |
| `Updated Imagery/` | 11 produkt-PNG + 2 GIFs |

Total storlek: ~7 MB

## Beroenden

- `../_shared/fonts.css`
- `../_shared/tokens.css`
- `../_shared/embed.js`

**Ingen Supabase.** Inga JS-handlers — bara statisk markup.

## Hur man använder i Webflow

```html
<iframe
  src="https://<hostas-någonstans>/modules/merch/index.html?embed=1"
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
