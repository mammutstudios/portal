"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import { convertDealAction, deleteDealAction } from "@/lib/actions/deals";
import type { Deal } from "@/lib/types";

/**
 * Omzetten en verwijderen: de twee dingen die je met een deal doet buiten het
 * bijwerken om. Allebei achter een bevestiging, want ze zijn niet terug te
 * draaien; een bevestiging hoort wél in een venster en niet op een eigen pagina.
 */
export default function DealActies({ deal, klantNaam }: { deal: Deal; klantNaam: string | null }) {
  const router = useRouter();
  const [omzetten, setOmzetten] = useState(false);
  const [verwijderen, setVerwijderen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function doeOmzetten() {
    setBezig(true);
    setFout(null);
    const uitkomst = await convertDealAction(deal.id);
    setBezig(false);
    if (uitkomst?.error) return setFout(uitkomst.error);
    setOmzetten(false);
    if (uitkomst?.clientId) router.push(`/dashboard/clients/${uitkomst.clientId}`);
  }

  async function doeVerwijderen() {
    setBezig(true);
    setFout(null);
    const formData = new FormData();
    formData.set("id", deal.id);
    const uitkomst = await deleteDealAction(formData);
    setBezig(false);
    if (uitkomst?.error) return setFout(uitkomst.error);
    router.push("/dashboard/deals");
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {deal.converted_at ? (
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            Omgezet
            {deal.project_id && (
              <>
                {" naar "}
                <Link href={`/dashboard/projects/${deal.project_id}`} className="hover:underline">
                  het project
                </Link>
              </>
            )}
            .
          </span>
        ) : !deal.client_id ? (
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            Kies een organisatie om deze deal om te kunnen zetten.
          </span>
        ) : (
          <button
            onClick={() => setOmzetten(true)}
            className="text-sm px-3 py-1.5 rounded-md font-medium"
            style={{ background: "var(--text-heading)", color: "#fff" }}
          >
            Omzetten naar project
          </button>
        )}

        <button
          onClick={() => setVerwijderen(true)}
          className="text-sm px-3 py-1.5 rounded-md ml-auto"
          style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          Verwijderen
        </button>
      </div>

      {omzetten && (
        <Modal title="Deal omzetten" onClose={() => setOmzetten(false)}>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--text)" }}>
              {deal.client_id ? (
                <>
                  Hiermee komt er een project <strong>{deal.title}</strong> op Upcoming bij{" "}
                  <strong>{klantNaam ?? "deze organisatie"}</strong>. Er wordt geen tweede
                  organisatie aangemaakt.
                </>
              ) : (
                <>
                  Er hangt nog geen organisatie aan deze deal. Kies er een bij de deal, dan
                  komt het project daar terecht.
                </>
              )}{" "}
              De deal blijft eraan gekoppeld, zodat zichtbaar blijft waar dit werk vandaan komt.
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {deal.contact_id
                ? "De contactpersoon gaat mee naar de organisatie en het project. "
                : ""}
              Portaaltoegang komt er niet vanzelf bij; dat regel je apart bij de organisatie.
            </p>
            {fout && <p className="text-sm" style={{ color: "#b0413e" }}>{fout}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOmzetten(false)}
                className="text-sm px-3 py-1.5 rounded-md"
                style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                Annuleren
              </button>
              <button
                onClick={doeOmzetten}
                disabled={bezig}
                className="text-sm px-3 py-1.5 rounded-md font-medium"
                style={{ background: "var(--text-heading)", color: "#fff", opacity: bezig ? 0.6 : 1 }}
              >
                {bezig ? "Bezig…" : "Omzetten"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {verwijderen && (
        <Modal title="Deal verwijderen" onClose={() => setVerwijderen(false)}>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--text)" }}>
              <strong>{deal.title}</strong> wordt verwijderd. Wat er al uit omgezet is blijft
              bestaan: de organisatie en het project raak je hier niet mee kwijt.
            </p>
            {fout && <p className="text-sm" style={{ color: "#b0413e" }}>{fout}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setVerwijderen(false)}
                className="text-sm px-3 py-1.5 rounded-md"
                style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                Annuleren
              </button>
              <button
                onClick={doeVerwijderen}
                disabled={bezig}
                className="text-sm px-3 py-1.5 rounded-md font-medium"
                style={{ background: "#b0413e", color: "#fff", opacity: bezig ? 0.6 : 1 }}
              >
                {bezig ? "Bezig…" : "Verwijderen"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
