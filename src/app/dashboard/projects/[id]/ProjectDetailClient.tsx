"use client";

import { useState } from "react";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import { ProjectStatusBadge, ProjectTagBadge, TaskStatusBadge } from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import EditProjectForm from "@/components/EditProjectForm";
import type { Project, Client, Task, File as ProjectFile, TimeEntry } from "@/lib/types";

export default function ProjectDetailClient({
  project,
  clients,
  tasks,
  files,
  timeEntries,
}: {
  project: Project & { clients?: { name: string; id: string } | null };
  clients: Client[];
  tasks: Task[];
  files: ProjectFile[];
  timeEntries: TimeEntry[];
}) {
  const [showEdit, setShowEdit] = useState(false);
  const totalHours = timeEntries.reduce((sum, e) => sum + Number(e.hours), 0);

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        <Link href="/dashboard/projects" className="hover:underline" style={{ color: "var(--text-muted)" }}>
          Projecten
        </Link>
        <CaretRight size={12} weight="bold" />
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
        <p className="text-sm mb-8" style={{ color: "var(--text)" }}>
          {project.description}
        </p>
      )}

      <div className="mb-8" />

      {/* Tasks */}
      <section className="mb-10">
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-heading)" }}>Taken</h2>
        <div className="rounded-lg overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
          {tasks.length > 0 ? (
            <table className="w-full min-w-[640px]">
              <thead>
                <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Taak</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Deadline</th>
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

      {/* Uren */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>Uren</h2>
          {timeEntries.length > 0 && (
            <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{totalHours.toFixed(2)} uur totaal</span>
          )}
        </div>
        <div className="rounded-lg overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
          {timeEntries.length > 0 ? (
            <table className="w-full min-w-[640px]">
              <thead>
                <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Taak</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Uren</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Datum</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Wie</th>
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
