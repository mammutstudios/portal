import { createClient } from "@/lib/supabase/server";
import { logPaginabezoek } from "@/lib/activity";
import { getPortalContext, shortDate } from "@/lib/portal";
import PortalEmpty from "../PortalEmpty";

type Entry = {
  id: string;
  task: string;
  hours: number;
  date: string;
  project_id: string | null;
};

export default async function PortalHoursPage() {
  const { clientIds, activeClientName } = await getPortalContext();
  await logPaginabezoek("Uren");
  if (clientIds.length === 0) return <PortalEmpty />;

  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title")
    .in("client_id", clientIds);

  const projectIds = projects?.map((p) => p.id as string) ?? [];
  const projectTitle = new Map((projects ?? []).map((p) => [p.id as string, p.title as string]));

  const { data: entries } = projectIds.length
    ? await supabase
        .from("time_entries")
        .select("id, task, hours, date, project_id")
        .in("project_id", projectIds)
        .order("date", { ascending: false })
    : { data: [] as Entry[] };

  const rows = (entries ?? []) as Entry[];
  const total = rows.reduce((s, e) => s + (e.hours ?? 0), 0);

  // Per project optellen, in dezelfde volgorde als de projectenlijst.
  const perProject = (projects ?? []).map((p) => ({
    id: p.id as string,
    title: p.title as string,
    hours: rows.filter((e) => e.project_id === p.id).reduce((s, e) => s + (e.hours ?? 0), 0),
  })).filter((p) => p.hours > 0);

  const hours = (n: number) => `${n.toLocaleString("nl-NL", { maximumFractionDigits: 2 })} uur`;

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Uren
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        {activeClientName ? `Gewerkte uren voor ${activeClientName}` : "De uren die we voor je maakten"}
        {total > 0 && `, ${hours(total)} in totaal.`}
      </p>

      {perProject.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-heading)" }}>
            Per project
          </h2>
          <div className="squircle overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
            {perProject.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: i < perProject.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <span className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>{p.title}</span>
                <span className="text-sm tabular-nums" style={{ color: "var(--text-muted)" }}>{hours(p.hours)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-heading)" }}>
          Registraties
        </h2>
        <div className="squircle overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
          {rows.length > 0 ? (
            rows.map((e, i) => (
              <div
                key={e.id}
                className="flex items-center justify-between px-4 py-3 gap-4"
                style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-heading)" }}>{e.task}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {e.project_id ? projectTitle.get(e.project_id) ?? "Project" : "Zonder project"} · {shortDate(e.date)}
                  </p>
                </div>
                <span className="text-sm tabular-nums flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  {hours(e.hours ?? 0)}
                </span>
              </div>
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
              Er zijn nog geen uren geschreven.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
