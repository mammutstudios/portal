/** Voortgang als balk. Losstaand, zodat hij naast een fase kan staan. */
export default function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div
      className="squircle p-5"
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Voortgang
        </span>
        <span className="text-sm font-bold" style={{ color: "var(--text-heading)" }}>{pct}%</span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 8, background: "var(--bg-secondary)" }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--ink)" }} />
      </div>
    </div>
  );
}
