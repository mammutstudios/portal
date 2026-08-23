/**
 * Voortgang als balk in een donker vlak, bedoeld voor de call-out onderin de
 * gegevenslijst. Donker met een witte balk, zodat hij opvalt tussen de rustige
 * regels erboven.
 */
export default function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className="squircle px-4 py-3.5" style={{ background: "var(--ink)" }}>
      <div className="flex items-baseline justify-between mb-2.5">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "color-mix(in srgb, var(--white) 65%, transparent)" }}
        >
          Voortgang
        </span>
        <span className="text-sm font-bold" style={{ color: "var(--white)" }}>{pct}%</span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 8, background: "color-mix(in srgb, var(--white) 22%, transparent)" }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--white)" }} />
      </div>
    </div>
  );
}
