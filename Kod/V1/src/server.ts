import "dotenv/config";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { copyFile, mkdir, access } from "node:fs/promises";
import Fastify from "fastify";
import formbody from "@fastify/formbody";
import fastifyStatic from "@fastify/static";
import fastifyView from "@fastify/view";
import nunjucks from "nunjucks";
import { resolveSalonHook } from "./web/tenant.js";
import { requireAuthHook, sessionHook } from "./web/auth.js";
import { dayRoutes } from "./web/routes/day.js";
import { appointmentRoutes } from "./web/routes/appointments.js";
import { clientRoutes } from "./web/routes/clients.js";
import { authRoutes, publicAuthRoutes } from "./web/routes/auth.js";
import { onboardingRoutes } from "./web/routes/onboarding.js";
import { marketingRoutes } from "./web/routes/marketing.js";
import { catalogRoutes } from "./web/routes/catalog.js";
import { settingsRoutes } from "./web/routes/settings.js";
import { statsRoutes } from "./web/routes/stats.js";
import { formatRsd } from "./lib/money.js";
import { countLabel } from "./lib/plural.js";

const here = dirname(fileURLToPath(import.meta.url));
const viewsDir = join(here, "web/views");
const publicDir = join(here, "../public");

/** Kopira htmx/alpine iz node_modules u public/vendor (offline, bez CDN-a). */
async function ensureVendor() {
  const vendorDir = join(publicDir, "vendor");
  await mkdir(vendorDir, { recursive: true });
  const pairs: [string, string][] = [
    [join(here, "../node_modules/htmx.org/dist/htmx.min.js"), join(vendorDir, "htmx.min.js")],
    [join(here, "../node_modules/alpinejs/dist/cdn.min.js"), join(vendorDir, "alpine.min.js")],
  ];
  for (const [src, dest] of pairs) {
    try {
      await access(dest);
    } catch {
      await copyFile(src, dest).catch((e) => console.warn(`vendor copy skipped: ${src}`, e.message));
    }
  }
}

async function build() {
  const app = Fastify({ logger: true });

  await app.register(formbody);
  await app.register(fastifyView, {
    engine: { nunjucks },
    root: viewsDir,
    options: {
      onConfigure: (env: nunjucks.Environment) => {
        env.addFilter("json", (v: unknown) => JSON.stringify(v));
        // Cene su svuda u minor jedinicama (para) — prikaz ide kroz jedan filter.
        env.addFilter("rsd", (v: unknown) => formatRsd(Number(v ?? 0)));
        // {{ 3 | plural("dolazak", "dolaska", "dolazaka") }} -> "3 dolaska"
        env.addFilter("plural", (v: unknown, one: string, few: string, many: string) =>
          countLabel(Number(v ?? 0), one, few, many),
        );
      },
    },
  });
  await app.register(fastifyStatic, { root: publicDir, prefix: "/" });

  // Sesija se čita za svaki request (potpisani cookie).
  app.addHook("onRequest", sessionHook);

  // Javne rute: globalna prijava + registracija salona.
  await app.register(publicAuthRoutes);

  // Tenant JAVNO pod /s/:slug — prijava/odjava konkretnog salona.
  await app.register(
    async (scope) => {
      scope.addHook("preHandler", resolveSalonHook);
      await scope.register(authRoutes);
    },
    { prefix: "/s/:slug" },
  );

  // Tenant ZAŠTIĆENO pod /s/:slug — sve ostalo traži sesiju tog salona.
  await app.register(
    async (scope) => {
      scope.addHook("preHandler", resolveSalonHook);
      scope.addHook("preHandler", requireAuthHook);
      await scope.register(dayRoutes);
      await scope.register(appointmentRoutes);
      await scope.register(clientRoutes);
      await scope.register(onboardingRoutes);
      await scope.register(catalogRoutes);
      await scope.register(settingsRoutes);
      await scope.register(statsRoutes);
    },
    { prefix: "/s/:slug" },
  );

  // Početna strana (marketing) + robots/sitemap.
  await app.register(marketingRoutes);

  return app;
}

async function main() {
  await ensureVendor();
  const app = await build();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
