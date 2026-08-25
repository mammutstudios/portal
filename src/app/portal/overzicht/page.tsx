import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import PortalProjectList, {
  PORTAL_PROJECT_KOLOMMEN,
  type PortalProject,
} from "@/components/PortalProjectList";
import { opStatus } from "@/lib/types";
import {
  plausibleIsConfigured,
  siteStats,
  series as siteSeries,
} from "@/lib/analytics/plausible";
import { resolvePeriod, isPeriod } from "@/lib/analytics/periods";
import CurrentVisitors from "@/components/CurrentVisitors";
import VisitorsCard from "@/components/analytics/VisitorsCard";
import PeriodPicker from "@/components/analytics/PeriodPicker";

/**
 * Het overzicht van de klant: waar we aan werken, en hoe de site het doet.
 *
 * De pagina zelf is niet async. Elk blok haalt zijn eigen gegevens op achter
 * een eigen <Suspense>, zodat de trage bron de snelle niet ophoudt: de
 * projecten uit Supabase staan los van wat Plausible doet, en andersom.
 */
export default function PortalOverzichtPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <Suspense fallback={<KopSkelet />}>
        <Kop />
      </Suspense>

      <Suspense fallback={null}>
        <WebsiteBlok searchParams={searchParams} />
      </Suspense>

      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
            Projecten
          </h2>
          <Link href="/portal/projecten" className="text-sm hover:underline" style={{ color: "var(--text-muted)" }}>
            Alle projecten →
          </Link>
        </div>
        <Suspense fallback={<TabelSkelet />}>
          <LopendeProjecten />
        </Suspense>
      </section>

    </div>
  );
}

/**
 * Ochtend, middag of avond, nadrukkelijk in Nederlandse tijd en niet in die
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

/**
 * De gekoppelde sites van deze bezoeker.
 *
 * Komen uit getPortalContext en kosten dus geen eigen query meer; het overzicht
 * vroeg ze eerder twee keer apart op bij clients.
 */
async function gekoppeldeSites(): Promise<string[]> {
  if (!plausibleIsConfigured()) return [];
  const { clients } = await getPortalContext();
  return clients.map((c) => c.plausible_site_id).filter(Boolean) as string[];
}

async function Kop() {
  const { fullName } = await getPortalContext();
  const heeftSite = (await gekoppeldeSites()).length > 0;
  const naam = voornaam(fullName);

  return (
    <>
      {/* Zelfde ritme als het dashboard: mb-1 onder de kop, mb-8 onder de regel. */}
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        {groet()}{naam ? `, ${naam}` : ""}
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        {/* Alleen noemen wat er ook echt staat: zonder gekoppelde site is er
            geen websitecijfer om naar te verwijzen. */}
        Waar we op dit moment aan werken{heeftSite ? ", en hoe je website het doet" : ""}.
      </p>
    </>
  );
}

/**
 * De websitecijfers, in dezelfde opmaak als het interne overzicht: de naam van
 * de site met favicon, de teller van nu, en een periodekiezer. Standaard de
 * laatste 7 dagen.
 */
async function WebsiteBlok({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const [{ periode: gekozen }, sites] = await Promise.all([searchParams, gekoppeldeSites()]);
  const siteId = sites[0];
  if (!siteId) return null;

  const periodeKey = isPeriod(gekozen) ? gekozen : "7d";
  const periode = resolvePeriod(periodeKey);
  // Zie loadSiteAnalytics: dag-imports passen niet in uuremmers.
  const metImports = periode.interval !== "time:hour";

  const [bezoekers, cijfers, cijfersVorig] = await Promise.all([
    siteSeries(siteId, periode.range, periode.interval, metImports),
    siteStats(siteId, periode.range, metImports),
    periode.previous ? siteStats(siteId, periode.previous, metImports) : Promise.resolve(null),
  ]);

  if (bezoekers.length === 0) return null;

  return (
    <div className="mb-10">
      {/* Zelfde indeling als het interne overzicht: op mobiel zakt alleen de
          teller onder de naam en blijft de kiezer ernaast staan. */}
      <div className="flex flex-wrap items-center gap-x-4 mb-3">
        <Link
          href="/portal/analytics"
          className="order-1 flex items-center gap-2 text-sm font-semibold hover:underline"
          style={{ color: "var(--text-heading)" }}
        >
          {process.env.PLAUSIBLE_BASE_URL && (
            // Plausible serveert favicons zelf, net als bij de bronnenlijst.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${process.env.PLAUSIBLE_BASE_URL}/favicon/sources/${encodeURIComponent(siteId)}`}
              alt=""
              width={16}
              height={16}
              className="flex-shrink-0 rounded-sm"
            />
          )}
          {siteId}
        </Link>
        {/* initial is null: die teller haalt zichzelf op zodra de pagina er
            staat. Als antwoord uit Plausible mocht hij nooit gecachet worden,
            en zo stond een vraag die per definitie vers moet zijn de hele
            pagina in de weg. */}
        <div className="order-3 w-full mt-1.5 md:order-2 md:ml-auto md:w-auto md:mt-0">
          <CurrentVisitors siteId={siteId} initial={null} />
        </div>
        {/* Op mobiel geen periodekiezer: daar is de ruimte te krap en
            staat de standaardperiode al goed. */}
        <div className="hidden md:block order-3">
          <PeriodPicker current={periodeKey} />
        </div>
      </div>
      <VisitorsCard
        stats={cijfers}
        prevStats={cijfersVorig}
        series={bezoekers}
        interval={periode.interval}
        periodeSlot={<PeriodPicker current={periodeKey} blok />}
      />
    </div>
  );
}

/**
 * Wat er loopt en wat eraan komt, actief bovenaan.
 *
 * Dezelfde lijst als op de projectenpagina, uit dezelfde component en met
 * dezelfde volgorde, zodat de twee niet uit elkaar lopen. Wat stilligt of af
 * is hoort hier niet: dat staat op de projectenpagina.
 */
async function LopendeProjecten() {
  const { clientIds } = await getPortalContext();
  if (clientIds.length === 0) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(PORTAL_PROJECT_KOLOMMEN)
    .in("client_id", clientIds)
    .in("status", ["active", "upcoming"])
    .order("created_at", { ascending: false });

  return <PortalProjectList projecten={opStatus((data ?? []) as unknown as PortalProject[])} />;
}

function KopSkelet() {
  return (
    <div className="animate-pulse" aria-hidden>
      <div className="h-8 rounded mb-3" style={{ width: 260, background: "var(--border)" }} />
      <div className="h-3.5 rounded mb-8" style={{ width: 420, maxWidth: "100%", background: "var(--border)" }} />
    </div>
  );
}

function TabelSkelet() {
  return (
    <div
      className="squircle overflow-hidden animate-pulse"
      aria-hidden
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-4 py-3.5 gap-4"
          style={{ borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}
        >
          <div className="h-3.5 rounded" style={{ width: 140, background: "var(--border)" }} />
          <div className="h-3.5 rounded" style={{ width: 40, background: "var(--border)" }} />
        </div>
      ))}
    </div>
  );
}
