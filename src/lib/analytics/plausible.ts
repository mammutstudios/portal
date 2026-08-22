/**
 * Plausible Stats API (v2).
 *
 * Eén endpoint: POST /api/v2/query met een query-object. Werkt tegen zowel
 * Plausible Cloud als een eigen Community Edition-instantie; het verschil is
 * alleen PLAUSIBLE_BASE_URL.
 *
 * Zie developer-documentatie: plausible.io/docs/stats-api
 */
export type SiteStats = {
  visitors: number;
  visits: number;
  pageviews: number;
  viewsPerVisit: number | null;
  bounceRate: number | null;
  visitDuration: number | null;
};

export function plausibleIsConfigured() {
  return Boolean(process.env.PLAUSIBLE_API_KEY && process.env.PLAUSIBLE_BASE_URL);
}

/** Een datumbereik als [van, tot], beide als YYYY-MM-DD. */
export type Range = [string, string];

/** Kengetallen over een periode. */
export async function siteStats(siteId: string, range: Range): Promise<SiteStats | null> {
  if (!plausibleIsConfigured()) return null;

  const body = {
    site_id: siteId,
    metrics: ["visitors", "visits", "pageviews", "views_per_visit", "bounce_rate", "visit_duration"],
    date_range: range,
    // Zonder dit telt alleen wat deze instantie zelf heeft gemeten; alles wat
    // uit Plausible Cloud is geïmporteerd valt er dan buiten.
    include: { imports: true },
  };

  try {
    const res = await fetch(`${process.env.PLAUSIBLE_BASE_URL}/api/v2/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PLAUSIBLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`[plausible] ${res.status} voor ${siteId}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }

    // Zonder dimensions is er precies één resultaatrij, in dezelfde volgorde
    // als de opgegeven metrics.
    const json = (await res.json()) as { results?: { metrics: (number | null)[] }[] };
    const values = json.results?.[0]?.metrics;
    if (!values) return null;

    return {
      visitors: values[0] ?? 0,
      visits: values[1] ?? 0,
      pageviews: values[2] ?? 0,
      viewsPerVisit: values[3] ?? null,
      bounceRate: values[4] ?? null,
      visitDuration: values[5] ?? null,
    };
  } catch (e) {
    // Analytics mag een pagina nooit stukmaken; die is niet de kern.
    console.error("[plausible] ophalen mislukt:", e);
    return null;
  }
}

/** Eén rij per dag, voor de grafiek. */
export type DailyPoint = { date: string; visitors: number; pageviews: number };

/** Eén regel in een top-lijstje. */
export type BreakdownRow = { label: string; visitors: number };

async function query<T = unknown>(body: Record<string, unknown>): Promise<T | null> {
  if (!plausibleIsConfigured()) return null;
  try {
    const res = await fetch(`${process.env.PLAUSIBLE_BASE_URL}/api/v2/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PLAUSIBLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[plausible] ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error("[plausible] verzoek mislukt:", e);
    return null;
  }
}

/** Reeks voor de grafiek; per dag of per maand, afhankelijk van de lengte. */
export async function series(
  siteId: string,
  range: Range,
  interval: "time:day" | "time:month" = "time:day",
): Promise<DailyPoint[]> {
  const json = await query<{ results?: { dimensions: string[]; metrics: number[] }[] }>({
    site_id: siteId,
    metrics: ["visitors", "pageviews"],
    date_range: range,
    dimensions: [interval],
    include: { imports: true },
  });
  return (json?.results ?? []).map((r) => ({
    date: r.dimensions[0],
    visitors: r.metrics[0] ?? 0,
    pageviews: r.metrics[1] ?? 0,
  }));
}

/** Top-lijstje op één dimensie, bijvoorbeeld visit:source of event:page. */
export async function breakdown(
  siteId: string,
  range: Range,
  dimension: string,
  limit = 6,
): Promise<BreakdownRow[]> {
  const json = await query<{ results?: { dimensions: string[]; metrics: number[] }[] }>({
    site_id: siteId,
    metrics: ["visitors"],
    date_range: range,
    dimensions: [dimension],
    order_by: [["visitors", "desc"]],
    pagination: { limit },
    include: { imports: true },
  });
  return (json?.results ?? []).map((r) => ({
    label: r.dimensions[0] || "Direct / geen",
    visitors: r.metrics[0] ?? 0,
  }));
}

/** Blijft bestaan voor het maandoverzicht, dat in kalendermaanden denkt. */
export async function monthlySiteStats(siteId: string, month: string) {
  const [year, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(year, m - 1, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10);
  return siteStats(siteId, [from, to]);
}

/**
 * Bezoekers van de laatste vijf minuten — wat Plausible "current visitors" noemt.
 * Realtime is bij hen simpelweg een datum-tijdbereik, geen apart eindpunt.
 */
export async function currentVisitors(siteId: string): Promise<number | null> {
  const nu = new Date();
  const van = new Date(nu.getTime() - 5 * 60_000);
  const stamp = (d: Date) => d.toISOString().replace(/\.\d+Z$/, "+00:00");

  const json = await query<{ results?: { metrics: number[] }[] }>({
    site_id: siteId,
    metrics: ["visitors"],
    date_range: [stamp(van), stamp(nu)],
  });
  return json?.results?.[0]?.metrics?.[0] ?? null;
}
