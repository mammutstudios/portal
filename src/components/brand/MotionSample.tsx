"use client";

import { useState } from "react";
import CopyValue from "./CopyValue";
import type { BrandMotion } from "@/lib/brand/types";

/**
 * Een curve die je ziet in plaats van leest.
 *
 * Het blokje legt de baan af met precies de easing en de duur die eronder
 * staan, dus wie twijfelt of een beweging klopt, kan hem hier naast leggen.
 * Het loopt op hover en op tik, zodat het op een telefoon ook werkt.
 */
export default function MotionSample({ item }: { item: BrandMotion }) {
  const [uit, setUit] = useState(false);

  return (
    <div className="squircle p-4" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
          {item.name}
        </h3>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {item.duration} ms
        </span>
      </div>

      <div
        onMouseEnter={() => setUit(true)}
        onMouseLeave={() => setUit(false)}
        onClick={() => setUit((v) => !v)}
        className="squircle relative overflow-hidden cursor-pointer"
        style={{ background: "var(--bg-secondary)", height: "3rem" }}
      >
        {/* De baan loopt via `left` en niet via een transform: een percentage
            telt daar vanaf de ouder, dus de eindstand klopt zonder de breedte
            te hoeven meten. */}
        <span
          aria-hidden
          className="squircle absolute"
          style={{
            top: "0.375rem",
            width: "2.25rem",
            height: "2.25rem",
            left: uit ? "calc(100% - 2.625rem)" : "0.375rem",
            background: "var(--ink)",
            transitionProperty: "left",
            transitionDuration: `${item.duration}ms`,
            transitionTimingFunction: item.easing,
          }}
        />
      </div>

      {item.usage && (
        <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
          {item.usage}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 mt-3">
        <CopyValue value={item.easing} />
        <CopyValue value={`${item.duration}ms`} />
      </div>
    </div>
  );
}
