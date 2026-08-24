"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";

/**
 * Een waarde die je met één klik overneemt: een hexcode, een curve, een maat.
 *
 * De knop houdt zijn eigen breedte vast tijdens de bevestiging, anders springt
 * de regel eromheen op het moment dat "Gekopieerd" verschijnt.
 */
export default function CopyValue({
  value,
  label,
  className = "",
  style,
  tone = "default",
}: {
  /** Wat er op het klembord komt. */
  value: string;
  /** Wat er op de knop staat; standaard de waarde zelf. */
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  /** "op-kleur" neemt de tekstkleur van de ondergrond over. */
  tone?: "default" | "op-kleur";
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Zonder klembord (oudere browser, geen https) heeft de bevestiging
      // geen zin: dan gebeurt er zichtbaar niets, wat klopt.
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1400);
  }

  const opKleur = tone === "op-kleur";

  return (
    <button
      type="button"
      onClick={copy}
      title={`Kopieer ${value}`}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${className}`}
      style={{
        background: opKleur ? "rgb(255 255 255 / 0.15)" : "var(--bg-secondary)",
        color: opKleur ? "inherit" : "var(--text-heading)",
        transition: "background 150ms var(--ease-osmo)",
        ...style,
      }}
    >
      {copied ? <Check size={12} weight="bold" /> : <Copy size={12} weight="bold" />}
      <span>{copied ? "Gekopieerd" : label ?? value}</span>
    </button>
  );
}
