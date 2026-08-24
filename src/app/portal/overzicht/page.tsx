import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import { monthStats } from "@/lib/analytics";
import {
  plausibleIsConfigured,
  monthlySiteStats,
  siteStats,
  series as siteSeries,
  currentVisitors,
} from "@/lib/analytics/plausible";
import MaandoverzichtClient from "./MaandoverzichtClient";

/**
 * Ochtend, middag of avond — nadrukkelijk in Nederlandse tijd en niet in die
 * van de server. Zou de klok van de bezoeker leidend zijn, dan wijkt de eerste
 * render af van wat de server stuurde en klaagt React over de hydratie.
 */
function groet(nu = new Date()): string {
  const uur = Number(
    new Intl.DateTimeFormat("nl-NL", {
      timeZone: "Europe/Amsterdam",
      hour: "numeric",
      hour12: false,
    }).format(nu),
  );
  if (uur < 6) return "Goedenacht";
  if (uur < 12) return "Goedemorgen";
  if (uur < 18) return "Goedemiddag";
  return "Goedenavond";
}

/** Alleen de voornaam; "Daniel Stoopendaal" wordt "Daniel". */
function voornaam(volledig: string | null): string | null {
  return volledig?.trim().split(/\s+/)[0] || null;
}

export default async function PortalOverzichtPage() {
  const { clientIds, fullName } = await getPortalContext();
  const supabase = await createClient();

  const now = new Date();
  // Deze maand plus de vijf ervoor, nieuwste eerst.
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const stats = await Promise.all(
    months.map((m) => monthStats(supabase, m.year, m.month, clientIds)),
  );

  // Websitecijfers van de gekoppelde sites, alleen voor de lopende maand.
  let site = null;
  if (plausibleIsConfigured() && clientIds.length > 0) {
    const { data: sites } = await supabase
      .from("clients")
      .select("plausible_site_id")
      .in("id", clientIds)
      .not("plausible_site_id", "is", null);

    const ids = (sites ?? []).map((c) => c.plausible_site_id as string);
    if (ids.length > 0) {
      const all = await Promise.all(ids.map((id) => monthlySiteStats(id, stats[0].month)));
      const found = all.filter(Boolean) as NonNullable<(typeof all)[number]>[];
      if (found.length > 0) {
        site = {
          visitors: found.reduce((s, x) => s + x.visitors, 0),
          pageviews: found.reduce((s, x) => s + x.pageviews, 0),
        };
      }
    }
  }

  // Bezoekersgrafiek van de lopende maand, als er een site gekoppeld is.
  let bezoekersReeks: { date: string; visitors: number; pageviews: number }[] = [];
  let nu: number | null = null;
  let siteIdVoorTeller: string | null = null;
  let siteCijfers: Awaited<ReturnType<typeof siteStats>> = null;
  let siteCijfersVorig: Awaited<ReturnType<typeof siteStats>> = null;
  if (plausibleIsConfigured() && clientIds.length > 0) {
    const { data: gekoppeld } = await supabase
      .from("clients")
      .select("plausible_site_id")
      .in("id", clientIds)
      .not("plausible_site_id", "is", null)
      .limit(1)
      .maybeSingle();

    siteIdVoorTeller = (gekoppeld?.plausible_site_id as string) ?? null;
    const siteId = siteIdVoorTeller;
    if (siteId) {
      const eerste = `${stats[0].month}-01`;
      const laatste = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
      // Vorige maand erbij voor de verandering, net als op de analyticspagina.
      const vorigeVan = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const vorigeTot = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

      [bezoekersReeks, nu, siteCijfers, siteCijfersVorig] = await Promise.all([
        siteSeries(siteId, [eerste, laatste]),
        currentVisitors(siteId),
        siteStats(siteId, [eerste, laatste]),
        siteStats(siteId, [vorigeVan, vorigeTot]),
      ]);
    }
  }

  return (
    <MaandoverzichtClient
      groet={groet()}
      voornaam={voornaam(fullName)}
      stats={stats}
      site={site}
      bezoekers={bezoekersReeks}
      currentVisitors={nu}
      siteId={siteIdVoorTeller}
      siteStats={siteCijfers}
      siteStatsPrev={siteCijfersVorig}
    />
  );
}
