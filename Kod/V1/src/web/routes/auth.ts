import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { accountByEmail, EmailTakenError, registerSalon, withTenant } from "../../db/client.js";
import { accountForSalon } from "../../db/queries.js";
import { clearSessionCookie, setSessionCookie } from "../auth.js";

type LoginBody = { email?: string; password?: string };
type RegisterBody = { salonName?: string; email?: string; password?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Rute pod /s/:slug BEZ requireAuth (prijava/odjava za konkretan salon).
 * resolveSalonHook je već postavio req.salon.
 */
export async function authRoutes(app: FastifyInstance) {
  app.get("/prijava", (req, reply) => {
    if (req.session?.salonId === req.salon.id) {
      return reply.redirect(`/s/${req.salon.slug}/day`);
    }
    return reply.view("auth-login.njk", {
      actionUrl: `/s/${req.salon.slug}/prijava`,
      salonName: req.salon.name,
      email: "",
      error: null,
    });
  });

  app.post<{ Body: LoginBody }>("/prijava", async (req, reply) => {
    const email = (req.body?.email ?? "").trim();
    const password = req.body?.password ?? "";

    const fail = () =>
      reply.code(422).view("auth-login.njk", {
        actionUrl: `/s/${req.salon.slug}/prijava`,
        salonName: req.salon.name,
        email,
        error: "Pogrešan email ili lozinka.",
      });

    if (!email || !password) return fail();
    const account = await withTenant(req.salon.id, (tx) =>
      accountForSalon(tx, req.salon.id, email),
    );
    if (!account || !(await bcrypt.compare(password, account.passwordHash))) return fail();

    setSessionCookie(reply, {
      accountId: account.id,
      salonId: req.salon.id,
      slug: req.salon.slug,
    });
    return reply.redirect(`/s/${req.salon.slug}/day`, 303);
  });

  app.post("/odjava", (_req, reply) => {
    clearSessionCookie(reply);
    return reply.redirect("/prijava", 303);
  });
}

/** Javne rute na root-u: globalna prijava + registracija salona. */
export async function publicAuthRoutes(app: FastifyInstance) {
  app.get("/prijava", (req, reply) => {
    if (req.session) return reply.redirect(`/s/${req.session.slug}/day`);
    return reply.view("auth-login.njk", {
      actionUrl: "/prijava",
      salonName: null,
      email: "",
      error: null,
    });
  });

  app.post<{ Body: LoginBody }>("/prijava", async (req, reply) => {
    const email = (req.body?.email ?? "").trim();
    const password = req.body?.password ?? "";

    const fail = () =>
      reply.code(422).view("auth-login.njk", {
        actionUrl: "/prijava",
        salonName: null,
        email,
        error: "Pogrešan email ili lozinka.",
      });

    if (!email || !password) return fail();
    const account = await accountByEmail(email);
    if (!account || !(await bcrypt.compare(password, account.passwordHash))) return fail();

    setSessionCookie(reply, {
      accountId: account.accountId,
      salonId: account.salonId,
      slug: account.slug,
    });
    return reply.redirect(`/s/${account.slug}/day`, 303);
  });

  app.get("/registracija", (_req, reply) => {
    return reply.view("auth-register.njk", {
      values: { salonName: "", email: "" },
      errors: {},
    });
  });

  app.post<{ Body: RegisterBody }>("/registracija", async (req, reply) => {
    const salonName = (req.body?.salonName ?? "").trim();
    const email = (req.body?.email ?? "").trim();
    const password = req.body?.password ?? "";

    const errors: Record<string, string> = {};
    if (salonName.length < 2) errors.salonName = "Unesi ime salona (bar 2 znaka).";
    if (!EMAIL_RE.test(email)) errors.email = "Unesi ispravan email.";
    if (password.length < 8) errors.password = "Lozinka mora imati bar 8 znakova.";

    const renderError = () =>
      reply.code(422).view("auth-register.njk", {
        values: { salonName, email },
        errors,
      });

    if (Object.keys(errors).length > 0) return renderError();

    let created;
    try {
      created = await registerSalon({
        name: salonName,
        email,
        passwordHash: await bcrypt.hash(password, 10),
      });
    } catch (err) {
      if (err instanceof EmailTakenError) {
        errors.email = "Nalog sa ovim email-om već postoji — prijavi se.";
        return renderError();
      }
      throw err;
    }

    // Odmah ulogovan → pravo u onboarding wizard (korak 1: radno vreme).
    const { salon, accountId } = created;
    setSessionCookie(reply, { accountId, salonId: salon.id, slug: salon.slug });
    return reply.redirect(`/s/${salon.slug}/podesi/radno-vreme`, 303);
  });
}
