import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext, euro, shortDate } from "@/lib/portal";
import { ProjectStatusBadge, ProjectTagBadge } from "@/components/StatusBadge";
import DetailList from "@/components/DetailList";
import ProjectLeadCard from "@/components/ProjectLeadCard";
import ProjectInvoiceCard from "@/components/ProjectInvoiceCard";
import ProgressBar from "@/components/ProgressBar";
import ProjectTimeline, { type TimelineEntry } from "@/components/ProjectTimeline";
import { PHASE_LABEL, type Project, type Task } from "@/lib/types";
import PageSkeleton from "@/components/PageSkeleton";

/**
 * budget_amount hoort hier wél bij: de klant kent de afgesproken prijs van zijn
 * eigen project. Wat intern blijft zijn de uren en wat daar tegenover staat.
 */
const KOLOMMEN =
  "id, client_id, title, description, status, deadline, tags, progress, phase, lead_profile_id, budget_amount, created_at, next_step, client_action, live_url, staging_url";

/**
 * Het id staat in de URL en is dus pas op verzoektijd bekend: erop wachten in
 * de pagina zelf houdt de hele route tegen. Achter deze <Suspense> staat het
 * kader er meteen en volgt de inhoud zodra de database antwoordt.
 */
export default function PortalProjectPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<PageSkeleton rijen={4} />}>
      <Projectpagina params={params} />
    </Suspense>
  );
}

async function Projectpagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { clientIds, userId } = await getPortalContext();
  const supabase = await createClient();

  // Eerst eigenaarschap vaststellen, pas daarna de inhoud. Een project van een
  // andere klant bestaat voor deze bezoeker simpelweg niet.
  const { data } = await supabase
    .from("projects")
    .select(`${KOLOMMEN}, lead:profiles(id, full_name, avatar_url, email, phone)`)
    .eq("id", id)
    .maybeSingle();
  const project = data as unknown as Project | null;
  if (!project || !clientIds.includes(project.client_id)) notFound();

  // De rest in één ronde. De eigenaarscheck hierboven blijft bewust apart:
  // in development draait deze client met de service role, en dan is die
  // check de enige afscherming.
  const [{ data: mij }, { data: taken }, { data: comments }, { data: facturen }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url").eq("id", userId).maybeSingle(),
    supabase.from("tasks").select("*").eq("project_id", id).order("created_at"),
    supabase
      .from("project_comments")
      .select("id, body, created_at, profile_id, kind, profiles(full_name, avatar_url)")
      .eq("project_id", id)
      .order("created_at"),
    supabase
      .from("moneybird_invoices")
      .select("id, reference, invoice_date, state, total_excl_tax, sent_at, paid_at")
      .eq("project_id", id)
      .neq("state", "draft")
      .order("invoice_date", { ascending: false }),
  ]);

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
          <ProjectTimeline
            projectId={project.id}
            entries={(comments ?? []) as unknown as TimelineEntry[]}
            createdAt={project.created_at}
            invoices={facturen ?? []}
            tasks={(taken ?? []) as unknown as Task[]}
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
            ...(project.budget_amount != null
              ? [{ label: "Projectbedrag", value: euro(project.budget_amount) }]
              : []),
            ...(project.deadline
              ? [{ label: "Verwachte oplevering", value: shortDate(project.deadline) }]
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
            hrefPerFactuur
            invoices={(facturen ?? []).map((f) => ({
              id: f.id,
              reference: f.reference,
              invoice_date: f.invoice_date,
              state: f.state,
              bedrag: f.total_excl_tax,
            }))}
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
