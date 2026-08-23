"use client";

import { useEffect, useState, useTransition } from "react";
import { backfillMoneybirdAction } from "@/lib/actions/moneybird";
import InvoiceTable, { type MoneybirdInvoice } from "@/components/InvoiceTable";
import ClientLogo from "@/components/ClientLogo";
import type { RecurringAgreement } from "@/lib/moneybird/recurring";

const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);


/**
 * Statuslabels en -kleuren. De logica: nog niets verstuurd is wit met een rand,
 * wachten op geld is lavendel, actie nodig is oker of rood, en binnen is ink.
 */
const STATE_STYLE: Record<
  string,
  { label: string; bg: string; fg: string; border?: string }
> = {
  draft: { label: "Concept", bg: "var(--bg)", fg: "var(--ink)", border: "var(--border)" },
  scheduled: { label: "Ingepland", bg: "var(--bg)", fg: "var(--ink)", border: "var(--border)" },
  open: { label: "Openstaand", bg: "var(--lavender)", fg: "var(--ink)" },
  pending_payment: { label: "Betaling onderweg", bg: "var(--lavender)", fg: "var(--ink)" },
  reminded: { label: "Herinnerd", bg: "#c8901f", fg: "#fff" },
  late: { label: "Te laat", bg: "#b0413e", fg: "#fff" },
  uncollectible: { label: "Oninbaar", bg: "#b0413e", fg: "#fff" },
  paid: { label: "Betaald", bg: "var(--ink)", fg: "#fff" },
};

function StateBadge({ state }: { state: string | null }) {
  if (!state) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  const s = STATE_STYLE[state] ?? { label: state, bg: "var(--bg)", fg: "var(--ink)", border: "var(--border)" };
  return (
    <span
      className="inline-block px-3 py-1 squircle text-xs font-medium whitespace-nowrap"
      style={{
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border ?? "transparent"}`,
      }}
    >
      {s.label}
    </span>
  );
}

/**
 * "vandaag om 17:12" / "gisteren om 09:04" / "op 20-08-2026 om 14:03".
 * Inclusief voorzetsel, want dat verschilt per vorm.
 */
function fmtRelative(iso: string): string {
  const d = new Date(iso);
  const tijd = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

  const dag = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const verschil = Math.round((dag(new Date()) - dag(d)) / 86_400_000);

  if (verschil === 0) return `vandaag om ${tijd}`;
  if (verschil === 1) return `gisteren om ${tijd}`;
  return `op ${d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" })} om ${tijd}`;
}

function SetupInstructions() {
  return (
    <div className="squircle p-6 space-y-4" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
      <h2 className="text-lg font-semibold" style={{ color: "var(--text-heading)" }}>
        Moneybird is nog niet gekoppeld
      </h2>
      <p style={{ color: "var(--text-muted)" }}>
        Er staan nog geen sleutels in <code>.env.local</code>. Deze drie regels zijn nodig — zet ze er
        zelf in, ik raak je tokens niet aan:
      </p>
      <pre
        className="squircle p-4 text-sm overflow-x-auto"
        style={{ background: "var(--bg-secondary)", color: "var(--text)" }}
      >
{`MONEYBIRD_API_TOKEN=...
MONEYBIRD_ADMINISTRATION_ID=...
MONEYBIRD_WEBHOOK_SECRET=...`}
      </pre>
      <ol className="space-y-2 text-sm list-decimal pl-5" style={{ color: "var(--text-muted)" }}>
        <li>
          Maak een persoonlijk API-token op{" "}
          <span style={{ color: "var(--text-heading)" }}>moneybird.com/user/applications/new</span> met
          de scope <code>sales_invoices</code>.
        </li>
        <li>
          Het administratienummer staat in de URL van je administratie:{" "}
          <code>moneybird.com/&lt;nummer&gt;/</code>.
        </li>
        <li>
          Het webhook-secret krijg je één keer terug bij het aanmaken van de webhook, en daarna nooit
          meer.
        </li>
      </ol>
    </div>
  );
}

/** Datum zonder jaar als hij dit jaar valt: "1 september" tegenover "1 juli 2027". */
function fmtDatum(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const ditJaar = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    ...(ditJaar ? {} : { year: "numeric" }),
  });
}

/**
 * De periodieke facturen uit Moneybird. Dit zijn geen facturen maar afspraken,
 * dus ze staan bewust in een eigen tabel en niet tussen de verstuurde facturen.
 */
function RecurringTable({ rows }: { rows: RecurringAgreement[] }) {
  return (
    <div className="squircle overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th className="text-left font-semibold px-5 py-3" style={{ color: "var(--text-heading)" }}>Kenmerk</th>
            <th className="text-left font-semibold px-5 py-3" style={{ color: "var(--text-heading)" }}>Frequentie</th>
            <th className="text-left font-semibold px-5 py-3" style={{ color: "var(--text-heading)" }}>Volgende</th>
            <th className="text-left font-semibold px-5 py-3" style={{ color: "var(--text-heading)" }}>Klant</th>
            <th className="text-right font-semibold px-5 py-3" style={{ color: "var(--text-heading)" }}>Bedrag</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} style={i < rows.length - 1 ? { borderBottom: "1px solid var(--border)" } : undefined}>
              <td className="px-5 py-3" style={{ color: "var(--text-heading)" }}>{r.description}</td>
              <td className="px-5 py-3" style={{ color: "var(--text-muted)" }}>{r.frequencyLabel}</td>
              <td className="px-5 py-3" style={{ color: "var(--text-muted)" }}>{fmtDatum(r.nextDate)}</td>
              <td className="px-5 py-3">
                {r.client ? (
                  <span className="flex items-center gap-2 min-w-0">
                    <ClientLogo logo_url={r.client.logo_url} name={r.client.name} />
                    <span className="truncate" style={{ color: "var(--text-heading)" }}>{r.client.name}</span>
                  </span>
                ) : (
                  <span style={{ color: "#c8901f" }} title="Telt niet mee in de prognose">
                    {r.contactName ?? "—"} · niet gekoppeld
                  </span>
                )}
              </td>
              <td className="px-5 py-3 text-right tabular-nums" style={{ color: "var(--text-heading)" }}>
                {euro(r.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FacturenPageClient({
  configured,
  invoices,
  recurring,
  tableMissing,
}: {
  configured: boolean;
  invoices: MoneybirdInvoice[];
  recurring: RecurringAgreement[];
  tableMissing: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  // Laatste keer dat er daadwerkelijk is opgehaald — geen belofte over hoe vaak.
  // Pas na mount berekend: "vandaag" hoort de tijdzone van de kijker te volgen,
  // niet die van de server.
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  useEffect(() => {
    const stamps = invoices.map((i) => i.synced_at).filter(Boolean) as string[];
    setLastSynced(stamps.length ? fmtRelative(stamps.reduce((a, b) => (a > b ? a : b))) : null);
  }, [invoices]);

  const currentYear = new Date().getFullYear();
  const inCurrentYear = (i: MoneybirdInvoice) =>
    !!i.invoice_date && new Date(i.invoice_date).getFullYear() === currentYear;

  // Gefactureerd: concepten tellen hier bewust niet mee — die zijn nog niet verstuurd.
  const invoicedThisYear = invoices
    .filter((i) => i.state !== "draft" && inCurrentYear(i))
    .reduce((sum, i) => sum + (i.total_excl_tax ?? 0), 0);

  const draftTotal = invoices
    .filter((i) => i.state === "draft")
    .reduce((sum, i) => sum + (i.total_excl_tax ?? 0), 0);

  function sync() {
    setResult(null);
    startTransition(async () => {
      try {
        const r = await backfillMoneybirdAction();
        setResult(
          `${r.imported} van ${r.total} facturen ingelezen` +
            (r.skipped ? ` — ${r.skipped} overgeslagen (andere huisstijl)` : "") +
            (r.failures.length ? ` — ${r.failures.length} mislukt: ${r.failures[0]}` : ""),
        );
      } catch (e) {
        setResult(`Mislukt: ${(e as Error).message}`);
      }
    });
  }

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
          Facturen
        </h1>
        {configured && (
          <button
            onClick={sync}
            disabled={pending}
            className="squircle px-4 py-2 text-sm font-medium"
            style={{
              background: "var(--accent)",
              color: "var(--white)",
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? "Bezig…" : "Nu inlezen"}
          </button>
        )}
      </div>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Je verkoopfacturen uit Moneybird.
        {lastSynced && (
          <> Laatst opgehaald {lastSynced}.</>
        )}
      </p>

      {result && (
        <div
          className="squircle p-4 mb-6 text-sm"
          style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
        >
          {result}
        </div>
      )}

      {tableMissing && (
        <div
          className="squircle p-4 mb-6 text-sm"
          style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#c0392b" }}
        >
          De tabel <code>moneybird_invoices</code> bestaat nog niet. Draai eerst de migratie in{" "}
          <code>supabase/migrations/20260822_moneybird_invoices.sql</code>.
        </div>
      )}

      {!configured ? (
        <SetupInstructions />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="squircle p-6" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
              <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
                Facturen
              </div>
              <div className="text-3xl font-bold" style={{ color: "var(--text-heading)" }}>
                {invoices.length}
              </div>
            </div>
            <div className="squircle p-6" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
              <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
                Gefactureerd dit jaar
              </div>
              <div className="text-3xl font-bold" style={{ color: "var(--text-heading)" }}>
                {euro(invoicedThisYear)}
              </div>
            </div>
            <div className="squircle p-6" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
              <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
                Concept
              </div>
              <div className="text-3xl font-bold" style={{ color: "var(--text-heading)" }}>
                {euro(draftTotal)}
              </div>
            </div>
          </div>


          {recurring.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--text-heading)" }}>
                Periodieke facturen
              </h2>
              <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                Maakt Moneybird zelf aan. De komende beurten tellen mee in de omzetprognose.
              </p>
              <RecurringTable rows={recurring} />
            </div>
          )}

          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-heading)" }}>
            Facturen
          </h2>
          <InvoiceTable invoices={invoices} emptyLabel="Nog niets ingelezen. Klik op “Nu inlezen”." />
        </>
      )}
    </div>
  );
}
