/**
 * Izgledi (layout šabloni) mini sajta salona — Faza 9. Razdvajanje odgovornosti:
 * "tema" (site-themes.ts) = boje/tipografija kao CSS tokeni; "izgled" (ovde) =
 * struktura strane. Svaki izgled je jedan .njk u src/web/views/sites/ koji čita
 * iste --s-* i --brand varijable, pa svaki izgled radi sa svakom temom.
 */

export type SiteLayout = {
  key: string;
  label: string;
  /** Ime fajla u src/web/views/sites/ — renderuje se kao `sites/<template>`. */
  template: string;
};

export const SITE_LAYOUTS: Record<string, SiteLayout> = {
  // Fullscreen hero sa svetlosnim oblacima, marquee, sekcije naniže. Prvi izgled.
  aurora: { key: "aurora", label: "Aurora", template: "aurora.njk" },

  // Editorial naslovnica: ogromna tipografija, numerisane sekcije, asimetrična
  // mreža, galerija kao horizontalna traka.
  magazin: { key: "magazin", label: "Magazin", template: "magazin.njk" },

  // Portfolio raspored: fiksni levi panel (ime, nav, kontakt) + desna kolona
  // koja skroluje; na telefonu panel je header koji se skupi.
  split: { key: "split", label: "Split", template: "split.njk" },

  // Sve kao kartice u bento mreži — app osećaj, bez dugog skrola.
  bento: { key: "bento", label: "Bento", template: "bento.njk" },

  // Uska centrirana kolona kao digitalna vizit karta — telefon i Instagram bio.
  vizit: { key: "vizit", label: "Vizit", template: "vizit.njk" },

  // Svaka sekcija pun ekran sa scroll-snap i tačkastom navigacijom sa strane.
  cinema: { key: "cinema", label: "Cinema", template: "cinema.njk" },

  // Organski i prozračan za beauty salone: talasasti prelazi između sekcija,
  // galerija kao "latice", mekane kartice — ništa nije pravougaono.
  svila: { key: "svila", label: "Svila", template: "svila.njk" },

  // Foto-prvo kao album/scrapbook: polaroid kartice sa blagim rotacijama,
  // cenovnik i radno vreme kao stikeri, Instagram u prvom planu.
  album: { key: "album", label: "Album", template: "album.njk" },

  // Elegancija ogledala i lukova: svaka fotografija je prozor sa polukružnim
  // vrhom, romb ornamenti, cenovnik kao jelovnik sa tačkastim vođicama.
  arkada: { key: "arkada", label: "Arkada", template: "arkada.njk" },

  // Sajt kao svečana pozivnica: sekcije su "listovi" sa dvostrukim okvirom,
  // monogram i pečat, kaligrafski zavijuci, potpis na kraju.
  pismo: { key: "pismo", label: "Pismo", template: "pismo.njk" },

  // Cvetno i razigrano: čipkaste (skalop) ivice između sekcija, cvetići u
  // hero-u, galerija u ovalnim ramovima sa tačkastim vencem.
  buket: { key: "buket", label: "Buket", template: "buket.njk" },

  // Spa jutro: sunce koje izlazi u hero-u, svetlosne kugle koje dišu, ritual
  // u tri koraka, cenovnik i radno vreme na plutajućim ostrvima.
  ritual: { key: "ritual", label: "Ritual", template: "ritual.njk" },
};

export const DEFAULT_LAYOUT = "aurora";

export function safeLayout(key: unknown): SiteLayout {
  const found = typeof key === "string" ? SITE_LAYOUTS[key] : undefined;
  return found ?? (SITE_LAYOUTS[DEFAULT_LAYOUT] as SiteLayout);
}
