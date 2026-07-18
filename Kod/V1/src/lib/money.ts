/** Cene se čuvaju u minor jedinicama (para). 120000 => "1.200 RSD". */

const fmt = new Intl.NumberFormat("sr-RS", { maximumFractionDigits: 0 });

export function formatRsd(minor: number): string {
  return `${fmt.format(Math.round(minor / 100))} RSD`;
}

/** Unos iz forme (dinari, npr "1.800" ili "1800") -> minor jedinice, ili null. */
export function parseRsdToMinor(input: string): number | null {
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return null;
  return Number.parseInt(digits, 10) * 100;
}
