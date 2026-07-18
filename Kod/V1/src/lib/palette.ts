/** Boje radnika (#94a3b8 je rezervisan za "Bilo ko"). Deli je wizard i ekran "Radnici". */
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

/** Boja iz palete ili prva kao fallback (forma šalje proizvoljan string). */
export function safeStaffColor(value: string | undefined): string {
  return value && STAFF_PALETTE.includes(value) ? value : STAFF_PALETTE[0]!;
}
