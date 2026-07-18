import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { db, withTenant } from "../../db/client.js";
import { salons } from "../../db/schema.js";
import {
  accountForSalonId,
  allWorkingHours,
  replaceWorkingHours,
  type WorkingHourInput,
} from "../../db/queries.js";
import { hmToMinutes } from "../../lib/time.js";

const DAY_LABELS = ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"];
const WEEKDAY_OPTIONS = [
  { n: 1, label: "Ponedeljka" },
  { n: 7, label: "Nedelje" },
];
const HM_RE = /^\d{2}:\d{2}$/;

/** Podešavanja salona: ime, početak nedelje, radno vreme, odjava. */
export async function settingsRoutes(app: FastifyInstance) {
  const render = async (
    req: FastifyRequest,
    reply: FastifyReply,
    opts: { saved?: boolean; error?: string | null } = {},
  ) => {
    const { existing, account } = await withTenant(req.salon.id, async (tx) => ({
      existing: await allWorkingHours(tx, req.salon.id),
      account: await accountForSalonId(tx, req.salon.id),
    }));
    const hours = DAY_LABELS.map((label, i) => {
      const wh = existing.find((h) => h.weekday === i + 1);
      return {
        weekday: i + 1,
        label,
        isClosed: wh?.isClosed ?? false,
        open: wh?.openTime?.slice(0, 5) ?? "09:00",
        close: wh?.closeTime?.slice(0, 5) ?? "20:00",
      };
    });
    return reply.view("settings.njk", {
      salon: req.salon,
      tab: "more",
      pageTitle: "Podešavanja",
      pageKicker: req.salon.name,
      backHref: `/s/${req.salon.slug}/day`,
      weekdays: WEEKDAY_OPTIONS,
      hours,
      accountEmail: account?.email ?? "",
      saved: opts.saved ?? false,
      error: opts.error ?? null,
    });
  };

  app.get<{ Querystring: { saved?: string } }>("/podesavanja", (req, reply) =>
    render(req, reply, { saved: req.query.saved === "1" }),
  );

  app.post<{ Body: { name?: string; weekStartDay?: string } }>(
    "/podesavanja",
    async (req, reply) => {
      const name = (req.body?.name ?? "").trim();
      const weekStartDay = Number.parseInt(req.body?.weekStartDay ?? "1", 10);
      if (name.length < 2) {
        return render(req, reply.code(422), { error: "Ime salona mora imati bar 2 znaka." });
      }
      // salons nema RLS (registar tenantâ), pa ide direktno preko db.
      await db
        .update(salons)
        .set({
          name,
          weekStartDay: weekStartDay === 7 ? 7 : 1,
          updatedAt: new Date(),
        })
        .where(eq(salons.id, req.salon.id));
      return reply.redirect(`/s/${req.salon.slug}/podesavanja?saved=1`, 303);
    },
  );

  app.post("/podesavanja/radno-vreme", async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, string | undefined>;
    const rows: WorkingHourInput[] = [];

    for (let weekday = 1; weekday <= 7; weekday++) {
      const isClosed = body[`closed_${weekday}`] === "1";
      if (isClosed) {
        rows.push({ weekday, isClosed: true, openTime: null, closeTime: null });
        continue;
      }
      const open = body[`open_${weekday}`] ?? "";
      const close = body[`close_${weekday}`] ?? "";
      if (!HM_RE.test(open) || !HM_RE.test(close)) {
        return render(req, reply.code(422), {
          error: `Neispravno vreme za ${DAY_LABELS[weekday - 1]}.`,
        });
      }
      if (hmToMinutes(close) <= hmToMinutes(open)) {
        return render(req, reply.code(422), {
          error: `${DAY_LABELS[weekday - 1]}: kraj radnog vremena mora biti posle početka.`,
        });
      }
      rows.push({ weekday, isClosed: false, openTime: open, closeTime: close });
    }

    await withTenant(req.salon.id, (tx) => replaceWorkingHours(tx, req.salon.id, rows));
    return reply.redirect(`/s/${req.salon.slug}/podesavanja?saved=1`, 303);
  });
}
