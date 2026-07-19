import {
  pgTable,
  uuid,
  text,
  integer,
  smallint,
  boolean,
  time,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Status termina. Otkazivanje je soft (status = 'cancelled'), red se ne briše —
 * modal iz tačke 1 nudi izmenu/otkazivanje nad istim zapisom.
 */
export const appointmentStatus = pgEnum("appointment_status", ["booked", "cancelled"]);

// ---------------------------------------------------------------------------
// salons — tenant root. NEMA RLS (registar tenantâ; upit ide isključivo po slug-u
// pre nego što se zna salon_id). Vidi 0001_rls.sql.
// ---------------------------------------------------------------------------
export const salons = pgTable(
  "salons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(), // /s/:salonSlug/...
    name: text("name").notNull(),
    timezone: text("timezone").notNull().default("Europe/Belgrade"),
    // Početak nedelje u nedeljnoj navigaciji — config po salonu (1=Pon … 7=Ned).
    weekStartDay: smallint("week_start_day").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("salons_slug_unique").on(t.slug),
    check("salons_week_start_range", sql`${t.weekStartDay} between 1 and 7`),
  ],
);

// ---------------------------------------------------------------------------
// salon_accounts — jedan login po salonu (Faza 0: salon_id UNIQUE).
// Login je pod /s/:slug/login, pa je tenant poznat i RLS može da važi.
// ---------------------------------------------------------------------------
export const salonAccounts = pgTable(
  "salon_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    salonId: uuid("salon_id")
      .notNull()
      .references(() => salons.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("salon_accounts_email_unique").on(t.email),
    uniqueIndex("salon_accounts_salon_unique").on(t.salonId), // jedan login / salon (Faza 0)
  ],
);

// ---------------------------------------------------------------------------
// working_hours — radno vreme na nivou salona (NE po radniku).
// Granice dnevnog rastera za dati weekday.
// ---------------------------------------------------------------------------
export const workingHours = pgTable(
  "working_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    salonId: uuid("salon_id")
      .notNull()
      .references(() => salons.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(), // 1=Pon … 7=Ned (ISO-8601)
    isClosed: boolean("is_closed").notNull().default(false),
    openTime: time("open_time"), // null kad je isClosed
    closeTime: time("close_time"),
  },
  (t) => [
    uniqueIndex("working_hours_salon_weekday_unique").on(t.salonId, t.weekday),
    check("working_hours_weekday_range", sql`${t.weekday} between 1 and 7`),
  ],
);

// ---------------------------------------------------------------------------
// clients — indeksi po (salon, ime) i (salon, telefon) za live pretragu iz tačke 1.
// ---------------------------------------------------------------------------
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    salonId: uuid("salon_id")
      .notNull()
      .references(() => salons.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(), // obavezan pri kreiranju novog klijenta
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("clients_salon_name_idx").on(t.salonId, t.fullName),
    index("clients_salon_phone_idx").on(t.salonId, t.phone),
  ],
);

// ---------------------------------------------------------------------------
// services — katalog usluga; default trajanje + cena se povlače u termin.
// ---------------------------------------------------------------------------
export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    salonId: uuid("salon_id")
      .notNull()
      .references(() => salons.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    defaultDurationMin: integer("default_duration_min").notNull(),
    defaultPrice: integer("default_price").notNull(), // minor jedinice (para)
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("services_salon_name_idx").on(t.salonId, t.name),
    check("services_duration_positive", sql`${t.defaultDurationMin} > 0`),
    check("services_price_nonneg", sql`${t.defaultPrice} >= 0`),
  ],
);

// ---------------------------------------------------------------------------
// staff — radnici su RESURSI (label/boja na kartici), ne korisnički nalozi.
// ---------------------------------------------------------------------------
export const staff = pgTable("staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  salonId: uuid("salon_id")
    .notNull()
    .references(() => salons.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  color: text("color").notNull().default("#94a3b8"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// appointments — NAMERNO bez EXCLUDE constraint-a. Preklapanje po radniku je
// dozvoljeno; soft-check se radi aplikaciono na submit (indeks niže ga pokriva).
// ---------------------------------------------------------------------------
export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    salonId: uuid("salon_id")
      .notNull()
      .references(() => salons.id, { onDelete: "cascade" }),
    // nullable = termin bez klijenta ("prolaznik") — kartica kaže "Bez klijenta".
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    // nullable = "bilo ko"; brisanje radnika oslobađa termin bez gubitka zapisa.
    staffId: uuid("staff_id").references(() => staff.id, { onDelete: "set null" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    price: integer("price").notNull(), // override, default iz services.default_price
    note: text("note"),
    status: appointmentStatus("status").notNull().default("booked"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // dnevni prikaz: range po danu
    index("appt_salon_start_idx").on(t.salonId, t.startsAt),
    // soft-check preklapanja za radnika
    index("appt_salon_staff_start_idx").on(t.salonId, t.staffId, t.startsAt),
    check("appt_time_order", sql`${t.endsAt} > ${t.startsAt}`),
    check("appt_price_nonneg", sql`${t.price} >= 0`),
  ],
);

// ---------------------------------------------------------------------------
// Tipovi za korišćenje u aplikaciji
// ---------------------------------------------------------------------------
export type Salon = typeof salons.$inferSelect;
export type SalonAccount = typeof salonAccounts.$inferSelect;
export type WorkingHour = typeof workingHours.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Staff = typeof staff.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
