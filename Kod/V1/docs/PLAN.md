# Tefter — plan pune aplikacije

> Status: Faza 1 (Mobile + PWA), Faza 2 (Auth + registracija + onboarding) i Faza 4 (Početna
> strana) implementirane i verifikovane (2026-07-18).
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

## Faza 3 — Kompletne app opcije (CRUD ekrani)

| Ekran | Sadržaj |
|---|---|
| **Klijenti** | lista + pretraga, profil klijenta: istorija termina, ukupna potrošnja, beleške, brzi poziv (`tel:`) i SMS (`sms:`) linkovi |
| **Usluge** | dodavanje/izmena/deaktivacija, trajanje + cena |
| **Radnici** | ime, boja (postojeća paleta), aktivacija |
| **Podešavanja** | radno vreme po danu, početak nedelje, ime salona, jezik/valuta kasnije |
| **Nedeljni pregled** | kompaktni 7-dnevni grid (broj termina + zauzetost po danu), tap → dnevni prikaz |

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

## Infrastruktura (paralelno, pred launch)

Deploy na Hetzner (Docker Compose: app + Postgres + Caddy sa auto-TLS), noćni `pg_dump` backup,
health-check.

---

## Redosled implementacije

1. ✅ Faza 1 — Mobile + PWA
2. ✅ Faza 2 — Auth + registracija + onboarding
3. ✅ Faza 4 — Početna strana
4. Faza 3 — CRUD ekrani
5. Faza 5 — Premium gating
6. Faza 6 — Online zakazivanje
7. Faza 7 — Statistika + podsetnici

Cilj ovog redosleda: najranije dobiti nešto što se može pokazati salonima i pustiti prve
korisnike (registracija + osnovni kalendar + CRUD), pa tek onda premium slojeve.
