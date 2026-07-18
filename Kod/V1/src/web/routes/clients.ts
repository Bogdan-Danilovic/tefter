import type { FastifyInstance } from "fastify";
import { withTenant } from "../../db/client.js";
import { searchClients } from "../../db/queries.js";

export async function clientRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string } }>("/clients/search", async (req, reply) => {
    const q = (req.query.q ?? "").trim();
    const results = q.length >= 1
      ? await withTenant(req.salon.id, (tx) => searchClients(tx, req.salon.id, q))
      : [];
    return reply.view("partials/client-results.njk", { results, q });
  });
}
