import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectStatusBadge, TaskStatusBadge } from "@/components/StatusBadge";
import { getPortalContext } from "@/lib/portal";

export default async function PortalProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { clientIds } = await getPortalContext();
  const supabase = await createClient();

  // Eerst eigenaarschap vaststellen, pas daarna de inhoud ophalen. Een project
  // van een andere klant bestaat voor deze bezoeker simpelweg niet.
  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(name)")
    .eq("id", id)
    .single();

  if (!project || !clientIds.includes(project.client_id)) notFound();

  const [{ data: tasks }, { data: files }] = await Promise.all([
    supabase.from("tasks").select("*").eq("project_id", id).order("created_at"),
    supabase.from("files").select("*").eq("project_id", id).order("uploaded_at", { ascending: false }),
  ]);

  const doneTasks = tasks?.filter((t) => t.status === "done").length ?? 0;
  const totalTasks = tasks?.length ?? 0;

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <Link href="/portal" className="text-sm mb-6 inline-block" style={{ color: "var(--text-muted)" }}>
        ← Mijn projecten
      </Link>

      <div className="flex items-start justify-between mb-1">
        <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
          {project.title}
        </h1>
        <ProjectStatusBadge status={project.status} />
      </div>

      {project.description && (
        <p className="text-sm mb-2" style={{ color: "var(--text)" }}>{project.description}</p>
      )}

      {totalTasks > 0 && (
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          {doneTasks} van {totalTasks} taken afgerond
        </p>
      )}

      {/* Tasks */}
      <section className="mb-10">
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-heading)" }}>
          Taken
        </h2>
        <div className="squircle overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
          {tasks && tasks.length > 0 ? (
            <div>
              {tasks.map((task, i) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: i < tasks.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>{task.title}</p>
                    {task.description && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{task.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    {task.due_date && (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {new Date(task.due_date).toLocaleDateString("nl-NL")}
                      </span>
                    )}
                    <TaskStatusBadge status={task.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
              Geen taken voor dit project.
            </p>
          )}
        </div>
      </section>

      {/* Files */}
      <section>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-heading)" }}>
          Bestanden
        </h2>
        <div className="squircle overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
          {files && files.length > 0 ? (
            <div>
              {files.map((file, i) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: i < files.length - 1 ? "1px solid var(--border)" : "none" }}
                >
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline"
                    style={{ color: "var(--text-heading)" }}
                  >
                    {file.name}
                  </a>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    {file.size && (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {Math.round(file.size / 1024)} KB
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(file.uploaded_at).toLocaleDateString("nl-NL")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
              Geen bestanden geüpload.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
