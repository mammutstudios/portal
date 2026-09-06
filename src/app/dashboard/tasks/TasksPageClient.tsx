"use client";

import { useState, useMemo, useEffect, useRef, useSyncExternalStore } from "react";
import { updateTaskStatusAction } from "@/lib/actions/tasks";
import TicketKanban from "@/components/TicketKanban";
import { Rows, Kanban, MagnifyingGlass } from "@phosphor-icons/react";
import { TICKET_STATUS, TICKET_STATUS_ORDER } from "@/lib/tickets";

type Weergave = "lijst" | "kanban";

/**
 * Lijst of kanban is een voorkeur van jou, niet van een ticket: hij moet blijven
 * staan als je terugkomt. Zonder opgeslagen voorkeur is het de kanban.
 * localStorage bestaat alleen in de browser, dus de server rendert de
 * standaard en useSyncExternalStore wisselt daarna om naar wat jij koos.
 * Dat is de reden voor dit winkeltje in plaats van een useState met een effect
 * eromheen: bij dat laatste wijkt de eerste render af van de HTML die de
 * server stuurde, en dat is een hydratiefout.
 */
const WEERGAVE_SLEUTEL = "tickets-weergave";

const weergaveLuisteraars = new Set<() => void>();
let weergaveNu: Weergave | null = null;

function leesWeergave(): Weergave {
  if (weergaveNu === null) {
    weergaveNu = localStorage.getItem(WEERGAVE_SLEUTEL) === "lijst" ? "lijst" : "kanban";
  }
  return weergaveNu;
}

function schrijfWeergave(nieuwe: Weergave) {
  weergaveNu = nieuwe;
  localStorage.setItem(WEERGAVE_SLEUTEL, nieuwe);
  weergaveLuisteraars.forEach((melden) => melden());
}

function abonneerOpWeergave(melden: () => void) {
  weergaveLuisteraars.add(melden);
  return () => {
    weergaveLuisteraars.delete(melden);
  };
}
import Link from "next/link";
import ClientLogo from "@/components/ClientLogo";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStatus } from "@/lib/types";
import Button, { ButtonLink } from "@/components/Button";

function StatusCycle({ task }: { task: Task }) {
  const currentIdx = TICKET_STATUS_ORDER.indexOf(task.status);
  const next = TICKET_STATUS_ORDER[(currentIdx + 1) % TICKET_STATUS_ORDER.length];

  return (
    <form action={updateTaskStatusAction}>
      <input type="hidden" name="id" value={task.id} />
      <input type="hidden" name="status" value={next} />
      <button
        type="submit"
        title={`Zet naar: ${TICKET_STATUS[next].label}`}
        className="px-2 py-0.5 rounded-md text-xs font-medium"
        style={{
          background: TICKET_STATUS[task.status].bg,
          color: TICKET_STATUS[task.status].text,
          border: `1px solid ${TICKET_STATUS[task.status].border}`,
        }}
      >
        {TICKET_STATUS[task.status].label}
      </button>
    </form>
  );
}

// De lijsten voor het bewerkformulier zaten hier ook in, maar dat formulier
// staat nu op de ticketpagina en haalt ze daar zelf op.
export default function TasksPageClient({ tasks }: { tasks: Task[] }) {
  const [zoek, setZoek] = useState("");
  const router = useRouter();
  const weergave = useSyncExternalStore(
    abonneerOpWeergave,
    leesWeergave,
    // Wat de server rendert zolang er nog geen browser is om localStorage te
    // lezen. Moet gelijk zijn aan de standaard hierboven, anders wisselt het
    // scherm meteen na het laden van weergave.
    () => "kanban" as Weergave,
  );

  const openCount = tasks.filter((t) => t.status !== "done").length;

  /**
   * Zoeken doet de browser, niet de server: alle tickets staan hier al. Zodra
   * dat er duizenden worden hoort dit naar een query, maar dan is de lijst ook
   * te lang om in één keer op te halen en verandert er meer dan alleen dit.
   *
   * Het zoekt over alles wat op een kaart staat, want daar zoek je op: de
   * titel, de omschrijving, het project, de organisatie en de naam van wie
   * hem heeft of hem indiende.
   */
  const zichtbaar = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    if (!term) return tasks;
    return tasks.filter((t) =>
      [
        t.title,
        t.description,
        t.projects?.title,
        t.clients?.name,
        t.profiles?.full_name,
        t.contacts?.name,
        t.created_by_profile?.full_name,
      ].some((veld) => veld?.toLowerCase().includes(term)),
    );
  }, [tasks, zoek]);

  // Geen max-width zoals de andere pagina's: de kanban telt vier kolommen en
  // die passen niet in een leesbreedte.
  return (
    <div className="px-4 py-6 md:px-10 md:py-10">
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Tickets <span className="text-2xl font-normal" style={{ color: "var(--text-muted)" }}>({openCount})</span>
      </h1>

      {/* Eén wit vlak om de hele weergave: de wissel en de knop horen bij wat
          eronder staat, niet bij de paginatitel. De lijst en de kanban delen
          dat vlak, zodat het omschakelen alleen de inhoud verwisselt en niet
          het kader eromheen. */}
      <div
        className="squircle overflow-hidden mt-6"
        style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
      >
        <div
          className="flex items-center justify-between gap-2 px-5 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <label
            className="flex items-center gap-2 px-3 rounded-lg min-w-0"
            style={{ height: 40, maxWidth: "20rem", flex: "1 1 12rem", border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
          >
            <MagnifyingGlass size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
              placeholder="Zoeken in tickets"
              className="flex-1 min-w-0 bg-transparent outline-none text-sm"
              style={{ color: "var(--text-heading)" }}
            />
          </label>

          <div className="flex items-center gap-2 self-stretch">
          <WeergaveWissel weergave={weergave} onKies={schrijfWeergave} />
          <ButtonLink href="/dashboard/tasks/nieuw">
            + Nieuw ticket
          </ButtonLink>
          </div>
        </div>

      {weergave === "kanban" ? (
        <div className="px-5 py-4">
          <TicketKanban tasks={zichtbaar} />
        </div>
      ) : (
      <div className="overflow-x-auto">
        {zichtbaar.length > 0 ? (
          <table className="w-full min-w-[40rem]">
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                {/* De rij hierboven en de knoppenrij erboven raken elkaar; de
                    lijn hier is de enige die je ziet. */}
                <th className="text-left px-5 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Ticket</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Status</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Klant</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Toegewezen</th>
              </tr>
            </thead>
            <tbody>
              {zichtbaar.map((task, i) => {
                const assignee = task.profiles?.full_name ?? task.contacts?.name ?? null;
                return (
                  <tr
                    key={task.id}
                    onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                    className="cursor-pointer"
                    style={{ borderBottom: i < zichtbaar.length - 1 ? "1px solid var(--border)" : "none", transition: "background 120ms" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td className="px-5 py-2">
                      <p className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>{task.title}</p>
                    </td>
                    {/* De statusknop mag niet doorklikken naar het ticket: hier
                        wissel je hem, en dat is een andere handeling. */}
                    <td className="px-5 py-2" onClick={(e) => e.stopPropagation()}>
                      <StatusCycle task={task} />
                    </td>
                    <td className="px-5 py-2 text-sm" style={{ color: "var(--text-muted)" }}>
                      {task.clients?.name ? (
                        <span className="flex items-center gap-2 min-w-0">
                          <ClientLogo logo_url={task.clients.logo_url} name={task.clients.name} size="xs" />
                          <span className="truncate">{task.clients.name}</span>
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-2 text-sm" style={{ color: "var(--text-muted)" }}>
                      {assignee ? (
                        <div className="flex items-center gap-2">
                          {task.profiles?.avatar_url ? (
                            <img src={task.profiles.avatar_url} alt={assignee} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white" style={{ background: "var(--text-heading)", fontSize: "0.5625rem" }}>
                              {assignee.charAt(0).toUpperCase()}
                            </span>
                          )}
                          {assignee}
                        </div>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="px-5 py-8 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            {zoek.trim() ? (
              <>Niets gevonden voor &ldquo;{zoek.trim()}&rdquo;.</>
            ) : (
              <>
                Nog geen tickets.{" "}
                <Link href="/dashboard/tasks/nieuw" className="underline" style={{ color: "var(--text)" }}>
                  Maak het eerste aan.
                </Link>
              </>
            )}
          </p>
        )}
      </div>
      )}
      </div>

    </div>
  );
}

/**
 * Lijst of kanban.
 *
 * Twee knoppen naast elkaar in plaats van een uitklapmenu: er zijn er maar
 * twee, en zo zie je meteen waar je staat zonder eerst te openen. Het icoon
 * doet het werk, het woord staat ernaast omdat een rijtje streepjes en een
 * rijtje kolommen op 16 pixels te veel op elkaar lijken.
 */
const WEERGAVEN: { waarde: Weergave; label: string; icoon: React.ReactNode }[] = [
  // Kanban vooraan: dat is de standaardweergave, en die hoort links te staan
  // zodat de volgorde van de knoppen klopt met waar je terechtkomt.
  { waarde: "kanban", label: "Kanban", icoon: <Kanban size={16} weight="bold" /> },
  { waarde: "lijst", label: "Lijst", icoon: <Rows size={16} weight="bold" /> },
];

function WeergaveWissel({
  weergave,
  onKies,
}: {
  weergave: Weergave;
  onKies: (w: Weergave) => void;
}) {
  return (
    // self-stretch in plaats van een eigen hoogte: de wissel rekt mee met de
    // hoogste buur op de rij, en dat is de knop ernaast. Zo blijven ze gelijk
    // ook als die knop ooit andere padding krijgt. De radius is die van het
    // zoekveld en van de zoekbalk in de topbalk (0.5rem).
    <div
      className="flex self-stretch overflow-hidden rounded-lg"
      style={{ border: "1px solid var(--border)" }}
    >
      {WEERGAVEN.map(({ waarde, label, icoon }) => (
        <button
          key={waarde}
          onClick={() => onKies(waarde)}
          aria-pressed={weergave === waarde}
          className="text-sm font-medium px-3 flex items-center gap-1.5"
          style={{
            background: weergave === waarde ? "var(--bg-hover)" : "transparent",
            color: weergave === waarde ? "var(--text-heading)" : "var(--text-muted)",
            // De inactieve helft trekt anders net zoveel aandacht als de kant
            // waar je op staat.
            opacity: weergave === waarde ? 1 : 0.6,
            transition: "background 150ms, color 150ms, opacity 150ms",
          }}
        >
          {icoon}
          {label}
        </button>
      ))}
    </div>
  );
}
