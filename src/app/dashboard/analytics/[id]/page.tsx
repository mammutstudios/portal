import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { loadSiteAnalytics } from "@/lib/analytics/load";
import SiteAnalytics from "@/components/analytics/SiteAnalytics";

export default async function DashboardSiteAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ periode?: string }>;
}) {
  const { id } = await params;
  const { periode } = await searchParams;

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, plausible_site_id")
    .eq("id", id)
    .maybeSingle();

  if (!client?.plausible_site_id) notFound();

  const siteId = client.plausible_site_id as string;
  const data = await loadSiteAnalytics(siteId, periode);

  return (
    <div>
      <nav className="flex items-center gap-1.5 text-sm px-4 pt-6 md:px-10 md:pt-10 max-w-5xl mx-auto"
        style={{ color: "var(--text-muted)" }}>
        <Link href="/dashboard/analytics" className="hover:underline">Analytics</Link>
        <CaretRight size={13} weight="bold" />
        <span style={{ color: "var(--text-heading)" }}>{client.name}</span>
      </nav>

      <SiteAnalytics
        configured={data.configured}
        siteName={siteId}
        periode={data.key}
        periodeLabel={data.label}
        interval={data.interval}
        stats={data.stats}
        series={data.punten}
        lists={data.lists}
        prevStats={data.prevStats}
        currentVisitors={data.nu}
        faviconBase={process.env.PLAUSIBLE_BASE_URL ?? null}
      />
    </div>
  );
}
