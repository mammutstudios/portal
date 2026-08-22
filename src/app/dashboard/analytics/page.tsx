import { createClient } from "@/lib/supabase/server";
import { plausibleIsConfigured, last24h } from "@/lib/analytics/plausible";
import AnalyticsOverzichtClient from "./AnalyticsOverzichtClient";

export default async function DashboardAnalyticsPage() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, plausible_site_id")
    .not("plausible_site_id", "is", null)
    .order("name");

  const gekoppeld = (clients ?? []) as {
    id: string; name: string; plausible_site_id: string;
  }[];

  const configured = plausibleIsConfigured();
  const cards = configured
    ? await Promise.all(gekoppeld.map((c) => last24h(c.plausible_site_id)))
    : [];

  // Drukste site bovenaan. Sites zonder cijfers zakken vanzelf naar beneden;
  // bij gelijke stand op naam, anders springt de volgorde bij elke verversing.
  const sites = gekoppeld
    .map((c, i) => ({
      id: c.id,
      name: c.name,
      siteId: c.plausible_site_id,
      card: cards[i] ?? null,
    }))
    .sort((a, b) => {
      const verschil = (b.card?.visitors ?? 0) - (a.card?.visitors ?? 0);
      return verschil !== 0 ? verschil : a.siteId.localeCompare(b.siteId, "nl");
    });

  return (
    <AnalyticsOverzichtClient
      configured={configured}
      sites={sites}
      faviconBase={process.env.PLAUSIBLE_BASE_URL ?? null}
    />
  );
}
