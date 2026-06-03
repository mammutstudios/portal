"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react";
import Modal from "@/components/Modal";
import CreateProjectForm from "@/components/CreateProjectForm";
import { ProjectStatusBadge, ProjectTagBadge } from "@/components/StatusBadge";
import type { Project, Client } from "@/lib/types";

const Chevron = () => (
  <CaretRight size={14} weight="bold" style={{ color: "var(--text-muted)" }} />
);

const FILTERS = [
  { label: "Actief", value: "active" },
  { label: "On hold", value: "on_hold" },
  { label: "Voltooid", value: "completed" },
  { label: "Alle projecten", value: "all" },
] as const;

type Filter = typeof FILTERS[number]["value"];

export default function ProjectsPageClient({
  projects,
  clients,
}: {
  projects: Project[];
  clients: Client[];
}) {
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<Filter>("active");
  const router = useRouter();

  const filtered = projects.filter((p) =>
    filter === "all" ? true :
    filter === "active" ? p.status === "active" :
    filter === "on_hold" ? p.status === "on_hold" :
    p.status === "completed"
  );

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
          Projecten <span className="text-2xl font-normal" style={{ color: "var(--text-muted)" }}>({filtered.length})</span>
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm px-3 py-1.5 rounded-md font-medium"
          style={{ background: "var(--text-heading)", color: "#fff" }}
        >
          + Nieuw project
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mt-4 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className="px-3 py-1.5 rounded-md text-sm transition-colors"
            style={{
              background: filter === f.value ? "var(--text-heading)" : "transparent",
              color: filter === f.value ? "#fff" : "var(--text-muted)",
              border: `1px solid ${filter === f.value ? "var(--text-heading)" : "var(--border)"}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {filtered.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Project</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Klant</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Type</th>
                <th className="w-8 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((project, i) => (
                <tr
                  key={project.id}
                  onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  className="cursor-pointer"
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: "var(--text-heading)" }}>{project.title}</span>
                      <ProjectStatusBadge status={project.status} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {project.clients ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                          style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
                        >
                          {project.clients.logo_url ? (
                            <img src={project.clients.logo_url} alt={project.clients.name} className="w-full h-full object-contain" />
                          ) : (
                            <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-muted)" }}>
                              {project.clients.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>{project.clients.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {project.tags?.map((tag) => <ProjectTagBadge key={tag} tag={tag} />)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Chevron />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Geen {filter === "all" ? "" : filter === "active" ? "actieve" : "voltooide"} projecten.
          </p>
        )}
      </div>

      {showModal && (
        <Modal title="Nieuw project" onClose={() => setShowModal(false)}>
          <CreateProjectForm clients={clients} onClose={() => setShowModal(false)} />
        </Modal>
      )}
    </div>
  );
}
