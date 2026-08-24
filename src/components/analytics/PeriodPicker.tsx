"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CaretDown } from "@phosphor-icons/react";
import { PERIODS } from "@/lib/analytics/periods";

/**
 * Periodekiezer: zet ?periode= in de URL, de server haalt de rest op.
 * Gedeeld door de analyticspagina's en het overzicht, zodat die drie
 * dezelfde periodes aanbieden.
 */
export default function PeriodPicker({ current }: { current: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const label = PERIODS.find((p) => p.key === current)?.label ?? "";

  function kies(key: string) {
    const next = new URLSearchParams(params.toString());
    next.set("periode", key);
    setOpen(false);
    router.push(`?${next.toString()}`);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 rounded-lg text-sm"
        style={{ height: 36, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-heading)" }}
      >
        {label}
        <CaretDown size={12} weight="bold" style={{ color: "var(--text-muted)" }} />
      </button>

      {open && (
        <>
          {/* Klik ernaast sluit de lijst */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-1 rounded-lg overflow-hidden z-50 py-1"
            style={{
              minWidth: 200,
              background: "var(--bg)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 32px rgb(20 0 24 / 0.12)",
            }}
          >
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => kies(p.key)}
                className="card-hover w-full text-left px-3 py-2 text-sm"
                style={{
                  color: p.key === current ? "var(--text-heading)" : "var(--text)",
                  fontWeight: p.key === current ? 600 : 400,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
