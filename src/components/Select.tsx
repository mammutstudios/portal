"use client";

import { useState, useRef, useEffect } from "react";
import { CaretDown } from "@phosphor-icons/react";

export type SelectOption = { value: string; label: string };

/**
 * Een keuzelijst met precies dezelfde knop als DatePicker.
 *
 * Een gewone <select> erft het besturingssysteem: op macOS krijgt hij een
 * dubbele pijl en een net andere hoogte, waardoor hij naast de datumkiezer
 * uit de toon valt. Vandaar dit eigen knopje, met een verborgen input zodat
 * het formulier er niets van merkt.
 */
export default function Select({
  name,
  options,
  defaultValue,
  placeholder = "Kies",
}: {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const gekozen = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2 rounded-md text-sm flex items-center justify-between outline-none"
        style={{
          border: `1px solid ${open ? "var(--text-heading)" : "var(--border)"}`,
          background: "var(--bg)",
          color: gekozen ? "var(--text)" : "var(--text-muted)",
        }}
      >
        <span className="truncate">{gekozen?.label ?? placeholder}</span>
        <CaretDown
          size={14}
          weight="bold"
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md overflow-hidden py-1"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 16px rgb(20 0 24 / 0.1)",
          }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                setValue(o.value);
                setOpen(false);
              }}
              className="card-hover w-full text-left px-3 py-2 text-sm"
              style={{
                color: o.value === value ? "var(--text-heading)" : "var(--text)",
                fontWeight: o.value === value ? 600 : 400,
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
