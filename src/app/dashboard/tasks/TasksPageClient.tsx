"use client";

import { useState, useMemo, useRef, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import DatePicker from "@/components/DatePicker";
import { updateTaskStatusAction, updateTaskVeldAction } from "@/lib/actions/tasks";
import TicketKanban from "@/components/TicketKanban";
import { Rows, Kanban, MagnifyingGlass } from "@phosphor-icons/react";
import { TICKET_STATUS, TICKET_STATUS_ORDER } from "@/lib/tickets";

type Weergave = "board" | "list";

/**
 * Lijst of kanban is een voorkeur van jou, niet van een ticket: hij moet blijven
 * staan als je terugkomt. Zonder opgeslagen voorkeur is het de lijst: daar zie
 * je alles in één scherm, en het bord is wat je erbij pakt om te verdelen.
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
    // "lijst" is de oude opgeslagen waarde; wie die nog heeft houdt zijn keuze.
    const bewaard = localStorage.getItem(WEERGAVE_SLEUTEL);
    weergaveNu = bewaard === "board" ? "board" : "list";
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
import ClientLogo from "@/components/ClientLogo";
import TaskFilter, { STANDAARD_FILTERS, pasToe, type Filters } from "@/components/TaskFilter";
import TaskToevoegen, { type KlantOptie, type ProjectOptie } from "@/components/TaskToevoegen";
import RijKiezer from "@/components/RijKiezer";
import RijUren from "@/components/RijUren";
import { useRouter } from "next/navigation";
import type { Task } from "@/lib/types";
import { ButtonLink } from "@/components/Button";

/** 042. Drie cijfers; loopt het ooit over de 999 heen, dan groeit hij vanzelf. */
function taskNummer(nummer: number | null): string {
  return nummer === null ? "" : String(nummer).padStart(3, "0");
}

/**
 * Een lege cel die wel aan te klikken is.
 *
 * Een streepje en niet niets: zonder teken is de cel leeg, en dan is er ook
 * niets om aan te wijzen.
 */
function Streepje() {
  return <span style={{ color: "var(--text-muted)" }}>&mdash;</span>;
}

/**
 * De deadline in de regel aanpassen: onze eigen kalender, in een portal.
 *
 * Het datumveld van de browser zou hier makkelijker zijn, maar dat is in elke
 * browser een ander ding en je moet er eerst een pietepeuterig icoontje van
 * raken voordat er een kalender komt. Dus dezelfde kalender als op de
 * taskpagina, en net als bij RijKiezer aan de body gehangen: de tabel zit in
 * een vak dat schuift, en dat knipt ook van onderen af.
 */
function RijDatum({
  waarde,
  onKies,
}: {
  waarde: string | null;
  onKies: (waarde: string | null) => void;
}) {
  const [plek, setPlek] = useState<{ x: number; y: number } | null>(null);
  const knop = useRef<HTMLButtonElement>(null);

  function openen() {
    const r = knop.current?.getBoundingClientRect();
    if (!r) return;
    // De kalender is 260 breed en ruim 300 hoog; past hij er onder niet bij,
    // dan klapt hij omhoog.
    const naarBoven = r.bottom + 320 > window.innerHeight && r.top > 320;
    setPlek({
      x: Math.min(r.left, window.innerWidth - 280),
      y: naarBoven ? r.top - 320 : r.top,
    });
  }

  return (
    <>
      <button
        ref={knop}
        type="button"
        onClick={openen}
        className="w-full text-left text-sm rounded px-1.5 flex items-center"
        style={{ height: 22, color: "inherit", transition: "background 120ms" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {waarde
          ? new Date(waarde).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
          : <Streepje />}
      </button>

      {plek &&
        createPortal(
          <div className="fixed z-50" style={{ left: plek.x, top: plek.y, width: 260 }}>
            <DatePicker
              name="due_date"
              defaultValue={waarde ?? undefined}
              placeholder="Kies datum"
              startOpen
              onChange={(nieuweWaarde) => {
                setPlek(null);
                onKies(nieuweWaarde || null);
              }}
              onSluiten={() => setPlek(null)}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

/** Deadline voorbij, en nog niet klaar. */
function teLaat(task: Task): boolean {
  return Boolean(task.due_date && task.status !== "done" && new Date(task.due_date) < new Date());
}

/**
 * Afvinken vanuit de lijst.
 *
 * Eén klik zet een task op Klaar, en nog een klik zet hem terug op Open. Dat
 * tweede is er zodat een misklik met dezelfde beweging te herstellen is; een
 * vinkje dat alleen één kant op werkt dwingt je de task te openen.
 */
function Afvinken({ task }: { task: Task }) {
  const klaar = task.status === "done";

  return (
    <form action={updateTaskStatusAction}>
      <input type="hidden" name="id" value={task.id} />
      <input type="hidden" name="status" value={klaar ? "open" : "done"} />
      <button
        type="submit"
        aria-label={klaar ? "Terugzetten op Open" : "Afvinken"}
        title={klaar ? "Terugzetten op Open" : "Afvinken"}
        // Vierkant met een ronding, net als de subtaken in het ticket zelf: een
        // rondje leest als een keuzerondje waar er maar één van mag.
        className="w-4 h-4 rounded flex items-center justify-center"
        style={{
          border: `1.5px solid ${klaar ? "#16a34a" : "var(--border)"}`,
          background: klaar ? "#16a34a" : "transparent",
          transition: "border-color 150ms, background 150ms",
        }}
      >
        {klaar && (
          <svg width="9" height="9" viewBox="0 0 8 8" fill="none">
            <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </form>
  );
}

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
        className="px-2 py-0.5 rounded-md text-xs font-medium leading-4"
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
export type Teamlid = { id: string; full_name: string | null; avatar_url: string | null };

export default function TasksPageClient({
  tasks,
  klanten,
  projecten,
  team,
  urenPerTask,
}: {
  tasks: Task[];
  klanten: KlantOptie[];
  projecten: ProjectOptie[];
  team: Teamlid[];
  /** Som van de geschreven uren, per task-id. */
  urenPerTask: Record<string, number>;
}) {
  const [, schrijfBezig] = useTransition();

  /**
   * Eén veld van één task wegschrijven vanuit de regel.
   *
   * Via updateTaskVeldAction en niet het hele formulier: die schrijft precies
   * dit ene veld, zodat de rest van de task niet meegestuurd hoeft te worden
   * en dus ook niet kan verdwijnen. Zelfde weg als het inline bewerken op de
   * taskpagina zelf.
   */
  function schrijf(taskId: string, veld: string, waarde: string | null) {
    const fd = new FormData();
    fd.set("id", taskId);
    fd.set("veld", veld);
    fd.set("waarde", waarde ?? "");
    schrijfBezig(async () => {
      await updateTaskVeldAction(fd);
      router.refresh();
    });
  }

  const [zoek, setZoek] = useState("");
  const [filters, setFilters] = useState<Filters>(STANDAARD_FILTERS);
  const router = useRouter();
  const weergave = useSyncExternalStore(
    abonneerOpWeergave,
    leesWeergave,
    // Wat de server rendert zolang er nog geen browser is om localStorage te
    // lezen. Moet gelijk zijn aan de standaard hierboven, anders wisselt het
    // scherm meteen na het laden van weergave.
    () => "list" as Weergave,
  );

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
    // Eerst de filters, dan de zoekterm: beide beperken, de volgorde maakt
    // voor de uitkomst niet uit, maar zo doorzoekt hij de kleinste stapel.
    const gefilterd = pasToe(tasks, filters, weergave === "list");
    const term = zoek.trim().toLowerCase();
    if (!term) return gefilterd;
    return gefilterd.filter((t) =>
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
  }, [tasks, zoek, filters, weergave]);

  // Geen max-width zoals de andere pagina's: de kanban telt vier kolommen en
  // die passen niet in een leesbreedte.
  return (
    // Smallere marge dan de andere pagina's (md:px-10): een lijst met zeven
    // kolommen heeft de breedte nodig, en de rand van het scherm is hier niet
    // het probleem.
    <div className="px-4 pt-4 pb-6 md:px-6 md:pt-5 md:pb-10">
      {/* Geen paginakop: het kruimelpad in de balk zegt al dat je bij Tasks
          bent, en twee keer hetzelfde woord boven elkaar kost alleen hoogte.
          Ook geen kader om de boel heen; de lijst mag de volle breedte. */}
      <div className="flex items-center justify-between gap-2 mb-5">
        <label
          className="flex items-center gap-2 px-3 rounded-md min-w-0"
          style={{ height: 32, width: "18rem", flexShrink: 1, minWidth: "8rem", border: "1px solid var(--border)", background: "var(--bg)" }}
        >
          <MagnifyingGlass size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            placeholder="Zoeken in tasks"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm"
            style={{ color: "var(--text-heading)" }}
          />
        </label>

        {/* De keuzes komen uit alle tasks en niet uit wat er na het zoeken
            overblijft: anders verdwijnt een filter uit de lijst zodra je typt. */}
        <TaskFilter tasks={tasks} filters={filters} onWijzig={setFilters} />

        <div className="flex items-center gap-2 self-stretch ml-auto">
          <WeergaveWissel weergave={weergave} onKies={schrijfWeergave} />
          <ButtonLink href="/dashboard/tasks/nieuw" size="xs">
            New task
          </ButtonLink>
        </div>
      </div>

      {weergave === "board" ? (
        <TicketKanban tasks={zichtbaar} />
      ) : (
      <div className="overflow-x-auto">
        {zichtbaar.length > 0 ? (
          <table className="w-full min-w-[40rem]">
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                {/* Over het vinkjeskolommetje heen, zodat de kop tegen de
                    linkermarge staat en niet achter een rondje van 16 pixels
                    vandaan begint. */}
                <th colSpan={2} className="text-left pr-5 py-2 text-xs font-semibold" style={{ color: "var(--ink)" }}>Task</th>
                <th className="text-left px-5 py-2 text-xs font-semibold" style={{ color: "var(--ink)" }}>Status</th>
                <th className="text-left px-5 py-2 text-xs font-semibold" style={{ color: "var(--ink)" }}>Klant</th>
                <th className="text-left px-5 py-2 text-xs font-semibold" style={{ color: "var(--ink)" }}>Toegewezen</th>
                <th className="text-left px-5 py-2 text-xs font-semibold" style={{ color: "var(--ink)" }}>Deadline</th>
                <th className="text-left px-5 py-2 text-xs font-semibold" style={{ color: "var(--ink)" }}>Uren</th>
                <th className="text-left pl-5 pr-2 py-2 text-xs font-semibold" style={{ color: "var(--ink)" }}>ID</th>
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
                    style={{
                      height: 28,
                      borderBottom: i < zichtbaar.length - 1 ? "1px solid var(--border)" : "none",
                      transition: "background 120ms",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--row-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    {/* Afvinken zonder de task te openen. Klaar zet hem terug
                        op Open, zodat een misklik met dezelfde klik te
                        herstellen is. */}
                    <td className="pl-2 py-0 w-8" onClick={(e) => e.stopPropagation()}>
                      <Afvinken task={task} />
                    </td>
                    <td className="pr-5 py-0">
                      <p
                        className="text-sm font-medium leading-4"
                        style={{
                          color: task.status === "done" ? "var(--text-muted)" : "var(--text-heading)",
                          textDecoration: task.status === "done" ? "line-through" : "none",
                        }}
                      >
                        {task.title}
                      </p>
                    </td>
                    {/* De statusknop mag niet doorklikken naar het ticket: hier
                        wissel je hem, en dat is een andere handeling. */}
                    <td className="px-5 py-0" onClick={(e) => e.stopPropagation()}>
                      <StatusCycle task={task} />
                    </td>
                    <td className="px-5 py-0 text-sm" style={{ color: "var(--text-muted)" }}>
                      <RijKiezer
                        waarde={task.client_id}
                        leegLabel="Geen klant"
                        zoekPlaatshouder="Zoek een klant"
                        opties={klanten.map((k) => ({
                          waarde: k.id,
                          label: k.name,
                          logo: k.logo_url,
                          soort: "klant" as const,
                        }))}
                        onKies={(w) => schrijf(task.id, "client_id", w)}
                      >
                        {task.clients?.name ? (
                          <span className="flex items-center gap-2 min-w-0">
                            <ClientLogo logo_url={task.clients.logo_url} name={task.clients.name} size="xs" />
                            <span className="truncate">{task.clients.name}</span>
                          </span>
                        ) : (
                          <Streepje />
                        )}
                      </RijKiezer>
                    </td>
                    <td className="px-5 py-0 text-sm" style={{ color: "var(--text-muted)" }}>
                      <RijKiezer
                        waarde={task.assigned_profile_id}
                        leegLabel="Niemand"
                        zoekPlaatshouder="Zoek een teamlid"
                        opties={team.map((t) => ({
                          waarde: t.id,
                          label: t.full_name ?? "Onbekend",
                          avatar: t.avatar_url,
                          soort: "persoon" as const,
                        }))}
                        onKies={(w) => schrijf(task.id, "assigned_profile_id", w)}
                      >
                        {assignee ? (
                          <span className="flex items-center gap-2 min-w-0">
                            {task.profiles?.avatar_url ? (
                              <img src={task.profiles.avatar_url} alt={assignee} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white" style={{ background: "var(--text-heading)", fontSize: "0.5625rem" }}>
                                {assignee.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span className="truncate">{assignee}</span>
                          </span>
                        ) : (
                          <Streepje />
                        )}
                      </RijKiezer>
                    </td>
                    <td
                      className="px-5 py-0 text-sm"
                      style={{ color: teLaat(task) ? "#b0413e" : "var(--text-muted)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RijDatum
                        waarde={task.due_date}
                        onKies={(w) => schrijf(task.id, "due_date", w)}
                      />
                    </td>
                    <td
                      className="px-5 py-0 text-sm"
                      style={{ color: "var(--text-muted)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RijUren
                        taskId={task.id}
                        geschreven={urenPerTask[task.id] ?? 0}
                        inschatting={task.estimate_hours}
                        onKlaar={() => router.refresh()}
                      />
                    </td>
                    <td className="pl-5 pr-2 py-0 text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {taskNummer(task.nummer)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="px-2 py-6 text-sm" style={{ color: "var(--text-muted)" }}>
            {zoek.trim() ? (
              <>Niets gevonden voor &ldquo;{zoek.trim()}&rdquo;.</>
            ) : (
              <>Nog geen tasks.</>
            )}
          </p>
        )}

        {/* Ook als er niets staat: dan is dit de enige weg naar een eerste
            task, en die hoort op dezelfde plek te zitten als later. */}
        <div style={{ borderTop: "1px solid var(--border)" }}>
          <TaskToevoegen klanten={klanten} projecten={projecten} />
        </div>
      </div>
      )}
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
  // List vooraan: dat is de standaardweergave, en die hoort links te staan
  // zodat de volgorde van de knoppen klopt met waar je terechtkomt.
  { waarde: "list", label: "List", icoon: <Rows size={15} weight="bold" /> },
  { waarde: "board", label: "Board", icoon: <Kanban size={15} weight="bold" /> },
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
      className="flex self-stretch overflow-hidden rounded-md"
      style={{ border: "1px solid var(--border)" }}
    >
      {WEERGAVEN.map(({ waarde, label, icoon }) => (
        <button
          key={waarde}
          onClick={() => onKies(waarde)}
          aria-pressed={weergave === waarde}
          className="text-xs font-medium px-2.5 flex items-center gap-1.5"
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
