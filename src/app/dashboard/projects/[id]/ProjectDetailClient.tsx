"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import { ProjectStatusBadge, ProjectTagBadge, TaskStatusBadge } from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import EditProjectForm from "@/components/EditProjectForm";
import ProjectProgress from "@/components/ProjectProgress";
import ProjectInvoices, { type KoppelbareFactuur } from "@/components/ProjectInvoices";
import type { Project, Client, Task, File as ProjectFile, TimeEntry } from "@/lib/types";

const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

export default function ProjectDetailClient({
  project,
  clients,
  tasks,
  files,
  timeEntries,
  invoices = [],
}: {
  project: Project & { clients?: { name: string; id: string } | null };
  clients: Client[];
  tasks: Task[];
  files: ProjectFile[];
  timeEntries: TimeEntry[];
  /** Alle facturen van deze klant; de koppeling per project zit erin. */
  invoices?: KoppelbareFactuur[];
}) {
  const [showEdit, setShowEdit] = useState(false);
  const totalHours = timeEntries.reduce((sum, e) => sum + Number(e.hours), 0);
  // Concepten tellen niet mee: die zijn nog niet de deur uit.
  const gefactureerd = invoices
    .filter((i) => i.project_id === project.id && i.state !== "draft")
    .reduce((som, i) => som + (i.total_excl_tax ?? 0), 0);

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        <Link href="/dashboard/projects" className="hover:underline" style={{ color: "var(--text-muted)" }}>
          Projecten
        </Link>
        <CaretRight size={13} weight="bold" />
        <span style={{ color: "var(--text-heading)" }}>{project.title}</span>
      </nav>

      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
            {project.title}
          </h1>
          <ProjectStatusBadge status={project.status} />
        </div>
        <button
          onClick={() => setShowEdit(true)}
          className="text-sm px-3 py-1.5 rounded-md flex-shrink-0"
          style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          Bewerken
        </button>
      </div>

      {project.tags && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.tags.map((tag: string) => <ProjectTagBadge key={tag} tag={tag} />)}
        </div>
      )}

      {project.description && (
        <p className="text-sm mb-6" style={{ color: "var(--text)" }}>
          {project.description}
        </p>
      )}

      <div className="mb-8">
        <ProjectProgress phase={project.phase} progress={project.progress} showPercentage />
      </div>

      {(project.next_step || project.client_action) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {project.next_step && (
            <div className="squircle p-5" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
              <div className="text-xs uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>
                Nu aan de beurt
              </div>
              <p className="text-sm" style={{ color: "var(--text-heading)" }}>{project.next_step}</p>
            </div>
          )}
          {project.client_action && (
            <div className="squircle p-5" style={{ border: "1px solid #fde68a", background: "#fefce8" }}>
              <div className="text-xs uppercase tracking-wide mb-1.5" style={{ color: "#92400e" }}>
                Van de klant nodig
              </div>
              <p className="text-sm" style={{ color: "#92400e" }}>{project.client_action}</p>
            </div>
          )}
        </div>
      )}

      {/* Budget en uren staan bewust alleen hier: bij een vaste prijs heeft de
          klant er niets aan, en het nodigt uit tot sturen op uren. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Kengetal label="Budget" waarde={project.budget_amount != null ? euro(project.budget_amount) : "Niet gezet"} />
        <Kengetal label="Gefactureerd" waarde={euro(gefactureerd)} />
        <Kengetal
          label="Nog te gaan"
          waarde={project.budget_amount != null ? euro(project.budget_amount - gefactureerd) : "—"}
        />
        <Kengetal label="Uren" waarde={`${totalHours.toFixed(1)}`} />
      </div>

      {(project.staging_url || project.live_url) && (
        <div className="flex flex-wrap gap-2 mb-8">
          {project.staging_url && <LinkKnop href={project.staging_url} label="Staging" />}
          {project.live_url && <LinkKnop href={project.live_url} label="Live" />}
        </div>
      )}

      {/* Tasks */}
      <section className="mb-10">
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-heading)" }}>Taken</h2>
        <div className="squircle overflow-x-auto" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
          {tasks.length > 0 ? (
            <table className="w-full min-w-[40rem]">
              <thead>
                <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Taak</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, i) => (
                  <tr key={task.id} style={{ borderBottom: i < tasks.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>{task.title}</p>
                      {task.description && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{task.description}</p>}
                    </td>
                    <td className="px-4 py-3"><TaskStatusBadge status={task.status} /></td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString("nl-NL") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>Geen taken voor dit project.</p>
          )}
        </div>
      </section>

      <ProjectInvoices projectId={project.id} invoices={invoices} />

      {/* Uren */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>Uren</h2>
          {timeEntries.length > 0 && (
            <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{totalHours.toFixed(2)} uur totaal</span>
          )}
        </div>
        <div className="squircle overflow-x-auto" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
          {timeEntries.length > 0 ? (
            <table className="w-full min-w-[40rem]">
              <thead>
                <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Taak</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Uren</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Datum</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold" style={{ color: "var(--ink)" }}>Wie</th>
                </tr>
              </thead>
              <tbody>
                {timeEntries.map((entry, i) => (
                  <tr key={entry.id} style={{ borderBottom: i < timeEntries.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td className="px-4 py-2.5 text-sm font-medium" style={{ color: "var(--text-heading)" }}>{entry.task}</td>
                    <td className="px-4 py-2.5 text-sm text-right tabular-nums" style={{ color: "var(--text-heading)" }}>{Number(entry.hours).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-sm" style={{ color: "var(--text-muted)" }}>
                      {new Date(entry.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>Nog geen uren voor dit project.</p>
          )}
        </div>
      </section>

      {showEdit && (
        <Modal title="Project bewerken" onClose={() => setShowEdit(false)}>
          <EditProjectForm project={project} clients={clients} onClose={() => setShowEdit(false)} />
        </Modal>
      )}
    </div>
  );
}

function Kengetal({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div className="squircle p-4" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
      <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
      <div className="text-lg font-bold" style={{ color: "var(--text-heading)" }}>{waarde}</div>
    </div>
  );
}

function LinkKnop({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="card-hover px-3 py-1.5 rounded-md text-sm"
      style={{ border: "1px solid var(--border)", color: "var(--text-heading)" }}
    >
      {label}
    </a>
  );
}
