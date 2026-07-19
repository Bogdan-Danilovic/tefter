import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { withTenant } from "../../db/client.js";
import {
  appointmentById,
  cancelAppointment,
  clientById,
  createClient,
  findOverlaps,
  insertAppointment,
  serviceById,
  updateAppointment,
  type DayAppointment,
} from "../../db/queries.js";
import { buildDayContext } from "../day-view.js";
import { buildEditModal, buildNewModal, errorModal, type ClientMode } from "../modal-view.js";
import { parseRsdToMinor } from "../../lib/money.js";
import { wallToInstant } from "../../lib/time.js";

export async function appointmentRoutes(app: FastifyInstance) {
  // Modal: novi termin (vreme prefilled iz slota)
  app.get<{ Querystring: { start?: string } }>("/appointments/new", async (req, reply) => {
    const start = req.query.start ?? "";
    const m = await withTenant(req.salon.id, (tx) => buildNewModal(tx, req.salon, start));
    return reply.view("partials/modal.njk", { m });
  });

  // Modal: izmena postojećeg
  app.get<{ Params: { id: string } }>("/appointments/:id/edit", async (req, reply) => {
    const appt = await withTenant(req.salon.id, (tx) =>
      appointmentById(tx, req.salon.id, req.params.id),
    );
    if (!appt) return reply.code(404).send("Termin nije pronađen");
    const m = await withTenant(req.salon.id, (tx) => buildEditModal(tx, req.salon, appt));
    return reply.view("partials/modal.njk", { m });
  });

  app.post("/appointments", (req, reply) => save(req, reply, "new", null));
  app.post<{ Params: { id: string } }>("/appointments/:id", (req, reply) =>
    save(req, reply, "edit", req.params.id),
  );

  app.post<{ Params: { id: string } }>("/appointments/:id/cancel", async (req, reply) => {
    const result = await withTenant(req.salon.id, async (tx) => {
      const appt = await appointmentById(tx, req.salon.id, req.params.id);
      if (!appt) return null;
      await cancelAppointment(tx, req.salon.id, req.params.id);
      const dateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: req.salon.timezone,
      }).format(appt.startsAt);
      const day = await buildDayContext(tx, req.salon, dateStr);
      return { day };
    });
    if (!result) return reply.code(404).send("Termin nije pronađen");
    return reply.view("partials/save-result.njk", { day: result.day, overlaps: [] });
  });
}

async function save(
  req: FastifyRequest,
  reply: FastifyReply,
  mode: "new" | "edit",
  apptId: string | null,
) {
  const salon = req.salon;
  const tz = salon.timezone;
  const body = (req.body ?? {}) as Record<string, string>;

  const date = (body.date ?? "").trim();
  const startTime = (body.startTime ?? "").trim();
  const durationMin = Number.parseInt(body.durationMin ?? "", 10);
  const serviceId = (body.serviceId ?? "").trim();
  const staffId = (body.staffId ?? "").trim();
  const clientId = (body.clientId ?? "").trim();
  const clientName = (body.clientName ?? "").trim();
  const clientPhone = (body.clientPhone ?? "").trim();
  const newClientName = (body.newClientName ?? "").trim();
  const newClientPhone = (body.newClientPhone ?? "").trim();
  const priceRaw = (body.price ?? "").trim();
  const note = (body.note ?? "").trim();

  const errors: Record<string, string> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.startTime = "Neispravan datum";
  if (!/^\d{2}:\d{2}$/.test(startTime)) errors.startTime = "Neispravno vreme";
  if (!serviceId || !Number.isInteger(durationMin) || durationMin <= 0)
    errors.service = "Izaberi uslugu";
  // Klijent je opcion — prazno polje pravi termin "Bez klijenta" (prolaznik).
  if (!clientId && newClientName && !newClientPhone) errors.clientPhone = "Telefon je obavezan";
  const priceMinor = parseRsdToMinor(priceRaw);
  if (priceMinor === null) errors.price = "Unesi cenu";

  const clientMode: ClientMode = clientId ? "selected" : newClientName ? "new" : "search";

  const renderError = async (extra: Record<string, string> = {}) => {
    const merged = { ...errors, ...extra };
    const m = await withTenant(salon.id, (tx) =>
      errorModal(tx, salon, {
        mode,
        apptId,
        date: date || "",
        startHm: startTime || "09:00",
        durationMin: Number.isInteger(durationMin) && durationMin > 0 ? durationMin : 30,
        clientMode,
        selectedClient: clientId ? { id: clientId, name: clientName, phone: clientPhone } : null,
        newClient: { name: newClientName, phone: newClientPhone },
        values: { serviceId, staffId, priceDinars: priceRaw, note },
        errors: merged,
      }),
    );
    return reply.code(422).view("partials/modal.njk", { m });
  };

  if (Object.keys(errors).length > 0) return renderError();

  const [y, mo, d] = date.split("-").map(Number);
  const [hh, mm] = startTime.split(":").map(Number);
  const start = wallToInstant(y!, mo!, d!, hh!, mm!, tz);
  const end = new Date(start.getTime() + durationMin * 60000);
  const staffFk = staffId || null;

  const outcome = await withTenant(salon.id, async (tx) => {
    // Validacija pripadnosti salonu (RLS + eksplicitno) PRE bilo kakvog pisanja.
    const svc = await serviceById(tx, salon.id, serviceId);
    if (!svc) {
      return { ok: false as const, field: { service: "Nepoznata usluga" } as Record<string, string> };
    }

    let resolvedClientId: string | null = clientId || null;
    if (clientId) {
      const c = await clientById(tx, salon.id, clientId);
      if (!c) {
        return { ok: false as const, field: { client: "Nepoznat klijent" } as Record<string, string> };
      }
    } else if (newClientName) {
      const c = await createClient(tx, salon.id, {
        fullName: newClientName,
        phone: newClientPhone,
      });
      resolvedClientId = c.id;
    }

    const values = {
      salonId: salon.id,
      clientId: resolvedClientId,
      serviceId,
      staffId: staffFk,
      startsAt: start,
      endsAt: end,
      price: priceMinor!,
      note: note || null,
    };

    if (mode === "new") {
      await insertAppointment(tx, values);
    } else {
      const updated = await updateAppointment(tx, salon.id, apptId!, {
        clientId: resolvedClientId,
        serviceId,
        staffId: staffFk,
        startsAt: start,
        endsAt: end,
        price: priceMinor!,
        note: note || null,
      });
      if (!updated) return { ok: false as const, notFound: true };
    }

    // Soft-check preklapanja za radnika (ne blokira save; samo upozorenje).
    const overlaps: DayAppointment[] = staffFk
      ? await findOverlaps(tx, salon.id, staffFk, start, end, mode === "edit" ? apptId! : undefined)
      : [];

    const day = await buildDayContext(tx, salon, date);
    return { ok: true as const, day, overlaps };
  });

  if (!outcome.ok) {
    if (outcome.notFound) return reply.code(404).send("Termin nije pronađen");
    return renderError(outcome.field ?? {});
  }

  return reply.view("partials/save-result.njk", {
    day: outcome.day,
    overlaps: outcome.overlaps,
  });
}
