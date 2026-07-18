/**
 * Potpisana sesija bez server-side store-a: payload (JSON, base64url) + HMAC-SHA256.
 * Cookie nosi "b64url(payload).b64url(hmac)"; exp je u payload-u pa ga potpis pokriva
 * (Max-Age na cookie-ju je samo hint browseru).
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export type SessionPayload = {
  accountId: string;
  salonId: string;
  slug: string;
  /** epoch ms do kada sesija važi */
  exp: number;
};

const b64url = (buf: Buffer) => buf.toString("base64url");

function hmac(data: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(data).digest();
}

export function sealSession(payload: SessionPayload, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${body}.${b64url(hmac(body, secret))}`;
}

export function openSession(
  token: string,
  secret: string,
  now: number = Date.now(),
): SessionPayload | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = hmac(body, secret);
  let given: Buffer;
  try {
    given = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (
    typeof payload?.accountId !== "string" ||
    typeof payload?.salonId !== "string" ||
    typeof payload?.slug !== "string" ||
    typeof payload?.exp !== "number"
  ) {
    return null;
  }
  if (payload.exp <= now) return null;
  return payload;
}

/** Minimalni parser Cookie header-a (dovoljan za naš jedan cookie). */
export function parseCookieHeader(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name) out[name] = value;
  }
  return out;
}
