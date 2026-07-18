import { describe, expect, it } from "vitest";
import { packColumns } from "./layout.js";
import { formatRsd, parseRsdToMinor } from "./money.js";
import { slugCandidate, slugify } from "./slug.js";
import { openSession, parseCookieHeader, sealSession, type SessionPayload } from "./session.js";
import {
  addDays,
  hmToMinutes,
  isoDateInTz,
  isoWeekday,
  minutesInTz,
  minutesToHm,
  wallToInstant,
} from "./time.js";

describe("packColumns", () => {
  it("razdvaja preklapajuće termine u kolone", () => {
    // 10:00–11:30 (Ana boja) i 10:30–11:00 (Ana šišanje) se preklapaju.
    const placed = packColumns([
      { startMin: 600, endMin: 690 },
      { startMin: 630, endMin: 660 },
    ]);
    expect(placed).toHaveLength(2);
    expect(placed.every((p) => p.lanes === 2)).toBe(true);
    expect(new Set(placed.map((p) => p.lane))).toEqual(new Set([0, 1]));
  });

  it("nepreklapajući termini dele jednu kolonu (lanes=1)", () => {
    const placed = packColumns([
      { startMin: 600, endMin: 630 },
      { startMin: 630, endMin: 660 },
    ]);
    expect(placed.every((p) => p.lanes === 1 && p.lane === 0)).toBe(true);
  });

  it("tri međusobno preklapajuća -> 3 lane-a", () => {
    const placed = packColumns([
      { startMin: 600, endMin: 700 },
      { startMin: 610, endMin: 640 },
      { startMin: 620, endMin: 660 },
    ]);
    expect(placed.every((p) => p.lanes === 3)).toBe(true);
  });
});

describe("money", () => {
  it("format minor -> RSD", () => {
    expect(formatRsd(120000)).toBe("1.200 RSD");
    expect(formatRsd(180000)).toBe("1.800 RSD");
  });
  it("parse dinara -> minor", () => {
    expect(parseRsdToMinor("1.800")).toBe(180000);
    expect(parseRsdToMinor("1800")).toBe(180000);
    expect(parseRsdToMinor("")).toBeNull();
  });
});

describe("time", () => {
  it("isoWeekday: 2026-07-17 je petak (5)", () => {
    expect(isoWeekday("2026-07-17")).toBe(5);
  });
  it("addDays prelazi mesec", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("hmToMinutes / minutesToHm round-trip", () => {
    expect(hmToMinutes("09:15")).toBe(555);
    expect(minutesToHm(555)).toBe("09:15");
  });
  it("wallToInstant + minutesInTz vraćaju isto zidno vreme (Belgrade, leto)", () => {
    const tz = "Europe/Belgrade";
    const inst = wallToInstant(2026, 7, 17, 10, 30, tz);
    expect(minutesInTz(inst, tz)).toBe(10 * 60 + 30);
    expect(isoDateInTz(tz, inst)).toBe("2026-07-17");
  });
  it("wallToInstant radi i preko zimskog vremena (Belgrade, jan)", () => {
    const tz = "Europe/Belgrade";
    const inst = wallToInstant(2026, 1, 15, 8, 0, tz);
    expect(minutesInTz(inst, tz)).toBe(8 * 60);
    expect(isoDateInTz(tz, inst)).toBe("2026-01-15");
  });
});

describe("slug", () => {
  it("transliteruje srpsku latinicu", () => {
    expect(slugify("Studio Šarm & Sjaj")).toBe("studio-sarm-sjaj");
    expect(slugify("Frizerski salon Đurđevak")).toBe("frizerski-salon-djurdjevak");
    expect(slugify("Čupavko ćošak žžž")).toBe("cupavko-cosak-zzz");
  });
  it("čisti višak znakova i ivične crtice", () => {
    expect(slugify("  --Mari's   Salon!--  ")).toBe("mari-s-salon");
    expect(slugify("###")).toBe("salon");
  });
  it("slugCandidate numeriše od drugog pokušaja", () => {
    expect(slugCandidate("mari", 0)).toBe("mari");
    expect(slugCandidate("mari", 1)).toBe("mari-2");
    expect(slugCandidate("mari", 2)).toBe("mari-3");
  });
});

describe("session", () => {
  const secret = "test-secret";
  const payload: SessionPayload = {
    accountId: "a1",
    salonId: "s1",
    slug: "demo",
    exp: Date.now() + 60_000,
  };

  it("seal/open round-trip", () => {
    const token = sealSession(payload, secret);
    expect(openSession(token, secret)).toEqual(payload);
  });
  it("odbija pogrešan potpis i izmenjen payload", () => {
    const token = sealSession(payload, secret);
    expect(openSession(token, "drugi-secret")).toBeNull();
    const [body] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ ...payload, salonId: "tudji" })).toString("base64url")}.${token.split(".")[1]}`;
    expect(openSession(forged, secret)).toBeNull();
    expect(openSession(`${body}.AAAA`, secret)).toBeNull();
  });
  it("odbija istekao token (exp u payload-u, ne samo Max-Age)", () => {
    const token = sealSession({ ...payload, exp: 1000 }, secret);
    expect(openSession(token, secret, 2000)).toBeNull();
  });
  it("parseCookieHeader izvlači cookie", () => {
    expect(parseCookieHeader("a=1; tefter_sess=xyz.abc; b=2")).toEqual({
      a: "1",
      tefter_sess: "xyz.abc",
      b: "2",
    });
    expect(parseCookieHeader(undefined)).toEqual({});
  });
});
