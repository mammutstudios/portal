"use client";

import { useState, useRef, useEffect } from "react";
import { CaretDown } from "@phosphor-icons/react";

export type SelectOption = {
  value: string;
  label: string;
  /**
   * Een optie die als gekleurd label hoort te lezen, zoals een status of een
   * prioriteit. Zonder dit is het gewone tekst. Staat hier en niet bij de
   * aanroeper, zodat de kleur in de lijst dezelfde is als op de knop: anders
   * kies je een geel label en krijg je zwarte tekst terug.
   */
  kleur?: { bg: string; text: string; border: string };
};

function Label({ optie }: { optie: SelectOption }) {
  if (!optie.kleur) return <span className="truncate">{optie.label}</span>;
  return (
    <span
      className="px-2 py-0.5 rounded-md text-xs font-medium"
      style={{
        background: optie.kleur.bg,
        color: optie.kleur.text,
        border: `1px solid ${optie.kleur.border}`,
      }}
    >
      {optie.label}
    </span>
  );
}

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
  onChange,
  startOpen = false,
  onSluiten,
  subtle = false,
}: {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  /** Voor inline bewerken: de keuze meteen wegschrijven, zonder formulier. */
  onChange?: (waarde: string) => void;
  /**
   * Meteen open bij het monteren. Voor inline bewerken: daar heb je al
   * geklikt om het veld tevoorschijn te halen, en een tweede klik om het
   * open te krijgen is er een te veel.
   */
  startOpen?: boolean;
  /**
   * Dichtgeklapt zonder iets te kiezen. Voor inline bewerken: de regel moet
   * dan terug naar zijn gewone weergave, anders blijf je met een leeg
   * keuzeveld zitten waar eerst een waarde stond.
   */
  onSluiten?: () => void;
  /**
   * Ingetogen: geen eigen vlak en geen rand, alleen een oplichting als je er
   * overheen gaat, en krapper. Voor inline bewerken in een lijst, waar een
   * volwaardig invoerveld de regel opblaast. Zelfde betekenis als de gelijk-
   * namige optie op SearchSelect.
   */
  subtle?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [value, setValue] = useState(defaultValue ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        onSluiten?.();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
    // onSluiten is bij elke render een nieuwe functie; hem in de lijst zetten
    // zou de luisteraar elke keer opnieuw ophangen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gekozen = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => {
          if (open) onSluiten?.();
          setOpen((o) => !o);
        }}
        className={`w-full rounded-md text-sm flex items-center justify-between outline-none ${subtle ? "px-2 py-1.5" : "px-3 py-2"}`}
        style={{
          border: subtle ? "1px solid transparent" : `1px solid ${open ? "var(--text-heading)" : "var(--border)"}`,
          background: subtle ? "transparent" : "var(--bg)",
          color: gekozen ? "var(--text)" : "var(--text-muted)",
        }}
        onMouseEnter={(e) => { if (subtle) e.currentTarget.style.background = "var(--bg-hover)"; }}
        onMouseLeave={(e) => { if (subtle) e.currentTarget.style.background = "transparent"; }}
      >
        {gekozen ? <Label optie={gekozen} /> : <span className="truncate">{placeholder}</span>}
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
                onChange?.(o.value);
              }}
              className="card-hover w-full text-left px-3 py-2 text-sm flex items-center"
              style={{
                color: o.value === value ? "var(--text-heading)" : "var(--text)",
                fontWeight: o.kleur ? 400 : o.value === value ? 600 : 400,
              }}
            >
              <Label optie={o} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
