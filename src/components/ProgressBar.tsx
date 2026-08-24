/**
 * Voortgang als laatste regel van de gegevenslijst: label links en percentage
 * rechts, precies als de regels erboven, met de balk eronder. Bewust dezelfde
 * opmaak, zodat het één lijst blijft en niet een blok apart.
 */
export default function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className="px-5 py-3.5">
      <div className="flex items-center justify-between gap-6 mb-2.5">
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>Voortgang</span>
        <span className="text-sm" style={{ color: "var(--text-heading)" }}>{pct}%</span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 6, background: "var(--bg-secondary)" }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--ink)" }} />
      </div>
    </div>
  );
}
