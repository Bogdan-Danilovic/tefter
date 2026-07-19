/** Zajednička paleta boja (#94a3b8 je rezervisan za "Bilo ko"/fallback). Deli je wizard, ekran "Radnici" i ekran "Usluge". */
export const STAFF_PALETTE = [
  "#f59e0b",
  "#3b82f6",
  "#10b981",
  "#f43f5e",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#84cc16",
];

/** Ista paleta za usluge — kartica u kalendaru sada nosi boju usluge, ne radnika. */
export const SERVICE_PALETTE = STAFF_PALETTE;

/** Boja iz palete ili prva kao fallback (forma šalje proizvoljan string). */
export function safeStaffColor(value: string | undefined): string {
  return value && STAFF_PALETTE.includes(value) ? value : STAFF_PALETTE[0]!;
}

/** Boja iz palete ili prva kao fallback (forma šalje proizvoljan string). */
export function safeServiceColor(value: string | undefined): string {
  return value && SERVICE_PALETTE.includes(value) ? value : SERVICE_PALETTE[0]!;
}
