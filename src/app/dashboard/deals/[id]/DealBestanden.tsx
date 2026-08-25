"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  signDealUploadAction,
  registerDealFileAction,
  deleteDealFileAction,
  dealFileUrlAction,
} from "@/lib/actions/dealBestanden";

export type DealBestand = {
  id: string;
  name: string;
  size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

const grootte = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`.replace(".", ",");
};

/**
 * Bestanden bij een deal: briefings, offertes, wat er ook binnenkomt.
 *
 * Uploaden gaat rechtstreeks van de browser naar de opslag met een link die de
 * server ondertekent. Door de serverfunctie heen zou het op 4,5 MB stuklopen,
 * en dat haalt een briefing van een paar pagina's zo.
 */
export default function DealBestanden({
  dealId,
  bestanden,
}: {
  dealId: string;
  bestanden: DealBestand[];
}) {
  const router = useRouter();
  const invoer = useRef<HTMLInputElement>(null);
  const [bezig, setBezig] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  async function kies(bestandenLijst: FileList | null) {
    if (!bestandenLijst?.length) return;
    setFout(null);

    const supabase = createClient();

    // Eén voor één: bij een mislukking weet je meteen welke, en de rest gaat
    // gewoon door.
    for (const bestand of Array.from(bestandenLijst)) {
      setBezig(bestand.name);

      const link = await signDealUploadAction(dealId, bestand.name, bestand.size);
      if ("error" in link) {
        setFout(`${bestand.name}: ${link.error}`);
        continue;
      }

      const { error } = await supabase.storage
        .from("documents")
        .uploadToSignedUrl(link.path, link.token, bestand);

      if (error) {
        setFout(`${bestand.name}: uploaden mislukt`);
        continue;
      }

      const rij = await registerDealFileAction(
        dealId,
        link.path,
        bestand.name,
        bestand.size,
        bestand.type || null,
      );
      if (rij?.error) setFout(`${bestand.name}: ${rij.error}`);
    }

    setBezig(null);
    if (invoer.current) invoer.current.value = "";
    router.refresh();
  }

  async function openen(id: string) {
    const uitkomst = await dealFileUrlAction(id);
    if (!uitkomst.url) return setFout(uitkomst.error ?? "Link maken mislukt");
    window.open(uitkomst.url, "_blank", "noopener,noreferrer");
  }

  async function verwijderen(id: string, naam: string) {
    if (!confirm(`${naam} verwijderen?`)) return;
    const uitkomst = await deleteDealFileAction(id);
    if (uitkomst?.error) return setFout(uitkomst.error);
    router.refresh();
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
          Bestanden
        </h2>
        <button
          onClick={() => invoer.current?.click()}
          disabled={Boolean(bezig)}
          className="text-sm px-3 py-1.5 rounded-md"
          style={{
            border: "1px solid var(--border)",
            color: "var(--text-heading)",
            opacity: bezig ? 0.6 : 1,
          }}
        >
          {bezig ? `Bezig met ${bezig}…` : "Toevoegen"}
        </button>
        <input
          ref={invoer}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => kies(e.target.files)}
        />
      </div>

      {fout && (
        <p className="text-sm mb-2" style={{ color: "#b0413e" }}>
          {fout}
        </p>
      )}

      <div className="squircle overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
        {bestanden.length === 0 ? (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Nog geen bestanden. Briefings en offertes horen hier.
          </p>
        ) : (
          bestanden.map((b, i) => (
            <div
              key={b.id}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: i < bestanden.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              <button
                onClick={() => openen(b.id)}
                className="text-sm text-left min-w-0 flex-1 hover:underline"
                style={{ color: "var(--text-heading)" }}
              >
                <span className="truncate block">{b.name}</span>
              </button>
              <span className="text-xs tabular-nums flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                {grootte(b.size_bytes)}
              </span>
              <button
                onClick={() => verwijderen(b.id, b.name)}
                className="text-xs flex-shrink-0 hover:underline"
                style={{ color: "var(--text-muted)" }}
              >
                Verwijderen
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
