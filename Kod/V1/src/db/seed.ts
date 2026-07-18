import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "./schema.js";
import { isoDateInTz, wallToInstant } from "../lib/time.js";

// Seed ide kao superuser (MIGRATION_DATABASE_URL) => zaobilazi RLS, sme da piše
// za bilo koji tenant bez set_config.
const url = process.env.MIGRATION_DATABASE_URL;
if (!url) throw new Error("MIGRATION_DATABASE_URL nije postavljen");

const SALON_TZ = "Europe/Belgrade";

/** RSD -> minor jedinice (para). 1200 RSD => 120000. */
const rsd = (dinars: number) => dinars * 100;

// "Danas" računamo u salonskoj zoni (ne host zoni) da termini padnu na isti dan
// koji app prikazuje kao /day, i da zidni sat bude tačan na bilo kom hostu (npr. UTC VPS).
const [tY, tM, tD] = isoDateInTz(SALON_TZ).split("-").map(Number);

/** Danas u salonskoj zoni, na dati zidni sat/minut. */
function todayAt(hour: number, minute = 0): Date {
  return wallToInstant(tY!, tM!, tD!, hour, minute, SALON_TZ);
}

async function main() {
  const client = postgres(url!, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    // Idempotentno: obriši demo salon (cascade briše decu) pa ubaci iznova.
    await db.delete(schema.salons).where(eq(schema.salons.slug, "demo"));

    const [salon] = await db
      .insert(schema.salons)
      .values({ slug: "demo", name: "Salon Demo", timezone: "Europe/Belgrade", weekStartDay: 1 })
      .returning();
    const salonId = salon!.id;

    await db.insert(schema.salonAccounts).values({
      salonId,
      email: "demo@tefter.local",
      passwordHash: await bcrypt.hash("demo1234", 10),
    });

    // Radno vreme: Pon–Pet 09–20, Sub 09–15, Ned zatvoreno.
    await db.insert(schema.workingHours).values([
      { salonId, weekday: 1, openTime: "09:00", closeTime: "20:00" },
      { salonId, weekday: 2, openTime: "09:00", closeTime: "20:00" },
      { salonId, weekday: 3, openTime: "09:00", closeTime: "20:00" },
      { salonId, weekday: 4, openTime: "09:00", closeTime: "20:00" },
      { salonId, weekday: 5, openTime: "09:00", closeTime: "20:00" },
      { salonId, weekday: 6, openTime: "09:00", closeTime: "15:00" },
      { salonId, weekday: 7, isClosed: true },
    ]);

    const services = await db
      .insert(schema.services)
      .values([
        { salonId, name: "Šišanje", defaultDurationMin: 30, defaultPrice: rsd(1200) },
        { salonId, name: "Farbanje", defaultDurationMin: 90, defaultPrice: rsd(4500) },
        { salonId, name: "Feniranje", defaultDurationMin: 30, defaultPrice: rsd(1500) },
        { salonId, name: "Pramenovi", defaultDurationMin: 120, defaultPrice: rsd(6000) },
      ])
      .returning();

    const staff = await db
      .insert(schema.staff)
      .values([
        { salonId, fullName: "Ana", color: "#f59e0b" },
        { salonId, fullName: "Marija", color: "#3b82f6" },
        { salonId, fullName: "Jelena", color: "#10b981" },
      ])
      .returning();

    const clients = await db
      .insert(schema.clients)
      .values([
        { salonId, fullName: "Milica Petrović", phone: "+381641112233" },
        { salonId, fullName: "Jovana Nikolić", phone: "+381652223344" },
        { salonId, fullName: "Teodora Ilić", phone: "+381603334455" },
      ])
      .returning();

    const [sisanje, farbanje, feniranje] = services;
    const [ana, marija] = staff;
    const [milica, jovana, teodora] = clients;

    // Termini za danas — uključuje preklapanje po radniku (Ana 10:00 farba + 10:30
    // šiša drugu klijentkinju) i termin bez radnika ("bilo ko").
    await db.insert(schema.appointments).values([
      {
        salonId,
        clientId: milica!.id,
        serviceId: farbanje!.id,
        staffId: ana!.id,
        startsAt: todayAt(10, 0),
        endsAt: todayAt(11, 30),
        price: farbanje!.defaultPrice,
        note: "Boja 6.0",
      },
      {
        salonId,
        clientId: jovana!.id,
        serviceId: sisanje!.id,
        staffId: ana!.id, // namerno preklapanje sa gornjim (dok boja stoji)
        startsAt: todayAt(10, 30),
        endsAt: todayAt(11, 0),
        price: sisanje!.defaultPrice,
      },
      {
        salonId,
        clientId: teodora!.id,
        serviceId: feniranje!.id,
        staffId: null, // "bilo ko"
        startsAt: todayAt(12, 0),
        endsAt: todayAt(12, 30),
        price: rsd(1800), // override cene po terminu
      },
    ]);

    console.log(`Seed gotov. Salon: /s/${salon!.slug}  login: demo@tefter.local / demo1234`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
