"use client";

import { useState, useTransition } from "react";
import { linkInvoiceToProjectAction } from "@/lib/actions/projects";

const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

const datum = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

export type KoppelbareFactuur = {
  id: string;
  reference: string | null;
  invoice_date: string | null;
  state: string | null;
  total_excl_tax: number | null;
  project_id: string | null;
};

/**
 * Facturen aan dit project hangen. Moneybird kent geen projecten, dus die
 * koppeling leggen we hier. Getoond worden alleen de facturen van dezelfde
 * klant, want een factuur van een andere organisatie hoort hier nooit bij.
 */
export default function ProjectInvoices({
  projectId,
  invoices,
}: {
  projectId: string;
  invoices: KoppelbareFactuur[];
}) {
  const [pending, startTransition] = useTransition();
  const [bezig, setBezig] = useState<string | null>(null);

  const gekoppeld = invoices.filter((i) => i.project_id === projectId);
  const los = invoices.filter((i) => i.project_id === null);

  function zet(id: string, naar: string | null) {
    setBezig(id);
    startTransition(async () => {
      await linkInvoiceToProjectAction(id, naar);
      setBezig(null);
    });
  }

  function Rij({ f, actie }: { f: KoppelbareFactuur; actie: "koppelen" | "loskoppelen" }) {
    return (
      <div
        className="flex items-center justify-between gap-4 px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-sm truncate" style={{ color: "var(--text-heading)" }}>
          {f.reference ?? "Factuur"}
          {f.state === "draft" && (
            <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>concept</span>
          )}
        </span>
        <span className="flex items-center gap-4 flex-shrink-0">
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>{datum(f.invoice_date)}</span>
          <span className="text-sm tabular-nums" style={{ color: "var(--text-heading)" }}>
            {f.total_excl_tax != null ? euro(f.total_excl_tax) : "—"}
          </span>
          <button
            onClick={() => zet(f.id, actie === "koppelen" ? projectId : null)}
            disabled={pending && bezig === f.id}
            className="text-xs font-medium hover:underline whitespace-nowrap"
            style={{ color: "var(--text-muted)", opacity: pending && bezig === f.id ? 0.5 : 1 }}
          >
            {actie === "koppelen" ? "Koppelen" : "Loskoppelen"}
          </button>
        </span>
      </div>
    );
  }

  return (
    <section className="mb-10">
      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-heading)" }}>Facturen</h2>

      <div
        className="squircle overflow-hidden mb-4 [&>*:last-child]:border-b-0"
        style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
      >
        {gekoppeld.length > 0 ? (
          gekoppeld.map((f) => <Rij key={f.id} f={f} actie="loskoppelen" />)
        ) : (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Nog geen facturen aan dit project gekoppeld.
          </p>
        )}
      </div>

      {los.length > 0 && (
        <details>
          <summary className="text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
            {los.length} {los.length === 1 ? "factuur" : "facturen"} van deze klant nog niet aan een
            project gekoppeld
          </summary>
          <div
            className="squircle overflow-hidden mt-2 [&>*:last-child]:border-b-0"
            style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
          >
            {los.map((f) => <Rij key={f.id} f={f} actie="koppelen" />)}
          </div>
        </details>
      )}
    </section>
  );
}
