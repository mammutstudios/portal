"use client";

import { useState } from "react";
import CurrentVisitors from "@/components/CurrentVisitors";
import VisitorsCard from "@/components/analytics/VisitorsCard";
import PeriodPicker from "@/components/analytics/PeriodPicker";
import type { SiteStats, DailyPoint, BreakdownRow, Interval } from "@/lib/analytics/plausible";

const INK = "#140018";

const getal = (n: number) => new Intl.NumberFormat("nl-NL").format(n);
const decimaal = (n: number | null) =>
  n === null ? "—" : new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 }).format(n);

const duur = (s: number | null) => {
  if (s === null) return "—";
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;
};




/**
 * De favicon-dienst van Plausible kent alleen domeinen, geen productnamen.
 * Chrome levert dus niets op, google.com wel — vandaar deze vertaling.
 */
const ICON_DOMAIN: Record<string, string> = {
  Chrome: "google.com",
  "Chrome Mobile": "google.com",
  Safari: "apple.com",
  "Mobile Safari": "apple.com",
  Firefox: "mozilla.org",
  "Microsoft Edge": "microsoft.com",
  Opera: "opera.com",
  "Yandex Browser": "yandex.com",
  "Samsung Internet": "samsung.com",
  Brave: "brave.com",
  Mac: "apple.com",
  iOS: "apple.com",
  Windows: "microsoft.com",
  Android: "android.com",
  Ubuntu: "ubuntu.com",
  GNU_Linux: "linux.org",
  Linux: "linux.org",
  ChromeOS: "google.com",
};

type Tab = {
  label: string;
  rows: BreakdownRow[];
  /** Favicon op basis van de regelnaam zelf (verwijzende domeinen). */
  icons?: boolean;
  /** Favicon via een vaste vertaling naar een leveranciersdomein. */
  iconDomains?: boolean;
};

/**
 * Kaart met tabs, zoals in het Plausible-dashboard. Alle tabs zijn al opgehaald,
 * dus wisselen kost geen nieuw verzoek naar de server.
 */
function Panel({
  title, columnLabel, tabs, tint, faviconBase,
}: {
  title: string;
  columnLabel: string;
  tabs: Tab[];
  tint: string;
  /** Alleen bij bronnen: Plausible serveert favicons op /favicon/sources/<naam>. */
  faviconBase?: string | null;
}) {
  const [active, setActive] = useState(0);
  const tab = tabs[active] ?? tabs[0];
  const rows = tab?.rows ?? [];
  const max = Math.max(1, ...rows.map((r) => r.visitors));

  return (
    <div
      className="squircle p-5 flex flex-col"
      style={{ border: "1px solid var(--border)", background: "var(--bg)", minHeight: 320 }}
    >
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold" style={{ color: "var(--text-heading)" }}>{title}</h2>
        <div className="flex items-center gap-3 flex-shrink-0">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              onClick={() => setActive(i)}
              className="text-xs"
              style={{
                color: i === active ? "var(--text-heading)" : "var(--text-muted)",
                fontWeight: i === active ? 600 : 400,
                textDecoration: i === active ? "underline" : "none",
                textUnderlineOffset: 4,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs mb-2 px-2" style={{ color: "var(--text-muted)" }}>
        <span>{columnLabel}</span>
        <span>Bezoekers</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm px-2 py-3" style={{ color: "var(--text-muted)" }}>Nog geen gegevens.</p>
      ) : (
        <div className="space-y-1">
          {rows.map((r) => (
            <div
              key={r.label}
              className="relative flex items-center justify-between text-sm py-2 px-2 rounded-md overflow-hidden"
            >
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-md"
                style={{ width: `${(r.visitors / max) * 100}%`, background: tint }}
              />
              <span className="relative flex items-center gap-2 min-w-0 pr-3">
                {(tab?.icons || (tab?.iconDomains && ICON_DOMAIN[r.label])) && faviconBase && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${faviconBase}/favicon/sources/${encodeURIComponent(
                      tab?.iconDomains ? ICON_DOMAIN[r.label] : r.label,
                    )}`}
                    alt=""
                    width={16}
                    height={16}
                    className="flex-shrink-0 rounded-sm"
                    onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                  />
                )}
                <span className="truncate" style={{ color: "var(--text-heading)" }}>{r.label}</span>
              </span>
              <span className="relative flex-shrink-0 tabular-nums" style={{ color: "var(--text-heading)" }}>
                {getal(r.visitors)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SiteAnalytics({
  configured,
  siteName,
  periode,
  periodeLabel,
  interval,
  stats,
  series,
  lists,
  prevStats = null,
  currentVisitors = null,
  faviconBase = null,
}: {
  configured: boolean;
  siteName: string | null;
  periode: string;
  periodeLabel: string;
  interval: Interval;
  stats: SiteStats | null;
  series: DailyPoint[];
  lists: Record<string, BreakdownRow[]>;
  prevStats?: SiteStats | null;
  currentVisitors?: number | null;
  faviconBase?: string | null;
}) {
  if (!configured || !siteName) {
    return (
      <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: "var(--text-heading)" }}>Analytics</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {configured
            ? "Er is nog geen website aan deze organisatie gekoppeld."
            : "Analytics is nog niet ingesteld."}
        </p>
      </div>
    );
  }

  const chartData = series.map((p) => ({
    punt:
      interval === "time:month"
        ? new Date(`${p.date}-01`).toLocaleDateString("nl-NL", { month: "short" })
        : String(new Date(p.date).getDate()),
    Bezoekers: p.visitors,
  }));

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <h1 className="text-2xl font-extrabold truncate" style={{ color: "var(--text-heading)" }}>
            {siteName}
          </h1>
          <CurrentVisitors siteId={siteName} initial={currentVisitors} />
        </div>
        <PeriodPicker current={periode} />
      </div>

      <VisitorsCard stats={stats} prevStats={prevStats} series={series} interval={interval} />

      <div className="mb-4" />

      {/* Eén raster van 2x2, zoals het Plausible-dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Panel
          title="Verkeersbronnen" columnLabel="Bron" tint="#e7f0fd" faviconBase={faviconBase}
          tabs={[
            { label: "Bronnen", rows: lists["visit:source"] ?? [], icons: true },
            { label: "Kanalen", rows: lists["visit:channel"] ?? [] },
          ]}
        />
        <Panel
          title="Pagina's" columnLabel="Pagina" tint="#fdf1e3"
          tabs={[
            { label: "Bekeken", rows: lists["event:page"] ?? [] },
            { label: "Instap", rows: lists["visit:entry_page"] ?? [] },
            { label: "Uitstap", rows: lists["visit:exit_page"] ?? [] },
          ]}
        />
        <Panel
          title="Locaties" columnLabel="Locatie" tint="#efe9fb"
          tabs={[
            { label: "Landen", rows: lists["visit:country"] ?? [] },
            { label: "Regio's", rows: lists["visit:region_name"] ?? [] },
            { label: "Steden", rows: lists["visit:city_name"] ?? [] },
          ]}
        />
        <Panel
          title="Apparaten" columnLabel="Apparaat" tint="#e4f5ec" faviconBase={faviconBase}
          tabs={[
            { label: "Browser", rows: lists["visit:browser"] ?? [], iconDomains: true },
            { label: "Systeem", rows: lists["visit:os"] ?? [], iconDomains: true },
            { label: "Type", rows: lists["visit:device"] ?? [] },
          ]}
        />
      </div>
    </div>
  );
}
