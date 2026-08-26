import { createClient } from "@/lib/supabase/server";
import { fetchInvoicesAsTransactions } from "@/lib/moneybird/asTransactions";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { ProjectStatusBadge, ProjectTagBadge } from "@/components/StatusBadge";
import HoverRow from "@/components/HoverRow";
import CurrentVisitors from "@/components/CurrentVisitors";
import VisitorsCard from "@/components/analytics/VisitorsCard";
import PeriodPicker from "@/components/analytics/PeriodPicker";
import {
  plausibleIsConfigured,
  siteStats,
  series as siteSeries,
} from "@/lib/analytics/plausible";
import { resolvePeriod, isPeriod } from "@/lib/analytics/periods";
import { opStatus, PROJECT_STATUS_VOLGORDE, type Project } from "@/lib/types";

/**
 * Onze eigen website. Bewust een losse instelling in plaats van een klantnaam
 * uit de database, zodat het overzicht niet stukgaat als die naam wijzigt.
 */
const EIGEN_SITE = process.env.PLAUSIBLE_OWN_SITE_ID ?? "mammutstudios.com";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

function fmtFull(amount: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const supabase = await createClient();
  const { periode: gekozen } = await searchParams;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [{ data: projects }, { count: taskCount }, transactions] = await Promise.all([
    supabase.from("projects").select("*, clients(name, logo_url)").in("status", ["active", "upcoming"]).order("created_at", { ascending: false }).limit(10),
    supabase.from("tasks").select("*", { count: "exact", head: true }).not("status", "eq", "done"),
    fetchInvoicesAsTransactions(supabase),
  ]);

  // Cijfers van de eigen site, dezelfde kaart als op de analyticspagina en in
  // het klantportaal. Standaard deze maand, zodat het aansluit op de
  // omzetkaarten eronder; via ?periode= is dat aan te passen.
  const periodeKey = isPeriod(gekozen) ? gekozen : "month";
  const periode = resolvePeriod(periodeKey, now);
  // Zie loadSiteAnalytics: dag-imports passen niet in uuremmers.
  const metImports = periode.interval !== "time:hour";
  // eigenNu is null: zie loadSiteAnalytics. Die teller haalt zichzelf op.
  const eigenNu = null;
  const [eigenStats, eigenReeks, eigenVorig, eigenClient] = plausibleIsConfigured()
    ? await Promise.all([
        siteStats(EIGEN_SITE, periode.range, metImports),
        siteSeries(EIGEN_SITE, periode.range, periode.interval, metImports),
        periode.previous
          ? siteStats(EIGEN_SITE, periode.previous, metImports)
          : Promise.resolve(null),
        supabase
          .from("clients")
          .select("id")
          .eq("plausible_site_id", EIGEN_SITE)
          .maybeSingle()
          .then(({ data }) => data),
      ])
    : [null, [], null, null, null];

  // Actief vóór upcoming, en binnen dezelfde status zakken retainers naar
  // onderen. De query haalt alleen active en upcoming op, dus on hold en
  // afgerond komen hier sowieso niet langs.
  const isRetainer = (p: Project) => p.tags?.some((t) => t.toLowerCase() === "retainer") ?? false;
  const sortedProjects = opStatus((projects ?? []) as Project[]).sort(
    (a, b) =>
      PROJECT_STATUS_VOLGORDE[a.status] - PROJECT_STATUS_VOLGORDE[b.status] ||
      Number(isRetainer(a)) - Number(isRetainer(b)),
  );

  const thisMonthTotal = (transactions ?? [])
    .filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  // Forecast volgende maand
  const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const nextMonthTx = (transactions ?? []).filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === nextMonthYear && d.getMonth() === nextMonth;
  });
  const nextMonthConfirmed = nextMonthTx.filter((t) => t.status !== "draft").reduce((sum, t) => sum + t.amount, 0);
  const nextMonthDraft = nextMonthTx.filter((t) => t.status === "draft").reduce((sum, t) => sum + t.amount, 0);
  const nextMonthForecast = nextMonthConfirmed + nextMonthDraft;

  const monthLabel = new Date(currentYear, currentMonth)
    .toLocaleDateString("nl-NL", { month: "long", year: "numeric" })
    .replace(/^\w/, (c) => c.toUpperCase());
  const nextMonthLabel = new Date(nextMonthYear, nextMonth)
    .toLocaleDateString("nl-NL", { month: "long", year: "numeric" })
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Overzicht
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Welkom terug bij Mammut Studios
      </p>

      {eigenReeks.length > 0 && (
        <div className="mb-8">
          {/* Eén rij op desktop, twee op mobiel: daar zakt de bezoekersteller
              onder de titel en blijft de periodekiezer naast de naam staan.
              De teller staat er maar één keer, met order-klassen verplaatst,
              want twee keer renderen zou ook twee keer gaan pollen. */}
          <div className="flex flex-wrap items-center gap-x-4 mb-3">
            <Link
              href={eigenClient ? `/dashboard/analytics/${eigenClient.id}` : "/dashboard/analytics"}
              className="order-1 flex items-center gap-2 text-sm font-semibold hover:underline"
              style={{ color: "var(--text-heading)" }}
            >
              {plausibleIsConfigured() && process.env.PLAUSIBLE_BASE_URL && (
                // Plausible serveert favicons zelf, net als bij de bronnenlijst
                // op de analyticspagina.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${process.env.PLAUSIBLE_BASE_URL}/favicon/sources/${encodeURIComponent(EIGEN_SITE)}`}
                  alt=""
                  width={16}
                  height={16}
                  className="flex-shrink-0 rounded-sm"
                />
              )}
              {EIGEN_SITE}
            </Link>
            {/* Op mobiel blijft de periodekiezer naast de titel staan en zakt
                alleen de teller naar de regel eronder; op desktop staan ze
                allebei rechts, teller eerst. */}
            <div className="order-3 w-full mt-1.5 md:order-2 md:ml-auto md:w-auto md:mt-0">
              <CurrentVisitors siteId={EIGEN_SITE} initial={eigenNu} />
            </div>
            {/* Op mobiel geen periodekiezer: daar is de ruimte te krap en
                staat de standaardperiode al goed. */}
            <div className="hidden md:block order-3">
              <PeriodPicker current={periodeKey} />
            </div>
          </div>
          <VisitorsCard
            stats={eigenStats}
            prevStats={eigenVorig}
            series={eigenReeks}
            interval={periode.interval}
            periodeSlot={<PeriodPicker current={periodeKey} blok />}
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">

        {/* Omzet deze maand */}
        <Link
          href="/dashboard/finance"
          className="card-hover squircle p-6 flex flex-col justify-between relative overflow-hidden"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", minHeight: 160 }}
        >
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full" style={{ background: "var(--bg-secondary)" }} />
          <div className="absolute -right-4 bottom-0 w-24 h-24 rounded-full opacity-60" style={{ background: "var(--bg-secondary)" }} />
          <p className="text-xs font-medium uppercase tracking-wider relative z-10" style={{ color: "var(--text-muted)" }}>
            Deze maand
          </p>
          <div className="relative z-10">
            <p className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-heading)" }}>
              {fmtFull(thisMonthTotal)}
            </p>
          </div>
          <p className="text-sm relative z-10 mt-1" style={{ color: "var(--text-muted)" }}>{monthLabel}</p>
        </Link>

        {/* Forecast volgende maand */}
        <Link
          href="/dashboard/finance"
          className="card-hover squircle p-6 flex flex-col justify-between"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", minHeight: 160 }}
        >
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Volgende maand
          </p>
          <div>
            <p className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-heading)" }}>
              {fmtFull(nextMonthForecast)}
            </p>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{nextMonthLabel}</p>
        </Link>

        {/* Openstaande taken */}
        <Link
          href="/dashboard/tasks"
          className="card-hover squircle p-6 flex flex-col justify-between"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", minHeight: 160 }}
        >
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Taken
          </p>
          <div>
            <p className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-heading)" }}>
              {taskCount ?? 0}
            </p>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Openstaande taken</p>
        </Link>

      </div>

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>
            Actieve projecten
          </h2>
          <Link href="/dashboard/projects" className="text-sm" style={{ color: "var(--text-muted)" }}>
            Alle projecten →
          </Link>
        </div>

        <div className="squircle overflow-x-auto" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
          {projects && projects.length > 0 ? (
            <table className="w-full min-w-[40rem]">
              <thead>
                <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Project</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Klant</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map((project, i) => (
                  <HoverRow
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    style={{ borderBottom: i < sortedProjects.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/projects/${project.id}`} className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                        {project.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {project.clients ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                            style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
                          >
                            {project.clients.logo_url ? (
                              /^https?|^\//.test(project.clients.logo_url) ? (
                                <img src={project.clients.logo_url} alt={project.clients.name} className="w-full h-full object-contain" />
                              ) : (
                                <span style={{ fontSize: "0.6875rem" }}>{project.clients.logo_url}</span>
                              )
                            ) : (
                              <span style={{ fontSize: "0.5625rem", fontWeight: 600, color: "var(--text-muted)" }}>
                                {project.clients.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span style={{ color: "var(--text-muted)" }}>{project.clients.name}</span>
                          {isRetainer(project) && <ProjectTagBadge tag="Retainer" />}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                          {isRetainer(project) && <ProjectTagBadge tag="Retainer" />}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ProjectStatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CaretRight size={15} weight="bold" style={{ color: "var(--text-muted)" }} />
                    </td>
                  </HoverRow>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
              Nog geen projecten aangemaakt.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
