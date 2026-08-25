"use client";

import { useState } from "react";
import Link from "next/link";
import { DealStatusBadge } from "@/components/StatusBadge";
import { DEAL_OPEN, type Deal, type DealStatus } from "@/lib/types";

const FILTERS = [
  { label: "Open", value: "open" },
  { label: "Gewonnen", value: "gewonnen" },
  { label: "Verloren", value: "verloren" },
  { label: "Alles", value: "alles" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

/** Zelfde volgorde als de pijplijn zelf: nieuw bovenaan, klaar onderaan. */
const VOLGORDE: Record<DealStatus, number> = {
  nieuw: 0,
  gesprek: 1,
  offerte: 2,
  gewonnen: 3,
  verloren: 4,
};

const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

const kortDatum = (d: string) =>
  new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });

export default function DealsPageClient({
  deals,
  clients,
}: {
  deals: Deal[];
  clients: { id: string; name: string }[];
}) {
  const klantNaam = new Map(clients.map((c) => [c.id, c.name]));
  const [filter, setFilter] = useState<Filter>("open");

  const zichtbaar = deals
    .filter((d) =>
      filter === "alles"
        ? true
        : filter === "open"
          ? DEAL_OPEN.includes(d.status)
          : d.status === filter,
    )
    .sort((a, b) => VOLGORDE[a.status] - VOLGORDE[b.status]);

  // Wat er nog te winnen valt; alleen over wat openstaat, want de rest is beslist.
  const openWaarde = deals
    .filter((d) => DEAL_OPEN.includes(d.status))
    .reduce((som, d) => som + (d.value_amount ?? 0), 0);

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
          Deals{" "}
          <span className="text-2xl font-normal" style={{ color: "var(--text-muted)" }}>
            ({zichtbaar.length})
          </span>
        </h1>
        <Link
          href="/dashboard/deals/nieuw"
          className="text-sm px-3 py-1.5 rounded-md font-medium"
          style={{ background: "var(--text-heading)", color: "#fff" }}
        >
          + Nieuwe deal
        </Link>
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
        Aanvragen en nieuw werk, van nieuwe klanten en van bestaande.
        {openWaarde > 0 && ` ${euro(openWaarde)} openstaand.`}
      </p>

      <div className="flex gap-1 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className="px-3 py-1.5 rounded-md text-sm transition-colors"
            style={{
              background: filter === f.value ? "var(--text-heading)" : "transparent",
              color: filter === f.value ? "#fff" : "var(--text-muted)",
              border: `1px solid ${filter === f.value ? "var(--text-heading)" : "var(--border)"}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="squircle overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
        {zichtbaar.length > 0 ? (
          zichtbaar.map((deal, i) => (
            <Link
              key={deal.id}
              href={`/dashboard/deals/${deal.id}`}
              className="card-hover flex items-center gap-4 px-4 py-3.5"
              style={{ borderBottom: i < zichtbaar.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                    {deal.title}
                  </span>
                  <DealStatusBadge status={deal.status} />
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {[
                    // Een gekoppelde organisatie wint van het vrije veld: die
                    // naam is de echte, het vrije veld is wat iemand typte.
                    (deal.client_id && klantNaam.get(deal.client_id)) || deal.company,
                    deal.contact_name,
                    deal.source && `via ${deal.source}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Geen gegevens"}
                </p>
              </div>

              <span className="text-sm tabular-nums flex-shrink-0" style={{ color: "var(--text-heading)" }}>
                {deal.value_amount != null ? euro(deal.value_amount) : "—"}
              </span>

              <span
                className="text-xs tabular-nums flex-shrink-0 hidden sm:block"
                style={{ color: "var(--text-muted)", width: 52 }}
              >
                {kortDatum(deal.created_at)}
              </span>

              {/* Omzetten zelf staat op de dealpagina; hier alleen of het al
                  gebeurd is, zodat de regel één link blijft. */}
              {deal.converted_at && (
                <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  Omgezet
                </span>
              )}
            </Link>
          ))
        ) : (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            {filter === "open" ? "Geen openstaande deals." : "Niets hier."}
          </p>
        )}
      </div>

    </div>
  );
}
