"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import TicketEigenschappen from "@/components/TicketEigenschappen";
import TicketReacties, { type TicketReactie, type Noembaar } from "@/components/TicketReacties";
import { deleteTaskAction, updateTaskVeldAction } from "@/lib/actions/tasks";
import { createSubtaskAction, toggleSubtaskAction, deleteSubtaskAction } from "@/lib/actions/subtasks";
import type { Task, Project, Profile, Subtask } from "@/lib/types";

/**
 * Eén ticket, op een eigen pagina.
 *
 * Stond eerder in een venster over het bord heen. Een pagina heeft een adres,
 * dus je kunt een ticket doorsturen, en de omschrijving hoeft niet meer in een
 * hoekje te passen.
 */
export default function TicketDetail({
  task,
  subtasks: subtakenVanServer,
  clients,
  projects,
  profiles,
  reacties,
  huidigeGebruikerId,
  noembaar,
}: {
  task: Task;
  subtasks: Subtask[];
  reacties: TicketReactie[];
  /** Om te bepalen welk bericht je zelf mag weghalen. */
  huidigeGebruikerId: string | null;
  /** Wie je in een reactie kunt noemen: het team en de mensen van deze klant. */
  noembaar: Noembaar[];
  clients: { id: string; name: string; logo_url: string | null }[];
  projects: Pick<Project, "id" | "title">[];
  /** Alleen team Mammut. Zie lib/team.ts. */
  profiles: Pick<Profile, "id" | "full_name" | "avatar_url">[];
}) {

  // Voor de avatar bij het invoerveld. Staat al in de teamlijst, dus dat
  // scheelt een extra vraag aan de database.
  const ikZelf = profiles.find((p) => p.id === huidigeGebruikerId) ?? null;

  return (
    <>
      <InlineTitel task={task} />

      {/* Geen overflow-hidden: de datumkiezer en de keuzelijsten klappen uit
          buiten hun regel, en die werden er hier tegen de onderrand afgeknipt.
          De ronde hoeken blijven kloppen, want de banden erbinnen hebben geen
          eigen achtergrond die eroverheen zou lopen. */}
      <div
        className="squircle"
        style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
      >
        <div className="px-6 py-5">
          <TicketEigenschappen
            task={task}
            clients={clients}
            projects={projects}
            profiles={profiles}
          />
        </div>

        <div className="px-6 py-5" style={{ borderTop: "1px solid var(--border)" }}>
          <TicketReacties
            taskId={task.id}
            reacties={reacties}
            huidigeGebruikerId={huidigeGebruikerId}
            huidigeNaam={ikZelf?.full_name ?? null}
            huidigeAvatar={ikZelf?.avatar_url ?? null}
            noembaar={noembaar}
          />
        </div>

        <div className="px-6 py-5" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            Omschrijving
          </p>
          <InlineOmschrijving task={task} />
        </div>

        <div className="px-6 py-5" style={{ borderTop: "1px solid var(--border)" }}>
          <Subtaken taskId={task.id} beginwaarde={subtakenVanServer} />
        </div>
      </div>

      {/* Onderaan en niet naast de titel: verwijderen is het laatste wat je
          doet, niet het eerste wat je ziet. */}
      <form action={deleteTaskAction} className="mt-6 flex justify-end">
        <input type="hidden" name="id" value={task.id} />
        <Button variant="danger" type="submit">
          Ticket verwijderen
        </Button>
      </form>
    </>
  );
}

/**
 * De titel, direct te wijzigen.
 *
 * Opslaan gebeurt bij het verlaten van het veld en bij Enter, niet met een
 * knop: je bent hier één regel aan het bijwerken en een knop ernaast is een
 * tweede kans om het te vergeten. Escape zet terug wat er stond.
 */
function InlineTitel({ task }: { task: Task }) {
  const [bewerken, setBewerken] = useState(false);
  const [waarde, setWaarde] = useState(task.title);
  const [fout, setFout] = useState<string | null>(null);
  const router = useRouter();

  async function bewaar() {
    const nieuw = waarde.trim();
    setBewerken(false);
    if (!nieuw || nieuw === task.title) {
      setWaarde(task.title);
      return;
    }
    try {
      await schrijfVeld(task.id, "title", nieuw);
      router.refresh();
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Opslaan is niet gelukt.");
      setWaarde(task.title);
    }
  }

  if (bewerken) {
    return (
      <input
        autoFocus
        value={waarde}
        onChange={(e) => setWaarde(e.target.value)}
        onBlur={bewaar}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setWaarde(task.title);
            setBewerken(false);
          }
        }}
        className="w-full text-3xl font-extrabold mb-6 rounded-md px-2 -mx-2 outline-none"
        style={{
          color: "var(--text-heading)",
          lineHeight: 1.2,
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
        }}
      />
    );
  }

  return (
    <div className="mb-6">
      <h1
        onClick={() => setBewerken(true)}
        className="text-3xl font-extrabold rounded-md px-2 -mx-2 cursor-text inline-block"
        style={{ color: "var(--text-heading)", lineHeight: 1.2, transition: "background 120ms" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "")}
      >
        {task.title}
      </h1>
      {fout && (
        <p className="text-sm mt-1" style={{ color: "#b0413e" }}>
          {fout}
        </p>
      )}
    </div>
  );
}

/** Zelfde idee als de titel, maar over meer regels en hij mag leeg zijn. */
function InlineOmschrijving({ task }: { task: Task }) {
  const [bewerken, setBewerken] = useState(false);
  const [waarde, setWaarde] = useState(task.description ?? "");
  const router = useRouter();

  async function bewaar() {
    setBewerken(false);
    const nieuw = waarde.trim();
    if (nieuw === (task.description ?? "")) return;
    await schrijfVeld(task.id, "description", nieuw);
    router.refresh();
  }

  if (bewerken) {
    return (
      <textarea
        autoFocus
        rows={6}
        value={waarde}
        onChange={(e) => setWaarde(e.target.value)}
        onBlur={bewaar}
        onKeyDown={(e) => {
          // Geen Enter om op te slaan: dit veld is juist bedoeld voor meer dan
          // één regel.
          if (e.key === "Escape") {
            setWaarde(task.description ?? "");
            setBewerken(false);
          }
        }}
        className="w-full text-sm rounded-md px-2 py-1.5 -mx-2 outline-none resize-y"
        style={{
          color: "var(--text)",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setBewerken(true)}
      className="text-sm rounded-md px-2 py-1.5 -mx-2 cursor-text"
      style={{ transition: "background 120ms" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
    >
      {task.description ? (
        // whitespace-pre-line: de regeleinden die erin getypt zijn horen te
        // blijven staan.
        <span className="whitespace-pre-line" style={{ color: "var(--text)" }}>
          {task.description}
        </span>
      ) : (
        <span style={{ color: "var(--text-muted)" }}>Geen omschrijving.</span>
      )}
    </div>
  );
}

/** Eén veld wegschrijven, in de vorm die de serveractie verwacht. */
async function schrijfVeld(id: string, veld: string, waarde: string) {
  const fd = new FormData();
  fd.set("id", id);
  fd.set("veld", veld);
  fd.set("waarde", waarde);
  await updateTaskVeldAction(fd);
}

/**
 * De subtaken.
 *
 * De lijst komt met de pagina mee en niet uit een eigen vraag vanuit de
 * browser, zoals in het oude venster. Aan- en afvinken gaat wel hier, met de
 * uitkomst alvast op het scherm: wachten op de server voelt bij een vinkje als
 * haperen.
 */
function Subtaken({ taskId, beginwaarde }: { taskId: string; beginwaarde: Subtask[] }) {
  const router = useRouter();
  const [subtaken, setSubtaken] = useState<Subtask[]>(beginwaarde);
  const [toevoegen, setToevoegen] = useState(false);
  const [titel, setTitel] = useState("");
  const invoer = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (toevoegen) invoer.current?.focus();
  }, [toevoegen]);

  async function voegToe(e: React.FormEvent) {
    e.preventDefault();
    const naam = titel.trim();
    if (!naam) return;

    // Alvast op het scherm met een tijdelijk id; de server geeft er zo een
    // echte voor terug via router.refresh().
    setSubtaken((s) => [
      ...s,
      {
        id: crypto.randomUUID(),
        task_id: taskId,
        title: naam,
        completed: false,
        created_at: new Date().toISOString(),
      },
    ]);
    setTitel("");

    const fd = new FormData();
    fd.set("task_id", taskId);
    fd.set("title", naam);
    await createSubtaskAction(fd);
    router.refresh();
  }

  async function wissel(subtaak: Subtask) {
    setSubtaken((s) =>
      s.map((x) => (x.id === subtaak.id ? { ...x, completed: !x.completed } : x)),
    );
    const fd = new FormData();
    fd.set("id", subtaak.id);
    fd.set("completed", String(!subtaak.completed));
    await toggleSubtaskAction(fd);
  }

  async function verwijder(id: string) {
    setSubtaken((s) => s.filter((x) => x.id !== id));
    const fd = new FormData();
    fd.set("id", id);
    await deleteSubtaskAction(fd);
  }

  const af = subtaken.filter((s) => s.completed).length;

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
          Subtaken{" "}
          {subtaken.length > 0 && (
            <span className="font-normal text-xs" style={{ color: "var(--text-muted)" }}>
              ({af}/{subtaken.length})
            </span>
          )}
        </p>
        {!toevoegen && subtaken.length > 0 && (
          <button
            onClick={() => setToevoegen(true)}
            className="text-xs px-2.5 py-1 rounded-md"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
          >
            + Toevoegen
          </button>
        )}
      </div>

      <div className="space-y-0.5 mb-3">
        {subtaken.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center gap-3 group px-2 py-2 rounded-lg -mx-2"
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "")}
          >
            <button
              onClick={() => wissel(sub)}
              className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
              style={{
                border: `1.5px solid ${sub.completed ? "var(--text-heading)" : "var(--border)"}`,
                background: sub.completed ? "var(--text-heading)" : "transparent",
                transition: "all 150ms",
              }}
            >
              {sub.completed && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span
              className="text-sm flex-1"
              style={{
                color: sub.completed ? "var(--text-muted)" : "var(--text-heading)",
                textDecoration: sub.completed ? "line-through" : "none",
              }}
            >
              {sub.title}
            </span>
            <button
              onClick={() => verwijder(sub.id)}
              className="opacity-0 group-hover:opacity-100 text-sm transition-opacity px-1"
              style={{ color: "#e57373" }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {toevoegen ? (
        <form onSubmit={voegToe} className="flex gap-2">
          <input
            ref={invoer}
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Subtaak omschrijving..."
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
            onKeyDown={(e) => e.key === "Escape" && setToevoegen(false)}
          />
          <Button type="submit">Voeg toe</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setToevoegen(false);
              setTitel("");
            }}
          >
            Annuleer
          </Button>
        </form>
      ) : (
        <button
          onClick={() => setToevoegen(true)}
          className="w-full text-left text-sm px-3 py-2.5 rounded-lg"
          style={{ border: "1px dashed var(--border)", color: "var(--text-muted)" }}
        >
          + Subtaak toevoegen
        </button>
      )}
    </>
  );
}
