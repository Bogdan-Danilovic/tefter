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
import { dayRoutes } from "./web/routes/day.js";
import { appointmentRoutes } from "./web/routes/appointments.js";
import { clientRoutes } from "./web/routes/clients.js";

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
      },
    },
  });
  await app.register(fastifyStatic, { root: publicDir, prefix: "/" });

  // Sve tenant rute pod /s/:slug; preHandler razrešava salon.
  await app.register(
    async (scope) => {
      scope.addHook("preHandler", resolveSalonHook);
      await scope.register(dayRoutes);
      await scope.register(appointmentRoutes);
      await scope.register(clientRoutes);
    },
    { prefix: "/s/:slug" },
  );

  app.get("/", (_req, reply) => reply.redirect("/s/demo/day"));

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
