"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChatText } from "@phosphor-icons/react";
import { updateTaskStatusAction } from "@/lib/actions/tasks";
import { TICKET_STATUS, TICKET_STATUS_ORDER } from "@/lib/tickets";
import ClientLogo from "@/components/ClientLogo";
import type { Task, TaskStatus } from "@/lib/types";

/**
 * De kanban: een kolom per status, slepen om iets te verplaatsen.
 *
 * Slepen gaat met de native drag and drop van de browser, zonder bibliotheek.
 * Dat kan hier omdat er maar één soort beweging is (een kaart naar een andere
 * kolom) en de volgorde bínnen een kolom niets betekent: die komt uit de
 * deadline. Een sorteerbibliotheek zou vooral gewicht toevoegen.
 *
 * Op een touchscreen bestaat die native drag niet. Daar is de statusknop op de
 * kaart de weg, dezelfde als in de lijst.
 */
export default function TicketKanban({ tasks }: { tasks: Task[] }) {
  const [, startTransition] = useTransition();
  const [sleept, setSleept] = useState<string | null>(null);
  const [boven, setBoven] = useState<TaskStatus | null>(null);

  /**
   * De status zoals hij er ná het loslaten uitziet, voordat de server heeft
   * geantwoord. Zonder dit springt de kaart terug naar zijn oude kolom en pas
   * een halve seconde later naar de nieuwe.
   *
   * De lijst waar die voorspelling bij hoort zit erbij. Zodra de server een
   * nieuwe stuurt is dit een ander array en laten we de voorspelling vallen:
   * wat er dan staat is de waarheid. Dat vergelijken gebeurt tijdens het
   * renderen en niet in een effect, want een setState in een effect kost een
   * extra ronde door de boom en is precies wat de kaart zou laten knipperen.
   */
  const [voorspelling, setVoorspelling] = useState<{
    bron: Task[];
    naar: Record<string, TaskStatus>;
  }>({ bron: tasks, naar: {} });

  const verplaatst = voorspelling.bron === tasks ? voorspelling.naar : {};

  const statusVan = (task: Task): TaskStatus => verplaatst[task.id] ?? task.status;

  function laatLos(status: TaskStatus) {
    const id = sleept;
    setSleept(null);
    setBoven(null);
    if (!id) return;

    const task = tasks.find((t) => t.id === id);
    if (!task || statusVan(task) === status) return;

    setVoorspelling((v) => ({
      bron: tasks,
      naar: { ...(v.bron === tasks ? v.naar : {}), [id]: status },
    }));

    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", status);
    startTransition(() => {
      updateTaskStatusAction(fd);
    });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {TICKET_STATUS_ORDER.map((status) => {
        const stijl = TICKET_STATUS[status];
        const kolom = tasks.filter((t) => statusVan(t) === status);
        const actief = boven === status;

        return (
          <section
            key={status}
            onDragOver={(e) => {
              // Zonder dit weigert de browser de drop en krijg je het
              // terugvliegende icoontje.
              e.preventDefault();
              if (boven !== status) setBoven(status);
            }}
            onDragLeave={(e) => {
              // Alleen loslaten als de muis de kolom echt verlaat, niet als hij
              // van de ene kaart erin naar de andere gaat.
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setBoven(null);
            }}
            onDrop={(e) => {
              // Zonder preventDefault handelt de browser de drop daarna zelf
              // nog af, en die probeert met de tekst uit de dataTransfer weg te
              // navigeren.
              e.preventDefault();
              laatLos(status);
            }}
            className="squircle flex flex-col"
            style={{
              // Vier gelijke kolommen die samen de breedte vullen. De
              // minimumbreedte is de ondergrens waaronder een kaarttitel niet
              // meer leesbaar afbreekt; passen ze daaronder niet meer, dan
              // scrollt de rij horizontaal in plaats van verder te knijpen.
              flex: "1 1 0",
              minWidth: "12rem",
              // Elke kolom draagt een zweem van zijn eigen kleur, afgeleid van
              // de stipkleur zodat er geen vijfde kleurwaarde per status bij
              // hoeft. Hangt er iets boven, dan wordt die zweem sterker: dat is
              // het enige signaal dat je hier kunt loslaten.
              background: `color-mix(in srgb, ${stijl.dot} ${actief ? "18%" : "7%"}, var(--white))`,
              border: `1px solid ${actief ? stijl.border : "transparent"}`,
              transition: "background 150ms, border-color 150ms",
            }}
          >
            {/* De kolomnaam is hetzelfde label als op het ticket zelf, zodat
                een status er overal gelijk uitziet. De stip die hier eerst
                stond zei daarnaast niets meer. */}
            <header className="flex items-center gap-2 px-3 pt-3 pb-2">
              <h2
                className="text-xs font-semibold px-2 py-0.5 rounded-md"
                style={{ background: stijl.bg, color: stijl.text, border: `1px solid ${stijl.border}` }}
              >
                {stijl.label}
              </h2>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {kolom.length}
              </span>
            </header>

            <div className="flex flex-col gap-2 px-2 pb-2 min-h-24">
              {kolom.map((task) => (
                <TicketKaart
                  key={task.id}
                  task={task}
                  sleept={sleept === task.id}
                  onDragStart={() => setSleept(task.id)}
                  onDragEnd={() => {
                    setSleept(null);
                    setBoven(null);
                  }}
                />
              ))}

              {kolom.length === 0 && (
                <p className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>
                  {actief ? "Laat hier los" : "Leeg"}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TicketKaart({
  task,
  sleept,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  sleept: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const router = useRouter();
  // Alleen tonen als er iets te lezen valt: een nul zegt niets en vult de
  // kaart met ruis.
  const reacties = task.task_comments?.[0]?.count ?? 0;
  const teLaat = task.due_date && task.status !== "done" && new Date(task.due_date) < new Date();
  const toegewezen = task.profiles?.full_name ?? task.contacts?.name ?? null;
  const organisatie = task.clients?.name ?? null;

  // Waar hoort dit bij? De organisatie, met haar logo: dat is waar je op een
  // vol bord op scant. Het project is de terugval voor een ticket dat wel aan
  // een project hangt maar nog geen organisatie heeft; zonder die terugval
  // staat er dan niets.
  const herkomst = organisatie ?? task.projects?.title ?? null;

  return (
    <article
      draggable
      onDragStart={(e) => {
        // Firefox begint pas te slepen als er iets in de dataTransfer zit.
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
      className="squircle px-4 py-3.5 select-none"
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        opacity: sleept ? 0.4 : 1,
        cursor: sleept ? "grabbing" : "grab",
        transition: "opacity 150ms, background 150ms",
      }}
      // Een tint in plaats van een schaduw. Bewust lichter dan de kolom
      // eronder (die zit op 5% inkt): op dezelfde tint zou de kaart in zijn
      // kolom oplossen in plaats van te reageren.
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "color-mix(in srgb, var(--ink) 3%, var(--white))")
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg)")}
    >
      <p className="text-sm font-semibold leading-snug" style={{ color: "var(--text-heading)" }}>
        {task.title}
      </p>

      {herkomst && (
        <div className="flex items-center gap-1.5 mt-2 min-w-0">
          {organisatie && (
            <ClientLogo logo_url={task.clients?.logo_url} name={organisatie} size="xs" />
          )}
          <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            {herkomst}
          </span>
        </div>
      )}

      {(task.due_date || toegewezen || reacties > 0) && (
        <div className="flex items-center justify-between gap-2 mt-2">
          <span className="flex items-center gap-2.5 min-w-0">
            {task.due_date && (
              <span className="text-xs" style={{ color: teLaat ? "#dc2626" : "var(--text-muted)" }}>
                {new Date(task.due_date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
              </span>
            )}
            {reacties > 0 && (
              <span
                className="flex items-center gap-1 text-xs leading-none"
                style={{ color: "var(--text-muted)" }}
                title={`${reacties} ${reacties === 1 ? "reactie" : "reacties"}`}
              >
                <ChatText size={14} />
                {reacties}
              </span>
            )}
          </span>

          {toegewezen &&
            // 16 pixels, gelijk aan het icoontje van de reactieteller
            // ertegenover. Op 20 stak hij boven en onder die regel uit en leek
            // hij scheef te hangen.
            (task.profiles?.avatar_url ? (
              <img
                src={task.profiles.avatar_url}
                alt={toegewezen}
                title={toegewezen}
                // Zonder dit sleept de browser het plaatje in plaats van de
                // kaart zodra je hem net op de avatar pakt.
                draggable={false}
                className="w-4 h-4 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <span
                title={toegewezen}
                className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white"
                style={{ background: "var(--text-heading)", fontSize: "0.5625rem" }}
              >
                {toegewezen.charAt(0).toUpperCase()}
              </span>
            ))}
        </div>
      )}
    </article>
  );
}
