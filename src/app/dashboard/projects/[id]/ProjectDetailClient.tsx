"use client";

import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import { ProjectStatusBadge, ProjectTagBadge, TaskStatusBadge } from "@/components/StatusBadge";
import { PHASE_LABEL } from "@/lib/types";
import DetailList from "@/components/DetailList";
import ProjectLeadCard from "@/components/ProjectLeadCard";
import ProjectInvoiceCard from "@/components/ProjectInvoiceCard";
import ProgressBar from "@/components/ProgressBar";
import ProjectTimeline, { type TimelineEntry } from "@/components/ProjectTimeline";
import ProjectInvoices, { type KoppelbareFactuur } from "@/components/ProjectInvoices";
import type { Project, Task, File as ProjectFile, TimeEntry } from "@/lib/types";

const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

export default function ProjectDetailClient({
  project,
  tasks,
  files,
  timeEntries,
  invoices = [],
  comments = [],
  currentProfileId = null,
  currentName = null,
  currentAvatarUrl = null,
}: {
  project: Project & { clients?: { name: string; id: string } | null };
  tasks: Task[];
  files: ProjectFile[];
  timeEntries: TimeEntry[];
  /** Alle facturen van deze klant; de koppeling per project zit erin. */
  invoices?: KoppelbareFactuur[];
  comments?: TimelineEntry[];
  currentProfileId?: string | null;
  currentName?: string | null;
  currentAvatarUrl?: string | null;
}) {
  const totalHours = timeEntries.reduce((sum, e) => sum + Number(e.hours), 0);

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
        </div>
        <Link
          href={`/dashboard/projects/${project.id}/bewerken`}
          className="card-hover text-sm px-3 py-1.5 rounded-md flex-shrink-0"
          style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          Bewerken
        </Link>
      </div>

      {project.description && (
        <p className="text-sm mb-6" style={{ color: "var(--text)" }}>
          {project.description}
        </p>
      )}

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2">
          <ProjectTimeline
            projectId={project.id}
            entries={comments}
            createdAt={project.created_at}
            invoices={invoices.filter((i) => i.project_id === project.id)}
            tasks={tasks}
            currentProfileId={currentProfileId}
            canManage
            currentName={currentName}
            currentAvatarUrl={currentAvatarUrl}
          />
        </div>
        <div className="space-y-4">
          <DetailList
          rows={[
              { label: "Status", value: <ProjectStatusBadge status={project.status} /> },
            ...(project.phase ? [{ label: "Fase", value: PHASE_LABEL[project.phase] }] : []),
            ...(project.tags && project.tags.length > 0
              ? [{
                  label: "Type",
                  value: (
                    <span className="flex flex-wrap gap-1.5 justify-end">
                      {project.tags.map((tag: string) => <ProjectTagBadge key={tag} tag={tag} />)}
                    </span>
                  ),
                }]
              : []),
            {
              label: "Budget",
              value: project.budget_amount != null ? euro(project.budget_amount) : "Niet gezet",
            },
            ...(project.deadline
              ? [{
                  label: "Deadline",
                  value: new Date(project.deadline).toLocaleDateString("nl-NL", {
                    day: "numeric", month: "long", year: "numeric",
                  }),
                }]
              : []),
          ]}
          callout={
            <ProgressBar
              value={project.progress ?? 0}
            />
          }
        />

          {project.lead && <ProjectLeadCard lead={project.lead} />}

          <ProjectInvoiceCard
            budget={project.budget_amount}
            invoices={invoices
              .filter((i) => i.project_id === project.id)
              .map((i) => ({
                id: i.id,
                reference: i.reference,
                invoice_date: i.invoice_date,
                state: i.state,
                bedrag: i.total_excl_tax,
              }))}
          />
        </div>
      </div>

      {(project.staging_url || project.live_url) && (
        <div className="flex flex-wrap gap-2 mb-8">
          {project.staging_url && <LinkKnop href={project.staging_url} label="Staging" />}
          {project.live_url && <LinkKnop href={project.live_url} label="Live" />}
        </div>
      )}

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
