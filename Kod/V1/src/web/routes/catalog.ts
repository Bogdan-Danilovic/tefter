import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { withTenant } from "../../db/client.js";
import {
  createService,
  createStaffMember,
  listServices,
  listStaff,
  updateService,
  updateStaffMember,
} from "../../db/queries.js";
import { parseRsdToMinor } from "../../lib/money.js";
import { SERVICE_PALETTE, STAFF_PALETTE, safeServiceColor, safeStaffColor } from "../../lib/palette.js";

type ServiceBody = { name?: string; durationMin?: string; price?: string; color?: string; isActive?: string };
type StaffBody = { fullName?: string; color?: string; isActive?: string };

/** Usluge i radnici — katalog salona (Faza 3). */
export async function catalogRoutes(app: FastifyInstance) {
  // --- Usluge ---------------------------------------------------------------
  const renderServices = async (
    req: FastifyRequest,
    reply: FastifyReply,
    error: string | null = null,
  ) => {
    const rows = await withTenant(req.salon.id, (tx) => listServices(tx, req.salon.id));
    return reply.view("services.njk", {
      salon: req.salon,
      tab: "more",
      pageTitle: "Usluge",
      pageKicker: req.salon.name,
      backHref: `/s/${req.salon.slug}/day`,
      // priceInput = dinari, jer forma prima dinare a baza čuva pare.
      items: rows.map((s) => ({ ...s, priceInput: Math.round(s.defaultPrice / 100) })),
      palette: SERVICE_PALETTE,
      error,
    });
  };

  app.get("/usluge", (req, reply) => renderServices(req, reply));

  app.post<{ Body: ServiceBody }>("/usluge", async (req, reply) => {
    const name = (req.body?.name ?? "").trim();
    const durationMin = Number.parseInt(req.body?.durationMin ?? "", 10);
    const price = parseRsdToMinor(req.body?.price ?? "");
    const color = safeServiceColor(req.body?.color);
    if (name.length < 2 || !Number.isFinite(durationMin) || durationMin <= 0 || price === null) {
      return renderServices(req, reply.code(422), "Proveri naziv, trajanje (u minutima) i cenu.");
    }
    await withTenant(req.salon.id, (tx) =>
      createService(tx, req.salon.id, { name, defaultDurationMin: durationMin, defaultPrice: price, color }),
    );
    return reply.redirect(`/s/${req.salon.slug}/usluge`, 303);
  });

  app.post<{ Params: { id: string }; Body: ServiceBody }>("/usluge/:id", async (req, reply) => {
    const name = (req.body?.name ?? "").trim();
    const durationMin = Number.parseInt(req.body?.durationMin ?? "", 10);
    const price = parseRsdToMinor(req.body?.price ?? "");
    const color = safeServiceColor(req.body?.color);
    if (name.length < 2 || !Number.isFinite(durationMin) || durationMin <= 0 || price === null) {
      return renderServices(req, reply.code(422), "Proveri naziv, trajanje (u minutima) i cenu.");
    }
    await withTenant(req.salon.id, (tx) =>
      updateService(tx, req.salon.id, req.params.id, {
        name,
        defaultDurationMin: durationMin,
        defaultPrice: price,
        color,
        isActive: req.body?.isActive === "1",
      }),
    );
    return reply.redirect(`/s/${req.salon.slug}/usluge`, 303);
  });

  // --- Radnici --------------------------------------------------------------
  const renderStaff = async (
    req: FastifyRequest,
    reply: FastifyReply,
    error: string | null = null,
  ) => {
    const items = await withTenant(req.salon.id, (tx) => listStaff(tx, req.salon.id));
    return reply.view("staff.njk", {
      salon: req.salon,
      tab: "more",
      pageTitle: "Radnici",
      pageKicker: req.salon.name,
      backHref: `/s/${req.salon.slug}/day`,
      items,
      palette: STAFF_PALETTE,
      error,
    });
  };

  app.get("/radnici", (req, reply) => renderStaff(req, reply));

  app.post<{ Body: StaffBody }>("/radnici", async (req, reply) => {
    const fullName = (req.body?.fullName ?? "").trim();
    const color = safeStaffColor(req.body?.color);
    if (fullName.length < 2) return renderStaff(req, reply.code(422), "Unesi ime radnika.");
    await withTenant(req.salon.id, (tx) => createStaffMember(tx, req.salon.id, { fullName, color }));
    return reply.redirect(`/s/${req.salon.slug}/radnici`, 303);
  });

  app.post<{ Params: { id: string }; Body: StaffBody }>("/radnici/:id", async (req, reply) => {
    const fullName = (req.body?.fullName ?? "").trim();
    const color = safeStaffColor(req.body?.color);
    if (fullName.length < 2) return renderStaff(req, reply.code(422), "Unesi ime radnika.");
    await withTenant(req.salon.id, (tx) =>
      updateStaffMember(tx, req.salon.id, req.params.id, {
        fullName,
        color,
        isActive: req.body?.isActive === "1",
      }),
    );
    return reply.redirect(`/s/${req.salon.slug}/radnici`, 303);
  });
}
