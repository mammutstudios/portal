import { createClient } from "@/lib/supabase/server";
import { getPortalContext, euro, shortDate } from "@/lib/portal";
import PortalEmpty from "../PortalEmpty";

/** Moneybird-statussen zoals de klant ze mag lezen. */
const STATE_STYLE: Record<string, { label: string; bg: string; fg: string; border: string }> = {
  paid: { label: "Betaald", bg: "#f0fdf4", fg: "#1a6b47", border: "#bbf7d0" },
  open: { label: "Open", bg: "#eff6ff", fg: "#1e40af", border: "#bfdbfe" },
  late: { label: "Te laat", bg: "#fef2f2", fg: "#c0392b", border: "#fecaca" },
  reminded: { label: "Herinnerd", bg: "#fff7ed", fg: "#92400e", border: "#fed7aa" },
  scheduled: { label: "Ingepland", bg: "#fefce8", fg: "#92400e", border: "#fde68a" },
  uncollectible: { label: "Oninbaar", bg: "#fef2f2", fg: "#c0392b", border: "#fecaca" },
};

function StateBadge({ state }: { state: string | null }) {
  if (!state) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  const s = STATE_STYLE[state] ?? {
    label: state,
    bg: "var(--bg-secondary)",
    fg: "var(--text-muted)",
    border: "var(--border)",
  };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ background: s.bg, color: s.fg, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  );
}

export default async function PortalInvoicesPage() {
  const { clientIds, activeClientName } = await getPortalContext();
  if (clientIds.length === 0) return <PortalEmpty />;

  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("moneybird_invoices")
    .select("id, invoice_number, reference, state, invoice_date, due_date, total_incl_tax, payload")
    .in("client_id", clientIds)
    // Concepten zijn intern: die heeft de klant nooit gezien.
    .neq("state", "draft")
    .order("invoice_date", { ascending: false, nullsFirst: false });

  const open = (invoices ?? []).filter((i) => i.state !== "paid");
  const openTotal = open.reduce((s, i) => s + (i.total_incl_tax ?? 0), 0);

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Facturen
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        {activeClientName ? `Alle facturen van ${activeClientName}.` : "Al je facturen op één plek."}
        {open.length > 0 && ` ${open.length} openstaand — ${euro(openTotal)} incl. btw.`}
      </p>

      <div className="squircle overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
        {invoices && invoices.length > 0 ? (
          invoices.map((inv, i) => {
            const externalUrl = (inv.payload as { url?: string } | null)?.url ?? null;
            return (
              <div
                key={inv.id}
                className="flex items-center justify-between px-4 py-3 gap-4"
                style={{ borderBottom: i < invoices.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-heading)" }}>
                    {inv.invoice_number ? `${inv.invoice_number} — ` : ""}
                    {inv.reference ?? "Factuur"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {shortDate(inv.invoice_date)}
                    {inv.due_date && ` · vervalt ${shortDate(inv.due_date)}`}
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-sm tabular-nums" style={{ color: "var(--text-heading)" }}>
                    {inv.total_incl_tax != null ? euro(inv.total_incl_tax) : "—"}
                  </span>
                  <StateBadge state={inv.state} />
                  {externalUrl && (
                    <a
                      href={externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium hover:underline"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Bekijken
                    </a>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Er zijn nog geen facturen verstuurd.
          </p>
        )}
      </div>
    </div>
  );
}
