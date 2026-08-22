"use client";

import { useState, useRef, useEffect } from "react";
import { CaretDown, CaretLeft, CaretRight } from "@phosphor-icons/react";

const MONTHS_FULL = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];
const WEEKDAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DatePicker({ name, defaultValue, placeholder = "Kies datum" }: { name: string; defaultValue?: string; placeholder?: string }) {
  const initial = defaultValue ? new Date(defaultValue) : null;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | null>(initial && !isNaN(initial.getTime()) ? initial : null);
  const [viewYear, setViewYear] = useState((selected ?? new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState((selected ?? new Date()).getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const value = selected ? toISO(selected) : "";
  const label = selected
    ? selected.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
    : placeholder;

  // Build calendar grid (Monday-first)
  const firstDay = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;
  const isSelected = (d: number) => selected?.getFullYear() === viewYear && selected?.getMonth() === viewMonth && selected?.getDate() === d;

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-3 py-2 rounded-md text-sm flex items-center justify-between outline-none"
        style={{ border: `1px solid ${open ? "var(--text-heading)" : "var(--border)"}`, background: "var(--bg)", color: selected ? "var(--text)" : "var(--text-muted)" }}
      >
        <span>{label}</span>
        <CaretDown size={14} weight="bold" style={{ color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 rounded-md p-3"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", boxShadow: "0 4px 16px rgb(20 0 24 / 0.1)", width: 260 }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 rounded-md hover:bg-[var(--bg-hover)]">
              <CaretLeft size={14} weight="bold" style={{ color: "var(--text-muted)" }} />
            </button>
            <span className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>{MONTHS_FULL[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="p-1 rounded-md hover:bg-[var(--bg-hover)]">
              <CaretRight size={14} weight="bold" style={{ color: "var(--text-muted)" }} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-xs font-medium py-1" style={{ color: "var(--text-muted)" }}>{w}</div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (d === null) return <div key={`e-${i}`} />;
              const sel = isSelected(d);
              const tdy = isToday(d) && !sel;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setSelected(new Date(viewYear, viewMonth, d)); setOpen(false); }}
                  className="aspect-square rounded-md text-xs font-medium flex items-center justify-center"
                  style={{
                    background: sel ? "var(--text-heading)" : "transparent",
                    color: sel ? "#fff" : "var(--text)",
                    border: tdy ? "1px solid var(--text-heading)" : "1px solid transparent",
                  }}
                  onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = "transparent"; }}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            <button type="button" onClick={() => { setSelected(null); setOpen(false); }} className="text-xs" style={{ color: "var(--text-muted)" }}>
              Wissen
            </button>
            <button type="button" onClick={() => { const t = new Date(); setSelected(t); setViewYear(t.getFullYear()); setViewMonth(t.getMonth()); setOpen(false); }} className="text-xs font-medium" style={{ color: "var(--text-heading)" }}>
              Vandaag
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
