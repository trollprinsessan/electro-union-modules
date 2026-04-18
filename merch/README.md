# Merch Module

"Coming soon"-shop med 9 produkter, currency selector och en stilig
2000-tals web-badge högst upp.

## Vad den gör

Visar en statisk shop-display:

- **2000s web badge** — "MERCHANDISE · [GIF] · COMING SOON" med blinkande text
- **Shop header** — "Coming in 2026: Pre-order opens soon" + currency dropdown (EUR/SEK/GBP/USD/CHF)
- **Product grid** — 3 kolumner (desktop), 2 (tablet/mobile):
  1. Supporter Scarf — €45 (Pre-order, med fireworks-gif bakom)
  2. Espresso Cup & Saucer — €28
  3. Speedos — €32
  4. Campaign Frisbee — €22 (New)
  5. Six-Pack Carrier — €35
  6. Bubblegum Sticks (13 pcs) — €6.50 (Ltd. Edition)
  7. Campaign Ashtray — €15
  8. Cocktail Napkins (set of 50) — €18
  9. Campaign T-Shirt — €38 (New)

"Add to basket"-knappen är `cursor:not-allowed` — ingen backend, bara display.

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

## Daniels feedback — ta bort i silver

> "Merch → remove (doesn't exist yet)"

Daniel rekommenderar att **helt ta bort** merch-sektionen i silver, eftersom
produkterna inte finns och "Add to basket" inte funkar. Det kan upplevas
förvirrande/fake.

Modulen extraheras ändå så den finns kvar för framtida bruk:
- När merch faktiskt finns och shopen är kopplad
- Bronze-varianten kan välja att behålla den som "teaser"

## Kända quirks

- Alla produktbilder är PNG utan bakgrund — hover-scale på `img` kan leta
  bryta layout om aspect-ratio inte stämmer
- `.eu-merch-item__name{white-space:nowrap}` → långa namn klipps på mobil,
  overridas inte i mobile-media query
- 2000s-badge animerar med CSS keyframes (`visibility` toggle) — funkar i
  embed eftersom det inte är transition utan animation
- Scarf-item har `fireworks` (WS2k.gif) som bakgrund — den är 80% av
  item-ytan och laddar i loop

## Lokal preview

```bash
cd electro-union
npx serve .
# http://localhost:3000/modules/merch/
# http://localhost:3000/modules/merch/?embed=1
```

## TODO (framtid)

- [ ] Länka "Add to basket" till Shopify / Stripe / egen backend
- [ ] Lazy-load produktbilder (redan `loading="lazy"`)
- [ ] Currency-switcher som faktiskt byter priser
- [ ] Sold-out-states
