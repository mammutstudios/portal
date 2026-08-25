"use client";

import { useRef, useState } from "react";
import { Paperclip } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Select from "@/components/Select";
import SearchSelect from "@/components/SearchSelect";
import { createDealAction, updateDealAction } from "@/lib/actions/deals";
import { quickCreateClientAction } from "@/lib/actions/clients";
import { quickCreateContactAction } from "@/lib/actions/contacts";
import { uploadDealBestand, bestandsgrootte } from "@/lib/dealUpload";
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
  /** Met de organisaties waar ze bij horen, zodat de lijst mee kan filteren. */
  contacts: {
    id: string;
    name: string;
    email: string | null;
    contact_clients?: { client_id: string | null }[] | null;
  }[];
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  // Bij een nieuwe deal bestaat er nog niets om bestanden aan te hangen, dus
  // houden we ze hier vast tot de deal is opgeslagen. Op een bestaande deal
  // doet het blok op de dealpagina dat werk.
  const bestandInvoer = useRef<HTMLInputElement>(null);
  const [klaarstaand, setKlaarstaand] = useState<File[]>([]);
  const [sleept, setSleept] = useState(false);

  // Bij een gekozen organisatie alleen de mensen die daarbij horen. Zonder
  // organisatie de hele lijst, want dan valt er niets te filteren.
  const [klantId, setKlantId] = useState(deal?.client_id ?? "");
  const hoortBij = (c: (typeof contacts)[number]) =>
    (c.contact_clients ?? []).some((k) => k.client_id === klantId);
  const zichtbareContacten = klantId ? contacts.filter(hoortBij) : contacts;

  // Is er precies één, dan is die de bedoeling; dat scheelt een klik.
  const enige = zichtbareContacten.length === 1 ? zichtbareContacten[0].id : undefined;
  // Wisselt de organisatie, dan telt de eerder bewaarde contactpersoon niet
  // meer mee: die hoort bij de vorige organisatie.
  const gewisseld = klantId !== (deal?.client_id ?? "");
  const standaardContact = gewisseld ? enige : (deal?.contact_id ?? enige);

  const voegToe = (lijst: FileList | null) =>
    setKlaarstaand((eerder) => [...eerder, ...Array.from(lijst ?? [])]);

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

    // De klaargezette bestanden kunnen er nu pas aan hangen; de deal bestaat
    // sinds een regel geleden.
    // updateDealAction geeft geen id terug, createDealAction wel; vandaar de
    // losse uitlezing in plaats van een smalle union.
    const nieuwId = deal ? null : (uitkomst as { id?: string | null }).id ?? null;
    if (nieuwId && klaarstaand.length > 0) {
      setBezig(true);
      for (const bestand of klaarstaand) {
        const mislukt = await uploadDealBestand(nieuwId, bestand);
        // De deal staat er al; een mislukte bijlage mag dat niet ongedaan
        // maken. Je ziet het op de dealpagina en probeert het daar opnieuw.
        if (mislukt) console.error(`[deals] ${bestand.name}: ${mislukt}`);
      }
      setBezig(false);
    }

    // Naar de deal zelf bij een nieuwe, zodat je ziet wat er staat; anders
    // terug naar de lijst.
    router.push(nieuwId ? `/dashboard/deals/${nieuwId}` : "/dashboard/deals");
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
          onChange={(waarde) => setKlantId(waarde ?? "")}
          onCreateNew={async (naam) => {
            const uitkomst = await quickCreateClientAction(naam);
            if ("error" in uitkomst) return null;
            return { value: uitkomst.id, label: uitkomst.name };
          }}
        />
      </Veld>

      <Veld label="Contactpersoon">
        {/* De key hangt aan de organisatie: wisselt die, dan begint deze lijst
            opnieuw met de juiste mensen en de juiste voorkeuze. */}
        <SearchSelect
          key={klantId}
          name="contact_id"
          defaultValue={standaardContact}
          placeholder={
            klantId && zichtbareContacten.length === 0
              ? "Nog niemand bij deze organisatie, typ een naam"
              : "Zoeken of nieuwe naam typen"
          }
          options={zichtbareContacten.map((c) => ({
            value: c.id,
            label: c.name,
            sublabel: c.email ?? undefined,
          }))}
          onCreateNew={async (naam) => {
            // Meteen aan de gekozen organisatie hangen, anders staat hij
            // nergens bij en valt hij de volgende keer buiten dit lijstje.
            const uitkomst = await quickCreateContactAction(naam, klantId || null);
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

      {!deal && (
        <Veld label="Bijlagen">
          {/* Slepen of klikken: allebei komen ze in dezelfde lijst terecht.
              De bestanden gaan pas de deur uit als de deal is opgeslagen, want
              vóór die tijd is er niets om ze aan te hangen. */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setSleept(true);
            }}
            onDragLeave={() => setSleept(false)}
            onDrop={(e) => {
              e.preventDefault();
              setSleept(false);
              voegToe(e.dataTransfer.files);
            }}
            onClick={() => bestandInvoer.current?.click()}
            className="rounded-lg px-4 py-6 flex items-center justify-center gap-2.5 cursor-pointer transition-colors"
            style={{
              border: `1px dashed ${sleept ? "var(--text-heading)" : "var(--border)"}`,
              background: sleept ? "var(--bg-hover)" : "var(--bg)",
            }}
          >
            <Paperclip size={18} style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text)" }}>
              Sleep bestanden hierheen of klik om te kiezen
            </p>
          </div>
          <input
            ref={bestandInvoer}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              voegToe(e.target.files);
              if (bestandInvoer.current) bestandInvoer.current.value = "";
            }}
          />

          {klaarstaand.length > 0 && (
            <ul className="mt-2 space-y-1">
              {klaarstaand.map((b, i) => (
                <li
                  key={`${b.name}-${i}`}
                  className="flex items-center gap-3 text-sm"
                  style={{ color: "var(--text)" }}
                >
                  <span className="truncate min-w-0 flex-1">{b.name}</span>
                  <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {bestandsgrootte(b.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setKlaarstaand((eerder) => eerder.filter((_, j) => j !== i))}
                    className="text-xs hover:underline"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Weghalen
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Veld>
      )}

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
