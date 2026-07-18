import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { withTenant } from "../../db/client.js";
import { isoDateInTz } from "../../lib/time.js";
import { buildDayContext } from "../day-view.js";

async function renderDay(req: FastifyRequest, reply: FastifyReply, dateParam?: string) {
  const salon = req.salon;
  const date = dateParam ?? isoDateInTz(salon.timezone);
  const day = await withTenant(salon.id, (tx) => buildDayContext(tx, salon, date));
  const template = req.headers["hx-request"] === "true" ? "partials/day-inner.njk" : "day.njk";
  return reply.view(template, { day, salon, tab: "day" });
}

export async function dayRoutes(app: FastifyInstance) {
  app.get<{ Params: { slug: string; date: string } }>("/day/:date", (req, reply) =>
    renderDay(req, reply, req.params.date),
  );

  app.get("/day", (req, reply) => renderDay(req, reply));

  // /s/:slug -> današnji dan.
  app.get("/", (req, reply) => reply.redirect(`/s/${req.salon.slug}/day`));
}
