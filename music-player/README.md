
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

