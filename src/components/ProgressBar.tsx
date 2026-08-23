/**
 * Voortgang als balk, bedoeld voor de call-out onderin de gegevenslijst. Hij
 * tekent geen eigen kaart: de achtergrond komt van het blok eromheen.
 */
export default function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink)" }}>
          Voortgang
        </span>
        <span className="text-sm font-bold" style={{ color: "var(--ink)" }}>{pct}%</span>
      </div>
      <div
        className="w-full rounded-full overflow-hidden"
        // Lichter dan de lavendel eromheen, zodat de baan zichtbaar blijft.
        style={{ height: 8, background: "color-mix(in srgb, var(--white) 55%, var(--lavender))" }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--ink)" }} />
      </div>
    </div>
  );
}
