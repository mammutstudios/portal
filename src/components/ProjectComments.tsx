"use client";

import { useState, useTransition } from "react";
import { addProjectCommentAction, deleteProjectCommentAction } from "@/lib/actions/projects";

export type ProjectComment = {
  id: string;
  body: string;
  created_at: string;
  profile_id: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
};

/** "vandaag om 14:03", "gisteren om 09:12", anders de datum erbij. */
function wanneer(iso: string): string {
  const d = new Date(iso);
  const tijd = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  const dag = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const verschil = Math.round((dag(new Date()) - dag(d)) / 86_400_000);

  if (verschil === 0) return `vandaag om ${tijd}`;
  if (verschil === 1) return `gisteren om ${tijd}`;
  return `${d.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })} om ${tijd}`;
}

function initiaal(naam: string | null | undefined) {
  return (naam?.trim()[0] ?? "?").toUpperCase();
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
}: {
  projectId: string;
  comments: ProjectComment[];
  currentProfileId: string | null;
}) {
  const [tekst, setTekst] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function plaats() {
    if (!tekst.trim()) return;
    setFout(null);
    const inhoud = tekst;
    startTransition(async () => {
      const r = await addProjectCommentAction(projectId, inhoud);
      if (r?.error) { setFout(r.error); return; }
      setTekst("");
    });
  }

  function verwijder(id: string) {
    startTransition(async () => {
      await deleteProjectCommentAction(id, projectId);
    });
  }

  return (
    <div
      className="squircle p-5 flex flex-col"
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-heading)" }}>
        Berichten
      </h2>

      {comments.length === 0 ? (
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          Nog geen berichten. Stel hier je vraag of laat weten hoe het ervoor staat.
        </p>
      ) : (
        <div className="space-y-4 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <span
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold overflow-hidden"
                style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}
              >
                {c.profiles?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  initiaal(c.profiles?.full_name)
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>
                  <span className="font-semibold" style={{ color: "var(--text-heading)" }}>
                    {c.profiles?.full_name ?? "Onbekend"}
                  </span>{" "}
                  {wanneer(c.created_at)}
                  {c.profile_id === currentProfileId && (
                    <button
                      onClick={() => verwijder(c.id)}
                      className="ml-2 hover:underline"
                      style={{ color: "var(--text-muted)" }}
                    >
                      verwijderen
                    </button>
                  )}
                </p>
                <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text)" }}>
                  {c.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto">
        <textarea
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          rows={3}
          placeholder="Schrijf een bericht"
          className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        />
        {fout && (
          <p className="text-xs mt-1" style={{ color: "#c0392b" }}>{fout}</p>
        )}
        <div className="flex justify-end mt-2">
          <button
            onClick={plaats}
            disabled={pending || !tekst.trim()}
            className="px-3 py-1.5 rounded-md text-sm font-medium"
            style={{
              background: "var(--text-heading)",
              color: "var(--white)",
              opacity: pending || !tekst.trim() ? 0.5 : 1,
            }}
          >
            {pending ? "Bezig" : "Plaatsen"}
          </button>
        </div>
      </div>
    </div>
  );
}
