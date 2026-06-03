import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { TaskStatusBadge } from "@/components/StatusBadge";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, projects(name, id)")
    .order("created_at", { ascending: false });

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Taken
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        {tasks?.length ?? 0} taken
      </p>

      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {tasks && tasks.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Taak</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Project</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Deadline</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, i) => (
                <tr key={task.id} style={{ borderBottom: i < tasks.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>{task.title}</p>
                  </td>
                  <td className="px-4 py-3">
                    {task.projects ? (
                      <Link
                        href={`/dashboard/projects/${task.projects.id}`}
                        className="text-sm hover:underline"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {task.projects.title}
                      </Link>
                    ) : (
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <TaskStatusBadge status={task.status} />
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--text-muted)" }}>
                    {task.due_date ? new Date(task.due_date).toLocaleDateString("nl-NL") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
            Geen taken gevonden.
          </p>
        )}
      </div>
    </div>
  );
}
