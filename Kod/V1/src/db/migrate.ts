import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

// Migracije se puštaju kao superuser (MIGRATION_DATABASE_URL) da bi mogle da
// kreiraju rolu/policies i da zaobiđu FORCE RLS.
const url = process.env.MIGRATION_DATABASE_URL;
if (!url) throw new Error("MIGRATION_DATABASE_URL nije postavljen");

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "../../drizzle");

async function main() {
  const sql = postgres(url!, { max: 1 });
  try {
    await sql`create table if not exists _migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`;

    const applied = new Set(
      (await sql<{ name: string }[]>`select name from _migrations`).map((r) => r.name),
    );

    const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`= skip   ${file}`);
        continue;
      }
      const content = await readFile(join(migrationsDir, file), "utf8");
      // set_config zamenjuje literal lozinke u 0001_rls.sql pre izvršavanja.
      const prepared = content.replaceAll(
        "__APP_DB_PASSWORD__",
        process.env.APP_DB_PASSWORD ?? "change_me",
      );
      console.log(`> apply  ${file}`);
      await sql.unsafe(prepared); // multi-statement simple query = jedna implicitna transakcija
      await sql`insert into _migrations (name) values (${file})`;
    }
    console.log("Migracije završene.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
