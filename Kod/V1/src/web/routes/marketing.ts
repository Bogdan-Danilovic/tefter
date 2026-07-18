import type { FastifyInstance, FastifyRequest } from "fastify";

/**
 * Javna početna strana (Faza 4). Sadržaj stoji ovde, a ne razbacan po template-u,
 * da bi se cenovnik/poruke menjali na jednom mestu.
 */

/** Cena Pro paketa — jedino mesto gde se menja (plan predviđa 1.500–2.000 RSD). */
const PRICING = {
  proMonthly: "1.490",
  note: "Mesečno, bez ugovora.",
};

const FREE_FEATURES = [
  "Dnevni kalendar i termini",
  "1 radnik",
  "Klijenti i beleške",
  "Instalacija na početni ekran (PWA)",
];

const PRO_FEATURES = [
  "Sve iz Free paketa",
  "Neograničeno radnika",
  "Online zakazivanje — javna strana salona",
  "Statistika prometa po radniku i usluzi",
  "Podsetnici klijentima",
  "Istorija i potrošnja po klijentu",
];

const FAQ = [
  {
    q: "Da li mi treba instalacija sa Google Play-a ili App Store-a?",
    a: "Ne. Otvoriš tefter.rs u pretraživaču telefona i dodaš ga na početni ekran — posle toga se ponaša kao svaka druga aplikacija, bez browser trake.",
  },
  {
    q: "Šta ako imam više radnika?",
    a: "Svaki radnik dobija svoju boju u kalendaru, pa odmah vidiš ko je kad zauzet. U Free paketu je jedan radnik, u Pro paketu neograničeno.",
  },
  {
    q: "Kako se plaća Pro?",
    a: "Pošaljemo ti predračun, platiš uplatnicom ili prenosom, i Pro se aktivira. Nema kartice ni automatske obnove.",
  },
  {
    q: "Gubim li podatke ako prestanem da plaćam?",
    a: "Ne. Nalog se vraća na Free paket — kalendar i klijenti ostaju, gase se samo Pro funkcije.",
  },
  {
    q: "Radi li bez interneta?",
    a: "Aplikacija se otvara i van mreže i prikazuje poslednje učitano, ali za upisivanje termina je potreban internet.",
  },
];

/**
 * Demo podaci za mini sajt salona (Faza 9). Ovo je izlog dizajna — kad se
 * uradi sinhronizacija, isti oblik podataka puni se iz baze (salon_sites,
 * services, staff, working_hours) i ruta postaje /s/:slug.
 */
const DEMO_SITE = {
  site: {
    name: "Studio Šarm",
    city: "Beograd",
    brandColor: "#c9a86b",
    tagline: "Frizerski salon · Beograd",
    about:
      "Malo nas je, i to je poenta. Znamo ti ime, znamo tvoju formulu boje i ne gledamo u sat dok si u stolici.",
    aboutLong:
      "Studio Šarm je salon u kom se ne čeka, ne žuri i ne nagađa. Svaka formula boje je zapisana, " +
      "svaki termin potvrđen porukom, a stolica te čeka tačno kad je rečeno. Radimo na kvalitet, ne na promet.",
    facts: [
      { n: "12+", label: "godina rada" },
      { n: "3.000+", label: "zadovoljnih klijenata" },
      { n: "4,9★", label: "Google ocena" },
    ],
    phone: "060 555 12 34",
    phoneRaw: "+381605551234",
    address: "Kralja Petra 12, Beograd",
    instagram: "studiosarm",
  },
  services: [
    { name: "Šišanje", durationMin: 45, price: "1.200 RSD" },
    { name: "Feniranje", durationMin: 30, price: "900 RSD" },
    { name: "Farbanje", durationMin: 90, price: "3.500 RSD" },
    { name: "Pramenovi", durationMin: 120, price: "6.000 RSD" },
    { name: "Balayage", durationMin: 150, price: "8.500 RSD" },
    { name: "Muško šišanje", durationMin: 30, price: "800 RSD" },
  ],
  staff: [
    { name: "Milica Petrović", initials: "MP", role: "Vlasnica · kolorista", color: "#d4a373" },
    { name: "Jovana Ilić", initials: "JI", role: "Stilista", color: "#a3b18a" },
    { name: "Ana Kostić", initials: "AK", role: "Frizerka", color: "#c9ada7" },
  ],
  gallery: [
    {
      label: "Balayage",
      art: "radial-gradient(70% 60% at 30% 30%, rgba(201,168,107,.75), transparent 70%), radial-gradient(60% 60% at 75% 75%, rgba(120,80,40,.6), transparent 70%), linear-gradient(150deg, #2b2117, #0e0c09)",
    },
    {
      label: "Pramenovi",
      art: "radial-gradient(65% 55% at 70% 25%, rgba(244,239,231,.5), transparent 65%), radial-gradient(55% 65% at 25% 75%, rgba(201,168,107,.55), transparent 70%), linear-gradient(200deg, #241f1a, #0e0c09)",
    },
    {
      label: "Svečane frizure",
      art: "radial-gradient(60% 60% at 25% 30%, rgba(151,71,255,.4), transparent 70%), radial-gradient(60% 55% at 80% 70%, rgba(201,168,107,.5), transparent 70%), linear-gradient(160deg, #1d1722, #0e0c09)",
    },
    {
      label: "Keratin",
      art: "radial-gradient(70% 55% at 65% 35%, rgba(163,177,138,.45), transparent 70%), radial-gradient(55% 60% at 20% 80%, rgba(201,168,107,.45), transparent 70%), linear-gradient(190deg, #1a2016, #0e0c09)",
    },
    {
      label: "Farbanje",
      art: "radial-gradient(65% 55% at 30% 70%, rgba(255,96,92,.4), transparent 70%), radial-gradient(60% 60% at 75% 25%, rgba(201,168,107,.55), transparent 70%), linear-gradient(170deg, #261613, #0e0c09)",
    },
    {
      label: "Muško šišanje",
      art: "radial-gradient(60% 60% at 70% 65%, rgba(105,148,198,.4), transparent 70%), radial-gradient(60% 50% at 25% 25%, rgba(244,239,231,.35), transparent 65%), linear-gradient(150deg, #141a22, #0e0c09)",
    },
  ],
};

/** Radno vreme za demo + koji je red "danas" (Europe/Belgrade). */
function demoHours() {
  const labels = ["Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota", "Nedelja"];
  const belgradeDay = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Belgrade",
    weekday: "short",
  }).format(new Date());
  const idx = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(belgradeDay);
  return labels.map((label, i) => ({
    label,
    time: i <= 4 ? "09:00 – 20:00" : i === 5 ? "09:00 – 15:00" : "Zatvoreno",
    open: i <= 5,
    today: i === idx,
  }));
}

function originOf(req: FastifyRequest): string {
  const proto = (req.headers["x-forwarded-proto"] as string) ?? req.protocol;
  return `${proto}://${req.headers.host ?? "tefter.rs"}`;
}

export async function marketingRoutes(app: FastifyInstance) {
  app.get("/", (req, reply) => {
    const origin = originOf(req);
    const title = "Tefter — rokovnik tvog salona, u telefonu";
    const description =
      "Zakazivanje, klijenti i dnevni pregled za frizerske i kozmetičke salone. " +
      "Radi kao aplikacija na telefonu, bez sveske i izgubljenih termina.";

    return reply.view("landing.njk", {
      session: req.session,
      pricing: PRICING,
      freeFeatures: FREE_FEATURES,
      proFeatures: PRO_FEATURES,
      faq: FAQ,
      year: new Date().getFullYear(),
      meta: { title, description, url: `${origin}/`, origin },
      jsonLd: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Tefter",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description,
        url: `${origin}/`,
        offers: [
          { "@type": "Offer", name: "Free", price: "0", priceCurrency: "RSD" },
          {
            "@type": "Offer",
            name: "Pro",
            price: PRICING.proMonthly.replace(".", ""),
            priceCurrency: "RSD",
          },
        ],
      }),
    });
  });

  // Demo mini sajta salona (Faza 9) — izlog dizajna sa mock podacima.
  app.get("/sajt-demo", (req, reply) => {
    const origin = originOf(req);
    const s = DEMO_SITE.site;
    const description = `${s.name}, ${s.city} — cenovnik, radno vreme i zakazivanje. ${s.about}`;
    return reply.view("site.njk", {
      ...DEMO_SITE,
      hours: demoHours(),
      year: new Date().getFullYear(),
      meta: { title: `${s.name} — zakazivanje i cenovnik`, description, url: `${origin}/sajt-demo`, origin },
      jsonLd: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "HairSalon",
        name: s.name,
        telephone: s.phoneRaw,
        address: { "@type": "PostalAddress", streetAddress: s.address, addressLocality: s.city },
        url: `${origin}/sajt-demo`,
        priceRange: "800–8.500 RSD",
      }),
    });
  });

  app.get("/robots.txt", (req, reply) => {
    reply.type("text/plain");
    // Aplikacija salona nema šta da traži u indeksu; javna booking strana (Faza 6) ima.
    return reply.send(
      ["User-agent: *", "Allow: /", "Disallow: /s/", "", `Sitemap: ${originOf(req)}/sitemap.xml`].join(
        "\n",
      ),
    );
  });

  app.get("/sitemap.xml", (req, reply) => {
    const origin = originOf(req);
    reply.type("application/xml");
    const urls = ["/", "/registracija", "/prijava"];
    return reply.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        urls.map((u) => `  <url><loc>${origin}${u}</loc></url>`).join("\n") +
        `\n</urlset>\n`,
    );
  });
}
