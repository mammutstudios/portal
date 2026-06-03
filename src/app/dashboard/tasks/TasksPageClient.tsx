"use client";

import { useState, useMemo } from "react";
import { updateTaskStatusAction, deleteTaskAction } from "@/lib/actions/tasks";
import { PRIORITY_COLORS } from "@/components/TaskForm";
import Modal from "@/components/Modal";
import TaskForm from "@/components/TaskForm";
import type { Task, Project, Contact, Profile, TaskStatus } from "@/lib/types";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Te doen",
  in_progress: "Bezig",
  review: "Review",
  done: "Klaar",
};

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "review", "done"];

const PRIORITY_LABELS: Record<string, string> = {
  low: "Laag",
  medium: "Normaal",
  high: "Hoog",
};

function PriorityDot({ priority }: { priority: string | null }) {
  if (!priority) return null;
  const c = PRIORITY_COLORS[priority];
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: c?.dot ?? "#ccc" }}
      title={PRIORITY_LABELS[priority]}
    />
  );
}

function StatusCycle({ task }: { task: Task }) {
  const currentIdx = STATUS_ORDER.indexOf(task.status);
  const next = STATUS_ORDER[(currentIdx + 1) % STATUS_ORDER.length];

  return (
    <form action={updateTaskStatusAction}>
      <input type="hidden" name="id" value={task.id} />
      <input type="hidden" name="status" value={next} />
      <button
        type="submit"
        title={`Zet naar: ${STATUS_LABELS[next]}`}
        className="px-2 py-0.5 rounded-md text-xs font-medium"
        style={{
          background: STATUS_BG[task.status],
          color: STATUS_TEXT[task.status],
          border: `1px solid ${STATUS_BORDER[task.status]}`,
        }}
      >
        {STATUS_LABELS[task.status]}
      </button>
    </form>
  );
}

const STATUS_BG: Record<TaskStatus, string> = {
  todo: "var(--bg-secondary)",
  in_progress: "#eff6ff",
  review: "#fefce8",
  done: "#f0fdf4",
};
const STATUS_TEXT: Record<TaskStatus, string> = {
  todo: "var(--text-muted)",
  in_progress: "#3b82f6",
  review: "#ca8a04",
  done: "#16a34a",
};
const STATUS_BORDER: Record<TaskStatus, string> = {
  todo: "var(--border)",
  in_progress: "#bfdbfe",
  review: "#fef08a",
  done: "#bbf7d0",
};

export default function TasksPageClient({
  tasks,
  projects,
  contacts,
  profiles,
}: {
  tasks: Task[];
  projects: Pick<Project, "id" | "title">[];
  contacts: Pick<Contact, "id" | "name" | "job_title">[];
  profiles: Pick<Profile, "id" | "full_name">[];
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, filterStatus, filterPriority]);

  const openCount = tasks.filter((t) => t.status !== "done").length;

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
          Taken <span className="text-2xl font-normal" style={{ color: "var(--text-muted)" }}>({openCount})</span>
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="text-sm px-3 py-1.5 rounded-md font-medium"
          style={{ background: "var(--text-heading)", color: "#fff" }}
        >
          + Nieuwe taak
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mt-5 mb-4 flex-wrap">
        <div className="flex gap-1">
          {([["all", "Alle"], ...STATUS_ORDER.map((s) => [s, STATUS_LABELS[s]])] as [string, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterStatus(val as any)}
              className="px-2.5 py-1 rounded-md text-xs font-medium"
              style={{
                border: `1px solid ${filterStatus === val ? "var(--text-heading)" : "var(--border)"}`,
                background: filterStatus === val ? "var(--text-heading)" : "transparent",
                color: filterStatus === val ? "#fff" : "var(--text-muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="w-px h-4" style={{ background: "var(--border)" }} />
        <div className="flex gap-1">
          {([["all", "Alle prioriteiten"], ["high", "Hoog"], ["medium", "Normaal"], ["low", "Laag"]] as [string, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterPriority(val)}
              className="px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5"
              style={{
                border: `1px solid ${filterPriority === val ? (val === "all" ? "var(--text-heading)" : PRIORITY_COLORS[val]?.border) : "var(--border)"}`,
                background: filterPriority === val ? (val === "all" ? "var(--text-heading)" : PRIORITY_COLORS[val]?.bg) : "transparent",
                color: filterPriority === val ? (val === "all" ? "#fff" : PRIORITY_COLORS[val]?.text) : "var(--text-muted)",
              }}
            >
              {val !== "all" && <span className="w-1.5 h-1.5 rounded-full" style={{ background: filterPriority === val ? PRIORITY_COLORS[val]?.dot : "var(--text-muted)" }} />}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {filtered.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Taak</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Project</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Toegewezen</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Deadline</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
                <th className="px-4 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((task, i) => {
                const assignee = task.profiles?.full_name ?? task.contacts?.name ?? null;
                const isOverdue = task.due_date && task.status !== "done" && new Date(task.due_date) < new Date();
                return (
                  <tr
                    key={task.id}
                    style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PriorityDot priority={task.priority} />
                        <div>
                          <p className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>{task.title}</p>
                          {task.description && (
                            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-muted)" }}>{task.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                      {task.projects?.title ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                      {assignee ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: isOverdue ? "#dc2626" : "var(--text-muted)" }}>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString("nl-NL") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusCycle task={task} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditTask(task)}
                        className="text-xs px-2 py-1 rounded-md mr-1"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Bewerken
                      </button>
                      <form action={deleteTaskAction} className="inline">
                        <input type="hidden" name="id" value={task.id} />
                        <button type="submit" className="text-xs px-2 py-1 rounded-md" style={{ color: "#e57373" }}>
                          ×
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-8 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Geen taken gevonden.{" "}
            {filterStatus === "all" && filterPriority === "all" && (
              <button onClick={() => setShowCreate(true)} className="underline" style={{ color: "var(--text)" }}>
                Maak de eerste aan.
              </button>
            )}
          </p>
        )}
      </div>

      {showCreate && (
        <Modal title="Nieuwe taak" onClose={() => setShowCreate(false)}>
          <TaskForm projects={projects} contacts={contacts} profiles={profiles} onClose={() => setShowCreate(false)} />
        </Modal>
      )}

      {editTask && (
        <Modal title="Taak bewerken" onClose={() => setEditTask(null)}>
          <TaskForm task={editTask} projects={projects} contacts={contacts} profiles={profiles} onClose={() => setEditTask(null)} />
        </Modal>
      )}
    </div>
  );
}
