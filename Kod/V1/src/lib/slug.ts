/**
 * Slug iz imena salona za path routing /s/:slug.
 * "Studio Šarm & Sjaj" -> "studio-sarm-sjaj". Srpska latinica se transliteruje
 * (đ -> dj), ostali dijakritici padaju kroz NFD normalizaciju.
 */

const SR_MAP: Record<string, string> = {
  š: "s",
  đ: "dj",
  č: "c",
  ć: "c",
  ž: "z",
};

export function slugify(name: string): string {
  const lowered = name.toLowerCase();
  let out = "";
  for (const ch of lowered) out += SR_MAP[ch] ?? ch;
  out = out
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // é -> e i sl.
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return out || "salon";
}

/** Kandidati za jedinstven slug: "mari", "mari-2", "mari-3", … */
export function slugCandidate(base: string, attempt: number): string {
  return attempt === 0 ? base : `${base}-${attempt + 1}`;
}
