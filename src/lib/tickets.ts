import type { TaskStatus } from "@/lib/types";

/**
 * De statussen van een ticket, op één plek.
 *
 * Stonden eerder drie keer los: als labels in TasksPageClient, nog eens als
 * TAAK_STATUS_LABEL in de serveractie, en de kleuren in weer een eigen setje
 * records. Het bord, de lijst en het portaal moeten hetzelfde zeggen, dus
 * leest alles nu hieruit.
 *
 * De volgorde is de volgorde van de kolommen op het bord, en tegelijk de
 * route die werk aflegt: alles begint op Open en schuift van daaruit naar
 * rechts. Er stond eerder een Te doen naast Open, maar die twee beschreven
 * dezelfde toestand (nog niet opgepakt) en verdeelden de wachtrij over twee
 * kolommen zonder onderscheid.
 */
/**
 * Een label is een gevulde tint met donkere tekst erop, geen zweem kleur met
 * een verzadigde letter. Dat laatste haalde op 12 pixels maar 2,8 tot 3,4 op 1
 * aan contrast en las als pastel; deze combinaties zitten allemaal rond de 7,5.
 *
 * `dot` staat er los bij voor de stip boven een kanbankolom. Die is acht
 * pixels groot, en op dat formaat zijn vier donkere tinten niet meer uit
 * elkaar te houden; daar hoort de verzadigde kleur.
 */
export type TicketStatusStijl = {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
};

export const TICKET_STATUS: Record<TaskStatus, TicketStatusStijl> = {
  open: {
    label: "Open",
    bg: "var(--bg-hover)",
    text: "var(--text)",
    border: "var(--border)",
    dot: "var(--text-muted)",
  },
  in_progress: {
    label: "Bezig",
    bg: "#fed7aa",
    text: "#7c2d12",
    border: "#fdba74",
    dot: "#ea580c",
  },
  review: {
    label: "Review",
    bg: "#bfdbfe",
    text: "#1e3a8a",
    border: "#93c5fd",
    dot: "#2563eb",
  },
  done: {
    label: "Klaar",
    bg: "#bbf7d0",
    text: "#14532d",
    border: "#86efac",
    dot: "#16a34a",
  },
};

export const TICKET_STATUS_ORDER: TaskStatus[] = [
  "open",
  "in_progress",
  "review",
  "done",
];

/** De status waarin een verzoek uit het portaal binnenkomt. */
export const TICKET_STATUS_NIEUW: TaskStatus = "open";

export const TICKET_STATUS_LABEL: Record<TaskStatus, string> = Object.fromEntries(
  TICKET_STATUS_ORDER.map((s) => [s, TICKET_STATUS[s].label]),
) as Record<TaskStatus, string>;

/**
 * Een status uit de database is een string, en na een handmatige ingreep hoeft
 * die niet in de lijst hierboven voor te komen. Valt terug op Open, want een
 * ticket dat nergens bij hoort verdwijnt van het bord. Dat geldt ook voor de
 * oude waarde 'todo': die is bij de migratie omgezet, maar een rij die daaraan
 * ontsnapt hoort in dezelfde kolom als waar hij naartoe zou zijn gegaan.
 */
export function alsTicketStatus(waarde: string | null | undefined): TaskStatus {
  return waarde && waarde in TICKET_STATUS ? (waarde as TaskStatus) : "open";
}
