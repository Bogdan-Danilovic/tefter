import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    // Studio/introspekcija idu kao superuser da RLS ne skriva podatke.
    url: process.env.MIGRATION_DATABASE_URL ?? "",
  },
});
