import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import PortalProjectList, {
  PORTAL_PROJECT_KOLOMMEN,
  type PortalProject,
} from "@/components/PortalProjectList";
import {
  plausibleIsConfigured,
  monthlySiteStats,
  siteStats,
  series as siteSeries,
} from "@/lib/analytics/plausible";
import CurrentVisitors from "@/components/CurrentVisitors";
import VisitorsCard from "@/components/analytics/VisitorsCard";

/**
 * Het overzicht van de klant: waar we aan werken, en hoe de site het doet.
 *
 * De pagina zelf is niet async. Elk blok haalt zijn eigen gegevens op achter
 * een eigen <Suspense>, zodat de trage bron de snelle niet ophoudt: de
 * projecten uit Supabase staan los van wat Plausible doet, en andersom.
 */
export default function PortalOverzichtPage() {
  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <Suspense fallback={<KopSkelet />}>
        <Kop />
      </Suspense>

      <Suspense fallback={null}>
        <WebsiteBlok />
      </Suspense>

      <Suspense fallback={null}>
        <WebsiteKaarten />
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

const getal = (n: number) => new Intl.NumberFormat("nl-NL").format(n);

/** De lopende maand als YYYY-MM, in dezelfde vorm als MonthStats.month. */
function huidigeMaand(nu = new Date()): string {
  return new Date(Date.UTC(nu.getFullYear(), nu.getMonth(), 1)).toISOString().slice(0, 7);
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

async function WebsiteBlok() {
  const [siteId] = await gekoppeldeSites();
  if (!siteId) return null;

  const nu = new Date();
  const eerste = `${huidigeMaand(nu)}-01`;
  const laatste = new Date(nu.getFullYear(), nu.getMonth() + 1, 0).toISOString().slice(0, 10);
  // Vorige maand erbij voor de verandering, net als op de analyticspagina.
  const vorigeVan = new Date(nu.getFullYear(), nu.getMonth() - 1, 1).toISOString().slice(0, 10);
  const vorigeTot = new Date(nu.getFullYear(), nu.getMonth(), 0).toISOString().slice(0, 10);

  const [bezoekers, cijfers, cijfersVorig] = await Promise.all([
    siteSeries(siteId, [eerste, laatste]),
    siteStats(siteId, [eerste, laatste]),
    siteStats(siteId, [vorigeVan, vorigeTot]),
  ]);

  if (bezoekers.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
          Website
        </h2>
        {/* initial is null: die teller haalt zichzelf op zodra de pagina er
            staat. Als antwoord uit Plausible mocht hij nooit gecachet worden,
            en zo stond een vraag die per definitie vers moet zijn de hele
            pagina in de weg. */}
        <CurrentVisitors siteId={siteId} initial={null} />
      </div>
      <VisitorsCard stats={cijfers} prevStats={cijfersVorig} series={bezoekers} />
    </div>
  );
}

async function WebsiteKaarten() {
  const sites = await gekoppeldeSites();
  if (sites.length === 0) return null;

  const maand = huidigeMaand();
  const alle = await Promise.all(sites.map((id) => monthlySiteStats(id, maand)));
  const gevonden = alle.filter(Boolean) as NonNullable<(typeof alle)[number]>[];
  if (gevonden.length === 0) return null;

  const visitors = gevonden.reduce((s, x) => s + x.visitors, 0);
  const pageviews = gevonden.reduce((s, x) => s + x.pageviews, 0);

  // Het raster zit hier en niet in de pagina: zonder gekoppelde site valt het
  // hele blok weg, inclusief de marge eronder.
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
      <Kaart label="Bezoekers" value={getal(visitors)} />
      <Kaart label="Paginaweergaven" value={getal(pageviews)} />
    </div>
  );
}

/**
 * Alleen wat er nu écht loopt.
 *
 * Bewust zonder upcoming: het overzicht gaat over vandaag, en wat eraan komt
 * staat op de projectenpagina. Dezelfde lijst als daar, uit dezelfde component,
 * zodat de twee niet uit elkaar lopen.
 */
async function LopendeProjecten() {
  const { clientIds } = await getPortalContext();
  if (clientIds.length === 0) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(PORTAL_PROJECT_KOLOMMEN)
    .in("client_id", clientIds)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return <PortalProjectList projecten={(data ?? []) as unknown as PortalProject[]} />;
}

function Kaart({ label, value }: { label: string; value: string }) {
  return (
    <div className="squircle p-6" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
      <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="text-3xl font-bold" style={{ color: "var(--text-heading)" }}>
        {value}
      </div>
    </div>
  );
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
