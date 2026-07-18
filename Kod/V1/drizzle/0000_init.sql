-- 0000_init: enum, tabele, indeksi, CHECK-ovi. Bez RLS (to je 0001).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "appointment_status" AS ENUM ('booked', 'cancelled');

-- salons -------------------------------------------------------------------
CREATE TABLE "salons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "timezone" text NOT NULL DEFAULT 'Europe/Belgrade',
  "week_start_day" smallint NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "salons_week_start_range" CHECK ("week_start_day" BETWEEN 1 AND 7)
);
CREATE UNIQUE INDEX "salons_slug_unique" ON "salons" ("slug");

-- salon_accounts -----------------------------------------------------------
CREATE TABLE "salon_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "salon_id" uuid NOT NULL REFERENCES "salons" ("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "salon_accounts_email_unique" ON "salon_accounts" ("email");
CREATE UNIQUE INDEX "salon_accounts_salon_unique" ON "salon_accounts" ("salon_id");

-- working_hours ------------------------------------------------------------
CREATE TABLE "working_hours" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "salon_id" uuid NOT NULL REFERENCES "salons" ("id") ON DELETE CASCADE,
  "weekday" smallint NOT NULL,
  "is_closed" boolean NOT NULL DEFAULT false,
  "open_time" time,
  "close_time" time,
  CONSTRAINT "working_hours_weekday_range" CHECK ("weekday" BETWEEN 1 AND 7)
);
CREATE UNIQUE INDEX "working_hours_salon_weekday_unique" ON "working_hours" ("salon_id", "weekday");

-- clients ------------------------------------------------------------------
CREATE TABLE "clients" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "salon_id" uuid NOT NULL REFERENCES "salons" ("id") ON DELETE CASCADE,
  "full_name" text NOT NULL,
  "phone" text NOT NULL,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "clients_salon_name_idx" ON "clients" ("salon_id", "full_name");
CREATE INDEX "clients_salon_phone_idx" ON "clients" ("salon_id", "phone");

-- services -----------------------------------------------------------------
CREATE TABLE "services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "salon_id" uuid NOT NULL REFERENCES "salons" ("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "default_duration_min" integer NOT NULL,
  "default_price" integer NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "services_duration_positive" CHECK ("default_duration_min" > 0),
  CONSTRAINT "services_price_nonneg" CHECK ("default_price" >= 0)
);
CREATE INDEX "services_salon_name_idx" ON "services" ("salon_id", "name");

-- staff --------------------------------------------------------------------
CREATE TABLE "staff" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "salon_id" uuid NOT NULL REFERENCES "salons" ("id") ON DELETE CASCADE,
  "full_name" text NOT NULL,
  "color" text NOT NULL DEFAULT '#94a3b8',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- appointments (BEZ EXCLUDE constraint-a; preklapanje = aplikacioni soft-check)
CREATE TABLE "appointments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "salon_id" uuid NOT NULL REFERENCES "salons" ("id") ON DELETE CASCADE,
  "client_id" uuid NOT NULL REFERENCES "clients" ("id") ON DELETE RESTRICT,
  "service_id" uuid NOT NULL REFERENCES "services" ("id") ON DELETE RESTRICT,
  "staff_id" uuid REFERENCES "staff" ("id") ON DELETE SET NULL,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz NOT NULL,
  "price" integer NOT NULL,
  "note" text,
  "status" "appointment_status" NOT NULL DEFAULT 'booked',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "appt_time_order" CHECK ("ends_at" > "starts_at"),
  CONSTRAINT "appt_price_nonneg" CHECK ("price" >= 0)
);
CREATE INDEX "appt_salon_start_idx" ON "appointments" ("salon_id", "starts_at");
CREATE INDEX "appt_salon_staff_start_idx" ON "appointments" ("salon_id", "staff_id", "starts_at");
