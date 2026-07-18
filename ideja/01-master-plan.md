# Master Plan — Salon Booking App "Sveska u oblaku"

Ciljni tržišni segment: Male beauty usluge u Srbiji (frizeri, kozmetičari, manikiri). MVP za 20 salona. Prioritet: najlakše održavanje.

---

## Arhitektonske odluke (fiksne)

| Aspekt | Izbor | Obrazloženje |
|---|---|---|
| **Backend** | Fastify + TypeScript | Thin, brz ruter; bez magije. Jedan Node proces, jedan deploy. |
| **Templating** | Nunjucks (server-side) | HTML se generiše na serveru, browser dobija gotov sadržaj. Nema hydration problema. |
| **Frontend interaktivnost** | HTMX + Alpine.js | HTMX šalje male zahteve serveru koji vraća HTML fragmente (npr. dnevni prikaz). Alpine za lokalne UI stvari (modal toggle, highlight). Bez React-a, bez build koraka za JS. |
| **Stilovi** | Tailwind CSS CLI | Tailwind preko Tailwind CLI (bez PostCSS/Vite). Samo `npx tailwindcss -i input.css -o output.css` i gotovo. |
| **Baza** | PostgreSQL | Jedan Postgres, svi saloni u njemu. Relacijski, sa EXCLUDE constraint-om za anti-dupli-termin. RLS za multi-tenant sigurnost. |
| **ORM** | Drizzle ORM | TypeScript-native schema definition. Bolja developer experience nego raw SQL + migracije su tipizovane. |
| **Validacija** | Zod | Parsiranje i validacija request/response. |
| **Testovi** | Vitest | Brz, moderna test harness. Handleri se testiraju kao obične funkcije. |
| **Deploy** | Docker Compose | App + Postgres + Caddy u jednom fajlu. Jedan VPS za sve. |
| **HTTPS** | Caddy | Auto Let's Encrypt. Zero-touch renewal. |
| **PWA** | Manifest + Service Worker | "Add to Home Screen" na telefonu. Offline keš za kalendar. |

---

## Poslovne odluke

| Aspekt | Izbor | Obrazloženje |
|---|---|---|
| **Multi-tenancy model** | Shared database, Row-Level Security | Ne: 20 baza ili WordPress Multisite (održavanje pakao). Svaki salon ima `salon_id`, RLS forsira izolaciju. |
| **Tenant routing** | Path-based `/s/:salonSlug/...` | Ne: subdomeni po salonu (DNS/sertifikat komplikacija). |
| **Self-booking u MVP** | NE — Faza 3+ | MVP = samo vlasnik unosi (sveska u oblaku). Mušterije kasnije. Smanjuje skop MVP-a za 40%. |
| **Radnici (staff)** | Resursi (kolone), ne nalozi | Jedan login po salonu. Svi vide sve termine tog salona. Nema per-radnik auth. |
| **Radno vreme** | Nivou salona, ne po radniku | Isto radno vreme za sve radnike. Nije uslov za MVP (česta greška — dodati kompleksnost unapred). |
| **Unos termina** | Hibrid: tekst + opciono vezivanje klijenta | "14:00 Marko šišanje" + opciono upari sa klijentom iz baze. Brzo za unos, podatke za podsetnike prikupljaš bez prisiljavanja. |
| **Naplata od salona** | Skripta `npm run invoices`, IPS QR PDF | NE: full billing sistem sa webhookovima/Stripe/dunning logikom. Prerano za 20 salona. `npm run invoices` generiše 20 PDF-a sa IPS QR, pošalje mejlom. Uplate pratim ručno iz izvoda. Tek Faza 2+. |
| **CMS (baneri, boje)** | Config row + jednostavna forma | NE: Directus, WordPress. Boje = CSS varijable što čita `settings` red. Baner = `banners` tabela + form u app-u. |
| **Infrastruktura za 20 salona** | 1× Hetzner CX22 (~€5/mes) | Jedan mali VPS, sve na njemu. Bekap na Hetzner Storage Box (~€3/mes). Ukupno ~€8-10/mes za sve. |

---

## Specifikacija podataka

### Tabele

```
salon
  id          UUID PRIMARY KEY
  name        VARCHAR(255)
  slug        VARCHAR(255) UNIQUE             ← za path-based routing
  email       VARCHAR(255)
  subscription_status  VARCHAR(50)             ← 'free', 'pro', 'cancelled'
  created_at  TIMESTAMP

salon_account
  id          UUID PRIMARY KEY
  salon_id    UUID FK → salon.id
  email       VARCHAR(255) UNIQUE
  password_hash VARCHAR(255)
  created_at  TIMESTAMP

staff
  id          UUID PRIMARY KEY
  salon_id    UUID FK → salon.id
  name        VARCHAR(255)                     ← npr. "Marko", "Ana"
  color       VARCHAR(7)                       ← hex boja za kalendar (#FF5733)
  active      BOOLEAN DEFAULT true
  created_at  TIMESTAMP

client
  id          UUID PRIMARY KEY
  salon_id    UUID FK → salon.id
  name        VARCHAR(255)
  phone       VARCHAR(20)                      ← za podsetnike (Faza 1)
  notes       TEXT
  no_show_count INTEGER DEFAULT 0              ← za PRO analitiku
  created_at  TIMESTAMP

service
  id          UUID PRIMARY KEY
  salon_id    UUID FK → salon.id
  name        VARCHAR(255)                     ← npr. "Muško šišanje", "Gel manikir"
  duration_minutes INTEGER                      ← npr. 30, 45, 60
  price       DECIMAL(10,2)
  active      BOOLEAN DEFAULT true
  created_at  TIMESTAMP

appointment
  id          UUID PRIMARY KEY
  salon_id    UUID FK → salon.id
  staff_id    UUID FK → staff.id              ← koji radnik
  client_id   UUID FK → client.id NULLABLE     ← opciono vezana mušterija
  service_id  UUID FK → service.id NULLABLE    ← opciono vezana usluga
  title       TEXT                             ← slobodan tekst unos ("Marko šišanje")
  start_at    TIMESTAMPTZ                      ← svaka vrijednost je sa timezone
  end_at      TIMESTAMPTZ                      ← start_at + duration_minutes
  status      VARCHAR(50)                      ← 'booked', 'completed', 'cancelled'
  reminder_sent_at TIMESTAMPTZ NULLABLE        ← popunjava se tek u Fazi 1 (podsetnici)
  created_at  TIMESTAMP
  updated_at  TIMESTAMP

working_hours
  salon_id    UUID FK → salon.id              ← nivo salona, ne po radniku
  weekday     INTEGER                          ← 0-6 (0=ponedeljak)
  open_time   TIME                             ← npr. 09:00
  close_time  TIME                             ← npr. 18:00

time_off
  id          UUID PRIMARY KEY
  salon_id    UUID FK → salon.id
  staff_id    UUID FK → staff.id NULLABLE      ← ako je null, važi za ceo salon
  start_at    TIMESTAMP
  end_at      TIMESTAMP
  reason      VARCHAR(255)                     ← "Godišnji", "Bolovanje", "Praznik"
  created_at  TIMESTAMP
```

### Ključni constraint-i

**Anti-dupli-termin (Postgres EXCLUDE sa btree_gist):**
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointment ADD CONSTRAINT no_overlapping_appointments
EXCLUDE USING gist (
  staff_id WITH =,
  tstzrange(start_at, end_at) WITH &&
) WHERE (status <> 'cancelled');
```

Ovaj constraint garantuje da dva aktivna termina istog radnika nikad ne mogu da se preklapaju, čak i pri konkurentnim insertima.

**Row-Level Security (Postgres) — aktivira se u Fazi 2:**
```sql
ALTER TABLE appointment ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_appointment_salon ON appointment
  USING (salon_id = current_setting('app.current_salon_id')::uuid)
  WITH CHECK (salon_id = current_setting('app.current_salon_id')::uuid);
```

Za sada (MVP) salon_id prisutan ali RLS nepaktivan — sve je dostupno svim nalozima.

---

## Funkcionalne karakteristike MVP-a (Faza 0)

### Ekrani

1. **Login** — email + password za salon (jedan nalog po salonu)
2. **Dashboard/Kalendar (nedeljni prikaz)** — radnici kao kolone, vremenske kockice, termine sa klijentima
3. **Dnevni prikaz** — klik na dan → otvara se modal/fragment sa satnom podjelom, jasnije vidiš slobodno vreme
4. **Unos termina** — modal sa:
   - Slobodnim tekstom (npr. "14:00 Marko šišanje")
   - Opciono: veži za klijenta iz baze (autocomplete)
   - Opciono: veži za uslugu iz baze (autocomplete)
   - Unos radnika
5. **Pregled/izmena termina** — klik na termin → otvara detalje, mogućnost brisanja/otkazivanja
6. **Upravljanje klijentima** — lista klijenti, kreiranje novog, dodavanje napomene
7. **Upravljanje uslugama** — lista usluga (naziv, trajanje, cena), CRUD
8. **Radno vreme + pauze** — forma za unos radno vreme po danu u nedelji, pauze/slobodni dani

### Dizajn
- Srpski jezik, uglađen UI (ne minimalan/goli)
- Mobilna optimizacija (PWA, 95% slučajeva vlasnik koristi telefon u salonu)
- Boje: temna paleta sa akcentima (npr. teal/slate kao DamagesPRO)

### PWA
- Manifest koji nudi "Add to Home Screen"
- Service worker koji keširuje:
  - App shell (HTML, CSS, JS)
  - Vlasnikov kalendar (prvih 4 nedelje od danas, refresh na svakom otvaranju)
- Offline: može čitati keširane termine, ne može pisati bez interneta (pisanja se queue-uju na sledećem otvaranju, ali nema Background Sync na iOS — pisanja se jednostavno "izgube" ako nema interneta)

---

## Faze razvoja

### **Faza 0: MVP** (~3 nedelje)
- Login (salon_account tabela, auth middleware)
- Nedeljni kalendar + dnevni prikaz po satima (HTMX paginacija kroz dane)
- Hibridni unos termina (tekst + opcional vezivanje)
- Upravljanje klijentima (CRUD)
- Upravljanje uslugama (CRUD)
- Radno vreme + time_off (pauze/praznici)
- DB-forsiran anti-dupli-termin (EXCLUDE constraint)
- PWA manifest + service worker
- Uglađen srpski UI
- salon_id prisutan na svim tabelama, ali RLS nije aktivan

**Izlazak:** sistem je funkcionalan za jedan salon, spreman za ručno testiranje sa realnim klijentima.

### **Faza 1: Podsetnici** (~1-2 nedelje, fast-follow)
- Integracija BulkGate (ili lokalnog Viber providera) — Viber + SMS fallback
- Scheduler (cron/node-schedule) koji proverava termine i šalje podsetnik dan pred termin
- UI nudge da vlasnik veže klijenta (jer bez telefona nema gde poslati podsetnik)
- Metrika `reminder_sent_at` na appointment tabeli

**Izlazak:** smanjuje se no-show stopa, prvi paid feature je spreman za naplatu.

### **Faza 2: Multi-tenant operacionalnost** (~1 nedelja)
- RLS je sada aktivan (pravi tenant isolation)
- Onboarding flow za nov salon (kreiranje salon naloga, prvi setup)
- Skripta `npm run invoices` — generiše IPS QR PDF fakture za aktivne salone, šalje mejlom
- Redirekcija na payment stranicu (još nema automatizacije, ali struktura je tu)

**Izlazak:** sistem je sigurno multi-tenant i proslađen za prodaju. Podaci su 100% izolovani. Bilovanje je ručno ali brzo (skripta radi umesto tebe).

### **Faza 3+: Opciono**
- Self-booking stranica (`/book/:salon-slug`) — mušterije viđaju slobodne termine i same zakazuju
- Analitika i izveštaji
- Mobilna aplikacija na App Store (ako se pokaže potreba, ali PWA pokriva 90% slučajeva)

---

## Infrastruktura i trošak

| Komponenta | Izbor | Trošak |
|---|---|---|
| VPS | Hetzner CX22 (2 vCPU, 4GB RAM) | €4-5/mes |
| Storage/Bekap | Hetzner Storage Box 1TB | €3/mes |
| Domain (opciono) | Registrar po izboru | ~€10/god (~€1/mes) |
| Viber (Faza 1) | Bulk reseler (BulkGate) | Prepaid ~€100 (trošak ~€11-35/mes za 20 salona) |
| **UKUPNO (MVP)** | | **~€8-10/mes infra** |
| **Sa podsetnicima (Faza 1+)** | | **~€20-40/mes** |

### Deployment

```
GitHub Repo
  ↓ (push na main)
  ↓ (GitHub Actions trigger)
VPS (ssh)
  ↓ (git pull)
  ↓ (docker compose restart)
Novi kod je gore
```

### Bekap

```
Nightly cron na VPS:
  pg_dump → gzip → upload na Hetzner Storage Box
Test restore: mesečno ili na zahtev
```

---

## Rad sa Cloud Claude ProjectOM

**Za planiranje i specifikaciju:** Koristi Claude Project sa ovim master plan-om u Knowledge bazi. Intervjuiši se u batch-evima, iterira odluke, piši specifikacije.

**Za implementaciju:** Koristi Claude Code (terminal/VS Code/Desktop) povezan sa git repom. Kod se piše posle "go".

---

## Rizici i odluke

| Rizik | Odluka |
|---|---|
| MVP "proširuje scope" | Faze su fiksne. Nema novog feature-a u MVP-u — prvo kalendar, zatim podsetnici, zatim multi-tenant. Samoproglašeni deadline: Faza 0 do 3 nedelje. |
| Self-booking se "čini kao MVP" | NE. Vlasnik samo unosi — to je gotovo 95% vrednosti za primarne korisnike (frizere). Self-booking je Faza 3 i opciono. |
| Kompleksnost per-radnik radno vreme | Nije u MVP-u. Isto radno vreme za sve radnike per salon. Ako se pokaže potreba, dodaj to u Faza 3. |
| PWA offline pisanja se gube bez Background Sync | Poznato, prihvaćeno. iOS nema Background Sync; offline pisanja se registruju ali `reminder_sent_at` itd. se ne ažuriraju ako nema interneta. To je acceptable za aplikaciju koju koristi vlasnik koji je obično u salonu sa internetom. |
| Naplata je ručna umesto automatizovane | Nameran izbor. Naplata podsistem je 50% posla, a za 20 salona skripta je dovoljna. Automatizacija dodaj u Faza 2+ kad se isplati. |

---

## Zaključak

**Sistem je dizajniran za održivost, ne za immediate scale.** Ako radi za 20 salona, skaliranje na 50-100 je pitanje dodavanja resursima (veći VPS, managed Postgres), ne arhitektonske rekonstrukcije. Sve od dana 1 je tipizovano, testirano, i dokumentovano.

**Prioritet:** Faza 0 do 3 nedelje. Ako se odložiš, rizik je da dodaš feature-ove u MVP i on ide 6 nedelja — previše za startup mode.

Kreni sa Fazom 0. Go?
