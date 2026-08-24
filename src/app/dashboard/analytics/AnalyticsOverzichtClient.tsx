"use client";

import { useState } from "react";
import Link from "next/link";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import type { SiteCard } from "@/lib/analytics/plausible";

const INK = "#140018";
const getal = (n: number) => new Intl.NumberFormat("nl-NL").format(n);

type Site = {
  id: string;
  name: string;
  siteId: string;
  card: SiteCard | null;
};

/**
 * Het favicon van de site zelf, uit de favicon-dienst van Plausible — dezelfde
 * bron als de icoontjes bij bronnen en apparaten. Valt terug op de beginletter
 * als het domein geen bruikbaar icoon heeft.
 */
function SiteFavicon({ base, domain, name }: { base: string | null; domain: string; name: string }) {
  const [mislukt, setMislukt] = useState(false);

  if (!base || mislukt) {
    return (
      <span
        className="w-5 h-5 rounded-sm flex items-center justify-center flex-shrink-0 text-[10px] font-semibold"
        style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}
      >
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${base}/favicon/sources/${encodeURIComponent(domain)}`}
      alt=""
      width={20}
      height={20}
      className="w-5 h-5 rounded-sm flex-shrink-0"
      onError={() => setMislukt(true)}
    />
  );
}

function Change({ pct }: { pct: number | null }) {
  if (pct === null || !isFinite(pct)) {
    return <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>;
  }
  const r = Math.round(pct);
  if (r === 0) return <span className="text-xs" style={{ color: "var(--text-muted)" }}>0%</span>;
  const up = r > 0;
  return (
    <span className="text-xs font-semibold" style={{ color: up ? "#16a34a" : "#dc2626" }}>
      {up ? "↗" : "↘"} {Math.abs(r)}%
    </span>
  );
}

export default function AnalyticsOverzichtClient({
  configured,
  sites,
  faviconBase,
}: {
  configured: boolean;
  sites: Site[];
  faviconBase: string | null;
}) {
  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
        Analytics
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Alle gekoppelde sites, bezoekers van de afgelopen 24 uur.
      </p>

      {!configured ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Analytics is nog niet ingesteld. Vul <code>PLAUSIBLE_BASE_URL</code> en{" "}
          <code>PLAUSIBLE_API_KEY</code> in.
        </p>
      ) : sites.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Nog geen enkele organisatie heeft een gekoppelde site. Dat stel je in op de
          organisatiepagina.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/analytics/${s.id}`}
                className="card-hover squircle p-5 flex flex-col"
                style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
              >
                <div className="flex items-center gap-2.5 mb-3 min-w-0">
                  <SiteFavicon base={faviconBase} domain={s.siteId} name={s.name} />
                  <span className="text-sm font-semibold truncate" style={{ color: "var(--text-heading)" }}>
                    {s.siteId}
                  </span>
                </div>

                <div style={{ height: 56 }}>
                  {s.card && s.card.points.some((p) => p > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={s.card.points.map((v, i) => ({ i, v }))}
                        margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id={`spark-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={INK} stopOpacity={0.16} />
                            <stop offset="100%" stopColor={INK} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone" dataKey="v" stroke={INK} strokeWidth={1.5}
                          fill={`url(#spark-${s.id})`} dot={false} isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-end">
                      <div className="w-full" style={{ height: 1, background: "var(--border)" }} />
                    </div>
                  )}
                </div>

                <div className="flex items-end justify-between mt-3">
                  <div>
                    <div className="text-2xl font-bold" style={{ color: "var(--text-heading)" }}>
                      {getal(s.card?.visitors ?? 0)}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      bezoekers, laatste 24 uur
                    </div>
                  </div>
                  <Change pct={s.card?.change ?? null} />
                </div>
              </Link>
          ))}
        </div>
      )}
    </div>
  );
}
