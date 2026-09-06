"use client";

import { useState } from "react";
import Modal from "@/components/Modal";
import SearchSelect from "@/components/SearchSelect";
import { createPortalTicketAction } from "@/lib/actions/portalTickets";
import { TICKET_STATUS, alsTicketStatus } from "@/lib/tickets";
import type { Task } from "@/lib/types";
import Button from "@/components/Button";

type ProjectOptie = { id: string; title: string };

/**
 * De ticketlijst in het portaal, met de knop om er zelf een in te dienen.
 *
 * De klant ziet hier bewust minder dan het team op het bord: geen prioriteit
 * en geen toewijzing. Dat is planning, en die verandert een paar keer per week
 * zonder dat het iets zegt over wanneer iets af is. De status staat er wel,
 * want daar gaat de vraag over, en met dezelfde woorden als op het bord: gaat
 * het over hetzelfde ticket, dan helpt het niet als jullie het anders noemen.
 */
export default function PortalTickets({
  tickets,
  projecten,
  clientId,
  kanIndienen,
}: {
  tickets: Task[];
  projecten: ProjectOptie[];
  clientId: string;
  kanIndienen: boolean;
}) {
  const [openFormulier, setOpenFormulier] = useState(false);

  const lopend = tickets.filter((t) => t.status !== "done");
  const afgerond = tickets.filter((t) => t.status === "done");

  return (
    <>
      {kanIndienen && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => setOpenFormulier(true)}>
            + Nieuw ticket
          </Button>
        </div>
      )}

      {tickets.length === 0 ? (
        <div
          className="squircle px-4 py-10 text-center"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Er staat nog niets open.{" "}
            {kanIndienen && (
              <button
                onClick={() => setOpenFormulier(true)}
                className="underline"
                style={{ color: "var(--text)" }}
              >
                Meld je eerste ticket aan.
              </button>
            )}
          </p>
        </div>
      ) : (
        <TicketLijst tickets={lopend} />
      )}

      {afgerond.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>
            Afgerond
          </h2>
          <TicketLijst tickets={afgerond} />
        </section>
      )}

      {openFormulier && (
        <Modal title="Nieuw ticket" onClose={() => setOpenFormulier(false)}>
          <TicketFormulier
            projecten={projecten}
            clientId={clientId}
            onKlaar={() => setOpenFormulier(false)}
          />
        </Modal>
      )}
    </>
  );
}

function TicketLijst({ tickets }: { tickets: Task[] }) {
  if (tickets.length === 0) return null;

  return (
    <div
      className="squircle overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      {tickets.map((ticket, i) => {
        const stijl = TICKET_STATUS[alsTicketStatus(ticket.status)];
        return (
          <div
            key={ticket.id}
            className="px-4 py-3 flex items-start justify-between gap-4"
            style={{ borderBottom: i < tickets.length - 1 ? "1px solid var(--border)" : "none" }}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>
                {ticket.title}
              </p>
              {ticket.description && (
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {ticket.description}
                </p>
              )}
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {ticket.projects?.title ?? "Geen project"}
                {" · "}
                {new Date(ticket.created_at).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            <span
              className="px-2.5 py-1 rounded-md text-xs font-medium flex-shrink-0"
              style={{ background: stijl.bg, color: stijl.text, border: `1px solid ${stijl.border}` }}
            >
              {stijl.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TicketFormulier({
  projecten,
  clientId,
  onKlaar,
}: {
  projecten: ProjectOptie[];
  clientId: string;
  onKlaar: () => void;
}) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function verstuur(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFout(null);
    setBezig(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set("client_id", clientId);
      await createPortalTicketAction(fd);
      onKlaar();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Versturen is niet gelukt.");
      setBezig(false);
    }
  }

  return (
    <form onSubmit={verstuur} className="space-y-4">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
          Waar gaat het over?
        </label>
        <input
          name="title"
          required
          autoFocus
          maxLength={200}
          placeholder="Bijvoorbeeld: nieuwe foto op de teampagina"
          className="w-full px-3 py-2 rounded-md text-sm"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-heading)" }}
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
          Toelichting
        </label>
        <textarea
          name="description"
          rows={4}
          placeholder="Wat moet er gebeuren, en is er iets waar we rekening mee moeten houden?"
          className="w-full px-3 py-2 rounded-md text-sm resize-none"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-heading)" }}
        />
      </div>

      {projecten.length > 0 && (
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
            Hoort het bij een project?
          </label>
          <SearchSelect
            name="project_id"
            placeholder="Geen"
            options={projecten.map((p) => ({ value: p.id, label: p.title }))}
          />
        </div>
      )}

      {fout && (
        <p className="text-sm" style={{ color: "#dc2626" }}>
          {fout}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" onClick={onKlaar}>
          Annuleren
        </Button>
        <Button type="submit" disabled={bezig}>
          {bezig ? "Bezig..." : "Ticket indienen"}
        </Button>
      </div>
    </form>
  );
}
