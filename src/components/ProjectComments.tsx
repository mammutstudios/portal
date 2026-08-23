"use client";

import { useState, useTransition } from "react";
import { ArrowUp } from "@phosphor-icons/react";
import { addProjectCommentAction, deleteProjectCommentAction } from "@/lib/actions/projects";

export type ProjectComment = {
  id: string;
  body: string;
  created_at: string;
  profile_id: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
};

/** "zojuist", "12 min geleden", "vandaag om 14:03", "12 aug om 14:03". */
function wanneer(iso: string): string {
  const d = new Date(iso);
  const seconden = (Date.now() - d.getTime()) / 1000;
  if (seconden < 60) return "zojuist";
  if (seconden < 3600) return `${Math.floor(seconden / 60)} min geleden`;

  const tijd = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  const dag = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const verschil = Math.round((dag(new Date()) - dag(d)) / 86_400_000);

  if (verschil === 0) return `vandaag om ${tijd}`;
  if (verschil === 1) return `gisteren om ${tijd}`;
  return `${d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} om ${tijd}`;
}

function Avatar({ naam, url, size = 32 }: { naam?: string | null; url?: string | null; size?: number }) {
  return (
    <span
      className="rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden text-xs font-semibold"
      style={{ width: size, height: size, background: "var(--bg-secondary)", color: "var(--text-muted)" }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        (naam?.trim()[0] ?? "?").toUpperCase()
      )}
    </span>
  );
}

/**
 * Het gesprek bij een project. Eén stroom, gedeeld door het dashboard en het
 * portaal: wat hier staat leest de klant ook. Er is bewust geen intern kanaal
 * ernaast, want een verborgen soort bericht in dezelfde lijst is precies hoe
 * een interne opmerking per ongeluk bij de klant belandt.
 */
export default function ProjectComments({
  projectId,
  comments,
  currentProfileId,
  currentAvatarUrl = null,
  currentName = null,
}: {
  projectId: string;
  comments: ProjectComment[];
  currentProfileId: string | null;
  currentAvatarUrl?: string | null;
  currentName?: string | null;
}) {
  const [tekst, setTekst] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function plaats() {
    if (!tekst.trim() || pending) return;
    setFout(null);
    const inhoud = tekst;
    startTransition(async () => {
      const r = await addProjectCommentAction(projectId, inhoud);
      if (r?.error) { setFout(r.error); return; }
      setTekst("");
    });
  }

  return (
    // h-full: even hoog als de gegevenskaart ernaast.
    <div
      className="squircle p-5 flex flex-col h-full"
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-heading)" }}>
        Berichten
      </h2>

      <div className="flex-1 min-h-0 space-y-1">
        {comments.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Nog geen berichten. Stel hier je vraag of laat weten hoe het ervoor staat.
          </p>
        ) : (
          comments.map((c, i) => (
            <div key={c.id} className="flex gap-3 group">
              {/* Lijntje onder de avatar door, behalve bij het laatste bericht. */}
              <div className="flex flex-col items-center flex-shrink-0">
                <Avatar naam={c.profiles?.full_name} url={c.profiles?.avatar_url} />
                {i < comments.length - 1 && (
                  <div className="w-px flex-1 mt-1" style={{ background: "var(--border)" }} />
                )}
              </div>

              <div className="min-w-0 flex-1 pb-4">
                <p className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                    {c.profiles?.full_name ?? "Onbekend"}
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {wanneer(c.created_at)}
                  </span>
                  {c.profile_id === currentProfileId && (
                    <button
                      onClick={() =>
                        startTransition(async () => {
                          await deleteProjectCommentAction(c.id, projectId);
                        })
                      }
                      className="text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                      style={{ color: "var(--text-muted)" }}
                    >
                      verwijderen
                    </button>
                  )}
                </p>
                <p className="text-sm mt-0.5 whitespace-pre-wrap" style={{ color: "var(--text)" }}>
                  {c.body}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {fout && <p className="text-xs mb-2" style={{ color: "#c0392b" }}>{fout}</p>}

      <div
        className="flex items-center gap-3 pt-4 mt-2"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <Avatar naam={currentName} url={currentAvatarUrl} />
        <textarea
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          onKeyDown={(e) => {
            // Enter verstuurt, shift-enter maakt een nieuwe regel.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              plaats();
            }
          }}
          rows={1}
          placeholder="Schrijf een bericht"
          className="flex-1 text-sm outline-none resize-none bg-transparent"
          style={{ color: "var(--text)" }}
        />
        <button
          onClick={plaats}
          disabled={pending || !tekst.trim()}
          aria-label="Bericht plaatsen"
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity"
          style={{
            background: tekst.trim() ? "var(--ink)" : "var(--bg-secondary)",
            color: tekst.trim() ? "var(--white)" : "var(--text-muted)",
            opacity: pending ? 0.5 : 1,
          }}
        >
          <ArrowUp size={15} weight="bold" />
        </button>
      </div>
    </div>
  );
}
