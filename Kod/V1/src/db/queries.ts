import { and, eq, or, ilike, ne, sql, asc, desc, count } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";
import { appointments, clients, salonAccounts, services, staff, workingHours } from "./schema.js";

export type Tx = PostgresJsDatabase<typeof schema>;

/** Termin sa denormalizovanim labelama za prikaz. */
export type DayAppointment = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  price: number;
  note: string | null;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  staffId: string | null;
  staffName: string | null;
  staffColor: string | null;
};

const apptSelection = {
  id: appointments.id,
  startsAt: appointments.startsAt,
  endsAt: appointments.endsAt,
  price: appointments.price,
  note: appointments.note,
  clientId: appointments.clientId,
  clientName: clients.fullName,
  serviceId: appointments.serviceId,
  serviceName: services.name,
  staffId: appointments.staffId,
  staffName: staff.fullName,
  staffColor: staff.color,
} as const;

export async function allWorkingHours(tx: Tx, salonId: string) {
  return tx
    .select()
    .from(workingHours)
    .where(eq(workingHours.salonId, salonId))
    .orderBy(asc(workingHours.weekday));
}

export async function workingHoursForWeekday(tx: Tx, salonId: string, weekday: number) {
  const rows = await tx
    .select()
    .from(workingHours)
    .where(and(eq(workingHours.salonId, salonId), eq(workingHours.weekday, weekday)))
    .limit(1);
  return rows[0] ?? null;
}

export async function dayAppointments(
  tx: Tx,
  salonId: string,
  start: Date,
  end: Date,
): Promise<DayAppointment[]> {
  return tx
    .select(apptSelection)
    .from(appointments)
    .leftJoin(clients, eq(appointments.clientId, clients.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(staff, eq(appointments.staffId, staff.id))
    .where(
      and(
        eq(appointments.salonId, salonId),
        eq(appointments.status, "booked"),
        sql`${appointments.startsAt} >= ${start.toISOString()}::timestamptz and ${appointments.startsAt} < ${end.toISOString()}::timestamptz`,
      ),
    )
    .orderBy(asc(appointments.startsAt)) as Promise<DayAppointment[]>;
}

export async function appointmentById(
  tx: Tx,
  salonId: string,
  id: string,
): Promise<DayAppointment | null> {
  const rows = (await tx
    .select(apptSelection)
    .from(appointments)
    .leftJoin(clients, eq(appointments.clientId, clients.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(staff, eq(appointments.staffId, staff.id))
    .where(and(eq(appointments.salonId, salonId), eq(appointments.id, id)))
    .limit(1)) as DayAppointment[];
  return rows[0] ?? null;
}

/** Termini istog radnika koji se preklapaju sa [start, end) — soft-check. */
export async function findOverlaps(
  tx: Tx,
  salonId: string,
  staffId: string,
  start: Date,
  end: Date,
  excludeId?: string,
): Promise<DayAppointment[]> {
  return tx
    .select(apptSelection)
    .from(appointments)
    .leftJoin(clients, eq(appointments.clientId, clients.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(staff, eq(appointments.staffId, staff.id))
    .where(
      and(
        eq(appointments.salonId, salonId),
        eq(appointments.staffId, staffId),
        eq(appointments.status, "booked"),
        excludeId ? ne(appointments.id, excludeId) : undefined,
        sql`tstzrange(${appointments.startsAt}, ${appointments.endsAt}) && tstzrange(${start.toISOString()}::timestamptz, ${end.toISOString()}::timestamptz)`,
      ),
    )
    .orderBy(asc(appointments.startsAt)) as Promise<DayAppointment[]>;
}

export async function searchClients(tx: Tx, salonId: string, q: string, limit = 8) {
  const like = `%${q}%`;
  return tx
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.salonId, salonId),
        or(ilike(clients.fullName, like), ilike(clients.phone, like)),
      ),
    )
    .orderBy(asc(clients.fullName))
    .limit(limit);
}

export async function clientById(tx: Tx, salonId: string, id: string) {
  const rows = await tx
    .select()
    .from(clients)
    .where(and(eq(clients.salonId, salonId), eq(clients.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createClient(
  tx: Tx,
  salonId: string,
  data: { fullName: string; phone: string },
) {
  const [row] = await tx
    .insert(clients)
    .values({ salonId, fullName: data.fullName, phone: data.phone })
    .returning();
  return row!;
}

export async function activeServices(tx: Tx, salonId: string) {
  return tx
    .select()
    .from(services)
    .where(and(eq(services.salonId, salonId), eq(services.isActive, true)))
    .orderBy(asc(services.name));
}

export async function serviceById(tx: Tx, salonId: string, id: string) {
  const rows = await tx
    .select()
    .from(services)
    .where(and(eq(services.salonId, salonId), eq(services.id, id)))
    .limit(1);
  return rows[0] ?? null;
}

export async function activeStaff(tx: Tx, salonId: string) {
  return tx
    .select()
    .from(staff)
    .where(and(eq(staff.salonId, salonId), eq(staff.isActive, true)))
    .orderBy(asc(staff.fullName));
}

export async function insertAppointment(tx: Tx, values: schema.NewAppointment) {
  const [row] = await tx.insert(appointments).values(values).returning();
  return row!;
}

export async function updateAppointment(
  tx: Tx,
  salonId: string,
  id: string,
  values: Partial<schema.NewAppointment>,
) {
  const [row] = await tx
    .update(appointments)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(appointments.salonId, salonId), eq(appointments.id, id)))
    .returning();
  return row ?? null;
}

export async function cancelAppointment(tx: Tx, salonId: string, id: string) {
  const [row] = await tx
    .update(appointments)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(appointments.salonId, salonId), eq(appointments.id, id)))
    .returning();
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Auth + onboarding (Faza 2)
// ---------------------------------------------------------------------------

/** Nalog salona po email-u — prijava na /s/:slug/prijava (tenant poznat, RLS važi). */
export async function accountForSalon(tx: Tx, salonId: string, email: string) {
  const rows = await tx
    .select()
    .from(salonAccounts)
    .where(
      and(
        eq(salonAccounts.salonId, salonId),
        sql`lower(${salonAccounts.email}) = lower(${email})`,
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/** Nalog salona (jedan po salonu) — za prikaz email-a u podešavanjima. */
export async function accountForSalonId(tx: Tx, salonId: string) {
  const rows = await tx
    .select()
    .from(salonAccounts)
    .where(eq(salonAccounts.salonId, salonId))
    .limit(1);
  return rows[0] ?? null;
}

export type WorkingHourInput = {
  weekday: number;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

/** Wizard korak 1: zameni svih 7 dana odjednom (delete + insert u istoj transakciji). */
export async function replaceWorkingHours(tx: Tx, salonId: string, rows: WorkingHourInput[]) {
  await tx.delete(workingHours).where(eq(workingHours.salonId, salonId));
  await tx.insert(workingHours).values(rows.map((r) => ({ ...r, salonId })));
}

/** Wizard korak 2: dodaj usluge (cena u minor jedinicama). */
export async function insertServices(
  tx: Tx,
  salonId: string,
  items: { name: string; durationMin: number; priceMinor: number }[],
) {
  if (items.length === 0) return;
  await tx.insert(services).values(
    items.map((s) => ({
      salonId,
      name: s.name,
      defaultDurationMin: s.durationMin,
      defaultPrice: s.priceMinor,
    })),
  );
}

/** Wizard korak 3: dodaj radnike (boja iz palete). */
export async function insertStaffMembers(
  tx: Tx,
  salonId: string,
  items: { fullName: string; color: string }[],
) {
  if (items.length === 0) return;
  await tx.insert(staff).values(items.map((s) => ({ salonId, ...s })));
}

// ---------------------------------------------------------------------------
// CRUD ekrani (Faza 3) — klijenti, usluge, radnici
// ---------------------------------------------------------------------------

/** Lista klijenata sa brojem dolazaka i ukupnom potrošnjom (samo 'booked'). */
export async function listClients(tx: Tx, salonId: string, q = "") {
  const like = `%${q}%`;
  return tx
    .select({
      id: clients.id,
      fullName: clients.fullName,
      phone: clients.phone,
      note: clients.note,
      visits: sql<number>`count(${appointments.id})::int`,
      spent: sql<number>`coalesce(sum(${appointments.price}), 0)::int`,
      lastVisit: sql<Date | null>`max(${appointments.startsAt})`,
    })
    .from(clients)
    .leftJoin(
      appointments,
      and(eq(appointments.clientId, clients.id), eq(appointments.status, "booked")),
    )
    .where(
      and(
        eq(clients.salonId, salonId),
        q ? or(ilike(clients.fullName, like), ilike(clients.phone, like)) : undefined,
      ),
    )
    .groupBy(clients.id)
    .orderBy(asc(clients.fullName));
}

/** Istorija termina jednog klijenta (najnoviji prvi), uključujući otkazane. */
export async function clientAppointments(tx: Tx, salonId: string, clientId: string) {
  return tx
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      price: appointments.price,
      status: appointments.status,
      serviceName: services.name,
      staffName: staff.fullName,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(staff, eq(appointments.staffId, staff.id))
    .where(and(eq(appointments.salonId, salonId), eq(appointments.clientId, clientId)))
    .orderBy(desc(appointments.startsAt))
    .limit(50);
}

export async function updateClient(
  tx: Tx,
  salonId: string,
  id: string,
  data: { fullName: string; phone: string; note: string | null },
) {
  const [row] = await tx
    .update(clients)
    .set(data)
    .where(and(eq(clients.salonId, salonId), eq(clients.id, id)))
    .returning();
  return row ?? null;
}

/** Briše klijenta; FK sa appointments je RESTRICT pa baca 23503 ako ima termine. */
export async function deleteClient(tx: Tx, salonId: string, id: string) {
  await tx.delete(clients).where(and(eq(clients.salonId, salonId), eq(clients.id, id)));
}

/** Sve usluge, i neaktivne — ekran "Usluge" prikazuje oba stanja. */
export async function listServices(tx: Tx, salonId: string) {
  return tx
    .select()
    .from(services)
    .where(eq(services.salonId, salonId))
    .orderBy(desc(services.isActive), asc(services.name));
}

export async function createService(
  tx: Tx,
  salonId: string,
  data: { name: string; defaultDurationMin: number; defaultPrice: number },
) {
  const [row] = await tx
    .insert(services)
    .values({ salonId, ...data })
    .returning();
  return row!;
}

export async function updateService(
  tx: Tx,
  salonId: string,
  id: string,
  data: Partial<{ name: string; defaultDurationMin: number; defaultPrice: number; isActive: boolean }>,
) {
  const [row] = await tx
    .update(services)
    .set(data)
    .where(and(eq(services.salonId, salonId), eq(services.id, id)))
    .returning();
  return row ?? null;
}

export async function listStaff(tx: Tx, salonId: string) {
  return tx
    .select()
    .from(staff)
    .where(eq(staff.salonId, salonId))
    .orderBy(desc(staff.isActive), asc(staff.fullName));
}

export async function createStaffMember(
  tx: Tx,
  salonId: string,
  data: { fullName: string; color: string },
) {
  const [row] = await tx
    .insert(staff)
    .values({ salonId, ...data })
    .returning();
  return row!;
}

export async function updateStaffMember(
  tx: Tx,
  salonId: string,
  id: string,
  data: Partial<{ fullName: string; color: string; isActive: boolean }>,
) {
  const [row] = await tx
    .update(staff)
    .set(data)
    .where(and(eq(staff.salonId, salonId), eq(staff.id, id)))
    .returning();
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Statistika (Faza 7, prvi deo) — sve u opsegu [start, end)
// ---------------------------------------------------------------------------

const inRange = (start: Date, end: Date) =>
  sql`${appointments.startsAt} >= ${start.toISOString()}::timestamptz and ${appointments.startsAt} < ${end.toISOString()}::timestamptz`;

export async function statsSummary(tx: Tx, salonId: string, start: Date, end: Date) {
  const [row] = await tx
    .select({
      revenue: sql<number>`coalesce(sum(${appointments.price}) filter (where ${appointments.status} = 'booked'), 0)::int`,
      done: sql<number>`count(*) filter (where ${appointments.status} = 'booked')::int`,
      cancelled: sql<number>`count(*) filter (where ${appointments.status} = 'cancelled')::int`,
      clients: sql<number>`count(distinct ${appointments.clientId}) filter (where ${appointments.status} = 'booked')::int`,
    })
    .from(appointments)
    .where(and(eq(appointments.salonId, salonId), inRange(start, end)));
  return row ?? { revenue: 0, done: 0, cancelled: 0, clients: 0 };
}

export async function statsByStaff(tx: Tx, salonId: string, start: Date, end: Date) {
  return tx
    .select({
      name: sql<string>`coalesce(${staff.fullName}, 'Bilo ko')`,
      color: sql<string>`coalesce(${staff.color}, '#94a3b8')`,
      revenue: sql<number>`coalesce(sum(${appointments.price}), 0)::int`,
      done: count(appointments.id),
    })
    .from(appointments)
    .leftJoin(staff, eq(appointments.staffId, staff.id))
    .where(
      and(
        eq(appointments.salonId, salonId),
        eq(appointments.status, "booked"),
        inRange(start, end),
      ),
    )
    .groupBy(staff.fullName, staff.color)
    .orderBy(desc(sql`coalesce(sum(${appointments.price}), 0)`));
}

export async function statsByService(tx: Tx, salonId: string, start: Date, end: Date) {
  return tx
    .select({
      name: services.name,
      revenue: sql<number>`coalesce(sum(${appointments.price}), 0)::int`,
      done: count(appointments.id),
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .where(
      and(
        eq(appointments.salonId, salonId),
        eq(appointments.status, "booked"),
        inRange(start, end),
      ),
    )
    .groupBy(services.name)
    .orderBy(desc(sql`coalesce(sum(${appointments.price}), 0)`));
}

/** Promet po danu u opsegu — dan se računa u timezone-u salona. */
export async function statsByDay(tx: Tx, salonId: string, start: Date, end: Date, tz: string) {
  return tx
    .select({
      day: sql<string>`to_char((${appointments.startsAt} at time zone ${tz})::date, 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${appointments.price}), 0)::int`,
      done: count(appointments.id),
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.salonId, salonId),
        eq(appointments.status, "booked"),
        inRange(start, end),
      ),
    )
    // GROUP BY 1 = po prvoj koloni: isti izraz sa parametrom (tz) se u drizzle-u
    // renderuje sa drugim placeholder-om pa ga Postgres ne prepozna kao isti.
    .groupBy(sql`1`)
    .orderBy(sql`1`);
}
