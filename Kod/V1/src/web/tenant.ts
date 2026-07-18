import type { FastifyReply, FastifyRequest } from "fastify";
import { resolveSalon } from "../db/client.js";
import type { Salon } from "../db/schema.js";

declare module "fastify" {
  interface FastifyRequest {
    salon: Salon;
  }
}

/**
 * preHandler za sve rute pod /s/:slug — razreši salon ili vrati 404.
 * (salons tabela nema RLS, pa lookup radi pre postavljanja tenant konteksta.)
 */
export async function resolveSalonHook(req: FastifyRequest, reply: FastifyReply) {
  const { slug } = req.params as { slug?: string };
  if (!slug) return reply.code(404).send("Nepoznat salon");
  const salon = await resolveSalon(slug);
  if (!salon) return reply.code(404).send("Salon nije pronađen");
  req.salon = salon;
}
