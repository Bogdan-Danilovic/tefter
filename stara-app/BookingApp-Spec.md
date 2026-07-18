# [Radni naziv] — Web app za zakazivanje termina (frizeri, kozmetičari, salon usluge)

## 1. Ideja
Web aplikacija koja zamenjuje svesku za zakazivanje termina kod frizera, kozmetičara i sličnih uslužnih delatnosti. Fokus na solo majstore i male salone sa timom. Pregledna, jednostavna za unos.

## 2. Ciljni korisnik
- Solo frizer/kozmetičar
- Salon sa više zaposlenih (vlasnik + radnici)
- Termine unosi **isključivo majstor/vlasnik** (klijent ne zakazuje sam — nema self-service u MVP-u)

## 3. MVP funkcionalnosti

### Klijenti
- Baza klijenata: ime + telefon
- Brzo dodavanje novog klijenta pri zakazivanju (bez odlaska na poseban ekran)

### Usluge i cene
- Predefinisana lista usluga sa cenama (šišanje, farbanje, manikir...)
- Mogućnost custom unosa usluge "u letu" ako nije na listi

### Zakazivanje / kalendar
- **Glavni ekran:** mesečni kalendar prikaz — dani sa terminima vizuelno obeleženi (npr. tačkica/broj termina)
- Klik na datum → otvara pregledan dnevni prikaz (lista termina za taj dan, čisto i jednostavno)
- Iz dnevnog prikaza: dugme za brzo dodavanje termina (klijent + usluga + vreme + trajanje)
- Radno vreme: default šablon (npr. 9-20h) + mogućnost ručne izmene po danu (odmor, pauza, drugačiji raspored)

### Tim / salon
- Vlasnik ima pregled rasporeda svih zaposlenih na jednom mestu (jedan nalog, više "kalendara" unutar app-a)
- Zaposleni bez posebnog login-a u MVP-u — sve unosi vlasnik/admin nalog

### Dizajn
- Minimalistički, svetla tema
- Jednostavan, brz unos (cilj: zamena sveske treba da bude BRŽA od sveske)

## 4. Van MVP-a (premium / v2)
- Prošireni profil klijenta (istorija poseta, beleške — boja kose, alergije, preference)
- SMS podsetnici klijentima pred termin
- Praćenje finansija (prihod po danu/mesecu/zaposlenom/usluzi)
- Nalozi za zaposlene (svoj login, vidi samo svoj raspored)
- Online self-service booking za klijente
- Push notifikacije

## 5. Predloženi tech stack
- **Frontend:** Plain HTML/CSS/JavaScript (vanilla, bez frameworka) — responsive, radi kao web app na telefonu i desktopu, mobile-first
- **Backend/DB:** Firebase Firestore (real-time, poznato iz Game Hub-a; Firebase JS SDK radi bez problema sa vanilla JS)
- **Auth:** Firebase Auth (email/telefon login za vlasnika)
- **Hosting:** Firebase Hosting ili Vercel (static)
- **Napomena:** Web app (ne native mobilna) — radi u browseru na telefonu, može se "dodati na početni ekran" (PWA) za app-like osećaj bez app store-a

## 6. Data model (skica)

**User (Owner/Salon)**
- id, ime salona, radno vreme (default template)

**Employee** (samo kao "kalendar" unutar salona, bez login-a u MVP-u)
- id, ime, boja (za razlikovanje u kalendaru)

**Client**
- id, ime, telefon

**Service**
- id, naziv, cena, trajanje (min)

**Appointment**
- id, clientId, employeeId, serviceId (ili custom naziv+cena), datum, vreme, trajanje, napomena

## 7. Ključni ekrani
1. Dnevni raspored (početni ekran)
2. Nedeljni/mesečni kalendar
3. Novi termin (client picker + service picker + vreme)
4. Lista klijenata
5. Podešavanje usluga i cena
6. Podešavanje radnog vremena / zaposlenih

## 8. Otvorena pitanja za sledeću fazu
- Naziv aplikacije
- Da li treba podrška za više lokacija (više salona pod istim nalogom)?
- Da li termin može trajati preko granice radnog vremena (upozorenje ili blokada)?
- Da li treba istorija/arhiva prošlih termina po klijentu (čak i bez punog profila)?
