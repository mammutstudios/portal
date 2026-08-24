const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

const kortDatum = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }) : "";

/** Statuslabels zoals ze in de rest van de app heten. */
const STATE: Record<string, { label: string; bg: string; fg: string; border?: string }> = {
  draft: { label: "Concept", bg: "var(--bg)", fg: "var(--ink)", border: "var(--border)" },
  scheduled: { label: "Ingepland", bg: "var(--bg)", fg: "var(--ink)", border: "var(--border)" },
  open: { label: "Openstaand", bg: "var(--ink)", fg: "#fff" },
  pending_payment: { label: "Betaling onderweg", bg: "var(--lavender)", fg: "var(--ink)" },
  reminded: { label: "Herinnerd", bg: "#c8901f", fg: "#fff" },
  late: { label: "Te laat", bg: "#b0413e", fg: "#fff" },
  uncollectible: { label: "Oninbaar", bg: "#b0413e", fg: "#fff" },
  paid: { label: "Betaald", bg: "var(--lavender)", fg: "var(--ink)" },
};

export type ProjectInvoice = {
  id: string;
  reference: string | null;
  invoice_date: string | null;
  state: string | null;
  bedrag: number | null;
};

/**
 * De facturen van dit project, compact naast de gegevens. Alleen kenmerk,
 * datum, bedrag en status: het volledige overzicht staat op de facturenpagina.
 */
export default function ProjectInvoiceCard({
  invoices,
  hrefPerFactuur = false,
}: {
  invoices: ProjectInvoice[];
  /** In het portaal opent een regel de PDF; in het dashboard niet. */
  hrefPerFactuur?: boolean;
}) {
  if (invoices.length === 0) return null;

  return (
    <div
      className="squircle overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      <div className="px-5 pt-5 pb-3 text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        Facturen
      </div>

      {invoices.map((f, i) => {
        const s = STATE[f.state ?? ""] ?? {
          label: f.state ?? "—",
          bg: "var(--bg)",
          fg: "var(--ink)",
          border: "var(--border)",
        };

        const inhoud = (
          <>
            <div className="min-w-0">
              <p className="text-sm truncate" style={{ color: "var(--text-heading)" }}>
                {f.reference ?? "Factuur"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {kortDatum(f.invoice_date)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className="text-sm tabular-nums" style={{ color: "var(--text-heading)" }}>
                {f.bedrag != null ? euro(f.bedrag) : "—"}
              </span>
              <span
                className="inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                style={{
                  background: s.bg,
                  color: s.fg,
                  border: `1px solid ${s.border ?? "transparent"}`,
                }}
              >
                {s.label}
              </span>
            </div>
          </>
        );

        const klassen = "flex items-start justify-between gap-4 px-5 py-3";
        const rand = { borderTop: "1px solid var(--border)" } as const;

        return hrefPerFactuur ? (
          <a
            key={f.id}
            href={`/api/facturen/${f.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className={`card-hover cursor-pointer ${klassen}`}
            style={i === 0 ? undefined : rand}
          >
            {inhoud}
          </a>
        ) : (
          <div key={f.id} className={klassen} style={i === 0 ? undefined : rand}>
            {inhoud}
          </div>
        );
      })}
    </div>
  );
}
