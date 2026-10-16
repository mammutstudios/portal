"use client";

import { useEffect, useRef, useState } from "react";
import { FadersHorizontal } from "@phosphor-icons/react";
import ClientLogo from "@/components/ClientLogo";
import { TICKET_STATUS, TICKET_STATUS_ORDER, alsTicketStatus } from "@/lib/tickets";
import type { Task, TaskStatus } from "@/lib/types";

export type Filters = {
  status: TaskStatus[];
  klant: string[];
  wie: string[];
};

/**
 * Alles behalve Klaar staat aan.
 *
 * Een lijst met taken is een lijst met werk dat er nog ligt; wat af is hoort
 * daar niet standaard tussen. Als keuze en niet als verborgen regel, zodat je
 * in het paneel ziet waarom je ze niet ziet.
 */
export const STANDAARD_STATUS: TaskStatus[] = TICKET_STATUS_ORDER.filter((s) => s !== "done");

export const STANDAARD_FILTERS: Filters = { status: STANDAARD_STATUS, klant: [], wie: [] };

function isStandaardStatus(gekozen: TaskStatus[]): boolean {
  return (
    gekozen.length === STANDAARD_STATUS.length &&
    STANDAARD_STATUS.every((s) => gekozen.includes(s))
  );
}

/** De statusgroep telt als één, en alleen als hij van de standaard afwijkt. */
export function aantalActief(f: Filters): number {
  return (isStandaardStatus(f.status) ? 0 : 1) + f.klant.length + f.wie.length;
}

/**
 * Een lege lijst betekent: geen beperking op dat veld. Vink je alle statussen
 * uit, dan zie je ze dus allemaal en niet geen enkele; een leeg scherm na het
 * uitzetten van een filter leest als een fout.
 *
 * statusTelt staat uit op het bord zolang de standaard aanstaat: daar is Klaar
 * een eigen kolom, en die altijd leeg tonen is geen filter maar een gat. Kies
 * je zelf iets anders, dan geldt dat op het bord net zo goed.
 */
export function pasToe(tasks: Task[], f: Filters, statusTelt = true): Task[] {
  const negeerStatus = !statusTelt && isStandaardStatus(f.status);
  return tasks.filter((t) => {
    const status = alsTicketStatus(t.status);
    if (!negeerStatus && f.status.length > 0 && !f.status.includes(status)) {
      return false;
    }
    if (f.klant.length > 0 && !(t.client_id && f.klant.includes(t.client_id))) return false;
    if (f.wie.length > 0 && !(t.assigned_profile_id && f.wie.includes(t.assigned_profile_id))) return false;
    return true;
  });
}

/**
 * Filteren op status, klant en wie hem heeft.
 *
 * De keuzes komen uit de tasks die er zijn en niet uit de database: zo staat
 * er nooit een klant in de lijst waar geen enkele task bij hoort, en kost het
 * scherm geen extra vraag. Zijn er duizenden tasks, dan hoort dit naar de
 * server, maar dan verandert er meer dan alleen dit.
 */
export default function TaskFilter({
  tasks,
  filters,
  onWijzig,
}: {
  tasks: Task[];
  filters: Filters;
  onWijzig: (f: Filters) => void;
}) {
  const [open, setOpen] = useState(false);
  const doos = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function buiten(e: MouseEvent) {
      if (doos.current && !doos.current.contains(e.target as Node)) setOpen(false);
    }
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", buiten);
    document.addEventListener("keydown", toets);
    return () => {
      document.removeEventListener("mousedown", buiten);
      document.removeEventListener("keydown", toets);
    };
  }, []);

  const klanten = uniek(
    tasks
      .filter((t) => t.client_id && t.clients?.name)
      .map((t) => ({ id: t.client_id!, naam: t.clients!.name, logo: t.clients!.logo_url })),
    (k) => k.id,
  ).sort((a, b) => a.naam.localeCompare(b.naam));

  const mensen = uniek(
    tasks
      .filter((t) => t.assigned_profile_id && t.profiles?.full_name)
      .map((t) => ({ id: t.assigned_profile_id!, naam: t.profiles!.full_name! })),
    (p) => p.id,
  ).sort((a, b) => a.naam.localeCompare(b.naam));

  const actief = aantalActief(filters);

  function wissel<K extends keyof Filters>(veld: K, waarde: string) {
    const huidig = filters[veld] as string[];
    const nieuw = huidig.includes(waarde)
      ? huidig.filter((w) => w !== waarde)
      : [...huidig, waarde];
    onWijzig({ ...filters, [veld]: nieuw });
  }

  return (
    <div ref={doos} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 rounded-md text-xs font-medium"
        style={{
          height: 32,
          border: "1px solid var(--border)",
          background: actief > 0 ? "var(--bg-hover)" : "var(--bg)",
          color: actief > 0 ? "var(--text-heading)" : "var(--text-muted)",
        }}
      >
        <FadersHorizontal size={15} weight="bold" />
        Filter
        {actief > 0 && <span className="tabular-nums">({actief})</span>}
      </button>

      {open && (
        <div
          className="absolute left-0 mt-1 rounded-lg overflow-hidden z-50"
          style={{
            width: "16rem",
            maxHeight: "60vh",
            overflowY: "auto",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 32px rgb(20 0 24 / 0.12)",
          }}
        >
          <Groep titel="Status">
            {TICKET_STATUS_ORDER.map((s) => (
              <Regel
                key={s}
                aan={filters.status.includes(s)}
                onKlik={() => wissel("status", s)}
              >
                <span
                  className="px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{
                    background: TICKET_STATUS[s].bg,
                    color: TICKET_STATUS[s].text,
                    border: `1px solid ${TICKET_STATUS[s].border}`,
                  }}
                >
                  {TICKET_STATUS[s].label}
                </span>
              </Regel>
            ))}
          </Groep>

          {klanten.length > 0 && (
            <Groep titel="Klant">
              {klanten.map((k) => (
                <Regel key={k.id} aan={filters.klant.includes(k.id)} onKlik={() => wissel("klant", k.id)}>
                  <ClientLogo logo_url={k.logo} name={k.naam} size="xs" />
                  <span className="truncate">{k.naam}</span>
                </Regel>
              ))}
            </Groep>
          )}

          {mensen.length > 0 && (
            <Groep titel="Toegewezen">
              {mensen.map((p) => (
                <Regel key={p.id} aan={filters.wie.includes(p.id)} onKlik={() => wissel("wie", p.id)}>
                  <span className="truncate">{p.naam}</span>
                </Regel>
              ))}
            </Groep>
          )}

          {actief > 0 && (
            <button
              type="button"
              onClick={() => onWijzig(STANDAARD_FILTERS)}
              className="w-full text-left px-3 py-2 text-xs"
              style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
            >
              Terug naar standaard
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function uniek<T>(rijen: T[], sleutel: (r: T) => string): T[] {
  const gezien = new Map<string, T>();
  for (const r of rijen) if (!gezien.has(sleutel(r))) gezien.set(sleutel(r), r);
  return [...gezien.values()];
}

function Groep({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <p className="px-3 pt-2.5 pb-1 text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {titel}
      </p>
      <div className="pb-1.5">{children}</div>
    </div>
  );
}

function Regel({
  aan,
  onKlik,
  children,
}: {
  aan: boolean;
  onKlik: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onKlik}
      className="w-full text-left px-3 py-1.5 flex items-center gap-2 text-sm min-w-0"
      style={{ color: "var(--text-heading)", transition: "background 120ms" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
    >
      <span
        className="w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center"
        style={{
          border: `1.5px solid ${aan ? "var(--text-heading)" : "var(--border)"}`,
          background: aan ? "var(--text-heading)" : "transparent",
        }}
      >
        {aan && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {children}
    </button>
  );
}
