"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { SiteStats, DailyPoint } from "@/lib/analytics/plausible";

const INK = "#140018";

const getal = (n: number) => new Intl.NumberFormat("nl-NL").format(n);
const decimaal = (n: number | null) =>
  n === null ? "—" : new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 }).format(n);

const duur = (s: number | null) => {
  if (s === null) return "—";
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;
};

/** Verschil in procenten; null wanneer er geen zinnige vergelijking is. */
export function delta(now: number | null | undefined, before: number | null | undefined): number | null {
  if (now == null || before == null || before === 0) return null;
  return ((now - before) / before) * 100;
}

function Change({ pct }: { pct: number | null }) {
  if (pct === null || !isFinite(pct)) return null;
  const rounded = Math.round(pct);
  if (rounded === 0) {
    return <span className="text-xs leading-none pb-0.5" style={{ color: "var(--text-muted)" }}>0%</span>;
  }
  const up = rounded > 0;
  return (
    <span
      className="text-xs font-semibold whitespace-nowrap leading-none pb-0.5"
      style={{ color: up ? "#16a34a" : "#dc2626" }}
    >
      {up ? "↗" : "↘"} {Math.abs(rounded)}%
    </span>
  );
}

function Metric({ label, value, change }: { label: string; value: string; change?: number | null }) {
  return (
    <div className="px-5 py-4" style={{ borderLeft: "1px solid var(--border)" }}>
      <div className="text-xs uppercase tracking-wide mb-1.5 truncate" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold" style={{ color: "var(--text-heading)" }}>{value}</span>
        <Change pct={change ?? null} />
      </div>
    </div>
  );
}

/**
 * Kengetallen plus bezoekersgrafiek in één kaart. Gedeeld door de
 * analyticspagina en het overzicht, zodat die twee niet uit elkaar lopen.
 */
export default function VisitorsCard({
  stats,
  prevStats = null,
  series,
  interval = "time:day",
}: {
  stats: SiteStats | null;
  prevStats?: SiteStats | null;
  series: DailyPoint[];
  interval?: "time:day" | "time:month";
}) {
  const data = series.map((p) => ({
    punt:
      interval === "time:month"
        ? new Date(`${p.date}-01`).toLocaleDateString("nl-NL", { month: "short" })
        : String(new Date(p.date).getDate()),
    Bezoekers: p.visitors,
  }));

  return (
    // overflow-hidden: anders steekt de rechte hoek van het metrics-vak
    // door de afgeronde hoek van de kaart heen.
    <div
      className="squircle overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      <div
        className="grid grid-cols-2 lg:grid-cols-4 [&>*:first-child]:border-l-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Metric label="Unieke bezoekers" value={getal(stats?.visitors ?? 0)}
          change={delta(stats?.visitors, prevStats?.visitors)} />
        <Metric label="Paginaweergaven" value={getal(stats?.pageviews ?? 0)}
          change={delta(stats?.pageviews, prevStats?.pageviews)} />
        <Metric label="Weergaven per bezoek" value={decimaal(stats?.viewsPerVisit ?? null)}
          change={delta(stats?.viewsPerVisit, prevStats?.viewsPerVisit)} />
        <Metric label="Bezoekduur" value={duur(stats?.visitDuration ?? null)}
          change={delta(stats?.visitDuration, prevStats?.visitDuration)} />
      </div>

      <div className="px-3 pt-5 pb-3" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 12, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="vlakBezoekers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={INK} stopOpacity={0.18} />
                <stop offset="100%" stopColor={INK} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="punt" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--text-muted)" }} allowDecimals={false} />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              contentStyle={{ border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, background: "var(--bg)" }}
            />
            <Area type="monotone" dataKey="Bezoekers" stroke={INK} strokeWidth={2} fill="url(#vlakBezoekers)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
