# Tefter — plan pune aplikacije

> Status: Faze 1 (Mobile + PWA), 2 (Auth + onboarding), 4 (Početna strana) i 3 (CRUD ekrani +
> statistika) implementirane i verifikovane (2026-07-18).
> Arhitektura je fiksna: Fastify + TypeScript, Nunjucks (server-side render), HTMX + Alpine.js
> (NO React, NO JS build step), Tailwind CLI, PostgreSQL, Drizzle ORM, Zod, Vitest,
> Docker Compose (app + Postgres + Caddy) na Hetzner VPS. Multi-tenant preko `salon_id` +
> Row-Level Security, path routing `/s/:salonSlug/...`.

## Slika celine

```
tefter.rs
├── /                    → Početna (marketing, cenovnik, registracija)  [javno]
├── /registracija, /prijava
├── /s/:slug/...         → Aplikacija salona (PWA, iza logina)
│     ├── /day, /week    → kalendar
│     ├── /klijenti, /usluge, /radnici, /podesavanja
│     └── /statistika    [premium]
└── /s/:slug/zakazi      → Javna booking strana za klijente salona  [premium]
```

Aplikacija je zamišljena kao **mobile-first PWA** — mora da radi i da se oseća kao native
mobilna aplikacija (instalacija na početni ekran, bottom navigacija, touch-friendly), uz isti
monolit i bez React-a/JS build koraka.

---

## Faza 1 — Mobile-first + PWA ("kao native app") ✅ Isporučeno

Cilj: postojeći ekrani (dnevni kalendar + modal za termin) rade odlično na telefonu kao
primarnom uređaju, i aplikacija se može instalirati kao PWA.

- **Bottom navigacija** (4 taba: Danas · Kalendar · Klijenti · Više) — palac-friendly, fiksirana
  dole, safe-area za iPhone notch.
- **FAB dugme "+"** za novi termin, uvek dostupno; pametan prefill vremena (danas → sledeći
  slobodan kvart, drugi dan → početak radnog vremena).
- **Modal → bottom sheet**: na telefonu forma termina klizi odozdo preko celog ekrana (na
  desktopu ostaje centriran modal). Alpine tranzicije + drška (`sheet-handle`).
- **Swipe levo/desno** menja dan (touch events, bez biblioteke); vertikalni scroll ne okida
  promenu dana.
- **Touch mete ≥ 44px**, inputi `font-size: 16px` (sprečava iOS auto-zoom), `inputmode="tel"/
  "numeric"` na pravim poljima.
- **PWA paket**: `manifest.webmanifest` (ime, ikonice, standalone, theme color), service worker
  (cache statike + offline shell sa porukom), "Dodaj na početni ekran" prompt → aplikacija se
  instalira i pokreće bez browser UI-a, izgleda identično native aplikaciji.

Verifikovano uživo: RLS izolacija, soft-check preklapanja, mobilni layout (bottom nav/FAB/sheet
merenjem geometrije), swipe navigacija, service worker + manifest.

## Faza 2 — Auth + onboarding ✅ Isporučeno

- **Prijava**: po salonu (`/s/:slug/prijava`) i globalna (`/prijava`, lookup po email-u preko
  SECURITY DEFINER funkcije — RLS ostaje netaknut). bcrypt + potpisani session cookie
  (HMAC-SHA256, HttpOnly, SameSite=Lax, 30 dana, `SESSION_SECRET`). Odjava u "Više" tabu.
- **Zaštita svih tenant ruta**: preHandler posle tenant resolve-a; HTMX zahtevi dobijaju
  `HX-Redirect`, obični 302 na prijavu salona.
- **Registracija salona** (`/registracija`): ime → slug (transliteracija š/đ/č/ć/ž, kolizija →
  `-2`, `-3`…), email, lozinka; salon + nalog + default radno vreme u jednoj transakciji →
  **onboarding wizard u 3 koraka** (radno vreme → usluge → radnici, korak 3 preskočiv) i pravo
  u kalendar.
- Verifikovano: login (pogrešna/tačna lozinka, oba oblika), zaštita ruta sa/bez sesije, HTMX 401
  + HX-Redirect, ceo registracioni flow sa UTF-8 imenom, dupli email (422, bez salona-siročeta),
  dupli slug, izolacija sesija među salonima; typecheck + 17 vitest testova.
- Reset lozinke preko email-a (kasnije u fazi; MVP može ručno).

## Faza 3 — Kompletne app opcije (CRUD ekrani) ✅ Isporučeno (bez nedeljnog pregleda)

| Ekran | Ruta | Stanje |
|---|---|---|
| **Klijenti** | `/klijenti`, `/klijenti/:id` | lista sa brojem dolazaka i potrošnjom, pretraga, novi klijent, profil: izmena imena/telefona/beleške, `tel:`/`sms:` dugmad, istorija termina (otkazani precrtani), brisanje (blokirano ako ima termine) |
| **Usluge** | `/usluge` | lista (aktivne prve), dodavanje, izmena naziva/trajanja/cene, deaktivacija |
| **Radnici** | `/radnici` | lista, dodavanje, izmena imena i boje iz palete, deaktivacija |
| **Podešavanja** | `/podesavanja` | ime salona, početak nedelje, radno vreme po danu (validacija), email naloga, odjava |
| **Statistika** | `/statistika` | promet/termini/klijenti/otkazivanja za dan · nedelju · mesec, stubići po danima, tabele po radniku i po usluzi |
| **Nedeljni pregled** | — | ostalo za kasnije |

Usput: `rsd` i `plural` Nunjucks filteri (srpska množina: 1 dolazak / 2 dolaska / 5 dolazaka),
paleta boja radnika izdvojena u `src/lib/palette.ts`, bottom nav vodi na prave ekrane.

## Faza 4 — Početna strana (marketing) ✅ Isporučeno

- `/` servira landing (`marketing.njk` layout bez app shell-a + `landing.njk`): hero sa mockup-om
  telefona (čist HTML/CSS, bez slike), problem→rešenje blok, 4 feature kartice, Pro sekcija
  (online zakazivanje), **cenovnik Free/Pro**, FAQ (5 pitanja), finalni CTA, footer.
  Ulogovan korisnik u header-u dobija „Otvori aplikaciju" umesto CTA-ova.
- Sadržaj (cena, feature liste, FAQ) živi u `src/web/routes/marketing.ts` — cena se menja
  na jednom mestu (`PRICING.proMonthly`, trenutno **1.490 RSD/mes**).
- SEO: title/description, canonical, OG + Twitter tagovi, JSON-LD `SoftwareApplication` sa
  ponudama, `/robots.txt` (Disallow `/s/`) i `/sitemap.xml`.
- Usput: service worker prebačen na stale-while-revalidate (cache `tefter-v2`) — ranije je
  cache-first zauvek servirao staru `app.css`.

## Faza 5 — Premium model

Predlog paketa (sve se gate-uje jednim poljem `salons.plan` + `plan_expires_at`):

| | **Free** | **Pro** (~1.500–2.000 RSD/mes) |
|---|---|---|
| Kalendar + termini | ✅ | ✅ |
| Radnici | 1 | neograničeno |
| Klijenti | ✅ | ✅ + istorija/potrošnja |
| Online zakazivanje (javna strana) | — | ✅ |
| Statistika i izveštaji | — | ✅ |
| Podsetnici klijentima | — | ✅ |

**Naplata (potvrđeno):** bez payment gateway-a za sada. Vlasnik salona šalje PDF predračun/
uplatnicu/IPS ručno, vlasnik aplikacije (admin) ručno aktivira Pro plan u bazi/admin panelu.
Stripe ne radi za naplatu iz Srbije; ako ikad zatreba gateway, kandidati su Paddle/Lemon Squeezy
(merchant of record) ili lokalni gateway (AllSecure/NestPay) — nije prioritet.

## Faza 6 — Online zakazivanje (killer premium feature)

`/s/:slug/zakazi` — javna strana bez logina: klijent bira uslugu → vidi **stvarno slobodne
termine** (iz radnog vremena minus zauzeće) → ostavi ime + telefon → zahtev stiže vlasniku
(potvrdi/odbij u aplikaciji, badge na tabu). Ovo je razlog da salon plati Pro.

## Faza 7 — Statistika + podsetnici

- Promet po danu/nedelji/mesecu, po radniku, po usluzi; broj otkazivanja.
- Podsetnici MVP **bez troška**: dugme na terminu otvara gotov `sms:`/WhatsApp/Viber link sa
  unapred sastavljenom porukom. Automatski SMS (plaćeni provajder) tek kasnije.

## Faza 8 — Diferencijatori ("samo mi to imamo")

Detaljna analiza konkurencije i obrazloženje: `docs/KONKURENCIJA.md`. Ukratko, redom:

1. **K1** Viber/WhatsApp/SMS podsetnici za 0 RSD (konkurencija naplaćuje 5,95 RSD/SMS) — Free.
2. **K2** Kapara preko **NBS IPS QR** koda — pare direktno na račun salona, bez gateway-a;
   ubija no-show. Niko lokalno ovo nema.
3. **K3** Karton klijenta: formula boje, alergije, omiljeni radnik — frizerski lock-in.
4. **K5** Pametan „vreme je za termin" — klijenti koji su probili svoj prosečan ritam dolazaka
   + jedan tap do Viber poruke.
5. **K4** Lista čekanja — otkazan termin se nudi klijentima koji čekaju taj dan.
6. **K6** Ocena pouzdanosti klijenta → automatski predlog kapare (K2+K6 kombinacija je unikat).

## Faza 9 — Mini sajt salona (K7: "sajt koji se sam ažurira")

Javna strana `tefter.rs/s/:slug` kao mali sajt salona: hero (ime + fotka), o nama, **cenovnik
automatski iz usluga**, galerija (do 6 slika, WebP preko sharp-a), **radno vreme automatski iz
podešavanja**, kontakt + Instagram, dugme „Zakaži" → Faza 6.

- **Pattern, ne custom**: jedan `site.njk` + CSS varijable. Salon bira temu (3–4 varijante),
  boju iz palete (isti UI kao boja radnika) i slike — editor je jedan ekran u Podešavanjima.
- **Cene**: osnovna tema u Free (sa Tefter potpisom — akvizicioni mamac); sve teme + galerija
  bez potpisa u Pro; svoj domen +2.990 RSD/god (Caddy on-demand TLS, domen kupuje salon).
- **Trošak za nas**: ~0 (isti VPS; ~1,2 MB slika po salonu).
- Prodajni ugao: sajt kod studija = 30–60k RSD + naplata izmena; kod nas uključeno i nikad
  zastareo — promena cene usluge menja i sajt.

## Infrastruktura (paralelno, pred launch)

Deploy na Hetzner (Docker Compose: app + Postgres + Caddy sa auto-TLS), noćni `pg_dump` backup,
health-check.

---

## Redosled implementacije

1. ✅ Faza 1 — Mobile + PWA
2. ✅ Faza 2 — Auth + registracija + onboarding
3. ✅ Faza 4 — Početna strana
4. ✅ Faza 3 — CRUD ekrani (+ prvi deo statistike iz Faze 7)
5. Faza 6 — Online zakazivanje (razlog da se plati Pro — ide pre gating-a)
6. K1 podsetnici (Viber/WhatsApp/sms linkovi, Free)
7. Faza 5 — Premium gating (`salons.plan`)
8. Faza 8 — diferencijatori redom: K2 kapara → K3 karton → K5 ritam → K4 lista čekanja → K6
9. Nedeljni pregled + izvoz u Excel (usput)

Cilj ovog redosleda: najranije dobiti nešto što se može pokazati salonima i pustiti prve
korisnike (registracija + osnovni kalendar + CRUD), pa tek onda premium slojeve.
