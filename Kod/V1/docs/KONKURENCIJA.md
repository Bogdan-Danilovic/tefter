# Tefter — analiza konkurencije i plan diferencijacije

> Sastavljeno 2026-07-18 na osnovu javnih cenovnika i recenzija. Cilj: šta dodati da salon
> izabere Tefter **i ostane** — jer to što mu treba ima samo kod nas.

---

## 1. Mapa konkurencije

| Konkurent | Tip | Cena za salon | Model |
|---|---|---|---|
| **Fresha** (globalni lider) | SaaS + marketplace | **$19.95/mes** (Independent) ili $14.95/član tima + **20% provizija** na nove klijente sa marketplace-a (min $6) + 2,3–3,3% naplata kartica | "Besplatno zauvek" je ukinuto — sada pretplata I provizija I naplata procesiranja |
| **Booksy** | SaaS + marketplace | od **€29/mes** | Jak marketplace (klijenti te nađu), ali skupo za mali salon |
| **SrediMe / Buker** (region, najjači lokalno) | Marketplace + besplatan softver | Solo: 0 RSD · Basic: **1.999 RSD+PDV** · Standard: 0 RSD ali **15% provizija po zakazivanju** · Neon: **30% za prvog novog klijenta** · SMS **5,95 RSD+PDV/poruka** | Softver je mamac — zarađuju na proviziji i SMS-u |
| **Lime Booking** (Srbija) | SaaS | od **1.690 RSD/mes**, SMS paketi od 3.290 RSD/mes | Klasična pretplata, SMS ekstra |
| **Bookly** (Srbija) | SaaS | od **2.000 RSD/mes** | Plaćanje po fakturi, bez kartice |
| **Bookall, Bukware, Bookage, BookMyBarber** (Srbija) | SaaS / marketplace | razne, uglavnom 1.500–3.000 RSD | Manji igrači, slična ponuda |
| Papirna sveska | — | 0 RSD | **Pravi konkurent broj 1** — 80% malih salona i dalje radi ovako |

**Tefter Pro: 1.490 RSD/mes** — već ispod svih plaćenih lokalnih opcija.

## 2. Šta naplaćuju drugi, a mi ne (napadne tačke)

1. **Provizija na tvoje klijente.** SrediMe Standard uzima 15% od SVAKOG zakazivanja, Neon 30%
   od novog klijenta, Fresha 20% + min $6. Salon plaća proviziju i kad se njegov stalni klijent
   zakaže. → Tefter: **0% provizije, zauvek. Tvoji klijenti su tvoji.**
2. **SMS podsetnici.** Buker/SrediMe 5,95 RSD+PDV po poruci, Lime prodaje SMS pakete. Salon sa
   300 termina mesečno plati ~2.100 RSD samo za podsetnike. → Tefter: **podsetnici preko
   Vibera/WhatsApp-a = 0 RSD** (Srbija je Viber zemlja).
3. **Vezivanje za marketplace.** Kod marketplace modela klijent postaje "njihov" — profil, istorija
   i recenzije žive na tuđoj platformi; kad odeš, sve ostaje njima. → Tefter: **izvoz svega u
   Excel jednim klikom, bilo kad.**
4. **Naplata kartica kao uslov.** Fresha gura sopstveno procesiranje (2,3–3,3%). U Srbiji saloni
   rade keš/IPS. → Tefter: **IPS QR — pare idu direktno na račun salona, bez posrednika.**

## 3. Bolne tačke vlasnika salona (iz recenzija i industrijskih podataka)

- **No-show**: prosečan salon gubi ~$6.800/god na nepojavljivanja; podsetnici vraćaju trećinu.
- **Duplo zakazani termini** — najčešća žalba kad više ruku vodi jednu svesku.
- **Propušteni pozivi** = 15–20% izgubljenih zakazivanja (telefon zauzet dok radiš šišanje).
- **Karton klijenta**: nova radnica ne zna da klijentkinja "uvek ide kod Milice, farba 7.1 sa
  30 vol, alergična na amonijak". Frizerke ovo danas drže u — svesci.
- **Kapara/depozit**: skoro nijedan alat lokalno ne rešava kaparu bez kartičnog gateway-a.

## 4. Plan: 6 diferencijatora ("samo mi to imamo")

Redosled = odnos uloženo/dobijeno. Svaki pojačava razlog da salon OSTANE (podaci se gomilaju
kod nas, navika se stvara kod nas).

### K1 — Viber/WhatsApp/SMS podsetnici za 0 RSD ⭐ najbrži dobitak
Dugme na terminu otvara Viber/WhatsApp/sms: link sa gotovom porukom („Zdravo Jelena, podsećamo
na termin sutra u 14h u Studiju Šarm 💇"). Bez provajdera, bez troška, radi odmah sa telefona.
- *Zašto pobeđuje:* konkurencija ovo NAPLAĆUJE (5,95 RSD/SMS). Naš marketing: „podsetnici koje
  drugi naplaćuju — kod nas besplatni, doživotno".
- *Već u planu kao Faza 7 — podići na prvi sledeći zadatak.*

### K2 — Kapara preko IPS QR koda ⭐ niko ovo nema
Salon uključi „traži kaparu" za uslugu ili za nepouzdane klijente → Tefter generiše **NBS IPS QR**
(standard koji čita svaka m-banking aplikacija u Srbiji) sa iznosom i pozivom na broj = ID
termina. Klijent skenira, pare legnu **direktno na račun salona** — bez gateway-a, bez provizije,
bez Stripe-a (koji u Srbiji ionako ne radi).
- *Zašto pobeđuje:* ubija no-show (glavni trošak salona), a tehnički je samo generisanje QR
  stringa po NBS IPS specifikaciji — nema integracije, nema PCI. **Nijedan lokalni konkurent
  ovo nema.** Ovo je feature zbog kog se priča o nama.

### K3 — Karton klijenta sa formulom boje (frizerski vertical)
Uz postojeću belešku: strukturisana polja „formula/boja", „alergije/napomene", „omiljeni radnik",
vidljivo čim otvoriš termin. Farbanje bez formule = katastrofa; frizerke to danas čuvaju u svesci
koja može da se izgubi — bukvalno naš pitch.
- *Zašto zadržava:* posle 6 meseci u Tefteru je 200 formula. Prelazak drugde = prepisivanje
  svega. Ovo je najjači lock-in koji je istovremeno fer prema korisniku (uz izvoz u Excel).

### K5 — Pametan „vreme je za termin"
Tefter zna prosečan ritam klijenta (šiša se na ~5 nedelja). Kad probije ritam, vlasnik dobije
listu „ovih 8 klijenata je prekoračilo svoj ritam" + dugme koje otvara Viber sa porukom „Jelena,
prošlo je 6 nedelja 😊 da ti nađemo termin?". Ovo salonu **donosi pare** (popunjava rupe u
kalendaru), ne samo štedi vreme.

### K4 — Lista čekanja sa jednim tapom
Termin otkazan → Tefter ponudi: „3 klijenta čekaju ovaj dan — javi Mariji?" → otvara se Viber sa
gotovom porukom. Otkazani termin se popuni za 2 minuta umesto da propadne.

### K6 — Ocena pouzdanosti + automatska kapara (K2+K6 kombinacija je unikat)
Tefter broji no-show po klijentu. Klijent sa 2+ nepojavljivanja → aplikacija sama predloži
„traži kaparu za ovog klijenta" (IPS QR iz K2). Buker ima merenje pouzdanosti, ali **niko nema
pouzdanost vezanu za automatsku kaparu** — zatvoren krug koji stvarno rešava problem.

## 5. Ažuriran redosled rada

1. **Faza 6 — Online zakazivanje** (`/s/:slug/zakazi`) — razlog da se plati Pro; bez ovoga
   premium nema šta da gate-uje. + opcija kapare (K2) na javnom zakazivanju.
2. **K1 podsetnici** (mali posao, odmah u Free — udarna marketing priča).
3. **Faza 5 — Premium gating** (`salons.plan`): Free = kalendar + klijenti + podsetnici;
   Pro = online zakazivanje, statistika, kapara, lista čekanja, „vreme je za termin".
4. **K2 IPS QR kapara** → pa **K3 karton/formula** → **K5 ritam klijenta** → **K4 lista
   čekanja** → **K6 pouzdanost**.
5. Nedeljni pregled + izvoz u Excel (higijena, uz put).

## 6. Pozicioniranje u jednoj rečenici

> **„Sveska koja ne može da se izgubi — bez provizije, bez naplate SMS-a, tvoji klijenti
> ostaju tvoji, a kapara ti leže pravo na račun."**

Svaka od te 4 stavke je direktan udarac na konkretnog konkurenta: provizija → SrediMe/Fresha,
SMS → Buker/Lime, vlasništvo klijenata → marketplace modeli, kapara → svi (niko je nema).

## 7. Šta NE raditi

- **Ne graditi marketplace.** To je igra kapitala (Booksy/SrediMe je već igraju) i zahteva
  masu klijenata-potrošača. Naš kupac je salon, ne krajnji klijent.
- **Ne uvoditi obaveznu naplatu karticama** — u Srbiji je to trenje, ne vrednost. IPS QR je
  domaći teren.
- **Ne juriti feature-parity sa Freshom** (inventar, gift kartice, POS…) — mali salon to ne
  koristi, a nas usporava. Pobednička traka je: podsetnici → kapara → karton → ritam.
