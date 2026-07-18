import type { FastifyInstance } from "fastify";
import { withTenant } from "../../db/client.js";
import { statsByDay, statsByService, statsByStaff, statsSummary } from "../../db/queries.js";
import { addDays, formatDayLabel, isoDateInTz, isoWeekday, wallToInstant } from "../../lib/time.js";

const PERIODS = [
  { key: "dan", label: "Danas" },
  { key: "nedelja", label: "Ova nedelja" },
  { key: "mesec", label: "Ovaj mesec" },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

/** Prvi dan perioda (u tz salona) i broj dana koje pokrivamo. */
function rangeFor(period: PeriodKey, today: string, weekStartDay: number) {
  if (period === "dan") return { from: today, to: addDays(today, 1) };
  if (period === "nedelja") {
    const wd = isoWeekday(today); // 1=Pon … 7=Ned
    const back = weekStartDay === 7 ? wd % 7 : wd - 1;
    const from = addDays(today, -back);
    return { from, to: addDays(from, 7) };
  }
  const [y, m] = today.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const to = m === 12 ? `${y! + 1}-01-01` : `${y}-${String(m! + 1).padStart(2, "0")}-01`;
  return { from, to };
}

const toInstant = (dateStr: string, tz: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return wallToInstant(y!, m!, d!, 0, 0, tz);
};

export async function statsRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { period?: string } }>("/statistika", async (req, reply) => {
    const salon = req.salon;
    const period = (PERIODS.find((p) => p.key === req.query.period)?.key ?? "nedelja") as PeriodKey;
    const today = isoDateInTz(salon.timezone);
    const { from, to } = rangeFor(period, today, salon.weekStartDay);
    const start = toInstant(from, salon.timezone);
    const end = toInstant(to, salon.timezone);

    const data = await withTenant(salon.id, async (tx) => ({
      summary: await statsSummary(tx, salon.id, start, end),
      byStaff: await statsByStaff(tx, salon.id, start, end),
      byService: await statsByService(tx, salon.id, start, end),
      byDay: await statsByDay(tx, salon.id, start, end, salon.timezone),
    }));

    // Popuni i dane bez prometa da stubići pokrivaju ceo period (osim za "danas").
    const days: { date: string; revenue: number }[] = [];
    for (let d = from; d < to; d = addDays(d, 1)) {
      days.push({ date: d, revenue: data.byDay.find((r) => r.day === d)?.revenue ?? 0 });
    }
    const max = Math.max(...days.map((d) => d.revenue), 1);
    const best = days.reduce((a, b) => (b.revenue > a.revenue ? b : a), days[0]!);

    return reply.view("stats.njk", {
      salon,
      tab: "stats",
      pageTitle: "Statistika",
      pageKicker: salon.name,
      periods: PERIODS,
      period,
      rangeLabel:
        period === "dan"
          ? formatDayLabel(from)
          : `${formatDayLabel(from)} – ${formatDayLabel(addDays(to, -1))}`,
      summary: data.summary,
      byStaff: data.byStaff,
      byService: data.byService,
      byDay:
        period === "dan"
          ? []
          : days.map((d) => ({
              label: formatDayLabel(d.date),
              short: formatDayLabel(d.date).split(" ")[0],
              revenue: d.revenue,
              pct: Math.round((d.revenue / max) * 100),
            })),
      bestDay: best && best.revenue > 0 ? formatDayLabel(best.date) : "—",
    });
  });
}
