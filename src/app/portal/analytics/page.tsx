import { Suspense } from "react";
import { logPaginabezoek } from "@/lib/activity";
import { getPortalContext } from "@/lib/portal";
import { loadSiteAnalytics } from "@/lib/analytics/load";
import SiteAnalytics from "@/components/analytics/SiteAnalytics";
import PageSkeleton from "@/components/PageSkeleton";

/**
 * Deze pagina stelt vijftien vragen aan Plausible en leest de gekozen periode
 * uit de URL. Beide zijn pas op verzoektijd bekend, dus alles zit achter één
 * <Suspense>: de schil eromheen staat er meteen, de cijfers stromen erin.
 */
export default function PortalAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton breed rijen={4} />}>
      <Cijfers searchParams={searchParams} />
    </Suspense>
  );
}

async function Cijfers({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const [{ periode }, { clients }] = await Promise.all([searchParams, getPortalContext()]);
  await logPaginabezoek("Analytics");

  // De gekoppelde site komt uit de context; dat scheelt een eigen query naar
  // clients die hier eerder bij elk bezoek stond.
  const siteId = clients.find((c) => c.plausible_site_id)?.plausible_site_id ?? null;
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
