# Master plan: Mini sajt salona (Faza 9 / K7)

> „Sajt koji se sam ažurira" — javna strana salona na `tefter.rs/s/:slug` koju vlasnik složi
> za 5 minuta: izabere temu, boju i slike, a cenovnik i radno vreme se pune sami iz baze.
> Kontekst i cene: `docs/KONKURENCIJA.md` §K7, `docs/PLAN.md` Faza 9.

---

## 1. Cilj i princip

- **Za salon**: pravi sajt (Google ga nalazi, šalje se u Instagram bio) bez studija od 30–60k RSD
  i bez zastarevanja — promena cene usluge u Tefteru menja i sajt.
- **Za nas**: akvizicioni mamac (Free verzija sa „Napravljeno u Tefteru" potpisom = besplatna
  reklama u svakom Instagram bio-u) + razlog više za Pro + dodatak „svoj domen".
- **Princip**: pattern, ne custom. Jedan `site.njk` + CSS varijable; nula koda po salonu.
  Nikakav site-builder sa prevlačenjem — biraš iz ponuđenog, zato je nemoguće napraviti ružan sajt.

## 2. Struktura javne strane (odozgo nadole)

| Sekcija | Izvor podataka | Napomena |
|---|---|---|
| **Hero** | ime salona (baza) + hero slika (upload) + slogan (unos) | dugmad: „Zakaži termin" (→ Faza 6; do tada `tel:` poziv) i „Pozovi" |
| **O nama** | tekst do 400 znakova (unos) | opciona sekcija |
| **Cenovnik** | `services` gde `is_active` | automatski; prekidač „prikaži cene" (neki saloni neće javne cene → onda samo spisak usluga) |
| **Galerija** | do 6 slika (upload) | lightbox nije potreban — tap otvara sliku |
| **Tim** | `staff` gde `is_active` (samo imena + boje) | opciona sekcija |
| **Radno vreme** | `working_hours` | automatski; „danas" red podebljan |
| **Kontakt** | telefon, adresa, Instagram/Facebook link (unos) | adresa → link na Google Maps pretragu (bez embed-a i API ključa) |
| **Footer** | — | Free: „Napravljeno u Tefteru" → link na `/` (akviziciona petlja); Pro: bez potpisa |

Sve sekcije bez podataka se ne renderuju — sajt nikad ne izgleda prazno.

## 3. URL-ovi i rutiranje

```
GET /s/:slug                     → javni sajt (objavljen) | „stranica u pripremi" (404) ako nije
GET /s/:slug/podesavanja/sajt    → editor (zaštićeno, postojeći requireAuthHook)
POST /s/:slug/podesavanja/sajt          → snimanje podešavanja sajta
POST /s/:slug/podesavanja/sajt/slika    → upload (multipart)
POST /s/:slug/podesavanja/sajt/slika/:id/obrisi
GET /uploads/*                   → statika slika (fastifyStatic, immutable cache)
```

- `/s/:slug` root ide u **javni** scope (pored `authRoutes`), ne u zaštićeni.
- Ulogovan vlasnik na `/s/:slug` vidi plutajuće dugme „Uredi sajt" (session check, ništa više).
- `redirect posle prijave` ostaje `/day` — sajt ne dira app flow.

## 4. Model podataka (migracija `0003_site.sql`)

```sql
-- salon_sites: 1:1 sa salons; tenant tabela → RLS FORCE kao i ostale.
create table salon_sites (
  salon_id    uuid primary key references salons(id) on delete cascade,
  published   boolean not null default false,
  theme       text not null default 'klasicna',       -- klasicna | moderna | tamna
  brand_color text not null default '#0f172a',        -- iz palete, validira safeBrandColor()
  tagline     text not null default '',               -- slogan u hero-u, max 80
  about       text not null default '',               -- max 400
  phone       text not null default '',               -- javni broj (≠ nalog)
  address     text not null default '',
  instagram   text not null default '',               -- samo handle, bez URL-a
  facebook    text not null default '',
  show_prices boolean not null default true,
  show_staff  boolean not null default true,
  updated_at  timestamptz not null default now()
);

-- salon_photos: hero + galerija.
create table salon_photos (
  id         uuid primary key default gen_random_uuid(),
  salon_id   uuid not null references salons(id) on delete cascade,
  kind       text not null,                           -- 'hero' | 'gallery'
  sort       int  not null default 0,
  created_at timestamptz not null default now()
);
```

RLS politike identične postojećim tenant tabelama (`salon_id = current_setting('app.current_salon_id')`).
**Javno čitanje** ide kroz postojeći `withTenant(salonId, …)` — resolveSalonHook već razrešava
salon bez sesije, pa javna ruta ima salonId legalno.

## 5. Teme i šablon

Jedan `site.njk` (ekstenduje `marketing.njk` — već postoji layout bez app shell-a). Tema je
klasa na `<body>`, boja je CSS varijabla:

```html
<body class="theme-{{ site.theme }}" style="--brand: {{ site.brandColor }}">
```

| Tema | Karakter | Razlike (samo CSS) |
|---|---|---|
| **Klasična** | svetla, serif naslovi, tanke linije | default; jedina u Free |
| **Moderna** | svetla, krupan sans, zaobljene kartice, brand pozadina hero-a | Pro |
| **Tamna** | tamna pozadina, brand akcenti | Pro |

- Teme žive u `app.css` (`@layer components`, `.theme-x .site-*` selektori) — bez novih fajlova,
  bez JS-a. Dodavanje četvrte teme = ~40 linija CSS-a.
- `safeBrandColor()` u `src/lib/palette.ts` (isti princip kao `safeStaffColor`) — paleta od
  8 boja prilagođenih i svetloj i tamnoj temi; sprečava i CSS injection kroz style atribut.

## 6. Editor („Moj sajt" u Podešavanjima)

Jedan ekran, redosled kao na sajtu, Alpine bez ičeg novog:

1. **Status**: prekidač Objavljen/Skriven + link „Pogledaj sajt" (otvara `/s/:slug` u novom tabu).
2. **Tema**: 3 radio kartice sa CSS mini-pregledom (obojeni pravougaonici, bez slika);
   Free korisniku su Pro teme vidljive ali zaključane (🔒 → upsell ka Pro).
3. **Boja**: paleta krugova — isti UI pattern kao boja radnika (`staff.njk`).
4. **Slike**: hero (1) + galerija (do 6, Free do 2). `<input type="file" accept="image/*">`,
   posle upload-a redirect nazad (bez fancy progress bara — slike su male).
5. **Tekstovi i kontakt**: slogan, o nama (brojač znakova), telefon, adresa, Instagram, Facebook.
6. **Prekidači**: prikaži cene / prikaži tim.

Validacija na serveru (Zod), 422 + poruka kao na ostalim ekranima.

## 7. Slike — pipeline

- **Zavisnost**: `sharp` (jedina nova). Napomena za Docker: `node:20-alpine` traži
  `apk add vips` ili prelazak na `node:20-bookworm-slim` — rešiti u Dockerfile-u pre deploy-a.
- **Obrada pri upload-u** (`@fastify/multipart`, limit 8 MB): dekodiraj sharp-om (ovo je i
  provera da je stvarno slika — magic bytes, ne ekstenzija), rotiraj po EXIF-u, skini metapodatke,
  konvertuj u **WebP q80**: hero → 1600 px širine (~150 KB), galerija → 1200 px + thumb 400 px.
- **Skladište**: `data/uploads/{salonId}/{photoId}.webp` (+ `-thumb`). U Dockeru volume,
  backup istim cron-om kao `pg_dump`. Bez S3 — do 1.000 salona je to < 2 GB.
- **Serviranje**: `fastifyStatic` na `/uploads` sa `Cache-Control: public, max-age=31536000,
  immutable` — ime fajla je UUID pa je keš večan; zamena slike = novi UUID.
- **Brisanje**: red iz `salon_photos` + `unlink` fajlova; brisanje salona → cascade + čišćenje
  foldera.

## 8. SEO po salonu

- `<title>`: „{Ime salona} — {grad ako je u adresi} | zakazivanje i cenovnik".
- Meta description iz „o nama" (fallback: generisana rečenica sa uslugama).
- **JSON-LD `HairSalon`** (schema.org): ime, adresa, telefon, radno vreme (`openingHoursSpecification`
  iz `working_hours`), `priceRange`.
- OG tagovi + hero slika kao `og:image` → lep preview kad se link šalje u Viber/Instagram poruci
  (ovo saloni odmah primete!).
- **`robots.txt` izmena** (bitno): sada je `Disallow: /s/` — mora da postane:
  ```
  Allow: /s/*$          ← javni sajtovi (i kasnije /s/*/zakazi)
  Disallow: /s/*/day  /s/*/klijenti  /s/*/usluge ... (app rute eksplicitno)
  ```
- `sitemap.xml` dinamički dodaje objavljene sajtove (`select slug from salons join salon_sites
  … where published`).

## 9. Free / Pro / dodatak

| | Free | Pro (1.490 RSD/mes) |
|---|---|---|
| Sajt objavljen | ✅ | ✅ |
| Teme | Klasična | sve 3 |
| Galerija | 2 slike | 6 slika |
| „Napravljeno u Tefteru" u footeru | da (link na tefter.rs) | bez potpisa |
| OG slika za deljenje | — | ✅ |
| **Svoj domen** (`salonmilica.rs`) | — | **+2.990 RSD/god** |

Gating preko `salons.plan` (Faza 5) — sajt čita plan i sam se ograniči; ništa se ne briše pri
padu na Free (višak slika se samo ne prikazuje, tema se vrati na Klasičnu).

## 10. Svoj domen (pod-faza 9.4, posle launcha na VPS)

- Kolona `salons.custom_domain` (unique, nullable) — postavlja je admin ručno pri aktivaciji
  dodatka (kao i Pro — bez self-service-a za sada).
- Caddy `on_demand_tls` + `ask` endpoint u aplikaciji (`GET /caddy/ask?domain=…` → 200 ako
  domen postoji u bazi) — TLS sertifikat se izdaje automatski, 0 RSD.
- `onRequest` hook: ako `Host` nije tefter.rs → lookup po `custom_domain` → interno servira
  `/s/:slug` sadržaj; canonical pokazuje na custom domen.
- Uputstvo salonu (jedan email šablon): „kupi domen kod [registra], upiši A zapis na IP …".
  Preporuka: salon kupuje domen sam (njegovo vlasništvo, naša nula administracije).

## 11. Redosled implementacije

| Korak | Sadržaj | Procena |
|---|---|---|
| **9.0 Dizajn demo** ✅ | `GET /sajt-demo` — tema „Noć" sa mock podacima (`site.njk`): aurora hero, marquee, scroll-reveal, cenovnik sa tačkastim vođicama, galerija, tim, radno vreme sa „danas", mobilni fiksni CTA. Sinhronizacija sa bazom = zamena izvora podataka. | ✅ |
| **9.1 MVP** | migracija 0003, javna ruta + `site.njk` sa temom Klasična, editor bez slika (tema/boja/tekstovi/kontakt/publish), auto cenovnik + radno vreme, robots/sitemap izmena | 1,5 dan |
| **9.2 Slike** | sharp pipeline, hero + galerija, upload/brisanje u editoru, `/uploads` statika | 1 dan |
| **9.3 Teme + polish** | Moderna i Tamna tema, JSON-LD + OG, sekcija Tim, „Uredi sajt" dugme za vlasnika | 1 dan |
| **9.4 Gating** | Free/Pro ograničenja (čim Faza 5 postoji), footer potpis | 0,5 dan |
| **9.5 Svoj domen** | Caddy on-demand TLS + host lookup | posle deploy-a na VPS |

Preduslov nema — **9.1–9.3 mogu odmah**, nezavisno od Faze 6 (dugme „Zakaži" do tada vodi na
`tel:` poziv, pa se samo prevezuje kad Faza 6 stigne).

## 12. Verifikacija (definition of done za 9.1–9.3)

- curl matrica: `/s/demo` 200 bez sesije (objavljen) / 404 (neobjavljen); editor 302 bez sesije,
  200 sa; POST snimanja 303 + persist; upload odbija ne-sliku i > 8 MB (422).
- RLS: salon A ne može da čita/piše `salon_sites`/`salon_photos` salona B (postojeći test šablon).
- Promena cene usluge u app-u → odmah vidljiva na `/s/demo` (nema keša HTML-a).
- `robots.txt` dozvoljava `/s/demo`, brani `/s/demo/day`; sitemap sadrži objavljene sajtove.
- Vitest: `safeBrandColor`, generisanje `openingHoursSpecification`, plan-gating helper.
- Mobilni pregled: Lighthouse na `/s/demo` ≥ 90 performance (statičan HTML + 1 CSS → lako).

## 13. Šta NE raditi (v1)

- Bez drag-and-drop buildera, custom fontova i slobodnog rasporeda sekcija — uništava
  „nemoguće je napraviti ružan sajt" garanciju i množi podršku.
- Bez Google Maps embed-a (API ključ, kolačići) — link na mape je dovoljan.
- Bez recenzija/komentara — moderacija je posao; Google recenzije već postoje, samo link.
- Bez multijezičnosti — ciljna grupa je domaća.
- Bez S3/CDN-a pre 1.000 salona.
