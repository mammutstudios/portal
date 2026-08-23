"use client";

import ClientLogo from "@/components/ClientLogo";
import type { RecurringAgreement } from "@/lib/moneybird/recurring";

const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

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
 * De periodieke facturen uit Moneybird. Dit zijn afspraken en geen facturen —
 * ze hebben geen nummer en geen status — vandaar een eigen pagina in plaats van
 * een plek tussen de verstuurde facturen.
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

/** Wat een afspraak per jaar oplevert, om de jaarwaarde onderaan te kunnen tonen. */
const PER_JAAR: Record<string, number> = {
  Dagelijks: 365,
  Wekelijks: 52,
  Maandelijks: 12,
  "Per kwartaal": 4,
  Jaarlijks: 1,
};

export default function PeriodiekPageClient({
  configured,
  recurring,
}: {
  configured: boolean;
  recurring: RecurringAgreement[];
}) {
  // Alleen de gekoppelde tellen mee; de rest zit ook niet in de prognose.
  const perJaar = recurring
    .filter((r) => r.client)
    .reduce((som, r) => som + r.amount * (PER_JAAR[r.frequencyLabel] ?? 0), 0);

  const ongekoppeld = recurring.filter((r) => !r.client).length;

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
        Periodiek
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Facturen die Moneybird zelf aanmaakt. De komende beurten tellen mee in de omzetprognose.
      </p>

      {!configured ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Moneybird is nog niet gekoppeld.
        </p>
      ) : recurring.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Er staan geen actieve periodieke facturen in Moneybird.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="squircle p-6" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
              <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
                Afspraken
              </div>
              <div className="text-3xl font-bold" style={{ color: "var(--text-heading)" }}>
                {recurring.length}
              </div>
              {ongekoppeld > 0 && (
                <p className="text-xs mt-1" style={{ color: "#c8901f" }}>
                  {ongekoppeld} niet gekoppeld — telt niet mee
                </p>
              )}
            </div>
            <div className="squircle p-6" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
              <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
                Op jaarbasis
              </div>
              <div className="text-3xl font-bold" style={{ color: "var(--text-heading)" }}>
                {euro(perJaar)}
              </div>
            </div>
          </div>

          <RecurringTable rows={recurring} />
        </>
      )}
    </div>
  );
}
