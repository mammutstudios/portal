"use client";

import { useEffect, useState } from "react";

/** Groene stip met het aantal bezoekers van nu; ververst elke 30 seconden. */
export default function CurrentVisitors({
  siteId,
  initial,
}: {
  siteId: string;
  initial: number | null;
}) {
  const [aantal, setAantal] = useState(initial);

  useEffect(() => {
    let gestopt = false;
    const controller = new AbortController();

    // Een gewone fetch naar een route handler, bewust geen server action:
    // die laatste is een POST naar de huidige route en laat Next de hele
    // pagina opnieuw renderen. Voor een tikker om de dertig seconden betekende
    // dat elk half minuut alle queries van het scherm opnieuw.
    const tik = async () => {
      try {
        const res = await fetch(`/api/analytics/bezoekers-nu?site=${encodeURIComponent(siteId)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const { bezoekers } = (await res.json()) as { bezoekers: number | null };
        if (!gestopt && bezoekers !== null) setAantal(bezoekers);
      } catch {
        // Een teller die er even niet is mag nooit de pagina stukmaken.
      }
    };

    tik();
    const id = setInterval(tik, 30_000);
    return () => {
      gestopt = true;
      controller.abort();
      clearInterval(id);
    };
  }, [siteId]);

  if (aantal === null) return null;

  return (
    <span className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
      <span
        aria-hidden
        className="inline-block rounded-full"
        style={{ width: 8, height: 8, background: aantal > 0 ? "#16a34a" : "var(--border)" }}
      />
      {aantal} {aantal === 1 ? "bezoeker" : "bezoekers"} nu
    </span>
  );
}
