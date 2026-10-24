"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ClientLogo from "@/components/ClientLogo";

export type KiezerOptie = {
  waarde: string;
  label: string;
  /** Logo van een klant: een vierkantje met een rand. */
  logo?: string | null;
  /** Portret van een teamlid: een rondje. Null wordt de eerste letter. */
  avatar?: string | null;
  soort?: "klant" | "persoon";
};

/**
 * Een waarde aanpassen vanuit de tabelregel zelf.
 *
 * Het paneel hangt in een portal aan de body en niet in de cel. De tabel zit
 * in een vak dat horizontaal schuift, en zo'n vak knipt ook verticaal af: een
 * lijstje onder de laatste regel zou je dan half zien. Daarom een vaste plek
 * op het scherm, berekend uit waar de cel staat op het moment van openen.
 *
 * Met de muis op de regel blijft de cel leeg tot je erin klikt: elke cel een
 * randje geven maakt van een lijst een formulier, en je leest hem vaker dan
 * dat je hem invult.
 */
export default function RijKiezer({
  waarde,
  opties,
  leegLabel = "Geen",
  zoekPlaatshouder,
  onKies,
  children,
}: {
  waarde: string | null;
  opties: KiezerOptie[];
  /** Wat de lege keuze heet: "Niemand" leest anders dan "Geen klant". */
  leegLabel?: string;
  zoekPlaatshouder?: string;
  onKies: (waarde: string | null) => void;
  /** Hoe de cel eruitziet als hij dicht staat. */
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [zoek, setZoek] = useState("");
  const [plek, setPlek] = useState<{ x: number; y: number } | null>(null);
  const knop = useRef<HTMLButtonElement>(null);
  const paneel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function buiten(e: MouseEvent) {
      const doel = e.target as Node;
      if (paneel.current?.contains(doel) || knop.current?.contains(doel)) return;
      setOpen(false);
    }
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    // Scrollen laat het paneel achter op een plek die niets meer aanwijst;
    // dan is dichtklappen eerlijker dan meeschuiven.
    function weg() {
      setOpen(false);
    }

    document.addEventListener("mousedown", buiten);
    document.addEventListener("keydown", toets);
    window.addEventListener("scroll", weg, true);
    window.addEventListener("resize", weg);
    return () => {
      document.removeEventListener("mousedown", buiten);
      document.removeEventListener("keydown", toets);
      window.removeEventListener("scroll", weg, true);
      window.removeEventListener("resize", weg);
    };
  }, [open]);

  function openen() {
    const r = knop.current?.getBoundingClientRect();
    if (!r) return;
    // Past het er onder de cel niet meer bij, dan klapt hij omhoog.
    const hoogte = 300;
    const naarBoven = r.bottom + hoogte > window.innerHeight && r.top > hoogte;
    setPlek({
      x: Math.min(r.left, window.innerWidth - 240),
      y: naarBoven ? r.top - 2 - hoogte : r.bottom + 2,
    });
    setZoek("");
    setOpen(true);
  }

  function kies(nieuw: string | null) {
    setOpen(false);
    if (nieuw !== waarde) onKies(nieuw);
  }

  const term = zoek.trim().toLowerCase();
  const zichtbaar = term ? opties.filter((o) => o.label.toLowerCase().includes(term)) : opties;

  return (
    <>
      <button
        ref={knop}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openen();
        }}
        className="w-full text-left text-sm rounded px-1.5 flex items-center min-w-0"
        style={{
          height: 22,
          color: "inherit",
          background: open ? "var(--bg-hover)" : "transparent",
          transition: "background 120ms",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = "transparent";
        }}
      >
        {children}
      </button>

      {open && plek && createPortal(
        <div
          ref={paneel}
          onClick={(e) => e.stopPropagation()}
          className="fixed rounded-lg overflow-hidden z-50 flex flex-col"
          style={{
            left: plek.x,
            top: plek.y,
            width: "15rem",
            maxHeight: 300,
            background: "var(--bg)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 32px rgb(20 0 24 / 0.12)",
          }}
        >
          {/* Zoeken alleen als er genoeg staat om in te zoeken: bij drie
              namen is een invoerveld een extra handeling voor niets. */}
          {opties.length > 7 && (
            <div className="p-2 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              <input
                autoFocus
                value={zoek}
                onChange={(e) => setZoek(e.target.value)}
                placeholder={zoekPlaatshouder ?? "Zoeken..."}
                className="w-full px-2 py-1 text-sm rounded-md outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>
          )}

          <div className="overflow-y-auto py-1">
            <Regel gekozen={waarde === null} onKlik={() => kies(null)}>
              <span style={{ color: "var(--text-muted)" }}>{leegLabel}</span>
            </Regel>

            {zichtbaar.map((o) => (
              <Regel key={o.waarde} gekozen={waarde === o.waarde} onKlik={() => kies(o.waarde)}>
                {o.soort === "klant" && <ClientLogo logo_url={o.logo ?? null} name={o.label} size="xs" />}
                {o.soort === "persoon" && <Portret naam={o.label} url={o.avatar ?? null} />}
                <span className="truncate">{o.label}</span>
              </Regel>
            ))}

            {zichtbaar.length === 0 && (
              <p className="px-3 py-2 text-sm" style={{ color: "var(--text-muted)" }}>
                Niets gevonden
              </p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function Regel({
  gekozen,
  onKlik,
  children,
}: {
  gekozen: boolean;
  onKlik: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onKlik}
      className="w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 min-w-0"
      style={{
        color: "var(--text-heading)",
        background: gekozen ? "var(--bg-hover)" : "transparent",
        fontWeight: gekozen ? 500 : 400,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = gekozen ? "var(--bg-hover)" : "transparent")}
    >
      {children}
    </button>
  );
}

function Portret({ naam, url }: { naam: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={naam} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <span
      className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white"
      style={{ background: "var(--text-heading)", fontSize: "0.5625rem" }}
    >
      {naam.charAt(0).toUpperCase()}
    </span>
  );
}
