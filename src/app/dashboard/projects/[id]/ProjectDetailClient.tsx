"use client";

import { useState } from "react";
import Link from "next/link";
import { ProjectStatusBadge, ProjectTagBadge, TaskStatusBadge } from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import EditProjectForm from "@/components/EditProjectForm";
import type { Project, Client, Task, File as ProjectFile } from "@/lib/types";

export default function ProjectDetailClient({
  project,
  clients,
  tasks,
  files,
}: {
  project: Project & { clients?: { name: string; id: string } | null };
  clients: Client[];
  tasks: Task[];
  files: ProjectFile[];
}) {
  const [showEdit, setShowEdit] = useState(false);

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <Link href="/dashboard/projects" className="text-sm mb-6 inline-block" style={{ color: "var(--text-muted)" }}>
        ← Projecten
      </Link>

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

      {project.clients?.name && (
        <Link
          href={`/dashboard/clients/${project.clients.id}`}
          className="text-sm mb-2 inline-block hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          {project.clients.name}
        </Link>
      )}

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
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {tasks.length > 0 ? (
            <table className="w-full">
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

      {/* Files */}
      <section>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-heading)" }}>Bestanden</h2>
        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {files.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Bestand</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Grootte</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Geüpload</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file, i) => (
                  <tr key={file.id} style={{ borderBottom: i < files.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td className="px-4 py-3">
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline" style={{ color: "var(--text-heading)" }}>
                        {file.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                      {file.size ? `${Math.round(file.size / 1024)} KB` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                      {new Date(file.uploaded_at).toLocaleDateString("nl-NL")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>Geen bestanden geüpload.</p>
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
