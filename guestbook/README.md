# Guestbook Module

The Pastry Art Gallery — gallerivy + submit-modal som sparar användarens
drawing-canvas till Supabase (`gallery` tabell + `gallery-images` storage bucket).

## Vad den gör

1. **Header**: svajande `welcome.png` + "The Pastry Art Gallery" + live entry count
2. **Gallery grid**: alla entries sorterade `created_at.desc` från Supabase.
   Kort visar bild + valfri message + namn/land + datum.
3. **Submit modal** (`.eu-gb-modal`): öppnas när `#euDrawGuestbook` klickas (från
   drawing-modulen). Preview av 540×540 PNG eller 20-frame GIF + tre text-inputs
   (message 120ch, name 60ch, country 40ch) + submit-knapp.
4. **Submit**: dataURL → Blob → `POST /storage/v1/object/gallery-images/<id>.{png|gif}`
   → `POST /rest/v1/gallery` med `image_url` + optional fält. Reject vid >20 MB.

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

### Tillsammans med drawing (full experience)

I golden är båda modulerna bundlade i samma HTML. För att återskapa det
rekommenderas en wrapper-sida som inkluderar både `drawing/` och `guestbook/`
markup + scripts:

```html
<!-- Shared first -->
<link rel="stylesheet" href="../_shared/fonts.css">
<link rel="stylesheet" href="../_shared/tokens.css">
<link rel="stylesheet" href="../drawing/style.css">
<link rel="stylesheet" href="../guestbook/style.css">
<script src="../_shared/embed.js"></script>

<!-- Drawing markup här -->
<!-- Guestbook markup här -->

<!-- Drawing script (exponerar window.EU_DRAWING) -->
<script src="../drawing/script.js"></script>
<!-- Supabase + guestbook (använder EU_DRAWING) -->
<script src="../_shared/supabase.js"></script>
<script src="../guestbook/script.js"></script>
```

## Kända quirks / Beroenden mellan drawing och guestbook

- **Bundle-beroende**: submit-flödet (klick på #euDrawGuestbook) läser från
  `window.EU_DRAWING` som sätts av `../drawing/script.js`. Utan drawing-modulen
  loggar guestbook en warning och knappen svarar inte. Det är det önskade
  beteendet: guestbook-standalone = endast gallery-view.
- **GIF-kodningen återanvänds**: guestbook återanvänder drawing-modulens
  `buildAdaptivePalette`, `quantizeFrameAdaptive` och `buildGIF` via
  `EU_DRAWING`. Vi dubbel-implementerade inte LZW här, för att matcha golden.
- **540×540 vs 1080×1080**: guestbook använder halva upplösningen mot
  drawings egen download. 20 frames istället för 36 → filstorlek ≈ 1/4 av den
  nedladdningsbara GIF:en.
- **Supabase publishable key** ligger i `_shared/supabase.js` och är safe att
  exponera i frontend — RLS-policyer i `supabase-setup.sql` styr access.
- **Upload-cap**: 20 MB frontend, 20 MB i Supabase bucket config. Större blob
  → alert + avbryt.
- **Submit-text-bug från golden** (bevarad): efter lyckad upload sätts
  `gbSubmit.textContent = 'Submit to gallery'` (inte 'Add to gallery' som
  startvärdet). Liten visuell dribble men samma beteende som golden.
- **Ingen real-time**: `loadGallery()` körs på init och efter varje submit,
  inga Supabase Realtime subscriptions — andra användares submits syns först
  vid reload.

## Programmatic API (för extern integration)

Utöver #euDrawGuestbook-hook exponerar guestbook också:

```js
// Ladda upp en godtycklig canvas direkt som PNG, skippa modalen helt
window.EU_GUESTBOOK_SUBMIT(canvasElement, {
  name: 'Anna',
  message: 'Ett fint bakverk',
  country: 'Sweden'
}).then(inserted => console.log('Uploaded', inserted))
  .catch(err => console.error(err));
```

Använd t.ex. om du bundlar guestbook med en annan drawing-implementation eller
vill testa uploads från konsolen.

## Lokal preview

```bash
cd electro-union
npx serve .
# http://localhost:3000/modules/guestbook/          (bara gallery + modal)
# http://localhost:3000/modules/guestbook/?embed=1  (embed-mode)
```

## Supabase-schema

Se `golden/supabase-setup.sql` för fullständigt schema. Kortversion:

```sql
-- Tabell: gallery
-- Bucket: gallery-images (public read, INSERT via RLS-policy)
-- Kolumner: id, image_url, message, name, country, created_at
```

## TODO (för silver/bronze)

- [ ] Realtime-subscribe: `supabase.channel('gallery').on('postgres_changes', ...)`
- [ ] Click-to-expand card (lightbox för den fullstora GIF:en)
- [ ] Moderation queue / rapport-knapp
- [ ] Pagination eller virtual-scroll om gallery > 100 entries
- [ ] Dedup per IP/session så samma person inte spammar
