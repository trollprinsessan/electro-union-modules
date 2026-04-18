# Toolkit Module

Daniels favoritmodul. "The Toolkit" — social media assets, stickers, messaging.

## Vad den gör

En utfällbar toolkit med tre tabbar:

1. **Social media** — 6 färdiga Stories/Reels/Posts (2 GIFs + 4 JPGs, 1080×1350)
2. **Stickers** — 9 EU-stickers + 1 green badge (PNG, 1080×1350 eller 1080×1080)
3. **Messaging** — 4 copy-to-clipboard-meddelanden för sociala inlägg

Togglerns bakgrund cyklar genom **27 EU-länders flaggfärger** (Italien, Frankrike,
Tyskland, Irland, Belgien, Nederländerna, Österrike, Rumänien, Ungern, Bulgarien,
Sverige, Finland, Danmark, Grekland, Polen, Portugal, Spanien, Tjeckien, Kroatien,
Luxemburg, Slovakien, Slovenien, Litauen, Lettland, Estland, Cypern, Malta) var 4:e sekund.

Textfärgen anpassas automatiskt baserat på mittenfältets kontrast.

## Filer

| Fil | Vad |
|-----|-----|
| `index.html` | HTML-struktur (toggle + 3 tabbar + grid/messaging) |
| `style.css` | Sharables foldout + PAP cards + sticky link |
| `script.js` | Toggle, flag-cycling, tab-navigation, sticky-observer |
| `DOWNLOADS/SOCIAL ASSETS/` | 6 sociala assets (2 GIFs, 4 JPGs) |
| `STICKERS/` | 9 EU-sticker PNGs |
| `Updated Imagery/` | 1 green badge PNG |

Total storlek: ~75 MB

## Beroenden

- `../_shared/fonts.css`
- `../_shared/tokens.css`
- `../_shared/embed.js`

**Ingen Supabase** — toolkit är helt statisk, ingen backend-koppling.

## Hur man använder i Webflow

```html
<iframe
  src="https://<hostas-någonstans>/modules/toolkit/index.html?embed=1"
  style="width:100%;border:none;display:block;overflow:hidden"
  scrolling="no"
  height="200">
</iframe>

<script>
window.addEventListener('message', function(e){
  if(e.data && e.data.type === 'eu-resize' && e.data.height){
    document.querySelector('iframe').style.height = e.data.height + 'px';
  }
});
</script>
```

## Daniels feedback — prioritera denna

> "Asset library/toolkit → FOCUS on this, make mobile-friendly, move from
> GitHub to norrsken.org URL"

### TODO för mobile-friendly (Silver-versionen)

Daniel vill att assets ska kunna delas **direkt** till Instagram/Twitter/LinkedIn
istället för att behöva laddas ner till telefon först. Förslag:

1. **Web Share API** (fungerar på iOS/Android native share sheet):
   ```js
   if (navigator.share) {
     navigator.share({
       files: [new File([blob], 'electro-union.gif', { type: 'image/gif' })],
       title: 'Make Europe the Electro Union',
       text: 'Europe has always been electro. Let's make it electric.'
     });
   }
   ```
2. **Direkt-länkar till Instagram/Twitter composer** med pre-filled text
3. **Fallback:** nuvarande download-beteende för desktop

Detta är **inte implementerat än** i denna extraktion. Modulen är en trogen
kopia av Golden. Mobile share-ändringar sparas till Silver/Bronze-varianterna.

## Kända quirks

- Clipboard-kopiering använder `navigator.clipboard.writeText()` som kräver
  HTTPS (eller localhost). Fungerar ej i `file://`-protokoll.
- Sticky toolkit link är bara relevant i standalone-läge — doldt i embed.
- Flag-cykeln ersätter bakgrundsfärgen inline, så om man byter CSS på
  `.eu-sharables__toggle` senare måste JS-overriden tas hänsyn till.

## Lokal preview

```bash
cd electro-union
npx serve .
# http://localhost:3000/modules/toolkit/
# http://localhost:3000/modules/toolkit/?embed=1
```
