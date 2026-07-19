/**
 * Teme mini sajta salona (Faza 9). Cela tema je skup CSS varijabli — site.njk
 * ih samo prospe na `.site` element, pa nova tema = novi blok ovde (bez CSS-a).
 *
 * Kako se menja tema: promeni vrednosti u bloku i osveži /sajt-demo?tema=<key>.
 *  - bg/surface/ink/muted/line  → osnovne boje strane
 *  - brand + brandInk           → akcentna boja i boja teksta na akcentnom dugmetu
 *  - display                    → font naslova ("serif" ili "sans")
 *  - radius                     → zaobljenost kartica ("0.2rem" oštro … "1.5rem" meko)
 *  - grain                      → jačina filmskog zrna (tamne teme 0.4–0.5, svetle 0.1–0.25)
 *  - aurora                     → tri boje svetlosnih oblaka u hero-u (sa alfom!)
 *
 * Pravila kontrasta (WCAG AA, čuva ih scripts/site-theme-audit.ts):
 *  - ink i muted vs bg/surface ≥ 4.5:1 (body tekst)
 *  - brand kao tekst (kicker, cene na hover) vs bg/surface ≥ 4.5:1
 *  - brandInk vs brand ≥ 4.5:1 (tekst na CTA dugmetu)
 */

const SERIF = `Georgia, "Times New Roman", serif`;
const SANS = `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;

export type SiteTheme = {
  key: string;
  label: string;
  scheme: "light" | "dark";
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  brand: string;
  brandInk: string;
  display: string;
  displayWeight: number;
  displayTracking: string;
  radius: string;
  grain: number;
  aurora: [string, string, string];
};

export const SITE_THEMES: Record<string, SiteTheme> = {
  // Večernji luksuz: topla crna + šampanj zlato, serif. Aurora: zlato, noćna
  // ljubičasta i žar — "salon posle zalaska".
  noc: {
    key: "noc",
    label: "Noć",
    scheme: "dark",
    bg: "#0d0b08",
    surface: "#17130e",
    ink: "#f5efe4",
    muted: "rgba(245,239,228,0.62)",
    line: "rgba(245,239,228,0.11)",
    brand: "#d3ab6e",
    brandInk: "#201709",
    display: SERIF,
    displayWeight: 400,
    displayTracking: "-0.01em",
    radius: "1.1rem",
    grain: 0.5,
    aurora: ["rgba(211,171,110,0.32)", "rgba(126,84,220,0.15)", "rgba(255,110,84,0.11)"],
  },

  // Stari zanat: slonovača + bordo, serif, umeren radius — otmeno i mirno.
  // Aurora: bordo + staro zlato, jedva vidljivi.
  klasicna: {
    key: "klasicna",
    label: "Klasična",
    scheme: "light",
    bg: "#f8f4eb",
    surface: "#fffcf5",
    ink: "#251e18",
    muted: "rgba(37,30,24,0.68)",
    line: "rgba(37,30,24,0.14)",
    brand: "#7c2d43",
    brandInk: "#fdf5ec",
    display: SERIF,
    displayWeight: 400,
    displayTracking: "-0.005em",
    radius: "0.6rem",
    grain: 0.22,
    aurora: ["rgba(124,45,67,0.13)", "rgba(190,152,90,0.18)", "rgba(124,45,67,0.06)"],
  },

  // Startup energija: čisto belo + živ indigo, debeo sans, veliki radiusi.
  // Aurora: indigo + nebo + pink, tiho da hero tekst ostane AA.
  moderna: {
    key: "moderna",
    label: "Moderna",
    scheme: "light",
    bg: "#ffffff",
    surface: "#f5f6f9",
    ink: "#0e1016",
    muted: "rgba(14,16,22,0.64)",
    line: "rgba(14,16,22,0.1)",
    brand: "#4f46e5",
    brandInk: "#ffffff",
    display: SANS,
    displayWeight: 800,
    displayTracking: "-0.04em",
    radius: "1.5rem",
    grain: 0.1,
    aurora: ["rgba(79,70,229,0.16)", "rgba(2,132,199,0.12)", "rgba(219,39,119,0.1)"],
  },

  // Romantika za beauty salone: puder roze + duboka ruža, serif, mekano.
  // Aurora: ruža + breskva + jorgovan.
  ruz: {
    key: "ruz",
    label: "Ruž",
    scheme: "light",
    bg: "#fdf2f0",
    surface: "#ffffff",
    ink: "#3f262b",
    muted: "rgba(63,38,43,0.68)",
    line: "rgba(63,38,43,0.12)",
    brand: "#b3475d",
    brandInk: "#ffffff",
    display: SERIF,
    displayWeight: 400,
    displayTracking: "-0.005em",
    radius: "1.4rem",
    grain: 0.16,
    aurora: ["rgba(179,71,93,0.16)", "rgba(255,163,120,0.15)", "rgba(174,142,214,0.12)"],
  },

  // Spa/wellness: duboka šumska zelena + smaragd, serif. Aurora: smaragd +
  // tirkiz + prigušeno zlato.
  smaragd: {
    key: "smaragd",
    label: "Smaragd",
    scheme: "dark",
    bg: "#0a120d",
    surface: "#111c15",
    ink: "#ecf2ea",
    muted: "rgba(236,242,234,0.62)",
    line: "rgba(236,242,234,0.11)",
    brand: "#4cc38a",
    brandInk: "#06130c",
    display: SERIF,
    displayWeight: 400,
    displayTracking: "-0.01em",
    radius: "1rem",
    grain: 0.45,
    aurora: ["rgba(76,195,138,0.24)", "rgba(45,212,191,0.13)", "rgba(209,178,118,0.14)"],
  },

  // Editorial minimal za barbershop: skoro belo + čisto crno, oštre ivice,
  // zbijen sans. Aurora: samo dah senke — bez boje.
  papir: {
    key: "papir",
    label: "Papir",
    scheme: "light",
    bg: "#f8f8f6",
    surface: "#ffffff",
    ink: "#141414",
    muted: "rgba(20,20,20,0.66)",
    line: "rgba(20,20,20,0.16)",
    brand: "#141414",
    brandInk: "#f8f8f6",
    display: SANS,
    displayWeight: 700,
    displayTracking: "-0.025em",
    radius: "0.2rem",
    grain: 0.16,
    aurora: ["rgba(20,20,20,0.05)", "rgba(20,20,20,0.035)", "rgba(20,20,20,0.045)"],
  },

  // Noćni cyber barbershop: hladna crno-plava + JEDAN električni cijan, zbijen
  // sans, male ivice. Aurora: neonski odsjaj — cijan, elektro-plava, dah magente.
  neon: {
    key: "neon",
    label: "Neon",
    scheme: "dark",
    bg: "#08090d",
    surface: "#10131a",
    ink: "#edf1f7",
    muted: "rgba(237,241,247,0.62)",
    line: "rgba(237,241,247,0.11)",
    brand: "#22d3ee",
    brandInk: "#06181d",
    display: SANS,
    displayWeight: 700,
    displayTracking: "-0.03em",
    radius: "0.35rem",
    grain: 0.42,
    aurora: ["rgba(34,211,238,0.2)", "rgba(59,130,246,0.16)", "rgba(217,70,239,0.12)"],
  },

  // Mediteran: topao pesak + terakota, serif — sunčano i zemljano. Saturiranije
  // i toplije od "klasicne" (tamo je slonovača + vinski bordo). Aurora: terakota,
  // maslina, sunčevo zlato.
  terakota: {
    key: "terakota",
    label: "Terakota",
    scheme: "light",
    bg: "#f6ead8",
    surface: "#fdf6ea",
    ink: "#2b2118",
    muted: "rgba(43,33,24,0.68)",
    line: "rgba(43,33,24,0.15)",
    brand: "#a2402a",
    brandInk: "#fdf2e7",
    display: SERIF,
    displayWeight: 400,
    displayTracking: "-0.005em",
    radius: "0.85rem",
    grain: 0.2,
    aurora: ["rgba(162,64,42,0.16)", "rgba(128,128,52,0.16)", "rgba(224,164,80,0.2)"],
  },

  // Butik hotel: duboka teget + bakar, serif. Hladna plava baza — namerno drugačije
  // od tople crne "noći", a bakar je narandžastiji od njenog šampanja. Aurora:
  // bakar + duboko more + mesečina.
  lazur: {
    key: "lazur",
    label: "Lazur",
    scheme: "dark",
    bg: "#0a1424",
    surface: "#101c30",
    ink: "#eef2f7",
    muted: "rgba(238,242,247,0.62)",
    line: "rgba(238,242,247,0.11)",
    brand: "#d08b52",
    brandInk: "#1c1006",
    display: SERIF,
    displayWeight: 400,
    displayTracking: "-0.01em",
    radius: "0.8rem",
    grain: 0.45,
    aurora: ["rgba(208,139,82,0.24)", "rgba(59,130,246,0.14)", "rgba(148,190,255,0.1)"],
  },

  // Sanjivo: pastel lila + duboka ljubičasta, mek sans, najveći radiusi.
  // Ljubičasti spektar (ne rozi kao "ruz"); violet je crveniji od indiga "moderne",
  // a pozadina tonirana, ne bela. Aurora: violet, lila, ružičasti sumrak.
  lavanda: {
    key: "lavanda",
    label: "Lavanda",
    scheme: "light",
    bg: "#f4effc",
    surface: "#ffffff",
    ink: "#2b2140",
    muted: "rgba(43,33,64,0.68)",
    line: "rgba(43,33,64,0.12)",
    brand: "#6d28d9",
    brandInk: "#ffffff",
    display: SANS,
    displayWeight: 700,
    displayTracking: "-0.03em",
    radius: "1.6rem",
    grain: 0.14,
    aurora: ["rgba(109,40,217,0.14)", "rgba(167,139,250,0.18)", "rgba(236,153,246,0.12)"],
  },

  // Sedamdesete: ecru + duboki senf, DEBEO serif (jedini bold serif u paleti) —
  // "spaljeni" editorial karakter. Aurora: izbledele sunčeve mrlje — senf,
  // spaljena narandža, staro zlato.
  retro: {
    key: "retro",
    label: "Retro",
    scheme: "light",
    bg: "#f4eeda",
    surface: "#fcf7e8",
    ink: "#2a2416",
    muted: "rgba(42,36,22,0.68)",
    line: "rgba(42,36,22,0.14)",
    brand: "#7d5f00",
    brandInk: "#fdf8e4",
    display: SERIF,
    displayWeight: 700,
    displayTracking: "-0.02em",
    radius: "1rem",
    grain: 0.22,
    aurora: ["rgba(196,148,32,0.2)", "rgba(214,120,60,0.16)", "rgba(160,120,40,0.12)"],
  },
  /* ------------------------------------------------------------------
     Pastelna kolekcija — meke, svetle teme za kozmetičke i frizerske
     salone: puno vazduha, niska zrnavost, veliki radiusi, nežne aurore.
     Brand je namerno zatamnjen do AA — "pastelnost" nose bg/surface/aurore.
     ------------------------------------------------------------------ */

  // Puder roze + topla bela, prašnjava ruža. Svetlije i mekše od "ruz"
  // (tamo je saturirana duboka ruža na skoro beloj podlozi). Aurora:
  // ruža, puder i dah jorgovana — jedva vidljivi.
  puder: {
    key: "puder",
    label: "Puder",
    scheme: "light",
    bg: "#f8e8e8",
    surface: "#fffafa",
    ink: "#43272e",
    muted: "rgba(67,39,46,0.7)",
    line: "rgba(67,39,46,0.12)",
    brand: "#a04f62",
    brandInk: "#fff7f6",
    display: SERIF,
    displayWeight: 400,
    displayTracking: "-0.005em",
    radius: "1.7rem",
    grain: 0.12,
    aurora: ["rgba(160,79,98,0.12)", "rgba(244,187,187,0.16)", "rgba(214,186,224,0.12)"],
  },

  // Spa mir: sage zelena + krem, prigušena maslinasto-zelena kao akcenat.
  // Jedina zelena svetla tema (smaragd je taman). Aurora: sage, krem, list.
  eukaliptus: {
    key: "eukaliptus",
    label: "Eukaliptus",
    scheme: "light",
    bg: "#edf1e6",
    surface: "#f9fbf3",
    ink: "#232d24",
    muted: "rgba(35,45,36,0.7)",
    line: "rgba(35,45,36,0.12)",
    brand: "#4a6b53",
    brandInk: "#f1f6ec",
    display: SERIF,
    displayWeight: 400,
    displayTracking: "-0.005em",
    radius: "1.4rem",
    grain: 0.12,
    aurora: ["rgba(122,152,118,0.16)", "rgba(214,222,178,0.16)", "rgba(150,180,150,0.1)"],
  },

  // Kajsija/breskva + krem, topla koralna. Pinkija i svetlija od "terakote"
  // (tamo pesak + cigla); življa od "puder" roze. Aurora: breskva, koral, med.
  breskva: {
    key: "breskva",
    label: "Breskva",
    scheme: "light",
    bg: "#fdecdd",
    surface: "#fff8f0",
    ink: "#3f2a1d",
    muted: "rgba(63,42,29,0.7)",
    line: "rgba(63,42,29,0.12)",
    brand: "#ab4640",
    brandInk: "#fff3ec",
    display: SERIF,
    displayWeight: 400,
    displayTracking: "-0.005em",
    radius: "1.5rem",
    grain: 0.12,
    aurora: ["rgba(240,150,110,0.16)", "rgba(255,190,150,0.16)", "rgba(230,170,190,0.1)"],
  },

  // Mlečna kafa: krem-bež tonovi + karamel braon, mek sans — toplo i domaće.
  // Neutralnije od "terakote" (bez crvenog) i mirnije od "retro" senfa.
  // Aurora: karamel, mleko, cimet.
  latte: {
    key: "latte",
    label: "Latte",
    scheme: "light",
    bg: "#f2ebe1",
    surface: "#fbf7f0",
    ink: "#35291d",
    muted: "rgba(53,41,29,0.7)",
    line: "rgba(53,41,29,0.12)",
    brand: "#8a5c2e",
    brandInk: "#fdf7ed",
    display: SANS,
    displayWeight: 600,
    displayTracking: "-0.02em",
    radius: "1.6rem",
    grain: 0.14,
    aurora: ["rgba(180,130,70,0.14)", "rgba(236,214,180,0.17)", "rgba(170,120,90,0.1)"],
  },

  // Sveže i čisto: vrlo svetla plavo-siva + prašnjava plava. Smirenije od
  // "moderne" (tamo živ indigo na čisto belom). Aurora: prašnjava plava,
  // nebo, dah mente.
  nebo: {
    key: "nebo",
    label: "Nebo",
    scheme: "light",
    bg: "#edf1f6",
    surface: "#ffffff",
    ink: "#26303d",
    muted: "rgba(38,48,61,0.7)",
    line: "rgba(38,48,61,0.12)",
    brand: "#44688a",
    brandInk: "#f2f7fc",
    display: SANS,
    displayWeight: 600,
    displayTracking: "-0.02em",
    radius: "1.3rem",
    grain: 0.1,
    aurora: ["rgba(100,140,180,0.14)", "rgba(170,200,230,0.16)", "rgba(150,200,190,0.1)"],
  },
};

export const DEFAULT_THEME = "noc";

export function safeTheme(key: unknown): SiteTheme {
  const found = typeof key === "string" ? SITE_THEMES[key] : undefined;
  return found ?? (SITE_THEMES[DEFAULT_THEME] as SiteTheme);
}
