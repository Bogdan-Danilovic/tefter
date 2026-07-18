import type { FastifyInstance } from "fastify";
import { withTenant } from "../../db/client.js";
import {
  clientAppointments,
  clientById,
  createClient,
  deleteClient,
  listClients,
  searchClients,
  updateClient,
} from "../../db/queries.js";
import { formatDayLabel, isoDateInTz } from "../../lib/time.js";

type ClientBody = { fullName?: string; phone?: string; note?: string };

/** FK appointments.client_id je RESTRICT — brisanje klijenta sa terminima puca sa 23503. */
function isForeignKeyViolation(err: unknown): boolean {
  for (let e = err as { code?: string; cause?: unknown } | undefined; e; e = e.cause as never) {
    if (e.code === "23503") return true;
  }
  return false;
}

export async function clientRoutes(app: FastifyInstance) {
  // Live pretraga u modalu termina (HTMX) — postojeće ponašanje.
  app.get<{ Querystring: { q?: string } }>("/clients/search", async (req, reply) => {
    const q = (req.query.q ?? "").trim();
    const results =
      q.length >= 1 ? await withTenant(req.salon.id, (tx) => searchClients(tx, req.salon.id, q)) : [];
    return reply.view("partials/client-results.njk", { results, q });
  });

  // --- Ekran "Klijenti" -----------------------------------------------------
  app.get<{ Querystring: { q?: string } }>("/klijenti", async (req, reply) => {
    const q = (req.query.q ?? "").trim();
    const items = await withTenant(req.salon.id, (tx) => listClients(tx, req.salon.id, q));
    return reply.view("clients.njk", {
      salon: req.salon,
      tab: "clients",
      pageTitle: "Klijenti",
      pageKicker: req.salon.name,
      q,
      items,
      error: null,
    });
  });

  app.post<{ Body: ClientBody }>("/klijenti", async (req, reply) => {
    const fullName = (req.body?.fullName ?? "").trim();
    const phone = (req.body?.phone ?? "").trim();
    if (fullName.length < 2 || phone.length < 3) {
      const items = await withTenant(req.salon.id, (tx) => listClients(tx, req.salon.id));
      return reply.code(422).view("clients.njk", {
        salon: req.salon,
        tab: "clients",
        pageTitle: "Klijenti",
        pageKicker: req.salon.name,
        q: "",
        items,
        error: "Unesi ime (bar 2 znaka) i telefon.",
      });
    }
    const created = await withTenant(req.salon.id, (tx) =>
      createClient(tx, req.salon.id, { fullName, phone }),
    );
    return reply.redirect(`/s/${req.salon.slug}/klijenti/${created.id}`, 303);
  });

  app.get<{ Params: { id: string }; Querystring: { saved?: string } }>(
    "/klijenti/:id",
    async (req, reply) => {
      const data = await withTenant(req.salon.id, async (tx) => {
        const client = await clientById(tx, req.salon.id, req.params.id);
        if (!client) return null;
        const history = await clientAppointments(tx, req.salon.id, client.id);
        return { client, history };
      });
      if (!data) return reply.callNotFound();

      const booked = data.history.filter((h) => h.status === "booked");
      const lastVisit = booked[0]?.startsAt ?? null;

      return reply.view("client-detail.njk", {
        salon: req.salon,
        tab: "clients",
        pageTitle: data.client.fullName,
        pageKicker: "Klijent",
        backHref: `/s/${req.salon.slug}/klijenti`,
        client: data.client,
        history: data.history.map((h) => ({
          ...h,
          dateLabel: formatDayLabel(isoDateInTz(req.salon.timezone, h.startsAt)),
        })),
        stats: {
          visits: booked.length,
          spent: booked.reduce((sum, h) => sum + h.price, 0),
          lastVisit: lastVisit ? formatDayLabel(isoDateInTz(req.salon.timezone, lastVisit)) : null,
        },
        saved: req.query.saved === "1",
        error: null,
      });
    },
  );

  app.post<{ Params: { id: string }; Body: ClientBody }>("/klijenti/:id", async (req, reply) => {
    const fullName = (req.body?.fullName ?? "").trim();
    const phone = (req.body?.phone ?? "").trim();
    const note = (req.body?.note ?? "").trim();
    if (fullName.length < 2 || phone.length < 3) {
      return reply.redirect(`/s/${req.salon.slug}/klijenti/${req.params.id}`, 303);
    }
    await withTenant(req.salon.id, (tx) =>
      updateClient(tx, req.salon.id, req.params.id, {
        fullName,
        phone,
        note: note || null,
      }),
    );
    return reply.redirect(`/s/${req.salon.slug}/klijenti/${req.params.id}?saved=1`, 303);
  });

  app.post<{ Params: { id: string } }>("/klijenti/:id/obrisi", async (req, reply) => {
    try {
      await withTenant(req.salon.id, (tx) => deleteClient(tx, req.salon.id, req.params.id));
    } catch (err) {
      if (!isForeignKeyViolation(err)) throw err;
      const data = await withTenant(req.salon.id, async (tx) => ({
        client: await clientById(tx, req.salon.id, req.params.id),
        history: await clientAppointments(tx, req.salon.id, req.params.id),
      }));
      if (!data.client) return reply.callNotFound();
      const booked = data.history.filter((h) => h.status === "booked");
      return reply.code(422).view("client-detail.njk", {
        salon: req.salon,
        tab: "clients",
        pageTitle: data.client.fullName,
        pageKicker: "Klijent",
        backHref: `/s/${req.salon.slug}/klijenti`,
        client: data.client,
        history: data.history.map((h) => ({
          ...h,
          dateLabel: formatDayLabel(isoDateInTz(req.salon.timezone, h.startsAt)),
        })),
        stats: {
          visits: booked.length,
          spent: booked.reduce((sum, h) => sum + h.price, 0),
          lastVisit: booked[0]
            ? formatDayLabel(isoDateInTz(req.salon.timezone, booked[0].startsAt))
            : null,
        },
        saved: false,
        error: "Klijent ima termine u istoriji pa se ne može obrisati — istorija prometa bi ostala bez imena.",
      });
    }
    return reply.redirect(`/s/${req.salon.slug}/klijenti`, 303);
  });
}
