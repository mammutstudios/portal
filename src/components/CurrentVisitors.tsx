"use client";

import { useEffect, useState } from "react";
import { currentVisitorsAction } from "@/lib/actions/analytics";

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
    const tik = async () => {
      const n = await currentVisitorsAction(siteId);
      if (!gestopt && n !== null) setAantal(n);
    };
    // Meteen één keer, niet pas na de eerste dertig seconden. Zo hoeft de
    // server dit getal niet vooraf op te halen: dat was de enige vraag aan
    // Plausible die niet gecachet mocht worden, en die hield de hele pagina op.
    tik();
    const id = setInterval(tik, 30_000);
    return () => { gestopt = true; clearInterval(id); };
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
