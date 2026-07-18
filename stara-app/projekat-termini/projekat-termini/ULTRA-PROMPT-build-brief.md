# ULTRA PROMPT — Web app za zakazivanje termina (salon booking)

Koristi ovaj prompt kao build brief za Claude Code (ili drugi AI coding alat). Sadrži kompletan kontekst, tech stack, dizajn sistem i funkcionalni obim potreban da se aplikacija napravi od nule.

---

## ROLA I ZADATAK

Ti si senior full-stack developer koji gradi produkcijski spreman web app za zakazivanje termina, namenjen frizerima, kozmetičarima i sličnim uslužnim delatnostima kao zamena za svesku. Korisnik (vlasnik salona ili solo majstor) unosi termine — klijenti ne zakazuju sami. Prioritet je brzina unosa, preglednost i jednostavnost — mora biti brže i lepše od sveske.

Postoji funkcionalni HTML/CSS/JS prototip (`termini-prototip.html`) koji definiše tačan vizuelni identitet i interakcije. Prati ga kao referencu za dizajn sistem i UX flow, ali izgradi punu, produkcijsku, high quality verziju sa pravim backend-om.

---

## TECH STACK (obavezno)

- **Frontend:** Plain HTML/CSS/JavaScript — bez React-a, bez frameworka. Vanilla JS, moderan (ES modules, fetch, async/await).
- **Backend/DB:** Firebase Firestore (real-time baza)
- **Auth:** Firebase Auth (email + lozinka za vlasnika/admin nalog)
- **Hosting:** Firebase Hosting
- **PWA:** dodati `manifest.json` + service worker da se app može "dodati na početni ekran" telefona i deluje kao native app, bez app store-a
- Responsive, mobile-first (primarna upotreba je na telefonu tokom rada u salonu), ali mora dobro raditi i na desktopu/tabletu

Ne uvoditi build tool-ove (Webpack/Vite) osim ako je apsolutno neophodno — cilj je jednostavan, lako održiv kod koji solo developer može brzo da menja.

---

## DIZAJN SISTEM (tačno prati ove tokene)

**Boje:**
```
--bg: #FAF7F2            (pozadina, toplo bela)
--surface: #FFFFFF       (kartice, paneli)
--surface-alt: #F1ECE4   (hover / sekundarne površine)
--text: #2A2724          (primarni tekst, topla skoro-crna)
--text-muted: #948B7F    (sekundarni tekst)
--line: #E7E0D4          (linije, border-ovi)
--accent: #B4577A        (primarna akcentna boja — dusty rose/mauve)
--accent-soft: #F5E3EA   (svetla akcentna pozadina)
--accent-dark: #8F4362   (hover/aktivna stanja akcenta)
--sage: #6B8F71          (sekundarni akcent, npr. status "potvrđeno")
```

**Boje po zaposlenom** (za razlikovanje termina u kalendaru kada je više zaposlenih): svaki zaposleni dobija svoju boju iz palete — npr. #B4577A, #4A8B8C, #C98A3E, #7A5C8E — prikazano kao mala tačkica pored termina.

**Tipografija:**
- Display/naslovi: **Fraunces** (serif, koristi se za naziv app-a, naslov meseca, naslov dana u panelu) — koristiti umereno, ne za sve
- UI/tekst/forme: **Inter** (sans-serif, sve funkcionalno — dugmad, liste, input polja, labele)
- Učitati preko Google Fonts

**Stil:** Minimalistički, svetla tema, zaobljeni uglovi (10–20px radius), meke senke na hover-u, hairline border-ovi (`--line`), puno belog/toplog prostora. Bez teških gradijenata ili dekorativnih elemenata koji ne služe funkciji.

**Signature element:** dani u kalendaru prikazuju male obojene tačkice (po jedna po terminu, boja = zaposleni) — vizuelni "at a glance" pregled dana bez potrebe da se klikne.

---

## STRUKTURA PODATAKA (Firestore)

```
salons/{salonId}
  - name: string
  - defaultWorkingHours: { mon: {start, end}, tue: {...}, ... }
  - createdAt

salons/{salonId}/employees/{employeeId}
  - name: string
  - color: string (hex)
  - workingHoursOverrides: { "2026-07-20": {start, end, off: bool}, ... }

salons/{salonId}/services/{serviceId}
  - name: string
  - price: number
  - durationMinutes: number

salons/{salonId}/clients/{clientId}
  - name: string
  - phone: string

salons/{salonId}/appointments/{appointmentId}
  - date: string (YYYY-MM-DD)
  - time: string (HH:mm)
  - durationMinutes: number
  - clientId: reference (ili clientName/clientPhone direktno ako klijent nije u bazi)
  - serviceId: reference (ili customServiceName ako je ručno unet)
  - employeeId: reference
  - note: string (opciono)
  - createdAt
```

Auth: jedan Firebase Auth nalog = jedan `salonId` (vlasnik). Sva deca kolekcije su scoped pod tim salonom. Firestore security rules: samo autentifikovani vlasnik tog salona može čitati/pisati svoje podatke.

---

## FUNKCIONALNI OBIM — MVP (napraviti sada)

### 1. Autentifikacija
- Login ekran (email + lozinka, Firebase Auth)
- Prilikom prve registracije: kreiranje `salon` dokumenta, podešavanje naziva salona i default radnog vremena

### 2. Kalendar (glavni ekran)
- Mesečni prikaz, navigacija prev/next mesec
- Svaki dan prikazuje tačkice u boji zaposlenog za svaki termin tog dana (do 6 tačkica, posle toga "+N")
- Danas istaknut vizuelno
- Klik na dan → otvara bočni panel (desktop: slide-in panel sa strane; mobile: full-screen overlay) sa listom termina za taj dan, sortiranom po vremenu
- Filter po zaposlenom iznad kalendara (pilule sa bojom, "Svi" kao default) — vidljivo samo ako ima >1 zaposlenog

### 3. Dnevni panel
- Lista termina: vreme, ime klijenta, usluga, trajanje, boja/ime zaposlenog
- Dugme za brisanje termina (uz potvrdu)
- Dugme "+ Dodaj termin" koje otvara modal za novi termin sa već postavljenim datumom

### 4. Dodavanje termina (modal)
- Ime klijenta — text input sa autocomplete iz postojeće baze klijenata (Firestore query po prefiksu imena)
- Ako klijent ne postoji → kreira se novi client dokument automatski
- Telefon (opciono)
- Usluga — čipovi iz predefinisane liste usluga salona + polje za ručni/custom unos ako usluge nema na listi
- Vreme (time picker)
- Trajanje u minutima (predefinisano iz usluge, može se ručno izmeniti)
- Zaposleni — dropdown (prikazuje se samo ako ima više od 1 zaposlenog)
- Validacija: upozorenje (ne blokada) ako se termin preklapa sa postojećim terminom istog zaposlenog

### 5. Podešavanja
- Upravljanje listom usluga i cena (dodaj/izmeni/obriši)
- Upravljanje zaposlenima (dodaj/izmeni ime i boju) — bez login-a za zaposlene u MVP-u
- Podešavanje default radnog vremena po danu u nedelji + mogućnost izmene za konkretan datum (odmor/pauza)

### 6. Klijenti (jednostavna lista)
- Pregled svih klijenata (ime, telefon)
- Klik na klijenta → lista njegovih prošlih i budućih termina (osnovna istorija, bez beležaka — to je premium)

---

## EKSPLICITNO VAN OBIMA (ne implementirati sada, samo ostaviti prostor u arhitekturi)

- Prošireni profil klijenta (beleške, boja kose, alergije, foto pre/posle)
- SMS podsetnici
- Praćenje finansija/prihoda
- Nalozi i login za zaposlene (svako vidi samo svoje)
- Online self-service booking za klijente
- Push notifikacije
- Podrška za više lokacija pod jednim nalogom

Arhitektura treba da bude tako napisana da se ove funkcije mogu kasnije dodati bez velikog refaktora (npr. `employees` već postoje kao zasebna kolekcija, samo bez auth-a za sada).

---

## KVALITET I UX DETALJI

- Sve akcije (čuvanje termina, brisanje) moraju imati vizuelnu potvrdu (toast/animacija), ne tihe promene
- Prazna stanja (dan bez termina, salon bez klijenata) moraju imati jasnu poruku i poziv na akciju, ne prazan ekran
- Keyboard focus vidljiv svuda (accessibility)
- Sve animacije suptilne — slide/fade prelazi, bez preteranih efekata
- Loading stanja dok se Firestore podaci učitavaju (skeleton ili spinner, ne prazan ekran)
- Offline-friendly gde je moguće (Firestore ima built-in offline persistence — omogućiti je)

---

## REFERENCA

Postojeći prototip (`termini-prototip.html`) je izvor istine za:
- tačne boje, fontove i spacing
- interakciju klik-na-dan → panel → modal
- strukturu HTML/CSS pristupa (vanilla, bez frameworka)

Zadrži taj vizuelni jezik 1:1, samo ga poveži sa pravim Firestore backend-om umesto mock podataka, i dodaj login/podešavanja/klijente kao nove ekrane u istom stilu.
