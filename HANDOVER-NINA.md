# HANDOVER → Ninas Claude-session

**Kära Claude, läs detta i sin helhet innan du gör något annat.**

Du står i mappen `electro-union-modules/`. Nina har fått denna zip av KP (via
AirDrop från hans Mac) och du ska hjälpa henne få upp den på GitHub Pages
så att modulerna kan embedas i Webflow CMS på norrsken.org.

---

## 1. Vad det här är (kort kontext)

Norrsken publicerar en open-letter-artikel: *"Make Europe the Electro-Union"*.
Den ska ha en interaktiv modul inbakad i artikeln. Originalet (`Golden`) var
en enda 4170-raders HTML-fil som hostades på `trollprinsessan/electrounion`.
Feedback från Daniel Goldberg gjorde att vi bröt isär modulen i **7 mindre,
oberoende moduler** så att redaktören kan välja vilken/vilka som ska ligga i
artikeln.

Detta repo är **bara de 7 modulerna + en landningssida**. Ingenting rörande
själva artikeln — den bor i Webflow CMS.

**Viktigt**: Nina har ett existerande repo `trollprinsessan/electrounion` som
hostar hela Golden-versionen. Det ska **inte** röras. Det nya repot heter
`electro-union-modules` och är helt separat.

---

## 2. Vad du ska göra just nu (Steg 1-4)

### Steg 1: Verifiera innehållet

Kolla att dessa filer finns i rooten:

- `.nojekyll` (tom — KRITISK för att GitHub Pages ska servera `_shared/`)
- `.gitignore`
- `README.md`
- `index.html` (landningssida med 7 iframe-previews)
- 7 modul-mappar: `gate/`, `toolkit/`, `postcard-generator/`,
  `music-player/`, `merch/`, `drawing/`, `guestbook/`
- `_shared/` med `fonts.css`, `tokens.css`, `embed.js`, `supabase.js`, `fonts/`

```bash
ls -la
```

### Steg 2: Git-init + första commit

**Fråga Nina efter hennes GitHub-username först** om du inte redan vet det.
(Den är troligen `trollprinsessan` men bekräfta innan du kör `git remote add`.)

```bash
git init -b main
git add .
git commit -m "Initial import — modularized Electro Union from Golden"
```

### Steg 3: Skapa remote + push

Nina ska ha skapat ett tomt repo på:
**https://github.com/new** → namn: `electro-union-modules` → publikt →
inga auto-genererade filer (ingen README, ingen .gitignore, ingen license).

När repot finns:

```bash
git remote add origin git@github.com:trollprinsessan/electro-union-modules.git
git push -u origin main
```

Om SSH inte är konfigurerat, använd HTTPS:

```bash
git remote add origin https://github.com/trollprinsessan/electro-union-modules.git
git push -u origin main
```

Hon kan behöva ett Personal Access Token första gången — guide:
https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

### Steg 4: Aktivera GitHub Pages

Nina går manuellt till:
**https://github.com/trollprinsessan/electro-union-modules/settings/pages**

- Source: **Deploy from a branch**
- Branch: **main** / **/ (root)**
- Klicka **Save**

Vänta 30-60 sekunder. GitHub visar grönt banner överst: *"Your site is live at
https://trollprinsessan.github.io/electro-union-modules/"*

### Steg 5: Verifiera att det funkar

Öppna i browser:

- `https://trollprinsessan.github.io/electro-union-modules/` — ska visa landningssidan
- `https://trollprinsessan.github.io/electro-union-modules/gate/?embed=1` — ska visa gate-modulen

**Om du får 404 på `_shared/fonts.css` eller något i `_shared/`**: `.nojekyll`-filen
saknas eller är felplacerad. Skapa den tomt i rooten, `git add .nojekyll`, commit, push.

### Steg 6: Uppdatera iframe-src:arna

I `index.html` finns 8 ställen där iframe-src:en pekar på
`http://192.168.50.3:3000/` (det var KP:s lokala test-IP). Byt ut dem:

```bash
# sed-lösning (macOS-variant)
sed -i '' 's|http://192.168.50.3:3000/|https://trollprinsessan.github.io/electro-union-modules/|g' index.html
```

Eller bara gör en sök-och-ersätt i editorn. Commit + push.

Nu genererar "Copy iframe"-knapparna på landningssidan riktiga URL:er som
fungerar direkt i Webflow.

---

## 3. Workflow — hur Nina uppdaterar en modul

När hon vill ändra t.ex. en låt i `music-player/`:

```bash
# 1. Redigera filer
#    (t.ex. music-player/script.js eller lägga till fil i music-player/MUSIC/)

# 2. Testa lokalt
npx serve . -l 3000
# Öppna http://localhost:3000/music-player/ i browser
# Gör sig av med servern med Ctrl+C när du är klar

# 3. Committa + pusha
git add .
git commit -m "music-player: beskriv vad du ändrat"
git push

# 4. Vänta ~60 sekunder
# 5. Hard-refresh (Cmd+Shift+R) Webflow-sidan på norrsken.org
```

**Kom ihåg**: browser-cache kan göra att gamla versionen visas tills cachen
expirerar (normalt ~10 min). Hard-refresh tvingar ny hämtning. Om det är
kritiskt att uppdateringen syns direkt, bump version-parametern:

```html
<iframe src=".../music-player/?embed=1&v=2">
```

---

## 4. Lokal utvecklingsserver

**Rekommenderat sätt:**

```bash
npx serve . -l 3000
# Öppnar på http://localhost:3000/
```

Fungerar direkt utan installation. `npx` laddar ner `serve` första gången,
sen är det cache:at.

**Alternativ:**

```bash
python3 -m http.server 3000
# ELLER
php -S localhost:3000
```

Alla fungerar — det är 100% statiska filer.

**Tips för Nina**: säg till Claude "starta dev-servern på port 3000" och
Claude gör det åt henne. Säg "stäng dev-servern" för att döda den.

**VIKTIGT**: aldrig kör två dev-servers samtidigt på samma port. Om port 3000
är upptagen: `lsof -ti:3000 | xargs kill` stänger den.

---

## 5. Vanliga problem och lösningar

### "404 på `_shared/fonts.css`"
→ `.nojekyll` saknas i rooten. Skapa den tomt, `git add .nojekyll`, commit,
push. Vänta 60s. GitHub Pages rebuilds.

### "Iframen laddar inte på Webflow"
→ Kolla Webflow är HTTPS. Iframe-src MÅSTE också vara HTTPS (inte HTTP).
Kolla att GitHub Pages URL:en funkar i browsern direkt först.

### "Iframen är för kort / klipper av innehåll"
→ Resize-scriptet i iframe-snippen har inte kopplats. Dubbelkolla att
`<script>`-blocket är inklistrat tillsammans med `<iframe>` i Webflow
Embed-blocket. Det är två kod-delar, båda behövs.

### "Ändringen syns inte efter push"
→ 1) GitHub Actions-fliken kollar om Pages-deploy lyckats. 2) Browser-cache
— hard-refresh (Cmd+Shift+R). 3) Iframe själv cachas — bump `?v=N`-parametern.

### "Supabase returnerar fel i gate/guestbook"
→ Kolla nätverk i DevTools. Supabase-URL är `qqaiqevsygqwlfnvnhiu.supabase.co`.
Publishable-key är hardcoded i `_shared/supabase.js` och är säker
(RLS-skyddad). Om den slutat fungera: KP har backup, kolla med honom.

### "Counter startar om på 0 när jag testar lokalt"
→ Lokal och produktions-Supabase är samma DB. Om siffran hoppar runt är
det för att någon annan testar samtidigt. Ofarligt.

### "Musiken spelar inte"
→ Browsers blockerar autoplay utan user gesture. Användaren måste klicka
på play-knappen eller nånstans på sidan först. `script.js` hanterar detta.
I iframe-läge kan det finnas extra restrictions — `allow="autoplay"` på
iframe-taggen hjälper.

### "Drawing/Postcard-exporten crashar browsern"
→ Canvas-operationer på stora bilder är RAM-tungt. På äldre iPhones kan GIF-
encodern hänga. Golden-versionen har debug-logging. Kolla console.

---

## 6. Lägga till nya assets (bilder, videos, ljud)

**Regel**: allt hamnar i modulens egen mapp, och referenser använder
**relativa paths** (inte absoluta, inte externa).

### Exempel: ny låt i music-player

```bash
# 1. Kopiera m4a-filen
cp ~/Downloads/nyTrack.m4a music-player/MUSIC/

# 2. Lägg till den i music-player/script.js
#    Hitta tracks-arrayen och lägg till:
#    { name: 'Ny Track', artist: 'Artist Name', src: 'MUSIC/nyTrack.m4a' }

# 3. Testa lokalt
npx serve . -l 3000
# http://localhost:3000/music-player/

# 4. Push
git add music-player/
git commit -m "music-player: add Ny Track"
git push
```

### Exempel: ny sticker i drawing

```bash
cp ~/Downloads/nySticker.png drawing/Updated\ Imagery/
# Uppdatera listan i drawing/script.js
# Push
```

### Filnamns-tips

- **Undvik mellanslag** i nya filer (use hyphens eller underscore). "Ny Fil.png"
  funkar men blir encoded till "Ny%20Fil.png" — ser fult ut och kan krångla
  i vissa miljöer.
- **Små filstorlekar**: < 1 MB för bilder, < 5 MB för audio, < 30 MB för GIFs.
  Större än så: komprimera med ezgif/handbrake/squoosh innan push.
- **Format**: PNG/JPG/WebP för bilder, M4A/MP3 för ljud, GIF/MP4 för animation.

---

## 7. Storleksgränser (GitHub Pages)

- Enskild fil: max **100 MB**
- Repo total: rekommenderat **under 1 GB**, hard limit 5 GB
- Bandbredd: **100 GB/månad**

Modulerna ligger på ~210 MB totalt. Gott om marginal.

**Om något blir för stort**: video är bäst att hosta på Vimeo/YouTube och
embed:a via `<iframe>`. Bilder över 5 MB bör komprimeras.

---

## 8. Relation till andra projekt

- **`trollprinsessan/electrounion`**: original-repot med Golden-versionen. Finns
  kvar och rörs inte. Hostar fortfarande `https://trollprinsessan.github.io/electrounion/`.
- **`electro-union-modules`** (detta repo): modulär version. Hostar
  `https://trollprinsessan.github.io/electro-union-modules/`.
- **Webflow CMS**: Norrsken-artikeln på `norrsken.org/goodnews/...`. Bäddar in
  modulerna via iframe.

De är **tre separata saker**. Ändring i ett påverkar inte de andra.

---

## 9. Om du (Claude) är osäker

**Fråga KP om något är oklart.** Han har byggt hela workspace-strukturen och
har full kontext. Hans Mac har en parallell session som kan svara på frågor.
Nina kan SMSa eller ringa honom.

**Rör INTE** följande utan att fråga först:

- `trollprinsessan/electrounion` (Golden-repot) — orört tack
- Webflow CMS live-sidor — bara lägga till/byta iframe-src, inte redigera artikeln
- Supabase backend-config
- Domän-settings (DNS, custom domain på GitHub Pages)

---

## 10. Verifiering — vad som ska fungera när du är klar

- [ ] `https://trollprinsessan.github.io/electro-union-modules/` laddar landningssidan
- [ ] 7 iframe-previews renderar korrekt (music-player visar player ovanpå citat,
      merch visar badge + 9 produkter, toolkit visar flag-cykel, osv.)
- [ ] "📋 Copy iframe"-knapparna kopierar snippet med korrekt GitHub Pages-URL
- [ ] Inklistrad iframe-snippet i en test-Webflow-sida renderar modulen
- [ ] iframen justerar höjd automatiskt (inget scroll inuti, inget avklipp)

När allt ovan är grönt — ping KP, så levererar han till Daniel/Webflow-teamet.

---

## 11. Snabbreferens — URL-struktur

| Resurs | URL |
|--------|-----|
| Landing | `https://trollprinsessan.github.io/electro-union-modules/` |
| Gate | `.../gate/?embed=1` |
| Toolkit | `.../toolkit/?embed=1` |
| Postcard generator | `.../postcard-generator/?embed=1` |
| Music player | `.../music-player/?embed=1` |
| Merch | `.../merch/?embed=1` |
| Drawing | `.../drawing/?embed=1` |
| Guestbook | `.../guestbook/?embed=1` |

Parameter `?embed=1` säger till modulen att dölja hero/footer och posta
höjd till parent via `postMessage`. Utan den körs modulen i standalone-läge
(visar hero, footer, och allt).

---

*Lycka till. Koden är ren, modulerna fungerar, och KP har testat allt lokalt.
Vad som återstår är bara hosting + Webflow-embedding.*

— KP's workspace, 2026-04-18
