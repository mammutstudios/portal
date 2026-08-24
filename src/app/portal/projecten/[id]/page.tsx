import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext, euro, shortDate } from "@/lib/portal";
import { ProjectStatusBadge, ProjectTagBadge } from "@/components/StatusBadge";
import DetailList from "@/components/DetailList";
import ProgressBar from "@/components/ProgressBar";
import ProjectComments, { type ProjectComment } from "@/components/ProjectComments";
import { PHASE_LABEL, projectProgressPercentage, type Project } from "@/lib/types";

/** Zonder budget_amount: dat is een intern getal. Zie de lijstpagina. */
const KOLOMMEN =
  "id, client_id, title, description, status, deadline, tags, progress, phase, lead_profile_id, next_step, client_action, live_url, staging_url";

export default async function PortalProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { clientIds, userId } = await getPortalContext();
  const supabase = await createClient();

  // Eerst eigenaarschap vaststellen, pas daarna de inhoud. Een project van een
  // andere klant bestaat voor deze bezoeker simpelweg niet.
  const { data } = await supabase
    .from("projects")
    .select(`${KOLOMMEN}, lead:profiles(id, full_name, avatar_url)`)
    .eq("id", id)
    .maybeSingle();
  const project = data as unknown as Project | null;
  if (!project || !clientIds.includes(project.client_id)) notFound();

  const { data: mij } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  const { data: comments } = await supabase
    .from("project_comments")
    .select("id, body, created_at, profile_id, profiles(full_name, avatar_url)")
    .eq("project_id", id)
    .order("created_at");

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

      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        {project.title}
      </h1>
      {project.description && (
        <p className="text-sm mb-6" style={{ color: "var(--text)" }}>{project.description}</p>
      )}

      {/* Dezelfde twee kaarten als in het dashboard, maar zonder de regels over
          budget en uren: die zijn intern. */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-2">
          <ProjectComments
            projectId={project.id}
            comments={(comments ?? []) as unknown as ProjectComment[]}
            currentProfileId={userId}
            currentName={mij?.full_name ?? null}
            currentAvatarUrl={mij?.avatar_url ?? null}
          />
        </div>
        <div className="space-y-4">
          <DetailList
          rows={[
            { label: "Status", value: <ProjectStatusBadge status={project.status} /> },
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
            ...(project.phase
              ? [{ label: "Fase", value: PHASE_LABEL[project.phase] }]
              : []),
            ...(project.lead
              ? [{
                  label: "Lead",
                  value: (
                    <span className="flex items-center gap-2 justify-end">
                      {project.lead.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={project.lead.avatar_url}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                          style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}
                        >
                          {(project.lead.full_name ?? "?").trim()[0]?.toUpperCase()}
                        </span>
                      )}
                      {project.lead.full_name ?? "Naamloos"}
                    </span>
                  ),
                }]
              : []),
            ...(project.deadline
              ? [{ label: "Verwachte oplevering", value: shortDate(project.deadline) }]
              : []),
          ]}
          callout={
            <ProgressBar
              value={projectProgressPercentage(project.progress, project.phase, project.tags)}
            />
          }
        />
        </div>
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
