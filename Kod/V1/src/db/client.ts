import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import * as schema from "./schema.js";

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

export { schema };
