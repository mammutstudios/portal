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

/** Emmergrootte van een reeks. Uur alleen bij de 24-uursweergave. */
export type Interval = "time:hour" | "time:day" | "time:month";

/**
 * Elke vraag aan Plausible kost ruim honderd milliseconden, en een
 * analyticspagina stelt er vijftien. Bezoekcijfers hoeven niet op de seconde
 * vers te zijn, dus we hergebruiken een antwoord vijf minuten. Wie het wél
 * vers wil hebben geeft 0 mee; zie currentVisitors.
 */
const VERSHEID = 300;

/** Kengetallen over een periode. */
export async function siteStats(
  siteId: string,
  range: Range,
  imports = true,
): Promise<SiteStats | null> {
  if (!plausibleIsConfigured()) return null;

  const body = {
    site_id: siteId,
    metrics: ["visitors", "visits", "pageviews", "views_per_visit", "bounce_rate", "visit_duration"],
    date_range: range,
    // Zonder dit telt alleen wat deze instantie zelf heeft gemeten; alles wat
    // uit Plausible Cloud is geïmporteerd valt er dan buiten.
    include: { imports },
  };

  try {
    const res = await fetch(`${process.env.PLAUSIBLE_BASE_URL}/api/v2/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PLAUSIBLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      next: { revalidate: VERSHEID },
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

async function query<T = unknown>(
  body: Record<string, unknown>,
  revalidate = VERSHEID,
): Promise<T | null> {
  if (!plausibleIsConfigured()) return null;
  try {
    const res = await fetch(`${process.env.PLAUSIBLE_BASE_URL}/api/v2/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PLAUSIBLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      ...(revalidate > 0 ? { next: { revalidate } } : { cache: "no-store" as const }),
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
  interval: Interval = "time:day",
  /** Uurdata kan niet met dag-imports worden aangevuld; zie loadSiteAnalytics. */
  imports = true,
): Promise<DailyPoint[]> {
  const json = await query<{ results?: { dimensions: string[]; metrics: number[] }[] }>({
    site_id: siteId,
    metrics: ["visitors", "pageviews"],
    date_range: range,
    dimensions: [interval],
    include: { imports },
  });
  const gevonden = new Map<string, DailyPoint>();
  for (const r of json?.results ?? []) {
    const sleutel = normaliseer(r.dimensions[0], interval);
    gevonden.set(sleutel, {
      date: sleutel,
      visitors: r.metrics[0] ?? 0,
      pageviews: r.metrics[1] ?? 0,
    });
  }

  return interval === "time:hour"
    ? vulUren(gevonden, range)
    : vulGaten(gevonden, range, interval);
}

/**
 * Plausible levert uren als "2026-08-23 12:00:00" en dagen als "2026-08-23".
 * We maken er één vorm van, zodat sleutels en aanvullingen op elkaar passen.
 */
function normaliseer(waarde: string, interval: Interval): string {
  return interval === "time:hour" ? `${waarde.replace(" ", "T").slice(0, 13)}:00` : waarde;
}

/**
 * Plausible laat lege dagen wég uit het antwoord. Zonder aanvulling loopt de
 * lijn dwars over stille dagen heen en staan de labels op de as onregelmatig:
 * juli 2026 gaf 19 punten voor 31 dagen. Daarom vullen we de ontbrekende
 * emmers hier zelf aan met nul.
 *
 * De aanloop knippen we eraf, want bij "alles" begint het bereik in 2015 en
 * dat zou honderd lege maanden vóór de eerste meting opleveren.
 */
function vulGaten(
  gevonden: Map<string, DailyPoint>,
  [van, tot]: Range,
  interval: Interval,
): DailyPoint[] {
  const alles: DailyPoint[] = [];
  const eind = new Date(`${tot}T00:00:00Z`);

  for (
    let d = new Date(`${van}T00:00:00Z`);
    d <= eind;
    d = interval === "time:month"
      ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
      : new Date(d.getTime() + 86_400_000)
  ) {
    // Plausible sleutelt maanden op de eerste van de maand.
    const sleutel = d.toISOString().slice(0, 10);
    alles.push(gevonden.get(sleutel) ?? { date: sleutel, visitors: 0, pageviews: 0 });
  }

  const eerste = alles.findIndex((p) => p.visitors > 0 || p.pageviews > 0);
  return eerste <= 0 ? alles : alles.slice(eerste);
}

/**
 * Vierentwintig uuremmers, eindigend op het laatste uur waar iets in zit.
 *
 * Anders dan bij dagen kunnen we die emmers niet uit het opgevraagde bereik
 * afleiden: Plausible antwoordt in de tijdzone van de site en die kent de API
 * ons niet. Daarom rekenen we terug vanaf de laatste sleutel die we terugkregen
 * — dat is per definitie de juiste wandklok. Zonder enige meting valt er niets
 * af te leiden en vallen we terug op UTC; alles staat dan toch op nul.
 */
function vulUren(gevonden: Map<string, DailyPoint>, [, tot]: Range): DailyPoint[] {
  const sleutels = [...gevonden.keys()].sort();
  const laatste = sleutels.at(-1) ?? `${tot.replace(" ", "T").slice(0, 13)}:00`;

  const eind = new Date(`${laatste}:00Z`);
  const uren: DailyPoint[] = [];
  for (let i = 23; i >= 0; i--) {
    const sleutel = new Date(eind.getTime() - i * 3_600_000).toISOString().slice(0, 16);
    uren.push(gevonden.get(sleutel) ?? { date: sleutel, visitors: 0, pageviews: 0 });
  }
  return uren;
}

/** Top-lijstje op één dimensie, bijvoorbeeld visit:source of event:page. */
export async function breakdown(
  siteId: string,
  range: Range,
  dimension: string,
  limit = 6,
  imports = true,
): Promise<BreakdownRow[]> {
  const json = await query<{ results?: { dimensions: string[]; metrics: number[] }[] }>({
    site_id: siteId,
    metrics: ["visitors"],
    date_range: range,
    dimensions: [dimension],
    order_by: [["visitors", "desc"]],
    pagination: { limit },
    include: { imports },
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

  // Nul: dit getal staat op het scherm als "nu", dus cache heeft hier geen zin.
  const json = await query<{ results?: { metrics: number[] }[] }>(
    {
      site_id: siteId,
      metrics: ["visitors"],
      date_range: [stamp(van), stamp(nu)],
    },
    0,
  );
  return json?.results?.[0]?.metrics?.[0] ?? null;
}

export type SiteCard = {
  siteId: string;
  /** Bezoekers per uur, 24 punten, gaten aangevuld met nul. */
  points: number[];
  visitors: number;
  /** Verandering ten opzichte van de 24 uur daarvóór, in procenten. */
  change: number | null;
};

/**
 * Cijfers voor één kaart: laatste 24 uur.
 *
 * Bewust zónder geïmporteerde data. Die heeft alleen een datum en geen tijdstip,
 * dus in een venster dat door twee kalenderdagen snijdt zou een heel dagtotaal
 * meegeteld worden — dat gaf eerder 69 waar er 2 gemeten waren. Deze cijfers
 * lopen daardoor achter op het Plausible-dashboard zolang de historie nog uit
 * de import komt, maar ze zijn wel na te rekenen.
 */
export async function last24h(siteId: string): Promise<SiteCard | null> {
  if (!plausibleIsConfigured()) return null;

  const nu = new Date();
  const uur = (d: Date) => `${d.toISOString().slice(0, 13)}:00:00+00:00`;
  const min = (h: number) => new Date(nu.getTime() - h * 3_600_000);
  const sleutel = (v: string) => v.replace(" ", "T").slice(0, 13);

  const totaal = (van: string, tot: string) =>
    query<{ results?: { metrics: number[] }[] }>({
      site_id: siteId,
      metrics: ["visitors"],
      date_range: [van, tot],
      include: { imports: false },
    });

  const [reeks, huidig, vorige] = await Promise.all([
    query<{ results?: { dimensions: string[]; metrics: number[] }[] }>({
      site_id: siteId,
      metrics: ["visitors"],
      date_range: [uur(min(23)), uur(nu)],
      dimensions: ["time:hour"],
      include: { imports: false },
    }),
    totaal(uur(min(23)), uur(nu)),
    totaal(uur(min(47)), uur(min(24))),
  ]);

  if (!reeks) return null;

  const perUur = new Map<string, number>();
  for (const r of reeks.results ?? []) perUur.set(sleutel(r.dimensions[0]), r.metrics[0] ?? 0);

  const points: number[] = [];
  for (let i = 23; i >= 0; i--) points.push(perUur.get(sleutel(min(i).toISOString())) ?? 0);

  const visitors = huidig?.results?.[0]?.metrics?.[0] ?? points.reduce((a, b) => a + b, 0);
  const eerder = vorige?.results?.[0]?.metrics?.[0] ?? null;
  const change = eerder && eerder > 0 ? ((visitors - eerder) / eerder) * 100 : null;

  return { siteId, points, visitors, change };
}
