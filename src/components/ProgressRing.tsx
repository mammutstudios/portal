const INK = "#140018";

/**
 * Voortgang als ring, met het percentage in het midden.
 *
 * De boog begint bovenaan en loopt met de klok mee; het bolletje markeert waar
 * hij eindigt, zodat ook een kleine boog zichtbaar blijft.
 */
export default function ProgressRing({ value, size = 132 }: { value: number; size?: number }) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));

  const dikte = 12;
  const straal = (size - dikte) / 2;
  const midden = size / 2;
  const omtrek = 2 * Math.PI * straal;

  // Begin bovenaan: een kwartslag terug ten opzichte van de nul van een cirkel.
  const hoek = (pct / 100) * 2 * Math.PI - Math.PI / 2;
  const puntX = midden + straal * Math.cos(hoek);
  const puntY = midden + straal * Math.sin(hoek);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={midden}
          cy={midden}
          r={straal}
          fill="none"
          stroke="var(--bg-secondary)"
          strokeWidth={dikte}
        />
        <circle
          cx={midden}
          cy={midden}
          r={straal}
          fill="none"
          stroke={INK}
          strokeWidth={dikte}
          strokeLinecap="round"
          strokeDasharray={omtrek}
          strokeDashoffset={omtrek * (1 - pct / 100)}
          transform={`rotate(-90 ${midden} ${midden})`}
        />
        {pct > 0 && (
          <circle cx={puntX} cy={puntY} r={dikte / 2 - 2} fill="var(--white)" stroke={INK} strokeWidth={2} />
        )}
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
          {pct}
          <span className="text-lg font-bold" style={{ color: "var(--text-muted)" }}>%</span>
        </span>
      </div>
    </div>
  );
}
