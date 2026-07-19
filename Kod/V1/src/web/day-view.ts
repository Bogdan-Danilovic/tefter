import type { Salon } from "../db/schema.js";
import type { Tx, DayAppointment } from "../db/queries.js";
import { activeStaff, dayAppointments, workingHoursForWeekday } from "../db/queries.js";
import { packColumns } from "../lib/layout.js";
import { formatRsd } from "../lib/money.js";
import {
  addDays,
  dayBounds,
  formatDayLabel,
  hmToMinutes,
  isoDateInTz,
  isoWeekday,
  minutesInTz,
  minutesToHm,
} from "../lib/time.js";

export const SLOT_MIN = 15;
export const SLOT_PX = 28; // visina jednog 15-min slota
const MIN_CARD_PX = SLOT_PX; // minimalna visina kartice (bar 1 slot)

export type DayCard = {
  id: string;
  topPx: number;
  heightPx: number;
  leftPct: number;
  widthPct: number;
  clientName: string;
  serviceName: string;
  staffName: string;
  staffColor: string;
  timeLabel: string;
  priceLabel: string;
  hasNote: boolean;
};

export type DayContext = {
  slug: string;
  date: string;
  dateLabel: string;
  prevDate: string;
  nextDate: string;
  today: string;
  isToday: boolean;
  closed: boolean;
  openMin: number;
  closeMin: number;
  slotPx: number;
  gridHeightPx: number;
  hourLabels: { label: string; topPx: number }[];
  slots: { startParam: string; topPx: number; heightPx: number; isHour: boolean }[];
  cards: DayCard[];
  showNow: boolean;
  nowTopPx: number;
  weekStrip: { date: string; day: string; num: string; isToday: boolean; isCurrent: boolean }[];
  legend: { name: string; color: string }[];
  /** `YYYY-MM-DDTHH:MM` za FAB "+" — danas: sledeći kvart; inače početak radnog vremena. */
  fabStart: string;
};

export async function buildDayContext(tx: Tx, salon: Salon, date: string): Promise<DayContext> {
  const tz = salon.timezone;
  const today = isoDateInTz(tz);
  const weekday = isoWeekday(date);
  const [wh, staffRows] = await Promise.all([
    workingHoursForWeekday(tx, salon.id, weekday),
    activeStaff(tx, salon.id),
  ]);
  const legend = staffRows.map((s) => ({ name: s.fullName, color: s.color }));

  const base: Omit<DayContext, "closed" | "openMin" | "closeMin" | "gridHeightPx" | "hourLabels" | "slots" | "cards" | "showNow" | "nowTopPx" | "fabStart"> = {
    slug: salon.slug,
    date,
    dateLabel: formatDayLabel(date),
    prevDate: addDays(date, -1),
    nextDate: addDays(date, 1),
    today,
    isToday: date === today,
    slotPx: SLOT_PX,
    weekStrip: buildWeekStrip(date, today, salon.weekStartDay),
    legend,
  };

  if (!wh || wh.isClosed || !wh.openTime || !wh.closeTime) {
    return {
      ...base,
      closed: true,
      openMin: 0,
      closeMin: 0,
      gridHeightPx: 0,
      hourLabels: [],
      slots: [],
      cards: [],
      showNow: false,
      nowTopPx: 0,
      fabStart: `${date}T09:00`,
    };
  }

  const openMin = hmToMinutes(wh.openTime);
  const closeMin = hmToMinutes(wh.closeTime);
  const span = Math.max(closeMin - openMin, SLOT_MIN);
  const gridHeightPx = (span / SLOT_MIN) * SLOT_PX;

  // Časovne oznake na svakih 60 min.
  const hourLabels: DayContext["hourLabels"] = [];
  const firstHour = Math.ceil(openMin / 60) * 60;
  for (let m = firstHour; m <= closeMin; m += 60) {
    hourLabels.push({ label: minutesToHm(m), topPx: ((m - openMin) / SLOT_MIN) * SLOT_PX });
  }

  // Prazne ćelije (klik = novi termin).
  const slots: DayContext["slots"] = [];
  for (let m = openMin; m < closeMin; m += SLOT_MIN) {
    slots.push({
      startParam: `${date}T${minutesToHm(m)}`,
      topPx: ((m - openMin) / SLOT_MIN) * SLOT_PX,
      heightPx: SLOT_PX,
      isHour: m % 60 === 0,
    });
  }

  // Termini -> kartice sa lane/lanes.
  const { start, end } = dayBounds(date, tz);
  const appts = await dayAppointments(tx, salon.id, start, end);
  const intervals = appts.map((a) => toInterval(a, tz, openMin, closeMin));
  const placed = packColumns(intervals);
  const gutter = 4; // px razmak između kolona
  const cards: DayCard[] = placed.map((p) => {
    const widthPct = 100 / p.lanes;
    return {
      id: p.appt.id,
      topPx: ((p.startMin - openMin) / SLOT_MIN) * SLOT_PX,
      heightPx: Math.max(((p.endMin - p.startMin) / SLOT_MIN) * SLOT_PX - 2, MIN_CARD_PX),
      leftPct: p.lane * widthPct,
      widthPct,
      clientName: p.appt.clientName ?? "Bez klijenta",
      serviceName: p.appt.serviceName ?? "—",
      staffName: p.appt.staffName ?? "Bilo ko",
      staffColor: p.appt.staffColor ?? "#94a3b8",
      timeLabel: `${minutesToHm(p.realStart)}–${minutesToHm(p.realEnd)}`,
      priceLabel: formatRsd(p.appt.price),
      hasNote: Boolean(p.appt.note && p.appt.note.trim()),
    };
  });
  // gutter se primenjuje u templejtu preko calc(); ovde ostavljamo pct.
  void gutter;

  const nowMin = minutesInTz(new Date(), tz);
  const showNow = date === today && nowMin >= openMin && nowMin <= closeMin;

  // FAB "+": danas -> sledeći slobodan kvart (clamped u radno vreme), inače otvaranje.
  let fabMin = openMin;
  if (date === today) {
    const nextQuarter = Math.ceil(nowMin / SLOT_MIN) * SLOT_MIN;
    fabMin = Math.min(Math.max(nextQuarter, openMin), closeMin - SLOT_MIN);
  }

  return {
    ...base,
    closed: false,
    openMin,
    closeMin,
    gridHeightPx,
    hourLabels,
    slots,
    cards,
    showNow,
    nowTopPx: ((nowMin - openMin) / SLOT_MIN) * SLOT_PX,
    fabStart: `${date}T${minutesToHm(fabMin)}`,
  };
}

type IntervalCard = {
  startMin: number;
  endMin: number;
  realStart: number;
  realEnd: number;
  appt: DayAppointment;
};

function toInterval(a: DayAppointment, tz: string, openMin: number, closeMin: number): IntervalCard {
  const realStart = minutesInTz(a.startsAt, tz);
  let realEnd = minutesInTz(a.endsAt, tz);
  if (realEnd <= realStart) realEnd = closeMin; // prelazak preko ponoći / kraj van dana
  return {
    startMin: Math.max(realStart, openMin),
    endMin: Math.min(Math.max(realEnd, realStart + SLOT_MIN), closeMin),
    realStart,
    realEnd,
    appt: a,
  };
}

function buildWeekStrip(date: string, today: string, weekStartDay: number) {
  const dayNames = ["ned", "pon", "uto", "sre", "čet", "pet", "sub"];
  // Nađi početak nedelje koja sadrži `date`, po weekStartDay (1=Pon…7=Ned).
  const iso = isoWeekday(date); // 1..7
  const startIso = weekStartDay; // 1..7
  const back = (iso - startIso + 7) % 7;
  const weekStart = addDays(date, -back);
  const strip = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const [, m, dd] = d.split("-").map(Number);
    const wd = isoWeekday(d) % 7; // 0=Ned..6=Sub za naziv
    strip.push({
      date: d,
      day: dayNames[wd]!,
      num: `${String(dd)}.${String(m)}.`,
      isToday: d === today,
      isCurrent: d === date,
    });
  }
  return strip;
}
