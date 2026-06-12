"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { updateTaskStatusAction, deleteTaskAction } from "@/lib/actions/tasks";
import { createSubtaskAction, toggleSubtaskAction, deleteSubtaskAction } from "@/lib/actions/subtasks";
import { PRIORITY_COLORS } from "@/components/TaskForm";
import Modal from "@/components/Modal";
import TaskForm from "@/components/TaskForm";
import { createClient } from "@/lib/supabase/client";
import type { Task, Project, Contact, Profile, TaskStatus, Subtask } from "@/lib/types";

function StatusPicker({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Status</p>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="px-2.5 py-1 rounded-md text-xs font-medium"
          style={{
            background: STATUS_BG[task.status],
            color: STATUS_TEXT[task.status],
            border: `1px solid ${STATUS_BORDER[task.status]}`,
          }}
        >
          {STATUS_LABELS[task.status]} ▾
        </button>
        {open && (
          <div
            className="absolute z-10 mt-1 rounded-lg overflow-hidden"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 140 }}
          >
            {STATUS_ORDER.map((s) => (
              <form key={s} action={updateTaskStatusAction}>
                <input type="hidden" name="id" value={task.id} />
                <input type="hidden" name="status" value={s} />
                <button
                  type="submit"
                  onClick={() => setOpen(false)}
                  className="w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2"
                  style={{ color: s === task.status ? STATUS_TEXT[s] : "var(--text-heading)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: STATUS_TEXT[s] }} />
                  {STATUS_LABELS[s]}
                </button>
              </form>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TicketDetailModal({ task, onClose, onEdit, onDelete }: {
  task: Task;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const assignee = task.profiles?.full_name ?? task.contacts?.name ?? null;
  const isOverdue = task.due_date && task.status !== "done" && new Date(task.due_date) < new Date();
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.from("subtasks").select("*").eq("task_id", task.id).order("created_at").then(({ data }) => {
      if (data) setSubtasks(data);
    });
  }, [task.id]);

  useEffect(() => {
    if (addingSubtask) inputRef.current?.focus();
  }, [addingSubtask]);

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const fd = new FormData();
    fd.set("task_id", task.id);
    fd.set("title", newTitle.trim());
    const optimistic: Subtask = { id: crypto.randomUUID(), task_id: task.id, title: newTitle.trim(), completed: false, created_at: new Date().toISOString() };
    setSubtasks((s) => [...s, optimistic]);
    setNewTitle("");
    await createSubtaskAction(fd);
    const { data } = await supabase.from("subtasks").select("*").eq("task_id", task.id).order("created_at");
    if (data) setSubtasks(data);
  }

  async function handleToggle(subtask: Subtask) {
    setSubtasks((s) => s.map((x) => x.id === subtask.id ? { ...x, completed: !x.completed } : x));
    const fd = new FormData();
    fd.set("id", subtask.id);
    fd.set("completed", String(!subtask.completed));
    await toggleSubtaskAction(fd);
  }

  async function handleDelete(id: string) {
    setSubtasks((s) => s.filter((x) => x.id !== id));
    const fd = new FormData();
    fd.set("id", id);
    await deleteSubtaskAction(fd);
  }

  const completed = subtasks.filter((s) => s.completed).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-16 px-10"
      style={{ background: "rgba(0,0,0,0.25)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl"
        style={{ background: "var(--bg)", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-end px-8 pt-6 pb-2 gap-2">
          <button onClick={onEdit} className="text-xs px-3 py-1.5 rounded-md" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>Bewerken</button>
          <form action={deleteTaskAction} onSubmit={onDelete}>
            <input type="hidden" name="id" value={task.id} />
            <button type="submit" className="text-xs px-3 py-1.5 rounded-md" style={{ color: "#e57373", border: "1px solid #fecaca" }}>Verwijderen</button>
          </form>
          <button onClick={onClose} className="text-sm px-2 py-1 rounded-md ml-1" style={{ color: "var(--text-muted)" }}>✕</button>
        </div>

        {/* Title */}
        <div className="px-10 pt-2 pb-6">
          <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)", lineHeight: 1.2 }}>{task.title}</h1>
          {task.description && (
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>{task.description}</p>
          )}
        </div>

        {/* Properties — 4 kolommen */}
        <div className="px-10 pb-8" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="grid grid-cols-4 gap-6 pt-6">
            <StatusPicker task={task} />
            <div>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Project</p>
              <p className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>{task.projects?.title ?? <span style={{ color: "var(--text-muted)" }}>—</span>}</p>
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Toegewezen aan</p>
              {assignee ? (
                <div className="flex items-center gap-2">
                  {task.profiles?.avatar_url ? (
                    <img src={task.profiles.avatar_url} alt={assignee} className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0" style={{ background: "var(--text-heading)" }}>
                      {assignee.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>{assignee}</span>
                </div>
              ) : <span className="text-sm" style={{ color: "var(--text-muted)" }}>—</span>}
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Deadline</p>
              <p className="text-sm font-medium" style={{ color: isOverdue ? "#dc2626" : task.due_date ? "var(--text-heading)" : "var(--text-muted)" }}>
                {task.due_date ? new Date(task.due_date).toLocaleDateString("nl-NL", { day: "numeric", month: "long" }) : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Subtasks */}
        <div className="px-10 pb-10" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mt-6 mb-3">
            <p className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
              Subtaken {subtasks.length > 0 && <span className="font-normal text-xs" style={{ color: "var(--text-muted)" }}>({completed}/{subtasks.length})</span>}
            </p>
            {!addingSubtask && subtasks.length > 0 && (
              <button onClick={() => setAddingSubtask(true)} className="text-xs px-2.5 py-1 rounded-md" style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>+ Toevoegen</button>
            )}
          </div>
          <div className="space-y-0.5 mb-3">
            {subtasks.map((sub) => (
              <div key={sub.id} className="flex items-center gap-3 group px-2 py-2 rounded-lg -mx-2"
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "")}>
                <button onClick={() => handleToggle(sub)} className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
                  style={{ border: `1.5px solid ${sub.completed ? "var(--text-heading)" : "var(--border)"}`, background: sub.completed ? "var(--text-heading)" : "transparent", transition: "all 150ms" }}>
                  {sub.completed && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </button>
                <span className="text-sm flex-1" style={{ color: sub.completed ? "var(--text-muted)" : "var(--text-heading)", textDecoration: sub.completed ? "line-through" : "none" }}>{sub.title}</span>
                <button onClick={() => handleDelete(sub.id)} className="opacity-0 group-hover:opacity-100 text-sm transition-opacity px-1" style={{ color: "#e57373" }}>×</button>
              </div>
            ))}
          </div>
          {addingSubtask ? (
            <form onSubmit={handleAddSubtask} className="flex gap-2">
              <input ref={inputRef} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Subtaak omschrijving..."
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
                onKeyDown={(e) => e.key === "Escape" && setAddingSubtask(false)} />
              <button type="submit" className="text-xs px-3 py-2 rounded-lg font-medium" style={{ background: "var(--text-heading)", color: "#fff" }}>Voeg toe</button>
              <button type="button" onClick={() => { setAddingSubtask(false); setNewTitle(""); }} className="text-xs px-3 py-2 rounded-lg" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>Annuleer</button>
            </form>
          ) : (
            <button onClick={() => setAddingSubtask(true)} className="w-full text-left text-sm px-3 py-2.5 rounded-lg" style={{ border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
              + Subtaak toevoegen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [viewTask, setViewTask] = useState<Task | null>(null);
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
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
          Tickets <span className="text-2xl font-normal" style={{ color: "var(--text-muted)" }}>({openCount})</span>
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="text-sm px-3 py-1.5 rounded-md font-medium"
          style={{ background: "var(--text-heading)", color: "#fff" }}
        >
          + Nieuw ticket
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

      <div className="rounded-lg overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
        {filtered.length > 0 ? (
          <table className="w-full min-w-[640px]">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Ticket</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Project</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Toegewezen</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Deadline</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((task, i) => {
                const assignee = task.profiles?.full_name ?? task.contacts?.name ?? null;
                const isOverdue = task.due_date && task.status !== "done" && new Date(task.due_date) < new Date();
                return (
                  <tr
                    key={task.id}
                    onClick={() => setViewTask(task)}
                    className="cursor-pointer"
                    style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none", transition: "background 120ms" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <PriorityDot priority={task.priority} />
                        <p className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>{task.title}</p>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm" style={{ color: "var(--text-muted)" }}>
                      {task.projects?.title ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-sm" style={{ color: "var(--text-muted)" }}>
                      {assignee ? (
                        <div className="flex items-center gap-2">
                          {task.profiles ? (
                            task.profiles.avatar_url ? (
                              <img src={task.profiles.avatar_url} alt={assignee} className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                            ) : (
                              <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold text-white" style={{ background: "var(--text-heading)" }}>
                                {assignee.charAt(0).toUpperCase()}
                              </span>
                            )
                          ) : (
                            <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                              {assignee.charAt(0).toUpperCase()}
                            </span>
                          )}
                          {assignee}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2 text-sm" style={{ color: isOverdue ? "#dc2626" : "var(--text-muted)" }}>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString("nl-NL") : "—"}
                    </td>
                    <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                      <StatusCycle task={task} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-8 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Geen tickets gevonden.{" "}
            {filterStatus === "all" && filterPriority === "all" && (
              <button onClick={() => setShowCreate(true)} className="underline" style={{ color: "var(--text)" }}>
                Maak het eerste aan.
              </button>
            )}
          </p>
        )}
      </div>

      {showCreate && (
        <Modal title="Nieuw ticket" onClose={() => setShowCreate(false)}>
          <TaskForm projects={projects} contacts={contacts} profiles={profiles} onClose={() => setShowCreate(false)} />
        </Modal>
      )}

      {editTask && (
        <Modal title="Ticket bewerken" onClose={() => setEditTask(null)}>
          <TaskForm task={editTask} projects={projects} contacts={contacts} profiles={profiles} onClose={() => setEditTask(null)} />
        </Modal>
      )}

      {viewTask && !editTask && (
        <TicketDetailModal
          task={viewTask}
          onClose={() => setViewTask(null)}
          onEdit={() => { setEditTask(viewTask); setViewTask(null); }}
          onDelete={() => setViewTask(null)}
        />
      )}
    </div>
  );
}
