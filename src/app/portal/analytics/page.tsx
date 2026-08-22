import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import { loadSiteAnalytics } from "@/lib/analytics/load";
import SiteAnalytics from "@/components/analytics/SiteAnalytics";

export default async function PortalAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { periode } = await searchParams;
  const { clientIds } = await getPortalContext();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("clients")
    .select("plausible_site_id")
    .in("id", clientIds.length ? clientIds : ["00000000-0000-0000-0000-000000000000"])
    .not("plausible_site_id", "is", null)
    .limit(1);

  const siteId = (rows?.[0]?.plausible_site_id as string) ?? null;
  const data = siteId ? await loadSiteAnalytics(siteId, periode) : null;

  return (
    <SiteAnalytics
      configured={data?.configured ?? false}
      siteName={siteId}
      periode={data?.key ?? "28d"}
      periodeLabel={data?.label ?? ""}
      interval={data?.interval ?? "time:day"}
      stats={data?.stats ?? null}
      series={data?.punten ?? []}
      lists={data?.lists ?? {}}
      prevStats={data?.prevStats ?? null}
      currentVisitors={data?.nu ?? null}
      faviconBase={process.env.PLAUSIBLE_BASE_URL ?? null}
    />
  );
}
