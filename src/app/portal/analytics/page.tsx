import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import {
  plausibleIsConfigured,
  siteStats,
  series,
  breakdown,
  currentVisitors,
  type BreakdownRow,
} from "@/lib/analytics/plausible";
import { isPeriod, resolvePeriod } from "@/lib/analytics/periods";
import AnalyticsPageClient from "./AnalyticsPageClient";

export default async function PortalAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { periode } = await searchParams;
  const key = isPeriod(periode) ? periode : "28d";
  const { range, previous, interval, label } = resolvePeriod(key);

  const { clientIds } = await getPortalContext();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("clients")
    .select("name, plausible_site_id")
    .in("id", clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"])
    .not("plausible_site_id", "is", null);

  const sites = (rows ?? []) as { name: string; plausible_site_id: string }[];
  const configured = plausibleIsConfigured();
  const site = sites[0] ?? null;

  // Alles in één ronde ophalen: de tabs wisselen dan zonder nieuw verzoek.
  const DIMENSIONS = [
    "visit:source", "visit:channel",
    "event:page", "visit:entry_page", "visit:exit_page",
    "visit:country", "visit:region_name", "visit:city_name",
    "visit:browser", "visit:os", "visit:device",
  ] as const;

  const [stats, punten, prevStats, ...lists] =
    site && configured
      ? await Promise.all([
          siteStats(site.plausible_site_id, range),
          series(site.plausible_site_id, range, interval),
          previous ? siteStats(site.plausible_site_id, previous) : Promise.resolve(null),
          ...DIMENSIONS.map((d) => breakdown(site.plausible_site_id, range, d)),
        ])
      : [null, [], null, ...DIMENSIONS.map(() => [])];

  const byDimension = Object.fromEntries(
    DIMENSIONS.map((d, i) => [d, (lists[i] ?? []) as BreakdownRow[]]),
  ) as Record<(typeof DIMENSIONS)[number], BreakdownRow[]>;

  // Landcodes omzetten naar vlag plus Nederlandse landnaam. Serverzijdig, zodat
  // de browser geen lijst met landnamen hoeft mee te krijgen.
  const landnaam = new Intl.DisplayNames(["nl"], { type: "region" });
  byDimension["visit:country"] = byDimension["visit:country"].map((r) => {
    const code = r.label.toUpperCase();
    const geldig = /^[A-Z]{2}$/.test(code);
    const vlag = geldig
      ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
      : "";
    return { ...r, label: `${vlag} ${geldig ? landnaam.of(code) ?? code : r.label}`.trim() };
  });

  const nu = site && configured ? await currentVisitors(site.plausible_site_id) : null;

  return (
    <AnalyticsPageClient
      configured={configured}
      siteName={site?.plausible_site_id ?? null}
      periode={key}
      periodeLabel={label}
      interval={interval}
      stats={stats}
      series={punten}
      lists={byDimension}
      prevStats={prevStats}
      currentVisitors={nu}
      faviconBase={process.env.PLAUSIBLE_BASE_URL ?? null}
    />
  );
}
