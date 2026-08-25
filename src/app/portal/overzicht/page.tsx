import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import { ProjectStatusBadge } from "@/components/StatusBadge";
import ProjectProgress from "@/components/ProjectProgress";
import type { Project } from "@/lib/types";
import { maandCijfers } from "@/lib/analytics";
import {
  plausibleIsConfigured,
  monthlySiteStats,
  siteStats,
  series as siteSeries,
} from "@/lib/analytics/plausible";
import CurrentVisitors from "@/components/CurrentVisitors";
import VisitorsCard from "@/components/analytics/VisitorsCard";

/**
 * Het maandoverzicht.
 *
 * De pagina zelf is niet async. Elk blok haalt zijn eigen cijfers op achter een
 * eigen <Suspense>, zodat de trage bron de snelle niet ophoudt: de cijfers uit
 * Supabase staan er los van wat Plausible doet, en andersom. Eerder wachtte het
 * hele scherm op de traagste van de twee.
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

      {/* Beide blokken hieronder zijn directe kinderen van hetzelfde raster:
          <Suspense> zet zelf geen element in de DOM, dus de kaarten lijnen uit
          alsof ze uit één component komen. */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        <Suspense fallback={<KaartSkelet aantal={3} />}>
          <MaandKaarten />
        </Suspense>
        <Suspense fallback={null}>
          <WebsiteKaarten />
        </Suspense>
      </div>

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

      <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-heading)" }}>
        Eerdere maanden
      </h2>
      <Suspense fallback={<TabelSkelet />}>
        <EerdereMaanden />
      </Suspense>
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

const monthLabel = (key: string) => {
  const l = new Date(`${key}-01`).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  return l.charAt(0).toUpperCase() + l.slice(1);
};

const uren = (n: number) =>
  new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

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
        Hier vind je alles rond je lopende projecten:
        {heeftSite ? " de cijfers van je website, je facturen" : " je facturen"} en wat er deze maand
        is opgepakt.
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

async function MaandKaarten() {
  const { clientIds } = await getPortalContext();
  const [huidig] = await maandCijfers(clientIds);

  const kaarten = [
    { label: "Nieuwe tickets", value: String(huidig.newTickets) },
    { label: "Afgerond", value: String(huidig.closedTickets) },
    { label: "Uren", value: uren(huidig.hours) },
  ];

  return (
    <>
      {kaarten.map((c) => (
        <Kaart key={c.label} label={c.label} value={c.value} />
      ))}
    </>
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

  return (
    <>
      <Kaart label="Bezoekers" value={getal(visitors)} />
      <Kaart label="Paginaweergaven" value={getal(pageviews)} />
    </>
  );
}

/**
 * Wat er nu loopt en wat eraan komt.
 *
 * Bewust alleen actief en upcoming: review, on hold en afgerond horen op de
 * projectenpagina, niet in het overzicht van vandaag. Actief staat eerst, want
 * daar wordt nu aan gewerkt.
 */
const LOPEND = ["active", "upcoming"] as const;

type LopendProject = {
  id: string;
  title: string;
  status: (typeof LOPEND)[number];
  next_step: string | null;
  client_action: string | null;
  phase: Project["phase"];
  tags: string[] | null;
};

async function LopendeProjecten() {
  const { clientIds } = await getPortalContext();
  if (clientIds.length === 0) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, title, status, next_step, client_action, phase, tags")
    .in("client_id", clientIds)
    .in("status", LOPEND)
    .order("created_at", { ascending: false });

  const projecten = (data ?? []) as unknown as LopendProject[];
  // Expliciet sorteren en niet op de alfabetische volgorde van de statuswaarde
  // leunen; dat die "active" vóór "upcoming" zet is toeval.
  const gesorteerd = [...projecten].sort(
    (a, b) => LOPEND.indexOf(a.status) - LOPEND.indexOf(b.status),
  );

  if (gesorteerd.length === 0) {
    return (
      <div
        className="squircle px-4 py-6"
        style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
      >
        <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
          Er lopen op dit moment geen projecten.
        </p>
      </div>
    );
  }

  return (
    <div
      className="squircle overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      {gesorteerd.map((p, i) => (
        <Link
          key={p.id}
          href={`/portal/projecten/${p.id}`}
          className="card-hover block px-4 py-4"
          style={{ borderBottom: i < gesorteerd.length - 1 ? "1px solid var(--border)" : "none" }}
        >
          <div className="flex items-start justify-between gap-4 mb-2.5">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                {p.title}
              </h3>
              {p.next_step && (
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {p.next_step}
                </p>
              )}
            </div>
            <ProjectStatusBadge status={p.status} />
          </div>

          <ProjectProgress phase={p.phase} tags={p.tags} />

          {p.client_action && (
            <p className="text-xs mt-2.5" style={{ color: "#92400e" }}>
              Van jou nodig: {p.client_action}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}

async function EerdereMaanden() {
  const { clientIds } = await getPortalContext();
  const [, ...eerder] = await maandCijfers(clientIds);

  return (
    <div
      className="squircle overflow-x-auto"
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      <table className="w-full text-left">
        <thead>
          <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
            <th className="px-4 font-semibold" style={{ color: "var(--ink)" }}>Maand</th>
            <th className="px-4 text-right font-semibold" style={{ color: "var(--ink)" }}>Nieuw</th>
            <th className="px-4 text-right font-semibold" style={{ color: "var(--ink)" }}>Afgerond</th>
            <th className="px-4 text-right font-semibold" style={{ color: "var(--ink)" }}>Uren</th>
          </tr>
        </thead>
        <tbody>
          {eerder.map((m, i) => (
            <tr
              key={m.month}
              style={{ borderBottom: i < eerder.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <td className="px-4" style={{ color: "var(--text-heading)" }}>{monthLabel(m.month)}</td>
              <td className="px-4 text-right" style={{ color: "var(--text-muted)" }}>{m.newTickets}</td>
              <td className="px-4 text-right" style={{ color: "var(--text-muted)" }}>{m.closedTickets}</td>
              <td className="px-4 text-right" style={{ color: "var(--text-muted)" }}>{uren(m.hours)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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

function KaartSkelet({ aantal }: { aantal: number }) {
  return (
    <>
      {Array.from({ length: aantal }).map((_, i) => (
        <div
          key={i}
          className="squircle p-6 animate-pulse"
          aria-hidden
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        >
          <div className="h-3 rounded mb-3" style={{ width: "60%", background: "var(--border)" }} />
          <div className="h-8 rounded" style={{ width: "40%", background: "var(--border)" }} />
        </div>
      ))}
    </>
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
