/**
 * Wat er op het scherm staat zolang een pagina zijn gegevens ophaalt.
 *
 * Bewust in dezelfde maten als de echte pagina's (titel, ondertitel, een kaart
 * met regels), zodat er niets verspringt zodra de inhoud binnenkomt.
 */
export default function PageSkeleton({
  rijen = 5,
  breed = false,
}: {
  rijen?: number;
  /** De brede variant hoort bij pagina's zonder max-w-5xl, zoals analytics. */
  breed?: boolean;
}) {
  return (
    <div
      className={`px-4 py-6 md:px-10 md:py-10 animate-pulse ${breed ? "" : "max-w-5xl mx-auto"}`}
      aria-hidden
    >
      <div className="h-8 rounded mb-3" style={{ width: 220, background: "var(--border)" }} />
      <div className="h-3.5 rounded mb-8" style={{ width: 320, background: "var(--border)" }} />

      <div className="squircle overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
        {Array.from({ length: rijen }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-4 gap-4"
            style={{ borderBottom: i < rijen - 1 ? "1px solid var(--border)" : "none" }}
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 rounded" style={{ width: `${55 - i * 6}%`, background: "var(--border)" }} />
              <div className="h-3 rounded" style={{ width: `${35 - i * 4}%`, background: "var(--border)", opacity: 0.6 }} />
            </div>
            <div className="h-3.5 rounded flex-shrink-0" style={{ width: 64, background: "var(--border)" }} />
          </div>
        ))}
      </div>
    </div>
  );
}
