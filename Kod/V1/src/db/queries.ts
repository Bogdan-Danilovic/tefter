import { and, eq, or, ilike, ne, sql, asc } from "drizzle-orm";
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
