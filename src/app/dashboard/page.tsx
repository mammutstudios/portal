import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { ProjectStatusBadge } from "@/components/StatusBadge";
import HoverRow from "@/components/HoverRow";
import type { Project } from "@/lib/types";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

function fmtFull(amount: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(amount);
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [{ data: projects }, { count: taskCount }, { data: transactions }] = await Promise.all([
    supabase.from("projects").select("*, clients(name, logo_url)").eq("status", "active").order("created_at", { ascending: false }).limit(10),
    supabase.from("tasks").select("*", { count: "exact", head: true }).not("status", "eq", "done"),
    supabase.from("transactions").select("amount, date"),
  ]);

  const activeCount = projects?.filter((p) => p.status === "active").length ?? 0;

  const thisMonthTotal = (transactions ?? [])
    .filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const monthLabel = new Date(currentYear, currentMonth)
    .toLocaleDateString("nl-NL", { month: "long", year: "numeric" })
    .replace(/^\w/, (c) => c.toUpperCase());

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Overzicht
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Welkom terug bij Mammut Studios
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">

        {/* Omzet deze maand */}
        <Link
          href="/dashboard/finance"
          className="card-hover rounded-lg p-6 flex flex-col justify-between relative overflow-hidden"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", minHeight: 160 }}
        >
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full" style={{ background: "var(--bg-secondary)" }} />
          <div className="absolute -right-4 bottom-0 w-24 h-24 rounded-full opacity-60" style={{ background: "var(--bg-secondary)" }} />
          <p className="text-xs font-medium uppercase tracking-wider relative z-10" style={{ color: "var(--text-muted)" }}>
            Deze maand
          </p>
          <div className="relative z-10">
            <p className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-heading)" }}>
              {fmtFull(thisMonthTotal)}
            </p>
          </div>
          <p className="text-sm relative z-10 mt-1" style={{ color: "var(--text-muted)" }}>{monthLabel}</p>
        </Link>

        {/* Actieve projecten */}
        <Link
          href="/dashboard/projects"
          className="card-hover rounded-lg p-6 flex flex-col justify-between"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", minHeight: 160 }}
        >
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Projecten
          </p>
          <div>
            <p className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-heading)" }}>
              {activeCount}
            </p>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Actieve projecten</p>
        </Link>

        {/* Openstaande taken */}
        <Link
          href="/dashboard/tasks"
          className="card-hover rounded-lg p-6 flex flex-col justify-between"
          style={{ border: "1px solid var(--border)", background: "var(--bg)", minHeight: 160 }}
        >
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Taken
          </p>
          <div>
            <p className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-heading)" }}>
              {taskCount ?? 0}
            </p>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Openstaande taken</p>
        </Link>

      </div>

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>
            Actieve projecten
          </h2>
          <Link href="/dashboard/projects" className="text-sm" style={{ color: "var(--text-muted)" }}>
            Alle projecten →
          </Link>
        </div>

        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {projects && projects.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Project</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Klant</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(projects as Project[]).map((project, i) => (
                  <HoverRow
                    key={project.id}
                    style={{ borderBottom: i < projects.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/projects/${project.id}`} className="text-sm font-semibold after:absolute after:inset-0 after:content-['']" style={{ color: "var(--text-heading)" }}>
                        {project.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {project.clients ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 overflow-hidden"
                            style={{ border: "1px solid var(--border)", background: "var(--bg-secondary)" }}
                          >
                            {project.clients.logo_url ? (
                              /^https?|^\//.test(project.clients.logo_url) ? (
                                <img src={project.clients.logo_url} alt={project.clients.name} className="w-full h-full object-contain" />
                              ) : (
                                <span style={{ fontSize: "11px" }}>{project.clients.logo_url}</span>
                              )
                            ) : (
                              <span style={{ fontSize: "9px", fontWeight: 600, color: "var(--text-muted)" }}>
                                {project.clients.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span style={{ color: "var(--text-muted)" }}>{project.clients.name}</span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ProjectStatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CaretRight size={14} weight="bold" style={{ color: "var(--text-muted)" }} />
                    </td>
                  </HoverRow>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
              Nog geen projecten aangemaakt.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
