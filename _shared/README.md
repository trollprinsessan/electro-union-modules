# _shared/

Gemensam bas som alla moduler beror på.

## Innehåll

| Fil | Vad | Inkludera med |
|-----|-----|---------------|
| `fonts.css` | `@font-face` för Times Eighteen (Roman/Bold) + ABC Schengen Mono | `<link rel="stylesheet" href="../_shared/fonts.css">` |
| `fonts/` | Originalkopia av `golden/FONT/` (~45 MB, alla vikter) | används av `fonts.css` |
| `tokens.css` | `.eu *` reset + `.eu` tokens (färger, typsnitt-variabler, cursor) | `<link rel="stylesheet" href="../_shared/tokens.css">` |
| `embed.js` | Embed-detection, `is-embed`-klass, postMessage height-sync | `<script src="../_shared/embed.js"></script>` |
| `supabase.js` | Supabase-klient (`window.EU_SUPABASE`) för gate/guestbook | `<script src="../_shared/supabase.js"></script>` |

## Användning i en modul

Minsta skelett för en ny modul:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Electro Union — [modulnamn]</title>
  <link rel="stylesheet" href="../_shared/fonts.css">
  <link rel="stylesheet" href="../_shared/tokens.css">
  <link rel="stylesheet" href="style.css">
  <script src="../_shared/embed.js"></script>
  <script src="../_shared/supabase.js"></script>
</head>
<body>
  <div class="eu">
    <!-- modulens HTML här -->
  </div>
  <script src="script.js"></script>
</body>
</html>
```

## Designprinciper

- **Allt är scope:at till `.eu`** så det inte krockar med Webflow/Norrsken-stilar
- **Inga dependencies, inget byggsteg** — vanilla HTML/CSS/JS som kan klistras
  direkt i Webflow
- **Endast relativa paths** (`../_shared/...`) — när vi flyttar moduler till
  Norrsken-hosting uppdateras alla paths samtidigt
- **`fonts.css` + `tokens.css` är separata** så en modul kan inkludera bara
  fonter (t.ex. om den använder helt egen stilmall)

## När du ändrar något här

1. Alla moduler påverkas — testa i minst 2-3 moduler efter ändring
2. Notera ändringen i rot-`HANDOVER.md` session-logg
3. Om du lägger till ny variabel i `tokens.css` — dokumentera i kommentar

## Supabase-konfiguration

URL och publishable key ligger inline i `supabase.js`. Publishable keys är
säkra att exponera i frontend — RLS (Row Level Security) i Supabase styr
vad som får läsas/skrivas. Se `golden/supabase-setup.sql` för schema.

- **Tabeller:** `approvals` (counter), `gallery` (guestbook-inlägg)
- **RPC-funktioner:** `get_approval_count()`, `increment_and_get_count()`
- **Storage bucket:** `gallery-images` (public, 20MB, PNG/JPEG/GIF/WebP)

## Cross-origin iframe quirks

När modulerna körs i iframe från annan domän (Webflow) gäller:
- **Inga CSS transitions/animations** på show/hide — använd `display:none/block`
- **`window.scrollTo()` och `scrollIntoView()` fungerar ofta inte** —
  Norrsken-sidan använder GSAP ScrollSmoother som stör
- **Parent kan inte nå iframe-DOM** och vice versa — all kommunikation via
  `postMessage`

`embed.js` hanterar det åt dig, men moduler som använder egna animationer
måste kolla `window.EU_IS_EMBED` och byta till instant visning.
