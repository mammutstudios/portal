"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "@phosphor-icons/react";
import { addTicketReactieAction, deleteTicketReactieAction } from "@/lib/actions/ticketReacties";

export type TicketReactie = {
  id: string;
  body: string;
  created_at: string;
  profile_id: string | null;
  /** Profiel-ids die in body met @ genoemd zijn. */
  mentions?: string[] | null;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
};

export type Noembaar = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  /** "Mammut" of de naam van de organisatie. Staat in de lijst achter de naam,
      zodat je ziet of je iemand van binnen of van buiten noemt. */
  groep?: string;
};

/**
 * Het gesprek onder een ticket.
 *
 * Zelfde opzet als de projecttijdlijn: berichten van oud naar nieuw, en
 * onderaan het veld om er een bij te zetten. Enter verstuurt, shift-enter
 * maakt een nieuwe regel; dat is wat je gewend bent van elke chat en het
 * scheelt de reis naar een knop.
 *
 * Wel een eigen tabel en een eigen component, geen hergebruik van de
 * projecttijdlijn: daar staan ook systeemregels tussen (status, fase,
 * factuur), en een reactie op één ticket zou daar tussen verdwijnen.
 */
export default function TicketReacties({
  taskId,
  reacties,
  huidigeGebruikerId,
  huidigeNaam,
  huidigeAvatar,
  noembaar,
}: {
  taskId: string;
  reacties: TicketReactie[];
  huidigeGebruikerId: string | null;
  huidigeNaam: string | null;
  huidigeAvatar: string | null;
  /** Wie je met @ kunt noemen: het team en de mensen van deze klant. */
  noembaar: Noembaar[];
}) {
  const router = useRouter();
  const [tekst, setTekst] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, start] = useTransition();
  const veld = useRef<HTMLTextAreaElement>(null);

  /**
   * Het stuk `@zoekterm` waar de cursor in staat, of null als je niet in een
   * vermelding zit. Alleen kijken naar wat vóór de cursor staat: typ je later
   * nog iets bij een eerdere @, dan hoort die lijst niet opnieuw open te gaan.
   */
  const [noemen, setNoemen] = useState<{ vanaf: number; term: string } | null>(null);

  const treffers = noemen
    ? noembaar.filter((n) =>
        (n.full_name ?? "").toLowerCase().includes(noemen.term.toLowerCase()),
      )
    : [];

  function volgCursor(waarde: string, cursor: number) {
    const voor = waarde.slice(0, cursor);
    // Een @ die aan het begin staat of na een spatie: midden in een woord (of
    // in een e-mailadres) is het geen vermelding.
    const match = /(^|\s)@([^\s@]*)$/.exec(voor);
    setNoemen(match ? { vanaf: cursor - match[2].length - 1, term: match[2] } : null);
  }

  function kies(persoon: Noembaar) {
    if (!noemen) return;
    const naam = persoon.full_name ?? "Onbekend";
    const nieuw = `${tekst.slice(0, noemen.vanaf)}@${naam} ${tekst.slice(noemen.vanaf + 1 + noemen.term.length)}`;
    setTekst(nieuw);
    setNoemen(null);
    // Terug naar het veld, met de cursor achter de naam die er net in kwam.
    const cursor = noemen.vanaf + naam.length + 2;
    requestAnimationFrame(() => {
      veld.current?.focus();
      veld.current?.setSelectionRange(cursor, cursor);
    });
  }

  function plaats() {
    const inhoud = tekst.trim();
    if (!inhoud) return;
    setFout(null);
    setTekst("");
    start(async () => {
      // Alleen wie ook echt nog in de tekst staat: haal je een naam weer weg,
      // dan hoort de vermelding niet te blijven hangen.
      const genoemd = noembaar
        .filter((n) => n.full_name && inhoud.includes(`@${n.full_name}`))
        .map((n) => n.id);
      const uitkomst = await addTicketReactieAction(taskId, inhoud, genoemd);
      if (uitkomst?.error) {
        setFout(uitkomst.error);
        // Terugzetten, anders is je bericht weg zonder dat het geplaatst is.
        setTekst(inhoud);
        return;
      }
      router.refresh();
    });
  }

  function verwijder(id: string) {
    start(async () => {
      const uitkomst = await deleteTicketReactieAction(id, taskId);
      if (uitkomst?.error) setFout(uitkomst.error);
      router.refresh();
    });
  }

  return (
    <>
      <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-heading)" }}>
        Reacties{" "}
        {reacties.length > 0 && (
          <span className="font-normal text-xs" style={{ color: "var(--text-muted)" }}>
            ({reacties.length})
          </span>
        )}
      </p>

      <div className="space-y-4 mb-4">
        {reacties.map((reactie) => (
          <div key={reactie.id} className="flex items-start gap-3 group">
            <Avatar
              naam={reactie.profiles?.full_name ?? null}
              url={reactie.profiles?.avatar_url ?? null}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {reactie.profiles?.full_name ?? "Onbekend"}
                {" · "}
                {wanneer(reactie.created_at)}
              </p>
              <p
                className="mt-0.5 whitespace-pre-wrap"
                style={{ color: "var(--text)", fontSize: "0.8125rem" }}
              >
                <MetVermeldingen body={reactie.body} mentions={reactie.mentions} lijst={noembaar} />
              </p>
            </div>
            {/* Alleen je eigen bericht. De databasepolicy weigert de rest ook,
                maar een knop die niets doet is erger dan geen knop. */}
            {reactie.profile_id && reactie.profile_id === huidigeGebruikerId && (
              <button
                onClick={() => verwijder(reactie.id)}
                className="opacity-0 group-hover:opacity-100 text-sm transition-opacity px-1"
                style={{ color: "#e57373" }}
                aria-label="Bericht weghalen"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {fout && (
        <p className="text-xs mb-2" style={{ color: "#c0392b" }}>
          {fout}
        </p>
      )}

      {/* Geen scheidingslijn erboven: het invoerveld heeft nu een eigen vlak,
          en die twee samen maakten er een dubbele grens van. */}
      <div className="relative">
        {noemen && treffers.length > 0 && (
          // Boven het veld en niet eronder: het veld staat onderaan de kaart,
          // dus daaronder is geen ruimte.
          <div
            className="absolute bottom-full left-0 mb-1 rounded-lg overflow-hidden z-20"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              boxShadow: "0 4px 16px rgb(20 0 24 / 0.1)",
              minWidth: "14rem",
            }}
          >
            {treffers.map((persoon, i) => (
              <button
                key={persoon.id}
                type="button"
                // onMouseDown en niet onClick: het veld verliest anders eerst
                // zijn focus, en dan is de lijst al weg voor de klik landt.
                onMouseDown={(e) => {
                  e.preventDefault();
                  kies(persoon);
                }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2"
                style={{ background: i === 0 ? "var(--bg-hover)" : "transparent" }}
              >
                <Avatar naam={persoon.full_name} url={persoon.avatar_url} />
                <span style={{ color: "var(--text-heading)" }}>{persoon.full_name ?? "Onbekend"}</span>
                {persoon.groep && (
                  <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
                    {persoon.groep}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

      <div
        className="flex items-center gap-3 rounded-lg px-3 py-2"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
      >
        <Avatar naam={huidigeNaam} url={huidigeAvatar} />
        <textarea
          ref={veld}
          value={tekst}
          onChange={(e) => {
            setTekst(e.target.value);
            volgCursor(e.target.value, e.target.selectionStart);
          }}
          onClick={(e) => volgCursor(tekst, e.currentTarget.selectionStart)}
          onBlur={() => setNoemen(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && noemen) {
              setNoemen(null);
              return;
            }
            // Staat de lijst open, dan kiest Enter de eerste naam in plaats van
            // het bericht te versturen: je bent midden in een woord.
            if (e.key === "Enter" && !e.shiftKey) {
              if (noemen && treffers.length > 0) {
                e.preventDefault();
                kies(treffers[0]);
                return;
              }
              e.preventDefault();
              plaats();
            }
          }}
          rows={1}
          placeholder="Iets toevoegen"
          className="flex-1 outline-none resize-none bg-transparent"
          style={{ color: "var(--text)", fontSize: "0.8125rem" }}
        />
        <button
          onClick={plaats}
          disabled={bezig || !tekst.trim()}
          aria-label="Reactie plaatsen"
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            // Niet --bg-secondary: dat is nu de kleur van het veld eronder,
            // en dan is de knop in rust onzichtbaar.
            background: tekst.trim() ? "var(--ink)" : "var(--bg-hover)",
            color: tekst.trim() ? "var(--white)" : "var(--text-muted)",
            opacity: bezig ? 0.5 : 1,
          }}
        >
          <ArrowUp size={15} weight="bold" />
        </button>
      </div>
      </div>
    </>
  );
}

/**
 * De tekst van een bericht, met de genoemde namen opgelicht.
 *
 * De namen staan gewoon in de tekst; de ids ernaast zeggen wie er echt bedoeld
 * is. Alleen namen van mensen die ook in `mentions` staan lichten op, zodat een
 * los apenstaartje in een zin niet ineens een vermelding lijkt.
 */
function MetVermeldingen({
  body,
  mentions,
  lijst,
}: {
  body: string;
  mentions?: string[] | null;
  lijst: Noembaar[];
}) {
  const namen = (mentions ?? [])
    .map((id) => lijst.find((n) => n.id === id)?.full_name)
    .filter((n): n is string => Boolean(n))
    // Langste eerst: staat "Daniel" ook in "Daniel Stoopendaal", dan moet de
    // langste voorgaan of je houdt " Stoopendaal" los over.
    .sort((a, b) => b.length - a.length);

  if (namen.length === 0) return <>{body}</>;

  const patroon = new RegExp(`(@(?:${namen.map(ontsnap).join("|")}))`, "g");

  return (
    <>
      {body.split(patroon).map((stuk, i) =>
        namen.some((n) => stuk === `@${n}`) ? (
          // Doffer dan de rest van het bericht, niet nadrukkelijker: de naam
          // is de aanhef en de zin erna is wat je moet lezen.
          <span key={i} className="font-medium" style={{ color: "var(--text-muted)" }}>
            {stuk}
          </span>
        ) : (
          <span key={i}>{stuk}</span>
        ),
      )}
    </>
  );
}

/** Tekens die in een reguliere expressie iets betekenen onschadelijk maken. */
function ontsnap(waarde: string) {
  return waarde.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Avatar({ naam, url }: { naam: string | null; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={naam ?? ""}
        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <span
      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold text-white"
      style={{ background: "var(--text-heading)" }}
    >
      {(naam ?? "?").charAt(0).toUpperCase()}
    </span>
  );
}

/** "vandaag 14:12", "gisteren 09:03", of de datum voluit. */
function wanneer(iso: string): string {
  const d = new Date(iso);
  const dag = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const verschil = Math.round((dag(new Date()) - dag(d)) / 86_400_000);
  const tijd = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });

  if (verschil === 0) return `vandaag ${tijd}`;
  if (verschil === 1) return `gisteren ${tijd}`;
  return `${d.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })} ${tijd}`;
}
