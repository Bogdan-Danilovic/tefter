import type { FastifyReply, FastifyRequest } from "fastify";
import { openSession, parseCookieHeader, sealSession, type SessionPayload } from "../lib/session.js";

declare module "fastify" {
  interface FastifyRequest {
    session: SessionPayload | null;
  }
}

const COOKIE_NAME = "tefter_sess";
const MAX_AGE_S = 30 * 24 * 3600; // 30 dana — vlasnik ne sme stalno da se prijavljuje

const SECRET = process.env.SESSION_SECRET;
if (!SECRET) throw new Error("SESSION_SECRET nije postavljen");
const secret: string = SECRET;

/**
 * onRequest hook (globalno): pročitaj i verifikuj session cookie za svaki request.
 * Klizno produžavanje: dok god se aplikacija koristi, rok se pomera na novih
 * 30 dana — osvežavamo najviše jednom dnevno da ne pišemo cookie na svaki zahtev.
 */
export async function sessionHook(req: FastifyRequest, reply: FastifyReply) {
  const token = parseCookieHeader(req.headers.cookie)[COOKIE_NAME];
  req.session = token ? openSession(token, secret) : null;
  if (req.session && req.session.exp < Date.now() + (MAX_AGE_S - 24 * 3600) * 1000) {
    const { exp: _exp, ...data } = req.session;
    setSessionCookie(reply, data);
  }
}

export function setSessionCookie(
  reply: FastifyReply,
  data: Omit<SessionPayload, "exp">,
): void {
  const token = sealSession({ ...data, exp: Date.now() + MAX_AGE_S * 1000 }, secret);
  reply.header("set-cookie", cookieString(token, MAX_AGE_S));
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.header("set-cookie", cookieString("", 0));
}

function cookieString(value: string, maxAgeS: number): string {
  const parts = [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeS}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure"); // iza Caddy TLS-a
  return parts.join("; ");
}

/**
 * preHandler POSLE resolveSalonHook-a: sesija mora da pripada salonu iz URL-a.
 * HTMX zahtevi dobijaju HX-Redirect (fragment redirect ne ume da napusti target),
 * obični zahtevi 302 na prijavu tog salona.
 */
export async function requireAuthHook(req: FastifyRequest, reply: FastifyReply) {
  if (req.session && req.session.salonId === req.salon.id) return;
  const loginUrl = `/s/${req.salon.slug}/prijava`;
  if (req.headers["hx-request"] === "true") {
    return reply.code(401).header("HX-Redirect", loginUrl).send();
  }
  return reply.redirect(loginUrl);
}
