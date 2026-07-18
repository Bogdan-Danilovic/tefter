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
