import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import * as schema from "./schema.js";
import { slugCandidate, slugify } from "../lib/slug.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL nije postavljen");

// Runtime konekcija ide kao NON-owner rola => RLS je aktivan.
const client = postgres(url, { max: 10 });
export const db = drizzle(client, { schema });

/**
 * Razrešava salon iz slug-a (path routing /s/:salonSlug/...).
 * salons tabela nema RLS, pa ovaj upit radi pre nego što je tenant poznat.
 */
export async function resolveSalon(slug: string): Promise<schema.Salon | null> {
  const rows = await db.select().from(schema.salons).where(eq(schema.salons.slug, slug)).limit(1);
  return rows[0] ?? null;
}

/**
 * Pušta callback unutar transakcije sa postavljenim `app.current_salon_id`,
 * tako da RLS politike vide tekući salon. Sav tenant-scoped rad ide kroz ovo.
 *
 *   const appts = await withTenant(salon.id, (tx) =>
 *     tx.select().from(appointments).where(...));
 */
export async function withTenant<T>(
  salonId: string,
  fn: (tx: typeof db) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    // set_config(..., true) = LOCAL: važi samo do kraja ove transakcije.
    await tx.execute(sql`select set_config('app.current_salon_id', ${salonId}, true)`);
    return fn(tx as unknown as typeof db);
  });
}

// ---------------------------------------------------------------------------
// Registracija + globalna prijava (jedine operacije van tenant konteksta)
// ---------------------------------------------------------------------------

export class EmailTakenError extends Error {
  constructor() {
    super("Nalog sa ovim email-om već postoji");
  }
}

/** Default radno vreme novog salona — wizard korak 1 ga samo doteruje. */
const DEFAULT_WORKING_HOURS: Array<
  Pick<typeof schema.workingHours.$inferInsert, "weekday" | "isClosed" | "openTime" | "closeTime">
> = [
  { weekday: 1, isClosed: false, openTime: "09:00", closeTime: "20:00" },
  { weekday: 2, isClosed: false, openTime: "09:00", closeTime: "20:00" },
  { weekday: 3, isClosed: false, openTime: "09:00", closeTime: "20:00" },
  { weekday: 4, isClosed: false, openTime: "09:00", closeTime: "20:00" },
  { weekday: 5, isClosed: false, openTime: "09:00", closeTime: "20:00" },
  { weekday: 6, isClosed: false, openTime: "09:00", closeTime: "15:00" },
  { weekday: 7, isClosed: true, openTime: null, closeTime: null },
];

function uniqueViolation(err: unknown, constraint: string): boolean {
  // postgres-js greška može biti umotana (cause lanac); 23505 = unique_violation.
  for (let e = err as { code?: string; constraint_name?: string; cause?: unknown } | undefined; e; e = e.cause as never) {
    if (e.code === "23505" && e.constraint_name === constraint) return true;
  }
  return false;
}

/**
 * Kreira salon + nalog + default radno vreme u JEDNOJ transakciji (rollback ne
 * ostavlja salon-siroče ako je email zauzet). Slug se izvodi iz imena; na koliziju
 * se proba "ime-2", "ime-3", … RLS na salon_accounts/working_hours je zadovoljen
 * jer transakcija postavi app.current_salon_id odmah posle inserta salona.
 */
export async function registerSalon(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<{ salon: schema.Salon; accountId: string }> {
  const base = slugify(input.name);
  for (let attempt = 0; attempt < 20; attempt++) {
    const slug = slugCandidate(base, attempt);
    try {
      return await db.transaction(async (tx) => {
        const [salon] = await tx
          .insert(schema.salons)
          .values({ slug, name: input.name })
          .returning();
        await tx.execute(sql`select set_config('app.current_salon_id', ${salon!.id}, true)`);
        const [account] = await tx
          .insert(schema.salonAccounts)
          .values({
            salonId: salon!.id,
            email: input.email.toLowerCase(),
            passwordHash: input.passwordHash,
          })
          .returning();
        await tx
          .insert(schema.workingHours)
          .values(DEFAULT_WORKING_HOURS.map((h) => ({ ...h, salonId: salon!.id })));
        return { salon: salon!, accountId: account!.id };
      });
    } catch (err) {
      if (uniqueViolation(err, "salons_slug_unique")) continue; // sledeći kandidat
      if (uniqueViolation(err, "salon_accounts_email_unique")) throw new EmailTakenError();
      throw err;
    }
  }
  throw new Error(`Nema slobodnog slug-a za "${base}"`);
}

export type GlobalAccount = {
  accountId: string;
  salonId: string;
  passwordHash: string;
  slug: string;
  salonName: string;
};

/** Globalna prijava: nalog po email-u preko SECURITY DEFINER funkcije (0002_auth.sql). */
export async function accountByEmail(email: string): Promise<GlobalAccount | null> {
  const rows = await db.execute<{
    account_id: string;
    salon_id: string;
    password_hash: string;
    slug: string;
    salon_name: string;
  }>(sql`select * from auth_account_by_email(${email})`);
  const r = rows[0];
  if (!r) return null;
  return {
    accountId: r.account_id,
    salonId: r.salon_id,
    passwordHash: r.password_hash,
    slug: r.slug,
    salonName: r.salon_name,
  };
}

export { schema };
