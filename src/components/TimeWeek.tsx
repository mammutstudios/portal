"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CaretLeft, CaretRight, Trash } from "@phosphor-icons/react";
import SearchSelect from "@/components/SearchSelect";
import ClientLogo from "@/components/ClientLogo";
import { zetUrenBlokAction, deleteTimeEntryAction } from "@/lib/actions/timeEntries";
import type { TimeEntry, Profile } from "@/lib/types";

/** Pixels per uur. 44 is krap genoeg om een werkdag in beeld te houden. */
const UUR = 44;
/** Het rooster begint om zes uur: daarvoor wordt niet gewerkt, en zes lege
    uren bovenaan kosten alleen maar scrollen. Loopt wel door tot middernacht,
    want avonduren bestaan wel. */
const BEGIN_UUR = 6;
const UREN = 24 - BEGIN_UUR;
/** Kwartieren, net als bij het factureren. */
const SNAP = 15;
const DAGEN = ["ma", "di", "wo", "do", "vr", "za", "zo"];

type Project = {
  id: string;
  title: string;
  client_id: string | null;
  clients?: { name: string; logo_url: string | null } | null;
};

export type TaskOptie = {
  id: string;
  title: string;
  nummer: number | null;
  project_id: string | null;
  clients?: { name: string; logo_url: string | null } | null;
};

/**
 * Uren schrijven door ze in een week te tekenen.
 *
 * Een urenregel is hier een blok met een begin en een duur. Slepen over een
 * lege plek maakt er een, slepen aan de onderrand rekt hem uit, slepen in het
 * midden verplaatst hem. Dat is sneller dan een formulier met een datumveld en
 * een getal, en je ziet meteen waar je dag heen ging.
 *
 * Regels zonder begintijd staan boven hun dag. Ze in het rooster zetten op een
 * tijd die niemand heeft opgeschreven zou doen alsof we iets weten.
 */
export default function TimeWeek({
  entries,
  projects,
  tasks,
  profiles,
  currentUserId,
  rechts,
}: {
  entries: TimeEntry[];
  projects: Project[];
  tasks: TaskOptie[];
  profiles: Profile[];
  currentUserId: string | null;
  /** Rechts in de balk, naast het weektotaal. Daar zet de pagina zijn wissel
      neer; twee werkbalken boven elkaar is er een te veel. */
  rechts?: React.ReactNode;
}) {
  const [maandag, setMaandag] = useState(() => maandagVan(new Date()));
  const [wie, setWie] = useState<string | null>(currentUserId);
  const [open, setOpen] = useState<string | null>(null);
  const [sleep, setSleep] = useState<Sleep | null>(null);
  const rooster = useRef<HTMLDivElement>(null);

  const dagen = useMemo(
    () => Array.from({ length: 7 }, (_, i) => dagErbij(maandag, i)),
    [maandag],
  );

  const vanWie = useMemo(
    () => (wie ? entries.filter((e) => e.profile_id === wie) : entries),
    [entries, wie],
  );

  /**
   * Wat er onder de muis gebeurde toen je indrukte, nog voordat het een sleep
   * werd. Een ref en geen state: hier hangt niets aan wat getekend wordt, en
   * een render per muisbeweging voegt niets toe.
   */
  const aanzet = useRef<Aanzet | null>(null);

  function grijp(e: React.PointerEvent, info: Omit<Aanzet, "x" | "y" | "gesleept">) {
    if (e.button !== 0) return;
    // Pointer capture: vanaf nu komen alle bewegingen bij dit element terecht,
    // ook als je muis de kolom verlaat. Dat scheelt luisteraars op het
    // document, en het werkt meteen met een trackpad of een stylus.
    e.currentTarget.setPointerCapture(e.pointerId);
    aanzet.current = { ...info, x: e.clientX, y: e.clientY, gesleept: false };
  }

  function beweeg(e: React.PointerEvent) {
    const a = aanzet.current;
    if (!a) return;

    // Vier pixels speling voordat het een sleep heet. Zonder die drempel maakt
    // elke klik een sleepbeweging van nul, en die schreef eerder zomaar een
    // blok terug naar de database.
    if (!a.gesleept) {
      if (Math.abs(e.clientY - a.y) + Math.abs(e.clientX - a.x) < 4) return;
      a.gesleept = true;
    }

    const nu = minutenOpPagina(e.nativeEvent, rooster.current);
    setSleep({ ...a, van: a.minuut, nu });
  }

  async function laatLos(e: React.PointerEvent) {
    const a = aanzet.current;
    aanzet.current = null;
    setSleep(null);
    if (!a || !a.gesleept) return;

    const laatste: Sleep = { ...a, van: a.minuut, nu: minutenOpPagina(e.nativeEvent, rooster.current) };
    const blok = uitSleep(laatste);

    // Staat het blok na het slepen nog precies waar het stond, dan valt er
    // niets te schrijven. Vergelijken met de uitkomst en niet met de afgelegde
    // afstand: alles klikt vast op kwartieren, dus een duwtje levert vaak
    // hetzelfde blok op.
    if (laatste.soort !== "nieuw") {
      const zelfdeBegin = minutenVan(blok.start) === laatste.beginVast;
      const zelfdeDuur = Math.round(blok.uren * 60) === Math.round(laatste.duur ?? 0);
      if (zelfdeBegin && zelfdeDuur) return;
    }

    const id = await zetUrenBlokAction({
      id: laatste.soort === "nieuw" ? undefined : laatste.id,
      task: laatste.soort === "nieuw" ? "" : laatste.task,
      task_id: laatste.soort === "nieuw" ? null : laatste.task_id,
      project_id: laatste.soort === "nieuw" ? null : laatste.project_id,
      profile_id: wie,
      start_at: blok.start.toISOString(),
      hours: blok.uren,
    });

    // Meteen open: een blok zonder omschrijving zegt nog niets, en dit is het
    // moment waarop je weet waar het over ging.
    if (laatste.soort === "nieuw") setOpen(id);
  }

  /** Scrollt het venster weg of klapt het systeem terug, dan is het over. */
  function brekAf() {
    aanzet.current = null;
    setSleep(null);
  }

  const weekTotaal = dagen.reduce((som, d) => som + dagTotaal(vanWie, d), 0);

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 48px)" }}>
      <div className="flex items-center gap-3 px-4 md:px-6 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center" style={{ border: "1px solid var(--border)", borderRadius: 6 }}>
          <Knopje onClick={() => setMaandag(dagErbij(maandag, -7))} label="Vorige week">
            <CaretLeft size={14} weight="bold" />
          </Knopje>
          <button
            type="button"
            onClick={() => setMaandag(maandagVan(new Date()))}
            className="text-xs font-medium px-2.5"
            style={{ height: 30, color: "var(--text-heading)" }}
          >
            {weekLabel(maandag)}
          </button>
          <Knopje onClick={() => setMaandag(dagErbij(maandag, 7))} label="Volgende week">
            <CaretRight size={14} weight="bold" />
          </Knopje>
        </div>

        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Weektotaal <strong style={{ color: "var(--text-heading)" }}>{urenTekst(weekTotaal)}</strong>
        </span>

        <div className="ml-auto flex items-center gap-2">
        {profiles.length > 1 && (
          <select
            value={wie ?? ""}
            onChange={(e) => setWie(e.target.value || null)}
            className="text-xs px-2 rounded-md"
            style={{ height: 30, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text-heading)" }}
          >
            <option value="">Iedereen</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name ?? "Onbekend"}</option>
            ))}
          </select>
        )}
        {rechts}
        </div>
      </div>

      {/* Dagkoppen buiten het schuifvak, zodat ze blijven staan als je naar de
          avond scrolt. */}
      <div className="flex px-4 md:px-6 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div style={{ width: 48, flexShrink: 0 }} />
        {dagen.map((d) => {
          const totaal = dagTotaal(vanWie, d);
          return (
            <div key={d.toISOString()} className="flex-1 min-w-0 pb-2 px-1">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {DAGEN[(d.getDay() + 6) % 7]}{" "}
                <span style={{ color: vandaag(d) ? "var(--text-heading)" : "inherit", fontWeight: vandaag(d) ? 600 : 400 }}>
                  {d.getDate()}
                </span>
              </p>
              <p className="text-xs tabular-nums" style={{ color: totaal > 0 ? "var(--text-heading)" : "var(--border)" }}>
                {totaal > 0 ? urenTekst(totaal) : "—"}
              </p>
              {/* Regels van die dag zonder tijd: wel geteld, niet geplaatst. */}
              {vanWie.filter((e) => !e.start_at && e.date === isoDag(d)).map((e) => (
                <button
                  key={e.id}
                  onClick={() => setOpen(e.id)}
                  className="w-full text-left text-xs truncate px-1.5 py-0.5 rounded mt-1"
                  style={{ background: "var(--bg-hover)", color: "var(--text)" }}
                  title="Zonder begintijd. Open om er een te geven."
                >
                  {e.task || "Zonder omschrijving"}
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div ref={rooster} className="flex-1 overflow-y-auto px-4 md:px-6">
        <div className="flex relative" style={{ height: UREN * UUR }}>
          <div style={{ width: 48, flexShrink: 0 }}>
            {Array.from({ length: UREN }, (_, u) => (
              <div
                key={u}
                className="text-xs tabular-nums"
                style={{
                  height: UUR,
                  color: "var(--text-muted)",
                  // Het cijfer hoort op de lijn te staan, dus een halve regel
                  // omhoog. Behalve het eerste: daarboven is geen lijn en zou
                  // het half buiten beeld vallen.
                  transform: u > 0 ? "translateY(-0.5em)" : "none",
                }}
              >
                {`${String(u + BEGIN_UUR).padStart(2, "0")}:00`}
              </div>
            ))}
          </div>

          {dagen.map((dag, kolom) => (
            <div
              key={dag.toISOString()}
              className="flex-1 min-w-0 relative"
              // touch-action uit: anders scrollt de pagina mee zodra je op een
              // aanraakscherm een blok begint te tekenen.
              style={{ borderLeft: "1px solid var(--border)", touchAction: "none" }}
              onPointerDown={(e) => {
                if (e.target !== e.currentTarget) return;
                grijp(e, {
                  soort: "nieuw",
                  kolom,
                  dag,
                  minuut: minutenOpPagina(e.nativeEvent, rooster.current),
                  id: "",
                  task: "",
                  task_id: null,
                  project_id: null,
                });
              }}
              onPointerMove={beweeg}
              onPointerUp={laatLos}
              onPointerCancel={brekAf}
            >
              {Array.from({ length: UREN }, (_, u) => (
                <div key={u} style={{ height: UUR, borderTop: u === 0 ? "none" : "1px solid var(--border)", pointerEvents: "none" }} />
              ))}

              {(() => {
                const opDezeDag = vanWie.filter(
                  (e) => e.start_at && isoDag(new Date(e.start_at)) === isoDag(dag),
                );
                const verdeling = baantjes(opDezeDag);
                return opDezeDag.map((e2) => (
                  <Blok
                    key={e2.id}
                    entry={e2}
                    project={projects.find((p) => p.id === e2.project_id) ?? null}
                    open={open === e2.id}
                    onOpen={() => setOpen(open === e2.id ? null : e2.id)}
                    onGrijp={(e, soort) =>
                      grijp(e, {
                        soort,
                        kolom,
                        dag,
                        minuut: minutenOpPagina(e.nativeEvent, rooster.current),
                        id: e2.id,
                        task: e2.task,
                        task_id: e2.task_id,
                        project_id: e2.project_id,
                        beginVast: minutenVan(new Date(e2.start_at!)),
                        duur: e2.hours * 60,
                      })
                    }
                    onBeweeg={beweeg}
                    onLos={laatLos}
                    onBreekAf={brekAf}
                    projects={projects}
                    tasks={tasks}
                    onKlaar={() => setOpen(null)}
                    naarLinks={kolom >= 5}
                    baan={verdeling.get(e2.id) ?? { baan: 0, van: 1 }}
                  />
                ));
              })()}

              {sleep && sleep.kolom === kolom && <Schets sleep={sleep} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- slepen ---------- */

type Sleep = {
  soort: "nieuw" | "verplaats" | "rek";
  kolom: number;
  /** De dag van die kolom. Meegegeven bij het indrukken, want tijdens het
      slepen is alleen de sleep zelf nog in beeld. */
  dag: Date;
  /** Minuut waar het slepen begon. */
  van: number;
  /** Minuut waar de muis nu is. */
  nu: number;
  id: string;
  task: string;
  task_id: string | null;
  project_id: string | null;
  /** Bij verplaatsen en uitrekken: waar het blok stond toen je begon. */
  beginVast?: number;
  duur?: number;
};

/**
 * Wat er klaarligt na het indrukken, voordat het een sleep is.
 *
 * `gesleept` gaat pas aan als de muis genoeg bewogen heeft. Tot dat moment is
 * het een klik, en een klik hoort het kaartje te openen en verder niets.
 */
type Aanzet = Omit<Sleep, "van" | "nu"> & {
  /** Minuut waar je indrukte. */
  minuut: number;
  x: number;
  y: number;
  gesleept: boolean;
};

/** Begin en duur die uit een sleepbeweging volgen. */
function uitSleep(s: Sleep): { start: Date; uren: number } {
  let beginMin: number;
  let duurMin: number;

  if (s.soort === "nieuw") {
    beginMin = snap(Math.min(s.van, s.nu));
    duurMin = Math.max(SNAP, snap(Math.abs(s.nu - s.van)));
  } else if (s.soort === "verplaats") {
    beginMin = snap((s.beginVast ?? 0) + (s.nu - s.van));
    duurMin = s.duur ?? SNAP;
  } else {
    beginMin = s.beginVast ?? 0;
    duurMin = Math.max(SNAP, snap(s.nu - beginMin));
  }

  // Normaal niet voor zessen, maar een regel die daar al stond blijft staan:
  // hem naar 06:00 trekken omdat je hem even aanraakt is gegevens veranderen
  // die niemand heeft aangeraakt.
  const ondergrens = Math.min(BEGIN_UUR * 60, s.beginVast ?? BEGIN_UUR * 60);
  beginMin = Math.max(ondergrens, Math.min(24 * 60 - SNAP, beginMin));
  const start = new Date(s.dag);
  start.setHours(0, 0, 0, 0);
  start.setMinutes(beginMin);
  return { start, uren: duurMin / 60 };
}

function Schets({ sleep }: { sleep: Sleep }) {
  const begin =
    sleep.soort === "nieuw"
      ? snap(Math.min(sleep.van, sleep.nu))
      : sleep.soort === "verplaats"
        ? snap((sleep.beginVast ?? 0) + (sleep.nu - sleep.van))
        : (sleep.beginVast ?? 0);
  const duur =
    sleep.soort === "nieuw"
      ? Math.max(SNAP, snap(Math.abs(sleep.nu - sleep.van)))
      : sleep.soort === "verplaats"
        ? (sleep.duur ?? SNAP)
        : Math.max(SNAP, snap(sleep.nu - begin));

  return (
    <div
      className="absolute left-1 right-1 rounded pointer-events-none"
      style={{
        top: pixels(begin),
        height: (duur / 60) * UUR,
        background: "color-mix(in srgb, var(--ink) 10%, var(--white))",
        border: "1px dashed var(--text-muted)",
      }}
    >
      <p className="text-xs px-1.5 tabular-nums" style={{ color: "var(--text)" }}>
        {urenTekst(duur / 60)}
      </p>
    </div>
  );
}

/* ---------- een blok ---------- */

function Blok({
  entry,
  project,
  projects,
  tasks,
  open,
  onOpen,
  onGrijp,
  onBeweeg,
  onLos,
  onBreekAf,
  onKlaar,
  naarLinks,
  baan,
}: {
  entry: TimeEntry;
  project: Project | null;
  projects: Project[];
  tasks: TaskOptie[];
  open: boolean;
  onOpen: () => void;
  onGrijp: (e: React.PointerEvent, soort: "verplaats" | "rek") => void;
  onBeweeg: (e: React.PointerEvent) => void;
  onLos: (e: React.PointerEvent) => void;
  onBreekAf: () => void;
  onKlaar: () => void;
  /** Bij de laatste kolommen klapt het kaartje naar links, anders valt het
      buiten het schuifvak en wordt het afgeknipt. */
  naarLinks: boolean;
  /** Welk baantje van hoeveel, als er blokken overlappen. */
  baan: { baan: number; van: number };
}) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const begin = new Date(entry.start_at!);
  const beginMin = minutenVan(begin);
  const eindMin = beginMin + entry.hours * 60;
  const top = pixels(beginMin);
  // Begint hij voor zessen, dan valt het stuk daarvoor weg en wordt het blok
  // navenant korter. Alleen de bovenkant afkappen zou de eindtijd verzetten:
  // een blok van 05:15 tot 08:15 kwam er dan uit als 06:00 tot 09:00.
  const hoogte = Math.max(18, ((eindMin - Math.max(beginMin, BEGIN_UUR * 60)) / 60) * UUR);
  const tint = kleurVan(entry.task_id ?? entry.project_id);

  return (
    <>
      <div
        className="absolute rounded overflow-hidden cursor-grab"
        style={{
          top,
          height: hoogte,
          left: `calc(${(baan.baan / baan.van) * 100}% + 4px)`,
          width: `calc(${100 / baan.van}% - 6px)`,
          background: tint.vlak,
          borderLeft: `2px solid ${tint.rand}`,
          zIndex: open ? 20 : 1,
          touchAction: "none",
        }}
        onPointerDown={(e) => {
          // Alleen de linkerknop sleept; de rechter is voor het menu.
          if (e.button !== 0) return;
          e.stopPropagation();
          onGrijp(e, "verplaats");
        }}
        onPointerMove={(e) => {
          e.stopPropagation();
          onBeweeg(e);
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          onLos(e);
        }}
        onPointerCancel={onBreekAf}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
      >
        <p className="text-xs font-medium px-1.5 leading-4 truncate" style={{ color: "var(--text-heading)" }}>
          {entry.task || "Zonder omschrijving"}
        </p>
        {hoogte > 30 && (entry.tasks || project) && (
          <p className="text-xs px-1.5 leading-4 truncate" style={{ color: "var(--text-muted)" }}>
            {/* De task gaat voor: die zegt waar de tijd heen ging, het project
                alleen in welke bak het valt. */}
            {entry.tasks
              ? `${entry.tasks.nummer !== null ? String(entry.tasks.nummer).padStart(3, "0") + " · " : ""}${entry.tasks.title}`
              : `${project!.clients?.name ? project!.clients.name + " · " : ""}${project!.title}`}
          </p>
        )}
        {hoogte > 44 && (
          <p className="text-xs px-1.5 leading-4 tabular-nums" style={{ color: "var(--text-muted)" }}>
            {urenTekst(entry.hours)}
          </p>
        )}

        {/* Onderrand om uit te rekken. Smal, maar de muis verandert van vorm. */}
        <div
          className="absolute left-0 right-0 bottom-0 cursor-ns-resize"
          style={{ height: 6, touchAction: "none" }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            onGrijp(e, "rek");
          }}
          onPointerMove={(e) => {
            e.stopPropagation();
            onBeweeg(e);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            onLos(e);
          }}
          onPointerCancel={onBreekAf}
        />
      </div>

      {menu && (
        <BlokMenu
          entry={entry}
          x={menu.x}
          y={menu.y}
          onSluiten={() => setMenu(null)}
        />
      )}

      {open && (
        <Kaartje entry={entry} projects={projects} tasks={tasks} top={top} onKlaar={onKlaar} naarLinks={naarLinks} />
      )}
    </>
  );
}

/**
 * Het menu onder de rechtermuisknop.
 *
 * In een portal naar de body: het blok zit in een kolom met overflow, en een
 * menu dat daarbinnen opent wordt afgeknipt zodra het langer is dan het blok.
 */
function BlokMenu({
  entry,
  x,
  y,
  onSluiten,
}: {
  entry: TimeEntry;
  x: number;
  y: number;
  onSluiten: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    function weg() {
      onSluiten();
    }
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") onSluiten();
    }
    // In de volgende tel, anders vangt hij de klik op die hem net opende.
    const t = setTimeout(() => {
      document.addEventListener("pointerdown", weg);
      document.addEventListener("keydown", toets);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("pointerdown", weg);
      document.removeEventListener("keydown", toets);
    };
  }, [onSluiten]);

  async function dupliceer() {
    onSluiten();
    // Eronder en niet erbovenop: twee blokken op dezelfde plek zien er samen
    // uit als één, en dan lijkt er niets gebeurd.
    const begin = new Date(entry.start_at!);
    begin.setMinutes(begin.getMinutes() + entry.hours * 60);
    await zetUrenBlokAction({
      task: entry.task,
      task_id: entry.task_id,
      project_id: entry.project_id,
      profile_id: entry.profile_id,
      start_at: begin.toISOString(),
      hours: entry.hours,
    });
  }

  async function verwijder() {
    onSluiten();
    const fd = new FormData();
    fd.set("id", entry.id);
    await deleteTimeEntryAction(fd);
  }

  const heen = entry.task_id
    ? { label: "Naar de task", href: `/dashboard/tasks/${entry.task_id}` }
    : entry.project_id
      ? { label: "Naar het project", href: `/dashboard/projects/${entry.project_id}` }
      : null;

  return createPortal(
    <div
      className="fixed rounded-lg py-1 z-[200]"
      style={{
        top: y,
        left: x,
        minWidth: "11rem",
        background: "var(--bg)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 32px rgb(20 0 24 / 0.16)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MenuRegel onKlik={dupliceer}>Dupliceren</MenuRegel>
      {heen && (
        <MenuRegel onKlik={() => { onSluiten(); router.push(heen.href); }}>
          {heen.label}
        </MenuRegel>
      )}
      <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
      <MenuRegel onKlik={verwijder} rood>
        Verwijderen
      </MenuRegel>
    </div>,
    document.body,
  );
}

function MenuRegel({
  onKlik,
  rood,
  children,
}: {
  onKlik: () => void;
  rood?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onKlik}
      className="w-full text-left px-3 py-1.5 text-sm"
      style={{ color: rood ? "#b91c1c" : "var(--text-heading)", transition: "background 120ms" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
    >
      {children}
    </button>
  );
}

function Kaartje({
  entry,
  projects,
  tasks,
  top,
  onKlaar,
  naarLinks,
}: {
  entry: TimeEntry;
  projects: Project[];
  tasks: TaskOptie[];
  top: number;
  onKlaar: () => void;
  naarLinks: boolean;
}) {
  const [task, setTask] = useState(entry.task);
  const [taskId, setTaskId] = useState<string | null>(entry.task_id);
  const [projectId, setProjectId] = useState<string | null>(entry.project_id);
  const gekozenProject = projects.find((p) => p.id === projectId) ?? null;
  const gekozenTask = tasks.find((t) => t.id === taskId) ?? null;

  async function bewaar(velden: {
    task?: string;
    task_id?: string | null;
    project_id?: string | null;
  }) {
    await zetUrenBlokAction({
      id: entry.id,
      task: velden.task ?? task,
      task_id: velden.task_id !== undefined ? velden.task_id : taskId,
      project_id: velden.project_id !== undefined ? velden.project_id : projectId,
      profile_id: entry.profile_id,
      start_at: entry.start_at!,
      hours: entry.hours,
    });
  }

  /**
   * Een task kiezen vult de rest aan.
   *
   * Het project komt uit de task: die hoort er al bij, en het twee keer vragen
   * levert alleen de kans op dat ze niet meer kloppen. De omschrijving alleen
   * als je er zelf nog niets hebt getypt; wat jij schreef gaat voor.
   */
  function kiesTask(id: string | undefined) {
    const gekozen = tasks.find((t) => t.id === id) ?? null;
    const nieuwProject = gekozen?.project_id ?? projectId;
    const nieuweTekst = task.trim() === "" && gekozen ? gekozen.title : task;

    setTaskId(gekozen?.id ?? null);
    setProjectId(nieuwProject);
    setTask(nieuweTekst);
    bewaar({ task_id: gekozen?.id ?? null, project_id: nieuwProject, task: nieuweTekst });
  }

  return (
    <div
      className="absolute rounded-lg p-2.5 z-30"
      style={{
        top: Math.max(0, top - 4),
        [naarLinks ? "right" : "left"]: "calc(100% + 6px)",
        width: "15rem",
        background: "var(--bg)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 32px rgb(20 0 24 / 0.14)",
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <input
        autoFocus
        value={task}
        onChange={(e) => setTask(e.target.value)}
        onBlur={() => task !== entry.task && bewaar({ task })}
        placeholder="Waar ging het over?"
        className="w-full text-sm bg-transparent outline-none mb-2"
        style={{ color: "var(--text-heading)" }}
      />

      <div className="mb-1.5">
        <SearchSelect
          name="task_id"
          options={tasks.map((t) => ({
            value: t.id,
            label: t.nummer !== null ? `${String(t.nummer).padStart(3, "0")} · ${t.title}` : t.title,
            sublabel: t.clients?.name,
            logo: t.clients?.logo_url ?? undefined,
          }))}
          defaultValue={taskId ?? undefined}
          placeholder="Task"
          showLogos
          subtle
          onChange={kiesTask}
        />
      </div>

      {/* Met een task erbij is het project geen keuze meer: die zit al aan de
          task vast. Alleen tonen dus, zodat je ziet waar het heen gaat. Zonder
          task is het de enige plek waar de uren aan hangen, en kies je hem
          zelf. */}
      {taskId ? (
        (gekozenProject || gekozenTask?.clients) && (
          <div className="flex items-center gap-1.5 px-2 py-1 text-xs min-w-0">
            <ClientLogo
              logo_url={(gekozenProject?.clients ?? gekozenTask?.clients)?.logo_url ?? null}
              name={(gekozenProject?.clients ?? gekozenTask?.clients)?.name ?? gekozenProject?.title ?? ""}
              size="xs"
            />
            <span className="truncate" style={{ color: "var(--text-muted)" }}>
              {[gekozenProject?.title, (gekozenProject?.clients ?? gekozenTask?.clients)?.name]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        )
      ) : (
        <SearchSelect
          name="project_id"
          options={projects.map((p) => ({
            value: p.id,
            label: p.title,
            sublabel: p.clients?.name,
            logo: p.clients?.logo_url ?? undefined,
          }))}
          defaultValue={projectId ?? undefined}
          placeholder="Project"
          showLogos
          subtle
          onChange={(v) => {
            setProjectId(v ?? null);
            bewaar({ project_id: v ?? null });
          }}
        />
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
          {klokTekst(new Date(entry.start_at!))} – {klokTekst(new Date(new Date(entry.start_at!).getTime() + entry.hours * 3600_000))}
        </span>
        <form
          action={async (fd: FormData) => {
            await deleteTimeEntryAction(fd);
            onKlaar();
          }}
        >
          <input type="hidden" name="id" value={entry.id} />
          <button type="submit" className="p-1 rounded" style={{ color: "var(--text-muted)" }} title="Verwijderen">
            <Trash size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}

function Knopje({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center"
      style={{ width: 28, height: 30, color: "var(--text-muted)" }}
    >
      {children}
    </button>
  );
}

/* ---------- rekenwerk ---------- */

function snap(minuten: number): number {
  return Math.round(minuten / SNAP) * SNAP;
}

function minutenVan(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Waar in de dag de muis staat, in minuten vanaf middernacht. */
function minutenOpPagina(e: MouseEvent, vak: HTMLElement | null): number {
  if (!vak) return 0;
  const doos = vak.getBoundingClientRect();
  const y = e.clientY - doos.top + vak.scrollTop;
  return Math.max(BEGIN_UUR * 60, Math.min(24 * 60, BEGIN_UUR * 60 + (y / UUR) * 60));
}

/**
 * Hoe ver een tijdstip van boven staat.
 *
 * Niet onder nul: een regel van voor zessen hoort hier niet, maar hem buiten
 * beeld tekenen zou hem laten verdwijnen. Die staat dus bovenaan vastgeplakt.
 */
function pixels(minuten: number): number {
  return Math.max(0, ((minuten - BEGIN_UUR * 60) / 60) * UUR);
}

function maandagVan(d: Date): Date {
  const kopie = new Date(d);
  kopie.setHours(0, 0, 0, 0);
  // getDay geeft zondag 0; wij beginnen op maandag.
  kopie.setDate(kopie.getDate() - ((kopie.getDay() + 6) % 7));
  return kopie;
}

function dagErbij(d: Date, aantal: number): Date {
  const kopie = new Date(d);
  kopie.setDate(kopie.getDate() + aantal);
  return kopie;
}

function isoDag(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function vandaag(d: Date): boolean {
  return isoDag(d) === isoDag(new Date());
}

function dagTotaal(entries: TimeEntry[], dag: Date): number {
  const iso = isoDag(dag);
  return entries
    .filter((e) => (e.start_at ? isoDag(new Date(e.start_at)) === iso : e.date === iso))
    .reduce((som, e) => som + Number(e.hours), 0);
}

function urenTekst(uren: number): string {
  const totaal = Math.round(uren * 60);
  return `${Math.floor(totaal / 60)}:${String(totaal % 60).padStart(2, "0")}`;
}

function klokTekst(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function weekLabel(maandag: Date): string {
  const zondag = dagErbij(maandag, 6);
  const zelfdeMaand = maandag.getMonth() === zondag.getMonth();
  const maand = (d: Date) => d.toLocaleDateString("nl-NL", { month: "short" });
  return zelfdeMaand
    ? `${maandag.getDate()} – ${zondag.getDate()} ${maand(zondag)}`
    : `${maandag.getDate()} ${maand(maandag)} – ${zondag.getDate()} ${maand(zondag)}`;
}

/**
 * Baantjes voor blokken die elkaar overlappen.
 *
 * Twee regels op hetzelfde uur zouden elkaar anders bedekken en dan lijkt er
 * maar één te zijn. Ze worden per tros van overlappende blokken verdeeld over
 * even brede baantjes, zoals een agenda dat doet. De tros telt en niet het
 * hele etmaal: twee blokken in de ochtend hoeven niet smal te worden omdat er
 * 's avonds drie naast elkaar staan.
 */
function baantjes(entries: TimeEntry[]): Map<string, { baan: number; van: number }> {
  const uit = new Map<string, { baan: number; van: number }>();
  const op = [...entries].sort(
    (a, b) => new Date(a.start_at!).getTime() - new Date(b.start_at!).getTime(),
  );

  let tros: TimeEntry[] = [];
  let trosEind = -Infinity;

  function sluitTros() {
    if (tros.length === 0) return;
    const eindPerBaan: number[] = [];
    const baanVan = new Map<string, number>();

    for (const e of tros) {
      const begin = minutenVan(new Date(e.start_at!));
      const eind = begin + e.hours * 60;
      let baan = eindPerBaan.findIndex((tot) => tot <= begin);
      if (baan === -1) baan = eindPerBaan.length;
      eindPerBaan[baan] = eind;
      baanVan.set(e.id, baan);
    }

    for (const e of tros) uit.set(e.id, { baan: baanVan.get(e.id)!, van: eindPerBaan.length });
    tros = [];
    trosEind = -Infinity;
  }

  for (const e of op) {
    const begin = minutenVan(new Date(e.start_at!));
    if (begin >= trosEind) sluitTros();
    tros.push(e);
    trosEind = Math.max(trosEind, begin + e.hours * 60);
  }
  sluitTros();

  return uit;
}

/**
 * Een vaste kleur per project.
 *
 * Uit de sleutel en niet uit een lijst die je bijhoudt: zo krijgt een project
 * altijd dezelfde tint, ook na een herstart, en hoeft er niets opgeslagen te
 * worden. Lage verzadiging, want er staan er twintig naast elkaar.
 */
export function kleurVan(sleutel: string | null): { vlak: string; rand: string } {
  // Nog nergens aan gekoppeld: grijs. Een hash van niets kwam altijd op nul
  // uit, en nul is rood; dat las als een foutmelding terwijl er alleen nog
  // geen task bij stond.
  if (!sleutel) {
    return {
      vlak: "color-mix(in srgb, var(--ink) 6%, var(--white))",
      rand: "var(--text-muted)",
    };
  }
  let som = 0;
  for (let i = 0; i < sleutel.length; i++) som = (som * 31 + sleutel.charCodeAt(i)) % 360;
  return {
    vlak: `hsl(${som} 70% 94%)`,
    rand: `hsl(${som} 55% 58%)`,
  };
}
