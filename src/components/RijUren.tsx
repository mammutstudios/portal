"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Plus } from "@phosphor-icons/react";
import { urenOpTaskAction } from "@/lib/actions/timeEntries";

/** 1,5 in plaats van 1.5, en 2 in plaats van 2,00. */
function alsUren(getal: number): string {
  return getal.toFixed(2).replace(/[.,]?0+$/, "").replace(".", ",");
}

/**
 * De geschreven uren in de regel, en er uren bij schrijven.
 *
 * Alleen een getal en een plusje: wanneer je de uren maakte vraagt dit niet,
 * want in een lijst met tasks denk je daar niet over na. De regel komt op
 * vandaag te staan en verschijnt in het weekrooster boven die dag, waar je
 * hem op zijn plek sleept als dat uitmaakt.
 */
export default function RijUren({
  taskId,
  geschreven,
  inschatting,
  onKlaar,
}: {
  taskId: string;
  geschreven: number;
  inschatting: number | null;
  onKlaar: () => void;
}) {
  const [plek, setPlek] = useState<{ x: number; y: number } | null>(null);
  const [uren, setUren] = useState("");
  const [bezig, start] = useTransition();
  const knop = useRef<HTMLButtonElement>(null);
  const paneel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!plek) return;
    function buiten(e: MouseEvent) {
      const doel = e.target as Node;
      if (paneel.current?.contains(doel) || knop.current?.contains(doel)) return;
      setPlek(null);
    }
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") setPlek(null);
    }
    document.addEventListener("mousedown", buiten);
    document.addEventListener("keydown", toets);
    return () => {
      document.removeEventListener("mousedown", buiten);
      document.removeEventListener("keydown", toets);
    };
  }, [plek]);

  function openen() {
    const r = knop.current?.getBoundingClientRect();
    if (!r) return;
    setUren("");
    setPlek({ x: Math.min(r.left, window.innerWidth - 200), y: r.bottom + 2 });
  }

  function schrijf() {
    const getal = Number(uren.trim().replace(",", "."));
    if (!Number.isFinite(getal) || getal <= 0) return;
    setPlek(null);
    start(async () => {
      await urenOpTaskAction(taskId, getal);
      onKlaar();
    });
  }

  return (
    <>
      <button
        ref={knop}
        type="button"
        onClick={openen}
        className="w-full text-left text-sm rounded px-1.5 flex items-center gap-1.5 tabular-nums"
        style={{
          height: 22,
          color: "inherit",
          opacity: bezig ? 0.5 : 1,
          transition: "background 120ms",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {geschreven > 0 ? (
          <span>
            {alsUren(geschreven)}
            {inschatting !== null && (
              <span style={{ opacity: 0.6 }}> / {alsUren(inschatting)}</span>
            )}
          </span>
        ) : (
          <Plus size={13} weight="bold" style={{ opacity: 0.55 }} />
        )}
      </button>

      {plek &&
        createPortal(
          <div
            ref={paneel}
            className="fixed z-50 rounded-lg p-2 flex items-center gap-2"
            style={{
              left: plek.x,
              top: plek.y,
              width: "11rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 32px rgb(20 0 24 / 0.12)",
            }}
          >
            <input
              autoFocus
              inputMode="decimal"
              value={uren}
              onChange={(e) => setUren(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") schrijf();
              }}
              placeholder="1,5"
              className="w-full px-2 py-1 text-sm rounded-md outline-none min-w-0"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-heading)",
              }}
            />
            <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
              uur
            </span>
          </div>,
          document.body,
        )}
    </>
  );
}
