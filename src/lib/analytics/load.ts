import {
  plausibleIsConfigured,
  siteStats,
  series,
  breakdown,
  currentVisitors,
  type BreakdownRow,
} from "@/lib/analytics/plausible";
import { isPeriod, resolvePeriod, type PeriodKey } from "@/lib/analytics/periods";

/** Alle dimensies achter de tabs; in één ronde opgehaald. */
const DIMENSIONS = [
  "visit:source", "visit:channel",
  "event:page", "visit:entry_page", "visit:exit_page",
  "visit:country", "visit:region_name", "visit:city_name",
  "visit:browser", "visit:os", "visit:device",
] as const;

/**
 * Alles wat de analytics-weergave nodig heeft voor één site en één periode.
 * Gedeeld door het klantportaal en het dashboard, zodat beide identiek zijn.
 */
export async function loadSiteAnalytics(siteId: string, periode: string | undefined) {
  const key: PeriodKey = isPeriod(periode) ? periode : "28d";
  const { range, previous, interval, label } = resolvePeriod(key);

  const configured = plausibleIsConfigured();
  if (!configured) {
    return { configured, key, label, interval, stats: null, punten: [], prevStats: null,
      lists: {} as Record<string, BreakdownRow[]>, nu: null };
  }

  const [stats, punten, prevStats, nu, ...lists] = await Promise.all([
    siteStats(siteId, range),
    series(siteId, range, interval),
    previous ? siteStats(siteId, previous) : Promise.resolve(null),
    currentVisitors(siteId),
    ...DIMENSIONS.map((d) => breakdown(siteId, range, d)),
  ]);

  const byDimension = Object.fromEntries(
    DIMENSIONS.map((d, i) => [d, (lists[i] ?? []) as BreakdownRow[]]),
  ) as Record<string, BreakdownRow[]>;

  // Landcodes naar vlag plus Nederlandse landnaam.
  const landnaam = new Intl.DisplayNames(["nl"], { type: "region" });
  byDimension["visit:country"] = (byDimension["visit:country"] ?? []).map((r) => {
    const code = r.label.toUpperCase();
    const geldig = /^[A-Z]{2}$/.test(code);
    const vlag = geldig
      ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
      : "";
    return { ...r, label: `${vlag} ${geldig ? landnaam.of(code) ?? code : r.label}`.trim() };
  });

  return { configured, key, label, interval, stats, punten, prevStats, lists: byDimension, nu };
}
