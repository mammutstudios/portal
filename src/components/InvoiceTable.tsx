"use client";

import ClientLogo from "@/components/ClientLogo";

export type MoneybirdInvoice = {
  id: string;
  moneybird_id: string;
  invoice_number: string | null;
  reference: string | null;
  state: string | null;
  invoice_date: string | null;
  total_excl_tax: number | null;
  total_incl_tax: number | null;
  contact_name: string | null;
  client_id: string | null;
  synced_at: string | null;
  clients?: { id: string; name: string; logo_url: string | null } | null;
  /** Link naar de factuur bij Moneybird; alleen gevuld in het klantportaal. */
  external_url?: string | null;
};

const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Alleen de maand, uitgeschreven: "Oktober". */
const fmtMonth = (d: string) => {
  const m = new Date(d).toLocaleDateString("nl-NL", { month: "long" });
  return m.charAt(0).toUpperCase() + m.slice(1);
};

/**
 * Statuslabels en -kleuren. De logica volgt hoeveel aandacht iets verdient:
 * nog niets verstuurd is wit met een rand, openstaand is ink en springt eruit,
 * actie nodig is oker of rood, en binnen is lavendel en zakt naar de achtergrond.
 */
const STATE_STYLE: Record<
  string,
  { label: string; bg: string; fg: string; border?: string }
> = {
  draft: { label: "Concept", bg: "var(--bg)", fg: "var(--ink)", border: "var(--border)" },
  scheduled: { label: "Ingepland", bg: "var(--bg)", fg: "var(--ink)", border: "var(--border)" },
  open: { label: "Openstaand", bg: "var(--ink)", fg: "#fff" },
  pending_payment: { label: "Betaling onderweg", bg: "var(--lavender)", fg: "var(--ink)" },
  reminded: { label: "Herinnerd", bg: "#c8901f", fg: "#fff" },
  late: { label: "Te laat", bg: "#b0413e", fg: "#fff" },
  uncollectible: { label: "Oninbaar", bg: "#b0413e", fg: "#fff" },
  paid: { label: "Betaald", bg: "var(--lavender)", fg: "var(--ink)" },
};

function StateBadge({ state }: { state: string | null }) {
  if (!state) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  const s = STATE_STYLE[state] ?? { label: state, bg: "var(--bg)", fg: "var(--ink)", border: "var(--border)" };
  return (
    <span
      className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap"
      style={{
        minWidth: 110,
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
 * De factuurtabel, gedeeld door de facturenpagina en het finance-overzicht.
 * Bedragen zijn exclusief btw, net als overal elders in de finance-sectie.
 */
export default function InvoiceTable({
  invoices,
  emptyLabel = "Geen facturen.",
  dateLabel = "Factuurdatum",
  dateFormat = "full",
  showStatus = true,
  showClient = true,
  showNumber = false,
  amount = "excl",
  amountLabel = "Bedrag",
}: {
  invoices: MoneybirdInvoice[];
  emptyLabel?: string;
  /** Bij concepten is de datum een verwachting, geen feit. */
  dateLabel?: string;
  /** "month" toont alleen de uitgeschreven maand — genoeg voor een verwachting. */
  dateFormat?: "full" | "month";
  /** Uit te zetten wanneer alle rijen dezelfde status hebben. */
  showStatus?: boolean;
  /** Uit te zetten in het klantportaal: daar is elke factuur van dezelfde klant. */
  showClient?: boolean;
  /** Het factuurnummer vóór het kenmerk; de klant betaalt daarop. */
  showNumber?: boolean;
  /** De klant ziet wat hij betaalt, wij rekenen intern exclusief btw. */
  amount?: "excl" | "incl";
  amountLabel?: string;
}) {
  const kolommen = 2 + (showClient ? 1 : 0) + 1 + (showStatus ? 1 : 0);
  const bedrag = (inv: MoneybirdInvoice) =>
    amount === "incl" ? inv.total_incl_tax : inv.total_excl_tax;
  return (
      <div className="squircle overflow-x-auto" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
        <table className="w-full text-left">
          <thead>
            <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
              <th className="px-4 font-semibold" style={{ color: "var(--ink)" }}>Kenmerk</th>
              <th className="px-4 whitespace-nowrap font-semibold" style={{ color: "var(--ink)" }}>{dateLabel}</th>
              {showClient && (
                <th className="px-4 font-semibold" style={{ color: "var(--ink)" }}>Klant</th>
              )}
              <th className="px-4 text-right whitespace-nowrap font-semibold" style={{ color: "var(--ink)" }}>
                {amountLabel}
              </th>
              {showStatus && (
                <th className="pl-4 pr-8 text-left font-semibold" style={{ color: "var(--ink)" }}>Status</th>
              )}
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={kolommen} className="px-4 text-center" style={{ color: "var(--text-muted)" }}>
                  {emptyLabel}
                </td>
              </tr>
            )}
            {invoices.map((inv, i) => (
              <tr
                key={inv.id}
                style={{
                  borderBottom: i < invoices.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <td
                  className="px-4 max-w-[16rem] truncate"
                  style={{ color: "var(--text-muted)" }}
                  title={inv.reference ?? undefined}
                >
                  {showNumber && inv.invoice_number ? `${inv.invoice_number} — ` : ""}
                  {inv.reference ?? "—"}
                </td>
                <td className="px-4 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                  {inv.invoice_date ? (dateFormat === "month" ? fmtMonth(inv.invoice_date) : fmtDate(inv.invoice_date)) : ""}
                </td>
                {showClient && (
                  <td className="px-4">
                    {inv.clients ? (
                      <span className="flex items-center gap-2.5 whitespace-nowrap">
                        <ClientLogo logo_url={inv.clients.logo_url} name={inv.clients.name} />
                        {inv.clients.name}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>
                        {inv.contact_name ?? "niet gekoppeld"}
                      </span>
                    )}
                  </td>
                )}
                <td className="px-4 text-right whitespace-nowrap" style={{ color: "var(--text-heading)" }}>
                  {bedrag(inv) != null ? euro(bedrag(inv)!) : "—"}
                </td>
                {showStatus && (
                  <td className="pl-4 pr-8 text-left">
                    <span className="flex items-center gap-4">
                      <StateBadge state={inv.state} />
                      {inv.external_url && (
                        <a
                          href={inv.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium hover:underline whitespace-nowrap"
                          style={{ color: "var(--text-muted)" }}
                        >
                          Bekijken
                        </a>
                      )}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  );
}
