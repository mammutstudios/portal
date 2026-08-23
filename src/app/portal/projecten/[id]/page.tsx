import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext, euro, shortDate } from "@/lib/portal";
import { ProjectStatusBadge } from "@/components/StatusBadge";
import ProjectProgress from "@/components/ProjectProgress";
import type { Project } from "@/lib/types";

/** Zonder budget_amount: dat is een intern getal. Zie de lijstpagina. */
const KOLOMMEN =
  "id, client_id, title, description, status, deadline, tags, phase, next_step, client_action, live_url, staging_url";

export default async function PortalProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { clientIds } = await getPortalContext();
  const supabase = await createClient();

  // Eerst eigenaarschap vaststellen, pas daarna de inhoud. Een project van een
  // andere klant bestaat voor deze bezoeker simpelweg niet.
  const { data } = await supabase.from("projects").select(KOLOMMEN).eq("id", id).maybeSingle();
  const project = data as unknown as Project | null;
  if (!project || !clientIds.includes(project.client_id)) notFound();

  const { data: facturen } = await supabase
    .from("moneybird_invoices")
    .select("id, reference, invoice_date, state, total_incl_tax")
    .eq("project_id", id)
    .neq("state", "draft")
    .order("invoice_date", { ascending: false });

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <nav className="flex items-center gap-1.5 text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        <Link href="/portal/projecten" className="hover:underline">Projecten</Link>
        <CaretRight size={13} weight="bold" />
        <span style={{ color: "var(--text-heading)" }}>{project.title}</span>
      </nav>

      <div className="flex items-center gap-3 flex-wrap mb-1">
        <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
          {project.title}
        </h1>
        <ProjectStatusBadge status={project.status} />
      </div>
      {project.description && (
        <p className="text-sm mb-6" style={{ color: "var(--text)" }}>{project.description}</p>
      )}

      <div className="mb-8">
        <ProjectProgress phase={project.phase} tags={project.tags} />
        {project.deadline && (
          <p className="text-sm mt-3" style={{ color: "var(--text-muted)" }}>
            Verwachte oplevering: {shortDate(project.deadline)}
          </p>
        )}
      </div>

      {project.client_action && (
        <div
          className="squircle p-5 mb-8"
          style={{ border: "1px solid #fde68a", background: "#fefce8" }}
        >
          <div className="text-xs uppercase tracking-wide mb-1.5" style={{ color: "#92400e" }}>
            Van jou nodig
          </div>
          <p className="text-sm" style={{ color: "#92400e" }}>{project.client_action}</p>
        </div>
      )}

      {project.next_step && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--text-heading)" }}>
            Nu aan de beurt
          </h2>
          <p className="text-sm" style={{ color: "var(--text)" }}>{project.next_step}</p>
        </section>
      )}

      {(project.staging_url || project.live_url) && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--text-heading)" }}>
            Bekijken
          </h2>
          <div className="flex flex-wrap gap-2">
            {project.staging_url && <LinkKnop href={project.staging_url} label="Testomgeving" />}
            {project.live_url && <LinkKnop href={project.live_url} label="Live site" />}
          </div>
        </section>
      )}

      {facturen && facturen.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-heading)" }}>
            Facturen van dit project
          </h2>
          <div
            className="squircle overflow-hidden"
            style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
          >
            {facturen.map((f, i) => (
              <div
                key={f.id}
                className="flex items-center justify-between px-4 py-3 gap-4"
                style={{ borderBottom: i < facturen.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <span className="text-sm truncate" style={{ color: "var(--text-heading)" }}>
                  {f.reference ?? "Factuur"}
                </span>
                <span className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {shortDate(f.invoice_date)}
                  </span>
                  <span className="text-sm tabular-nums" style={{ color: "var(--text-heading)" }}>
                    {f.total_incl_tax != null ? euro(f.total_incl_tax) : "—"}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
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
