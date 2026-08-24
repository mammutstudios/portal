"use client";

import { useState, useTransition } from "react";
import { ArrowUp, CurrencyEur, Flag, ListChecks } from "@phosphor-icons/react";
import { addProjectCommentAction, deleteProjectCommentAction } from "@/lib/actions/projects";
import { TaskStatusBadge } from "@/components/StatusBadge";
import type { Task } from "@/lib/types";

export type TimelineInvoice = {
  id: string;
  reference: string | null;
  total_excl_tax?: number | null;
  sent_at?: string | null;
  paid_at?: string | null;
};

export type TimelineEntry = {
  id: string;
  body: string;
  created_at: string;
  profile_id: string | null;
  /** bericht = getypt door een mens; de rest legt het systeem vast. */
  kind: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
};

/** "vandaag", "gisteren", "1 juli 2026". Zonder tijd, want die is er niet. */
function opDag(iso: string): string {
  const d = new Date(iso);
  const dag = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const verschil = Math.round((dag(new Date()) - dag(d)) / 86_400_000);

  if (verschil === 0) return "vandaag";
  if (verschil === 1) return "gisteren";
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    ...(d.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
  });
}

/** "zojuist", "12 min geleden", "vandaag om 14:03", "12 aug om 14:03". */
function wanneer(iso: string): string {
  const d = new Date(iso);
  const seconden = (Date.now() - d.getTime()) / 1000;
  if (seconden < 60) return "zojuist";
  if (seconden < 3600) {
    const m = Math.floor(seconden / 60);
    return `${m} ${m === 1 ? "minuut" : "minuten"} geleden`;
  }

  const tijd = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  const dag = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const verschil = Math.round((dag(new Date()) - dag(d)) / 86_400_000);

  if (verschil === 0) return `vandaag om ${tijd}`;
  if (verschil === 1) return `gisteren om ${tijd}`;
  return `${d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} om ${tijd}`;
}

function Avatar({ naam, url }: { naam?: string | null; url?: string | null }) {
  return (
    <span
      className="rounded-full flex items-center justify-center overflow-hidden text-xs font-semibold"
      style={{ width: 32, height: 32, background: "var(--bg-secondary)", color: "var(--text-muted)" }}
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

/** Systeemregels krijgen een icoon in plaats van een gezicht. */
function GebeurtenisIcoon({ kind }: { kind: string }) {
  const Icoon =
    kind === "factuur" ? CurrencyEur : kind === "fase" || kind === "project" ? Flag : ListChecks;
  return (
    <span
      className="rounded-full flex items-center justify-center"
      style={{ width: 32, height: 32, background: "var(--lavender)", color: "var(--ink)" }}
    >
      <Icoon size={15} weight="bold" />
    </span>
  );
}

/**
 * De tijdlijn van een project: wat mensen schrijven én wat er gebeurt, in één
 * stroom. Ernaast een tabblad met de taken, zodat alles wat loopt op één plek
 * staat in plaats van verspreid over de pagina.
 */
export default function ProjectTimeline({
  projectId,
  entries: opgeslagen,
  createdAt,
  invoices = [],
  tasks,
  currentProfileId,
  currentAvatarUrl = null,
  currentName = null,
}: {
  projectId: string;
  entries: TimelineEntry[];
  /** Aanmaakdatum van het project; wordt de eerste regel op de tijdlijn. */
  createdAt: string;
  /** Facturen van dit project; hun momenten komen als regels op de tijdlijn. */
  invoices?: TimelineInvoice[];
  tasks: Task[];
  currentProfileId: string | null;
  currentAvatarUrl?: string | null;
  currentName?: string | null;
}) {
  // Wat je uit de gegevens kunt aflezen, leiden we af in plaats van het op te
  // slaan. Zo staan die regels ook op projecten en facturen van vóór de
  // tijdlijn, en kan er geen dubbele of ontbrekende regel ontstaan doordat een
  // wijziging net buiten een webhook viel.
  const afgeleid: TimelineEntry[] = [
    {
      id: "aangemaakt",
      body: "Project aangemaakt",
      created_at: createdAt,
      profile_id: null,
      kind: "project",
    },
  ];

  for (const f of invoices) {
    const kenmerk = f.reference ?? "Factuur";
    const bedrag =
      f.total_excl_tax != null
        ? ` (${new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(f.total_excl_tax)})`
        : "";
    if (f.sent_at) {
      afgeleid.push({
        id: `factuur-verstuurd-${f.id}`,
        body: `Factuur verstuurd: ${kenmerk}${bedrag}`,
        created_at: f.sent_at,
        profile_id: null,
        kind: "factuur",
      });
    }
    if (f.paid_at) {
      afgeleid.push({
        id: `factuur-betaald-${f.id}`,
        body: `Factuur betaald: ${kenmerk}${bedrag}`,
        created_at: f.paid_at,
        profile_id: null,
        kind: "factuur",
      });
    }
  }

  // Nieuwste bovenaan: je wilt zien wat er net gebeurd is, niet wat er een
  // half jaar geleden gebeurde.
  const entries = [...afgeleid, ...opgeslagen].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  const [tab, setTab] = useState<"tijdlijn" | "taken">("tijdlijn");
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
    <div
      className="squircle p-5 flex flex-col h-full"
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      {/* Geen negatieve marge: die trok de pil links buiten de padding van de
          kaart. De knop houdt zijn eigen ruimte en blijft binnen de rand. */}
      <div className="flex items-center gap-1 mb-5">
        {([["tijdlijn", "Tijdlijn"], ["taken", "Taken"]] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-md text-sm font-medium"
            style={{
              background: tab === t ? "var(--bg-hover)" : "transparent",
              color: tab === t ? "var(--text-heading)" : "var(--text-muted)",
            }}
          >
            {label}
            {t === "taken" && tasks.length > 0 && (
              <span className="ml-1.5" style={{ color: "var(--text-muted)" }}>{tasks.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "tijdlijn" ? (
        <>
          <div className="flex-1 min-h-0">
            {entries.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Nog niets gebeurd. Wat je hier schrijft leest de klant ook.
              </p>
            ) : (
              entries.map((e, i) => (
                <div key={e.id} className="flex gap-3 group">
                  {/* Doorlopende lijn onder het bolletje door, behalve bij de laatste. */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    {e.kind === "bericht" ? (
                      <Avatar naam={e.profiles?.full_name} url={e.profiles?.avatar_url} />
                    ) : (
                      <GebeurtenisIcoon kind={e.kind} />
                    )}
                    {i < entries.length - 1 && (
                      <div className="w-px flex-1 mt-1" style={{ background: "var(--border)" }} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pb-4">
                    {/* Alleen een bericht heeft een echt tijdstip. Bij de rest
                        staat er een datum: een gebeurtenis als "factuur betaald"
                        kent geen uur, en dat dan tonen suggereert precisie die
                        er niet is. */}
                    <p className="flex items-baseline gap-2 flex-wrap">
                      {e.kind === "bericht" ? (
                        <span className="text-sm" style={{ color: "var(--text-heading)" }}>
                          <span className="font-semibold">{e.profiles?.full_name ?? "Onbekend"}</span>
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            , {wanneer(e.created_at)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {opDag(e.created_at)}
                        </span>
                      )}
                      {e.profile_id && e.profile_id === currentProfileId && (
                        <button
                          onClick={() =>
                            startTransition(async () => {
                              await deleteProjectCommentAction(e.id, projectId);
                            })
                          }
                          className="text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                          style={{ color: "var(--text-muted)" }}
                        >
                          verwijderen
                        </button>
                      )}
                    </p>
                    <p
                      className="text-sm mt-0.5 whitespace-pre-wrap"
                      style={{ color: e.kind === "bericht" ? "var(--text)" : "var(--text-heading)" }}
                    >
                      {e.body}
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
              placeholder="Toevoegen aan tijdlijn"
              className="flex-1 text-sm outline-none resize-none bg-transparent"
              style={{ color: "var(--text)" }}
            />
            <button
              onClick={plaats}
              disabled={pending || !tekst.trim()}
              aria-label="Toevoegen aan tijdlijn"
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: tekst.trim() ? "var(--ink)" : "var(--bg-secondary)",
                color: tekst.trim() ? "var(--white)" : "var(--text-muted)",
                opacity: pending ? 0.5 : 1,
              }}
            >
              <ArrowUp size={15} weight="bold" />
            </button>
          </div>
        </>
      ) : (
        <div className="flex-1 min-h-0">
          {tasks.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Geen taken voor dit project.
            </p>
          ) : (
            <div className="[&>*:last-child]:border-b-0">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-4 py-3"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm" style={{ color: "var(--text-heading)" }}>{t.title}</p>
                    {t.due_date && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {new Date(t.due_date).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                      </p>
                    )}
                  </div>
                  <span className="flex-shrink-0">
                    <TaskStatusBadge status={t.status} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
