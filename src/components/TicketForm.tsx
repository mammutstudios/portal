"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SearchSelect from "@/components/SearchSelect";
import Button, { ButtonLink } from "@/components/Button";
import { createTaskAction } from "@/lib/actions/tasks";

export type KlantOptie = {
  id: string;
  name: string;
  logo_url: string | null;
};

const invoerStijl = {
  border: "1px solid var(--border)",
  background: "var(--bg-secondary)",
  color: "var(--text-heading)",
} as const;

/**
 * Een veld met zijn label, en eronder de uitleg als die er is.
 *
 * De uitleg staat ónder het veld en niet erboven: boven het veld leest hij als
 * een tweede label, eronder als een voorbeeld waar je op terugvalt als je niet
 * weet wat je moet invullen.
 */
function Veld({
  label,
  verplicht,
  uitleg,
  children,
}: {
  label: string;
  verplicht?: boolean;
  uitleg?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2" style={{ color: "var(--text-heading)" }}>
        {label}
        {verplicht && (
          <span className="font-normal ml-1.5" style={{ color: "var(--text-muted)" }}>
            (verplicht)
          </span>
        )}
      </label>
      {children}
      {uitleg && (
        <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
          {uitleg}
        </p>
      )}
    </div>
  );
}

/**
 * Een nieuw ticket, op een eigen pagina.
 *
 * Drie velden, en verder niets. Toewijzing, deadline, status en prioriteit
 * horen bij het inplannen en niet bij het opschrijven: die zet je later op het
 * bord of in het ticket zelf, als je weet wat het is. Zou je ze hier vragen,
 * dan sta je bij elk krabbeltje vier keuzes te maken die je toch nog wijzigt.
 *
 * Alleen aanmaken dus, geen bewerken. Een bestaand ticket door dit formulier
 * halen zou zijn deadline en toewijzing wissen, want die velden zitten er niet
 * in en de serveractie schrijft alles wat ze binnenkrijgt.
 */
export default function TicketForm({ clients }: { clients: KlantOptie[] }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function opslaan(formData: FormData) {
    setBezig(true);
    setFout(null);

    try {
      await createTaskAction(formData);
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Er ging iets mis.");
      setBezig(false);
      return;
    }

    router.push("/dashboard/tasks");
    router.refresh();
  }

  return (
    <form action={opslaan} className="space-y-6">
      <Veld label="Waar gaat het over" verplicht>
        <input
          name="title"
          required
          autoFocus
          placeholder="Nieuwe foto op de teampagina"
          className="w-full px-3 rounded-lg text-sm outline-none"
          style={{ ...invoerStijl, height: 40 }}
        />
      </Veld>

      <Veld
        label="Wat moet er gebeuren"
        uitleg="Bijvoorbeeld: welke pagina, welk element, en waar het vandaan komt."
      >
        <textarea
          name="description"
          rows={7}
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-y"
          style={invoerStijl}
        />
      </Veld>

      <Veld label="Klant" uitleg="Laat leeg als het intern werk is dat bij geen enkele klant hoort.">
        <SearchSelect
          name="client_id"
          placeholder="Geen"
          showLogos
          options={clients.map((c) => ({ value: c.id, label: c.name, logo: c.logo_url }))}
        />
      </Veld>

      {fout && (
        <p className="text-sm" style={{ color: "#b0413e" }}>
          {fout}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <ButtonLink href="/dashboard/tasks" variant="secondary">
          Annuleren
        </ButtonLink>
        <Button type="submit" disabled={bezig}>
          {bezig ? "Bezig…" : "Ticket aanmaken"}
        </Button>
      </div>
    </form>
  );
}
