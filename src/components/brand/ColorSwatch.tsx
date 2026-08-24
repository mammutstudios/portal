"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "@phosphor-icons/react";
import { isDarkHex, type BrandColor } from "@/lib/brand/types";

/**
 * Eén kleur uit het palet. De hele staal is de knop: klikken zet de hexcode op
 * het klembord, met de bevestiging in de kleur zelf zodat de rij niet
 * verspringt.
 */
export default function ColorSwatch({ color }: { color: BrandColor }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const donker = isDarkHex(color.hex);
  const hex = color.hex.toUpperCase();

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(hex);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`Kopieer ${hex}`}
      className="squircle overflow-hidden text-left w-full"
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      <span
        className="flex items-end justify-between gap-2 p-3"
        style={{
          background: color.hex,
          height: "6.5rem",
          // Lichte kleuren lopen anders in het witte vlak eronder over.
          borderBottom: "1px solid var(--border)",
          color: donker ? "#fff" : "var(--ink)",
        }}
      >
        <span className="text-xs font-medium" style={{ opacity: copied ? 1 : 0.75 }}>
          {copied ? (
            <span className="inline-flex items-center gap-1">
              <Check size={12} weight="bold" /> Gekopieerd
            </span>
          ) : (
            hex
          )}
        </span>
      </span>

      <span className="block px-3 py-2.5">
        <span className="block text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
          {color.name}
        </span>
        {color.usage && (
          <span className="block text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {color.usage}
          </span>
        )}
        {color.extra?.map((e) => (
          <span key={e.label} className="block text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {e.label}: {e.value}
          </span>
        ))}
      </span>
    </button>
  );
}
