"use client";

import { useState } from "react";
import { createTaskAction, updateTaskAction } from "@/lib/actions/tasks";
import SearchSelect from "@/components/SearchSelect";
import type { Task, Contact, Profile } from "@/lib/types";

type ProjectOption = { id: string; title: string; clients?: { name: string; logo_url: string | null } | null };

const STATUSES = [
  { value: "todo", label: "Te doen" },
  { value: "in_progress", label: "Bezig" },
  { value: "review", label: "Review" },
  { value: "done", label: "Klaar" },
];

const PRIORITIES = [
  { value: "low", label: "Laag" },
  { value: "medium", label: "Normaal" },
  { value: "high", label: "Hoog" },
];

export default function TaskForm({
  task,
  projects,
  contacts,
  profiles,
  defaultProjectId,
  onClose,
}: {
  task?: Task;
  projects: ProjectOption[];
  contacts: Pick<Contact, "id" | "name" | "job_title">[];
  profiles: Pick<Profile, "id" | "full_name">[];
  defaultProjectId?: string;
  onClose: () => void;
}) {
  const [status, setStatus] = useState(task?.status ?? "todo");
  const [highPriority, setHighPriority] = useState((task?.priority ?? "medium") === "high");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [assignee, setAssignee] = useState<string | undefined>(
    task?.assigned_profile_id ? `profile:${task.assigned_profile_id}`
    : task?.assigned_contact_id ? `contact:${task.assigned_contact_id}`
    : undefined
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      // Parse assignee
      if (assignee?.startsWith("profile:")) {
        fd.set("assigned_profile_id", assignee.replace("profile:", ""));
        fd.set("assigned_contact_id", "");
      } else if (assignee?.startsWith("contact:")) {
        fd.set("assigned_contact_id", assignee.replace("contact:", ""));
        fd.set("assigned_profile_id", "");
      }
      if (task) {
        await updateTaskAction(fd);
      } else {
        await createTaskAction(fd);
      }
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Er ging iets mis.");
    } finally {
      setLoading(false);
    }
  }

  // Combine contacts and profiles into one assignee list
  const assigneeOptions = [
    ...profiles.map((p) => ({ value: `profile:${p.id}`, label: p.full_name ?? "Onbekend", sublabel: "Mammut" })),
    ...contacts.map((c) => ({ value: `contact:${c.id}`, label: c.name, sublabel: c.job_title ?? "Contact" })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {task && <input type="hidden" name="id" value={task.id} />}
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="priority" value={highPriority ? "high" : "medium"} />

      {/* Titel */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Titel *</label>
        <input
          name="title"
          required
          autoFocus
          defaultValue={task?.title}
          className="w-full px-3 py-2 rounded-md text-sm outline-none"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        />
      </div>

      {/* Beschrijving */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Beschrijving</label>
        <textarea
          name="description"
          rows={2}
          defaultValue={task?.description ?? ""}
          className="w-full px-3 py-2 rounded-md text-sm outline-none resize-none"
          style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
        />
      </div>

      {/* Status (alleen bij bewerken) + Prioriteit checkbox */}
      <div className="flex items-center gap-4 flex-wrap">
        {task && (
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Status</label>
            <div className="flex flex-wrap gap-1">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value as any)}
                  className="px-2 py-1 rounded-md text-xs font-medium"
                  style={{
                    border: `1px solid ${status === s.value ? "var(--text-heading)" : "var(--border)"}`,
                    background: status === s.value ? "var(--text-heading)" : "transparent",
                    color: status === s.value ? "#fff" : "var(--text-muted)",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className={task ? "" : "pt-0"}>
          {task && <div className="text-xs font-medium mb-1" style={{ color: "transparent" }}>_</div>}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              onClick={() => setHighPriority((v) => !v)}
              className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
              style={{
                border: `1.5px solid ${highPriority ? PRIORITY_COLORS.high.border : "var(--border)"}`,
                background: highPriority ? PRIORITY_COLORS.high.bg : "transparent",
                transition: "all 150ms",
              }}
            >
              {highPriority && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 4l2 2 4-4" stroke={PRIORITY_COLORS.high.text} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className="text-sm" style={{ color: highPriority ? PRIORITY_COLORS.high.text : "var(--text-muted)" }}>
              Hoge prioriteit
            </span>
          </label>
        </div>
      </div>

      {/* Project */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Project</label>
        <SearchSelect
          name="project_id"
          placeholder="— Geen —"
          options={projects.map((p) => ({
            value: p.id,
            label: p.title,
            rightMeta: p.clients ? { label: p.clients.name, logo_url: p.clients.logo_url } : undefined,
          }))}
          defaultValue={task?.project_id ?? defaultProjectId ?? undefined}
        />
      </div>

      {/* Deadline */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Deadline</label>
        <input
          name="due_date"
          type="date"
          defaultValue={task?.due_date?.slice(0, 10) ?? ""}
          className="w-full px-3 py-2 rounded-md text-sm outline-none"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)" }}
        />
      </div>

      {/* Toewijzen */}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>Toewijzen aan</label>
        <SearchSelect
          name="assignee"
          placeholder="— Niemand —"
          options={assigneeOptions}
          defaultValue={assignee}
          onChange={(val) => setAssignee(val)}
        />
      </div>

      {error && (
        <p className="text-xs px-3 py-2 rounded-md" style={{ background: "#fef2f2", color: "#e57373" }}>{error}</p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md text-sm" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          Annuleren
        </button>
        <button type="submit" disabled={loading} className="px-3 py-1.5 rounded-md text-sm font-medium" style={{ background: "var(--text-heading)", color: "#fff", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Bezig..." : task ? "Opslaan" : "Ticket aanmaken"}
        </button>
      </div>
    </form>
  );
}

export const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  low:    { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0", dot: "#16a34a" },
  medium: { bg: "#fffbeb", text: "#d97706", border: "#fde68a", dot: "#d97706" },
  high:   { bg: "#fef2f2", text: "#dc2626", border: "#fecaca", dot: "#dc2626" },
};
