"use client";

import { useState, useMemo } from "react";
import Modal from "@/components/Modal";
import TimeEntryForm from "@/components/TimeEntryForm";
import { deleteTimeEntryAction } from "@/lib/actions/timeEntries";
import type { TimeEntry, Profile } from "@/lib/types";

type ProjectOption = { id: string; title: string; client_id: string; clients?: { name: string; logo_url: string | null } | null };

function fmtDate(date: string) {
  return new Date(date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

function ClientLogo({ logo_url, name }: { logo_url: string | null; name: string }) {
  return (
    <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
      {logo_url ? (
        /^https?|^\//.test(logo_url) ? (
          <img src={logo_url} alt={name} className="w-full h-full object-contain" />
        ) : (
          <span style={{ fontSize: "0.6875rem" }}>{logo_url}</span>
        )
      ) : (
        <span style={{ fontSize: "0.5625rem", fontWeight: 600, color: "var(--text-muted)" }}>{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

export default function TogglPageClient({
  entries,
  projects,
  profiles,
  currentUserId,
}: {
  entries: TimeEntry[];
  projects: ProjectOption[];
  profiles: Pick<Profile, "id" | "full_name" | "avatar_url">[];
  currentUserId: string | null;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);

  const totalHours = useMemo(() => entries.reduce((sum, e) => sum + Number(e.hours), 0), [entries]);

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
          Uren <span className="text-2xl font-normal" style={{ color: "var(--text-muted)" }}>({totalHours.toFixed(2)})</span>
        </h1>
        <button
          onClick={() => setShowAdd(true)}
          className="text-sm px-3 py-1.5 rounded-md font-medium"
          style={{ background: "var(--text-heading)", color: "#fff" }}
        >
          + Uren toevoegen
        </button>
      </div>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>Urenregistratie</p>

      <div className="squircle overflow-x-auto" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
        {entries.length > 0 ? (
          <table className="w-full min-w-[40rem]">
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Taak</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Uren</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Project</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Datum</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Wie</th>
                <th className="w-8 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  onClick={() => setEditEntry(entry)}
                  className="cursor-pointer"
                  style={{ borderBottom: i < entries.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td className="px-4 py-2.5">
                    <span className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>{entry.task}</span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-right tabular-nums" style={{ color: "var(--text-heading)" }}>
                    {Number(entry.hours).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5">
                    {entry.projects ? (
                      <div className="flex items-center gap-2">
                        {entry.projects.clients && <ClientLogo logo_url={entry.projects.clients.logo_url} name={entry.projects.clients.name} />}
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>{entry.projects.title}</span>
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-sm" style={{ color: "var(--text-muted)" }}>{fmtDate(entry.date)}</td>
                  <td className="px-4 py-2.5">
                    {entry.profiles ? (
                      <div className="flex items-center gap-2">
                        {entry.profiles.avatar_url ? (
                          <img src={entry.profiles.avatar_url} alt={entry.profiles.full_name ?? ""} className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0" style={{ background: "var(--text-heading)" }}>
                            {(entry.profiles.full_name ?? "?").charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>{entry.profiles.full_name ?? "Onbekend"}</span>
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <form action={deleteTimeEntryAction} className="inline">
                      <input type="hidden" name="id" value={entry.id} />
                      <button type="submit" className="text-xs px-1.5 py-1 rounded-md" style={{ color: "#e57373" }}>×</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-8 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Nog geen uren.{" "}
            <button onClick={() => setShowAdd(true)} className="underline" style={{ color: "var(--text)" }}>Voeg de eerste toe.</button>
          </p>
        )}
      </div>

      {showAdd && (
        <Modal title="Uren toevoegen" onClose={() => setShowAdd(false)}>
          <TimeEntryForm projects={projects} profiles={profiles} defaultProfileId={currentUserId} onClose={() => setShowAdd(false)} />
        </Modal>
      )}
      {editEntry && (
        <Modal title="Uren bewerken" onClose={() => setEditEntry(null)}>
          <TimeEntryForm entry={editEntry} projects={projects} profiles={profiles} onClose={() => setEditEntry(null)} />
        </Modal>
      )}
    </div>
  );
}
