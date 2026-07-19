/**
 * WCAG AA audit tema mini sajta (Faza 9): za svaku temu iz src/web/site-themes.ts
 * računa kontrast parove koje template stvarno koristi i pada (exit 1) ako je
 * neki ispod 4.5:1. Pokretanje: npx tsx scripts/site-theme-audit.ts
 */
import { SITE_THEMES } from "../src/web/site-themes.js";

type Rgb = [number, number, number];

/** #rgb/#rrggbb ili rgba(r,g,b,a) → [r,g,b] + alfa (rgba se kompozituje kasnije). */
function parse(color: string): { rgb: Rgb; alpha: number } {
  const hex = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1] as string;
    if (h.length === 3) h = h.replace(/./g, (c) => c + c);
    return {
      rgb: [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)],
      alpha: 1,
    };
  }
  const fn = color.trim().match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (fn) {
    return {
      rgb: [Number(fn[1]), Number(fn[2]), Number(fn[3])],
      alpha: fn[4] === undefined ? 1 : Number(fn[4]),
    };
  }
  throw new Error(`Ne umem da parsiram boju: ${color}`);
}

/** Poluprovidna boja preko podloge → neprovidna (kanal po kanal, sRGB prostor). */
function composite(fg: string, bg: string): Rgb {
  const f = parse(fg);
  const b = parse(bg);
  return f.rgb.map((c, i) => c * f.alpha + (b.rgb[i] as number) * (1 - f.alpha)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const lin = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as Rgb;
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** WCAG kontrast; poluprovidan prednji plan se prvo spljošti preko podloge. */
export function contrast(fg: string, bg: string): number {
  const bgFlat = parse(bg).rgb;
  const l1 = luminance(composite(fg, bg));
  const l2 = luminance(bgFlat);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const AA = 4.5;
let failed = false;

for (const t of Object.values(SITE_THEMES)) {
  // Parovi koje site.njk stvarno renderuje kao tekst.
  const checks: [string, number][] = [
    ["ink/bg", contrast(t.ink, t.bg)],
    ["ink/surface", contrast(t.ink, t.surface)],
    ["muted/bg", contrast(t.muted, t.bg)],
    ["muted/surface", contrast(t.muted, t.surface)],
    ["brand/bg", contrast(t.brand, t.bg)],
    ["brand/surface", contrast(t.brand, t.surface)],
    ["brandInk/brand", contrast(t.brandInk, t.brand)],
  ];
  const grainOk =
    t.scheme === "dark" ? t.grain >= 0.4 && t.grain <= 0.5 : t.grain >= 0.1 && t.grain <= 0.25;
  const auroraOk = t.aurora.every((a) => parse(a).alpha < 1);

  const parts = checks.map(([name, ratio]) => {
    const ok = ratio >= AA;
    if (!ok) failed = true;
    return `${ok ? "✓" : "✗"} ${name} ${ratio.toFixed(2)}`;
  });
  if (!grainOk || !auroraOk) failed = true;
  console.log(
    `${t.key.padEnd(9)} ${parts.join("  ")}  ${grainOk ? "✓" : "✗"} grain=${t.grain}  ${auroraOk ? "✓" : "✗"} aurora-alfa`,
  );
}

process.exit(failed ? 1 : 0);
