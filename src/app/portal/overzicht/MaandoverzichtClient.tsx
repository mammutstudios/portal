"use client";

import type { MonthStats } from "@/lib/analytics";
import type { SiteStats, DailyPoint } from "@/lib/analytics/plausible";
import CurrentVisitors from "@/components/CurrentVisitors";
import VisitorsCard from "@/components/analytics/VisitorsCard";

const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

const monthLabel = (key: string) => {
  const l = new Date(`${key}-01`).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
  return l.charAt(0).toUpperCase() + l.slice(1);
};

const uren = (n: number) =>
  new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

export default function MaandoverzichtClient({
  groet,
  voornaam,
  stats,
  site,
  bezoekers = [],
  currentVisitors: nu = null,
  siteId = null,
  siteStats = null,
  siteStatsPrev = null,
}: {
  groet: string;
  voornaam: string | null;
  stats: MonthStats[];
  /** Websitecijfers; null wanneer er geen site gekoppeld is of analytics uit staat. */
  site: { visitors: number; pageviews: number } | null;
  bezoekers?: DailyPoint[];
  currentVisitors?: number | null;
  siteId?: string | null;
  siteStats?: SiteStats | null;
  siteStatsPrev?: SiteStats | null;
}) {
  const [current, ...earlier] = stats;

  const getal = (n: number) => new Intl.NumberFormat("nl-NL").format(n);

  const cards = [
    { label: "Nieuwe tickets", value: String(current.newTickets) },
    { label: "Afgerond", value: String(current.closedTickets) },
    { label: "Uren", value: uren(current.hours) },
    { label: "Gefactureerd", value: euro(current.invoiceTotalExclTax) },
    ...(site
      ? [
          { label: "Bezoekers", value: getal(site.visitors) },
          { label: "Paginaweergaven", value: getal(site.pageviews) },
        ]
      : []),
  ];

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
        {groet}{voornaam ? `, ${voornaam}` : ""}
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Welkom in je portaal. Hieronder zie je wat er in {monthLabel(current.month).toLowerCase()} is
        gebeurd — tickets, uren en facturen
        {site ? ", plus de cijfers van je website" : ""}.
      </p>

      {bezoekers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
              Website
            </h2>
            {siteId && <CurrentVisitors siteId={siteId} initial={nu} />}
          </div>
          <VisitorsCard stats={siteStats} prevStats={siteStatsPrev} series={bezoekers} />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {cards.map((c) => (
          <div
            key={c.label}
            className="squircle p-6"
            style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
          >
            <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
              {c.label}
            </div>
            <div className="text-3xl font-bold" style={{ color: "var(--text-heading)" }}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-heading)" }}>
        Eerdere maanden
      </h2>
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
              <th className="px-4 text-right font-semibold" style={{ color: "var(--ink)" }}>Gefactureerd</th>
            </tr>
          </thead>
          <tbody>
            {earlier.map((m, i) => (
              <tr
                key={m.month}
                style={{ borderBottom: i < earlier.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <td className="px-4" style={{ color: "var(--text-heading)" }}>{monthLabel(m.month)}</td>
                <td className="px-4 text-right" style={{ color: "var(--text-muted)" }}>{m.newTickets}</td>
                <td className="px-4 text-right" style={{ color: "var(--text-muted)" }}>{m.closedTickets}</td>
                <td className="px-4 text-right" style={{ color: "var(--text-muted)" }}>{uren(m.hours)}</td>
                <td className="px-4 text-right" style={{ color: "var(--text-heading)" }}>
                  {euro(m.invoiceTotalExclTax)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
