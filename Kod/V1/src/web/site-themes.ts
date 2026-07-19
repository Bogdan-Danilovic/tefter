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
};

export const DEFAULT_THEME = "noc";

export function safeTheme(key: unknown): SiteTheme {
  const found = typeof key === "string" ? SITE_THEMES[key] : undefined;
  return found ?? (SITE_THEMES[DEFAULT_THEME] as SiteTheme);
}
