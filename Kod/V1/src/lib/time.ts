/**
 * Vremenska logika bez eksterne biblioteke. Termini se čuvaju kao timestamptz
 * (UTC); prikaz i raster računamo u timezone-u salona preko Intl API-ja.
 */

export type TzParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const pad = (n: number) => String(n).padStart(2, "0");

function partsInTz(date: Date, tz: string): TzParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
  const hour = map.hour === "24" ? 0 : Number(map.hour); // Intl ponekad vrati '24' za ponoć
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function offsetMs(date: Date, tz: string): number {
  const p = partsInTz(date, tz);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - Math.floor(date.getTime() / 1000) * 1000;
}

/** Zidni sat (y-m-d h:m) u timezone-u salona -> tačan UTC instant. */
export function wallToInstant(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
  tz: string,
): Date {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let inst = guess - offsetMs(new Date(guess), tz);
  inst = guess - offsetMs(new Date(inst), tz); // jedna korekcija za DST granice
  return new Date(inst);
}

/** Minuti od ponoći (u tz salona) za dati instant. */
export function minutesInTz(date: Date, tz: string): number {
  const p = partsInTz(date, tz);
  return p.hour * 60 + p.minute;
}

/** 'YYYY-MM-DD' u tz salona za dati instant (default: sada). */
export function isoDateInTz(tz: string, date = new Date()): string {
  const p = partsInTz(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** ISO weekday (1=Pon … 7=Ned) za kalendarski datum 'YYYY-MM-DD' (tz-nezavisno). */
export function isoWeekday(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay(); // 0=Ned … 6=Sub
  return ((dow + 6) % 7) + 1;
}

/** Pomeri 'YYYY-MM-DD' za n dana. */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** 'HH:MM' / 'HH:MM:SS' -> minuti od ponoći. */
export function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h! * 60 + (m ?? 0);
}

/** minuti od ponoći -> 'HH:MM'. */
export function minutesToHm(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

/** Granice kalendarskog dana (u tz salona) kao UTC instanti [start, end). */
export function dayBounds(dateStr: string, tz: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return {
    start: wallToInstant(y!, m!, d!, 0, 0, tz),
    end: wallToInstant(y!, m!, d! + 1, 0, 0, tz),
  };
}

/** Format 'YYYY-MM-DD' -> 'pon 17.07.' (kratko, srpski). */
export function formatDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  const days = ["ned", "pon", "uto", "sre", "čet", "pet", "sub"];
  return `${days[dt.getUTCDay()]} ${pad(d!)}.${pad(m!)}.`;
}
