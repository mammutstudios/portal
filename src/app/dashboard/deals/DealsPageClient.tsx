"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/Modal";
import DealForm from "@/components/DealForm";
import { DealStatusBadge } from "@/components/StatusBadge";
import { convertDealAction } from "@/lib/actions/deals";
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
  contacts,
}: {
  deals: Deal[];
  clients: { id: string; name: string }[];
  contacts: { id: string; name: string; email: string | null }[];
}) {
  const router = useRouter();
  const klantNaam = new Map(clients.map((c) => [c.id, c.name]));
  const [filter, setFilter] = useState<Filter>("open");
  const [nieuw, setNieuw] = useState(false);
  const [bewerken, setBewerken] = useState<Deal | null>(null);
  const [omzetten, setOmzetten] = useState<Deal | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

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

  async function omzetten_(deal: Deal) {
    setBezig(true);
    setFout(null);
    const uitkomst = await convertDealAction(deal.id);
    setBezig(false);

    if (uitkomst?.error) {
      setFout(uitkomst.error);
      return;
    }
    setOmzetten(null);
    router.refresh();
    if (uitkomst?.clientId) router.push(`/dashboard/clients/${uitkomst.clientId}`);
  }

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
          Deals{" "}
          <span className="text-2xl font-normal" style={{ color: "var(--text-muted)" }}>
            ({zichtbaar.length})
          </span>
        </h1>
        <button
          onClick={() => setNieuw(true)}
          className="text-sm px-3 py-1.5 rounded-md font-medium"
          style={{ background: "var(--text-heading)", color: "#fff" }}
        >
          + Nieuwe deal
        </button>
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
            <div
              key={deal.id}
              className="card-hover flex items-center gap-4 px-4 py-3.5 cursor-pointer"
              onClick={() => setBewerken(deal)}
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

              {/* Omzetten kan één keer; daarna wijst de deal naar zijn klant. */}
              {deal.converted_at ? (
                <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  Omgezet
                </span>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOmzetten(deal);
                  }}
                  className="text-sm px-3 py-1.5 rounded-md flex-shrink-0"
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text-heading)",
                  }}
                >
                  Omzetten
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            {filter === "open" ? "Geen openstaande deals." : "Niets hier."}
          </p>
        )}
      </div>

      {nieuw && (
        <Modal title="Nieuwe deal" onClose={() => setNieuw(false)}>
          <DealForm clients={clients} contacts={contacts} onClose={() => setNieuw(false)} />
        </Modal>
      )}

      {bewerken && (
        <Modal title="Deal bijwerken" onClose={() => setBewerken(null)}>
          <DealForm
            deal={bewerken}
            clients={clients}
            contacts={contacts}
            onClose={() => setBewerken(null)}
          />
        </Modal>
      )}

      {omzetten && (
        <Modal title="Deal omzetten" onClose={() => setOmzetten(null)}>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--text)" }}>
              {omzetten.client_id ? (
                <>
                  Hiermee komt er een project <strong>{omzetten.title}</strong> op Upcoming bij{" "}
                  <strong>{klantNaam.get(omzetten.client_id) ?? "deze organisatie"}</strong>. Er
                  wordt geen tweede organisatie aangemaakt.
                </>
              ) : (
                <>
                  Hiermee maak ik de organisatie{" "}
                  <strong>{omzetten.company?.trim() || omzetten.title}</strong> aan, met een project{" "}
                  <strong>{omzetten.title}</strong> op Upcoming.
                </>
              )}{" "}
              De deal blijft eraan gekoppeld, zodat zichtbaar blijft waar dit werk vandaan komt.
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {omzetten.contact_id || omzetten.contact_name
                ? "De contactpersoon gaat mee naar de organisatie en het project. "
                : ""}
              Portaaltoegang komt er niet vanzelf bij; dat regel je apart bij de organisatie.
            </p>

            {fout && (
              <p className="text-sm" style={{ color: "#b0413e" }}>
                {fout}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOmzetten(null)}
                className="text-sm px-3 py-1.5 rounded-md"
                style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                Annuleren
              </button>
              <button
                onClick={() => omzetten_(omzetten)}
                disabled={bezig}
                className="text-sm px-3 py-1.5 rounded-md font-medium"
                style={{ background: "var(--text-heading)", color: "#fff", opacity: bezig ? 0.6 : 1 }}
              >
                {bezig ? "Bezig…" : "Omzetten"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
