import type { FastifyInstance, FastifyRequest } from "fastify";
import { withTenant } from "../../db/client.js";
import {
  activeServices,
  activeStaff,
  allWorkingHours,
  insertServices,
  insertStaffMembers,
  replaceWorkingHours,
  type WorkingHourInput,
} from "../../db/queries.js";
import { hmToMinutes } from "../../lib/time.js";
import { parseRsdToMinor } from "../../lib/money.js";
import { SERVICE_PALETTE, STAFF_PALETTE } from "../../lib/palette.js";

/**
 * Onboarding wizard u 3 koraka posle registracije:
 *   /podesi/radno-vreme → /podesi/usluge → /podesi/radnici → kalendar.
 * Svaki korak je obična forma (POST + redirect); koraci su idempotentni pa se
 * ekrani mogu posetiti i kasnije.
 */

const DAY_NAMES = ["Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota", "Nedelja"];

const HM_RE = /^\d{2}:\d{2}$/;

/** Ponovljeno form polje (formbody: 1x = string, više puta = niz). */
function asArray(v: unknown): string[] {
  if (v == null) return [];
  return (Array.isArray(v) ? v : [v]).map((x) => String(x));
}

type HourRow = {
  weekday: number;
  name: string;
  closed: boolean;
  open: string;
  close: string;
  error: string | null;
};

export async function onboardingRoutes(app: FastifyInstance) {
  app.get("/podesi", (req, reply) =>
    reply.redirect(`/s/${req.salon.slug}/podesi/radno-vreme`),
  );

  // --- Korak 1: radno vreme -------------------------------------------------
  app.get("/podesi/radno-vreme", async (req, reply) => {
    const existing = await withTenant(req.salon.id, (tx) => allWorkingHours(tx, req.salon.id));
    const rows: HourRow[] = DAY_NAMES.map((name, i) => {
      const wh = existing.find((h) => h.weekday === i + 1);
      return {
        weekday: i + 1,
        name,
        closed: wh?.isClosed ?? false,
        open: wh?.openTime?.slice(0, 5) ?? "09:00",
        close: wh?.closeTime?.slice(0, 5) ?? "20:00",
        error: null,
      };
    });
    return reply.view("onboarding-hours.njk", { salon: null, s: req.salon, rows });
  });

  app.post("/podesi/radno-vreme", async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, string | undefined>;
    const rows: HourRow[] = [];
    const inputs: WorkingHourInput[] = [];
    let hasError = false;

    for (let wd = 1; wd <= 7; wd++) {
      const closed = body[`closed_${wd}`] === "on";
      const open = (body[`open_${wd}`] ?? "").trim();
      const close = (body[`close_${wd}`] ?? "").trim();
      let error: string | null = null;

      if (!closed) {
        if (!HM_RE.test(open) || !HM_RE.test(close)) error = "Unesi vreme od–do.";
        else if (hmToMinutes(open) >= hmToMinutes(close)) error = "Početak mora biti pre kraja.";
      }
      if (error) hasError = true;

      rows.push({ weekday: wd, name: DAY_NAMES[wd - 1]!, closed, open, close, error });
      inputs.push({
        weekday: wd,
        isClosed: closed,
        openTime: closed ? null : open,
        closeTime: closed ? null : close,
      });
    }

    if (hasError) {
      return reply.code(422).view("onboarding-hours.njk", { salon: null, s: req.salon, rows });
    }
    await withTenant(req.salon.id, (tx) => replaceWorkingHours(tx, req.salon.id, inputs));
    return reply.redirect(`/s/${req.salon.slug}/podesi/usluge`, 303);
  });

  // --- Korak 2: usluge ------------------------------------------------------
  const emptySvcRows = () => [
    { name: "", duration: "", price: "" },
    { name: "", duration: "", price: "" },
    { name: "", duration: "", price: "" },
  ];

  app.get("/podesi/usluge", async (req, reply) => {
    const existing = await withTenant(req.salon.id, (tx) => activeServices(tx, req.salon.id));
    return reply.view("onboarding-services.njk", {
      salon: null,
      s: req.salon,
      existing,
      initialRows: emptySvcRows(),
      error: null,
    });
  });

  app.post("/podesi/usluge", async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const names = asArray(body.svcName);
    const durations = asArray(body.svcDuration);
    const prices = asArray(body.svcPrice);

    const rows = names.map((name, i) => ({
      name: name.trim(),
      duration: (durations[i] ?? "").trim(),
      price: (prices[i] ?? "").trim(),
    }));

    const items: { name: string; durationMin: number; priceMinor: number }[] = [];
    let error: string | null = null;
    for (const [i, r] of rows.entries()) {
      if (!r.name && !r.duration && !r.price) continue; // prazan red se ignoriše
      const durationMin = Number.parseInt(r.duration, 10);
      const priceMinor = parseRsdToMinor(r.price);
      if (!r.name) error = `Red ${i + 1}: unesi naziv usluge.`;
      else if (!Number.isInteger(durationMin) || durationMin <= 0)
        error = `„${r.name}": unesi trajanje u minutima.`;
      else if (priceMinor === null) error = `„${r.name}": unesi cenu (može i 0).`;
      if (error) break;
      items.push({ name: r.name, durationMin, priceMinor: priceMinor! });
    }

    const outcome = await withTenant(req.salon.id, async (tx) => {
      const existing = await activeServices(tx, req.salon.id);
      if (!error && items.length === 0 && existing.length === 0) {
        error = "Dodaj bar jednu uslugu — bez nje nema termina.";
      }
      if (error) return { existing };
      await insertServices(
        tx,
        req.salon.id,
        items.map((item, i) => ({
          ...item,
          color: SERVICE_PALETTE[(existing.length + i) % SERVICE_PALETTE.length]!,
        })),
      );
      return null;
    });

    if (outcome) {
      return reply.code(422).view("onboarding-services.njk", {
        salon: null,
        s: req.salon,
        existing: outcome.existing,
        initialRows: rows.length > 0 ? rows : emptySvcRows(),
        error,
      });
    }
    return reply.redirect(`/s/${req.salon.slug}/podesi/radnici`, 303);
  });

  // --- Korak 3: radnici -----------------------------------------------------
  const staffCtx = async (req: FastifyRequest) => {
    const existing = await withTenant(req.salon.id, (tx) => activeStaff(tx, req.salon.id));
    return {
      salon: null,
      s: req.salon,
      existing,
      palette: STAFF_PALETTE,
      initialRows: [{ name: "" }],
      error: null as string | null,
    };
  };

  app.get("/podesi/radnici", async (req, reply) =>
    reply.view("onboarding-staff.njk", await staffCtx(req)),
  );

  app.post("/podesi/radnici", async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const names = asArray(body.stfName)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    // Radnici su opcioni (solo vlasnik) — prazna forma samo završava wizard.
    if (names.length > 0) {
      await withTenant(req.salon.id, async (tx) => {
        const existing = await activeStaff(tx, req.salon.id);
        await insertStaffMembers(
          tx,
          req.salon.id,
          names.map((fullName, i) => ({
            fullName,
            color: STAFF_PALETTE[(existing.length + i) % STAFF_PALETTE.length]!,
          })),
        );
      });
    }
    return reply.redirect(`/s/${req.salon.slug}/day`, 303);
  });
}
