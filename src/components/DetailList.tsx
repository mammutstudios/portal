import type { ReactNode } from "react";

export type DetailRow = { label: string; value: ReactNode };

/**
 * Label links, waarde rechts, met een lijn ertussen. Rustiger dan een rij
 * losse kaarten wanneer het om gegevens gaat die je naast elkaar leest in
 * plaats van vergelijkt.
 */
export default function DetailList({
  rows,
  callout,
}: {
  rows: DetailRow[];
  /** Blok onderaan in de merkkleur, voor iets dat eruit moet springen. */
  callout?: ReactNode;
}) {
  return (
    <div
      className="squircle overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      {rows.map((r, i) => (
        <div
          key={r.label}
          className="flex items-center justify-between gap-6 px-5 py-3.5"
          style={{
            borderBottom: i < rows.length - 1 || callout ? "1px solid var(--border)" : "none",
          }}
        >
          <span className="text-sm flex-shrink-0" style={{ color: "var(--text-muted)" }}>
            {r.label}
          </span>
          <span className="text-sm text-right" style={{ color: "var(--text-heading)" }}>
            {r.value}
          </span>
        </div>
      ))}

      {callout && (
        <div className="px-5 py-4" style={{ background: "var(--lavender)" }}>
          {callout}
        </div>
      )}
    </div>
  );
}
