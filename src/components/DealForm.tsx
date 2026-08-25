"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Select from "@/components/Select";
import SearchSelect from "@/components/SearchSelect";
import { createDealAction, updateDealAction } from "@/lib/actions/deals";
import { quickCreateClientAction } from "@/lib/actions/clients";
import { quickCreateContactAction } from "@/lib/actions/contacts";
import { DEAL_STATUSSEN, DEAL_STATUS_LABEL, type Deal } from "@/lib/types";

const invoerStijl = {
  border: "1px solid var(--border)",
  background: "var(--bg-secondary)",
  color: "var(--text-heading)",
} as const;

function Veld({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm mb-1.5" style={{ color: "var(--text)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Nieuwe deal of een bestaande bijwerken.
 *
 * Eén formulier voor allebei: de velden zijn identiek en twee kopieën zouden
 * meteen uit elkaar lopen. `deal` weglaten betekent nieuw.
 */
export default function DealForm({
  deal,
  clients,
  contacts,
}: {
  deal?: Deal;
  /** Bestaande organisaties, voor een aanvraag van een klant die je al kent. */
  clients: { id: string; name: string }[];
  contacts: { id: string; name: string; email: string | null }[];
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function opslaan(formData: FormData) {
    setBezig(true);
    setFout(null);
    const uitkomst = deal
      ? await updateDealAction(deal.id, formData)
      : await createDealAction(formData);
    setBezig(false);

    if (uitkomst?.error) {
      setFout(uitkomst.error);
      return;
    }
    // Terug naar de lijst, en die opnieuw laten ophalen: anders staat de
    // zojuist opgeslagen deal er nog niet in.
    router.push("/dashboard/deals");
    router.refresh();
  }

  return (
    <form action={opslaan} className="space-y-4">
      <Veld label="Waar gaat het over *">
        <input
          name="title"
          defaultValue={deal?.title}
          required
          placeholder="Webshop voor Van der Kam"
          className="w-full px-3 rounded-lg text-sm outline-none"
          style={{ ...invoerStijl, height: 40 }}
        />
      </Veld>

      {/* Geen losse tekstvelden voor bedrijf en contactpersoon: die zouden een
          tweede plek zijn voor gegevens die al in clients en contacts staan.
          Bestaat iemand nog niet, dan typ je de naam en maak je hem hier aan;
          hij staat dan meteen in je organisaties of contactpersonen. */}
      <Veld label="Organisatie">
        <SearchSelect
          name="client_id"
          defaultValue={deal?.client_id ?? undefined}
          placeholder="Zoeken of nieuwe naam typen"
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
          onCreateNew={async (naam) => {
            const uitkomst = await quickCreateClientAction(naam);
            if ("error" in uitkomst) return null;
            return { value: uitkomst.id, label: uitkomst.name };
          }}
        />
      </Veld>

      <Veld label="Contactpersoon">
        <SearchSelect
          name="contact_id"
          defaultValue={deal?.contact_id ?? undefined}
          placeholder="Zoeken of nieuwe naam typen"
          options={contacts.map((c) => ({
            value: c.id,
            label: c.name,
            sublabel: c.email ?? undefined,
          }))}
          onCreateNew={async (naam) => {
            const uitkomst = await quickCreateContactAction(naam);
            if ("error" in uitkomst) return null;
            return { value: uitkomst.id, label: uitkomst.name };
          }}
        />
      </Veld>

      <div className="grid grid-cols-2 gap-3">
        <Veld label="Hoe binnengekomen">
          <input
            name="source"
            defaultValue={deal?.source ?? ""}
            placeholder="Onepagelove, doorverwijzing"
            className="w-full px-3 rounded-lg text-sm outline-none"
            style={{ ...invoerStijl, height: 40 }}
          />
        </Veld>
        <Veld label="Inschatting (excl. btw)">
          <input
            name="value_amount"
            inputMode="decimal"
            defaultValue={deal?.value_amount ?? ""}
            placeholder="5000"
            className="w-full px-3 rounded-lg text-sm outline-none"
            style={{ ...invoerStijl, height: 40 }}
          />
        </Veld>
      </div>

      <Veld label="Status">
        <Select
          name="status"
          defaultValue={deal?.status ?? "nieuw"}
          options={DEAL_STATUSSEN.map((s) => ({ value: s, label: DEAL_STATUS_LABEL[s] }))}
        />
      </Veld>

      <Veld label="Notities">
        <textarea
          name="notes"
          defaultValue={deal?.notes ?? ""}
          rows={4}
          placeholder="Wat willen ze, wat is er afgesproken"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-y"
          style={invoerStijl}
        />
      </Veld>

      {fout && (
        <p className="text-sm" style={{ color: "#b0413e" }}>
          {fout}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Link
          href="/dashboard/deals"
          className="text-sm px-3 py-1.5 rounded-md"
          style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          Annuleren
        </Link>
        <button
          type="submit"
          disabled={bezig}
          className="text-sm px-3 py-1.5 rounded-md font-medium"
          style={{ background: "var(--text-heading)", color: "#fff", opacity: bezig ? 0.6 : 1 }}
        >
          {bezig ? "Bezig…" : deal ? "Opslaan" : "Deal toevoegen"}
        </button>
      </div>
    </form>
  );
}
