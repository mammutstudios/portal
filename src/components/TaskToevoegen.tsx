"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react";
import Modal from "@/components/Modal";
import SearchSelect from "@/components/SearchSelect";
import Button from "@/components/Button";
import { createTaskAction } from "@/lib/actions/tasks";

export type KlantOptie = { id: string; name: string; logo_url: string | null };
export type ProjectOptie = { id: string; title: string; client_id: string | null };

const invoerStijl = {
  border: "1px solid var(--border)",
  background: "var(--bg-secondary)",
  color: "var(--text-heading)",
} as const;

/**
 * Eén keuzelijst voor klant én project.
 *
 * Twee aparte velden zouden hier dubbel werk zijn: een project heeft zijn
 * klant al bij zich, dus kies je die twee keer. Alleen een klant kiezen moet
 * wél kunnen, want intern werk en verzoeken uit het portaal hangen aan geen
 * enkel project.
 *
 * De klantnaam staat ín het label van een project en niet eronder: de lijst
 * zoekt op het label, en zonder die naam vind je "Website" niet terug door
 * "Hubrand" te typen.
 */
function keuzes(klanten: KlantOptie[], projecten: ProjectOptie[]) {
  const naamVan = new Map(klanten.map((k) => [k.id, k]));

  const bijProject = projecten.map((p) => {
    const klant = p.client_id ? naamVan.get(p.client_id) : undefined;
    return {
      value: `p:${p.id}`,
      label: klant ? `${klant.name} · ${p.title}` : p.title,
      logo: klant?.logo_url ?? null,
      sorteer: `${klant?.name ?? "zzz"} ${p.title}`.toLowerCase(),
    };
  });

  bijProject.sort((a, b) => a.sorteer.localeCompare(b.sorteer));

  // Klanten onderaan: een task hangt meestal aan een project, en wat je het
  // vaakst kiest hoort bovenaan te staan.
  const alleenKlant = klanten.map((k) => ({
    value: `k:${k.id}`,
    label: k.name,
    logo: k.logo_url,
  }));

  return [...bijProject, ...alleenKlant];
}

/**
 * Een task erbij, zonder de lijst te verlaten.
 *
 * Drie velden in een venster, tegenover het volle formulier achter New task.
 * Dat laatste is voor werk dat je uitschrijft; dit is voor wat je nú bedenkt
 * en anders kwijt bent. Vandaar geen omschrijving, geen status en geen
 * deadline: die zet je erbij zodra je weet wat het is.
 */
export default function TaskToevoegen({
  klanten,
  projecten,
}: {
  klanten: KlantOptie[];
  projecten: ProjectOptie[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function opslaan(formData: FormData) {
    setBezig(true);
    setFout(null);

    // Het keuzeveld levert één waarde; de serveractie wil een project en een
    // klant. Een project vult zijn eigen klant daar verderop zelf aan.
    const doel = (formData.get("doel") as string) || "";
    formData.delete("doel");
    if (doel.startsWith("p:")) formData.set("project_id", doel.slice(2));
    if (doel.startsWith("k:")) formData.set("client_id", doel.slice(2));

    try {
      await createTaskAction(formData);
    } catch (e) {
      setFout(e instanceof Error ? e.message : "Er ging iets mis.");
      setBezig(false);
      return;
    }

    setBezig(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {/* Onder de laatste regel, in dezelfde kolom als de titels: zo leest hij
          als een lege regel die wacht tot je hem vult, en niet als een knop
          die ergens anders heen gaat. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 pl-2 pr-3 text-sm rounded-md"
        style={{ height: 32, color: "var(--text-muted)", transition: "color 120ms, background 120ms" }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--row-hover)";
          e.currentTarget.style.color = "var(--text-heading)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "";
          e.currentTarget.style.color = "var(--text-muted)";
        }}
      >
        <Plus size={14} weight="bold" />
        Add task
      </button>

      {open && (
        <Modal title="Nieuwe task" onClose={() => setOpen(false)}>
          <form action={opslaan} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--text-heading)" }}>
                Waar gaat het over
              </label>
              <input
                name="title"
                required
                autoFocus
                placeholder="Nieuwe foto op de teampagina"
                className="w-full px-3 rounded-md text-sm outline-none"
                style={{ ...invoerStijl, height: 36 }}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--text-heading)" }}>
                Klant of project
              </label>
              <SearchSelect
                name="doel"
                placeholder="Geen"
                showLogos
                options={keuzes(klanten, projecten)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--text-heading)" }}>
                Inschatting
              </label>
              <div
                className="flex items-center rounded-md pr-3"
                style={{ ...invoerStijl, height: 36, width: "9rem" }}
              >
                <input
                  name="estimate_hours"
                  inputMode="decimal"
                  placeholder="2"
                  className="w-full px-3 bg-transparent outline-none text-sm"
                  style={{ color: "var(--text-heading)" }}
                />
                <span className="text-sm flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  uur
                </span>
              </div>
              <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                Mag leeg. Staat later naast de uren die je er echt op schrijft.
              </p>
            </div>

            {fout && (
              <p className="text-sm" style={{ color: "#b0413e" }}>
                {fout}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Annuleren
              </Button>
              <Button type="submit" disabled={bezig}>
                {bezig ? "Bezig…" : "Task aanmaken"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
