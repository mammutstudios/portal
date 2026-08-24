import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import { ProjectStatusBadge } from "@/components/StatusBadge";
import ProjectProgress from "@/components/ProjectProgress";
import PortalEmpty from "../PortalEmpty";
import type { Project } from "@/lib/types";

/**
 * De projecten van deze klant.
 *
 * Let op de kolomlijst: nooit select("*") hier. Op dezelfde rij staat
 * budget_amount, en dat is een intern getal dat de klant niet hoort te zien.
 */
const KOLOMMEN =
  "id, title, description, status, deadline, tags, progress, phase, next_step, client_action, live_url, staging_url";

export default async function PortalProjectenPage() {
  const { clientIds } = await getPortalContext();
  if (clientIds.length === 0) return <PortalEmpty />;

  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(KOLOMMEN)
    .in("client_id", clientIds)
    .neq("status", "completed")
    .order("created_at", { ascending: false });

  const projecten = (data ?? []) as unknown as Project[];

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Projecten
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Waar we op dit moment aan werken.
      </p>

      {projecten.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Er lopen op dit moment geen projecten.
        </p>
      ) : (
        <div className="space-y-4">
          {projecten.map((p) => (
            <Link
              key={p.id}
              href={`/portal/projecten/${p.id}`}
              className="card-hover squircle p-5 block"
              style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold" style={{ color: "var(--text-heading)" }}>
                    {p.title}
                  </h2>
                  {p.next_step && (
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {p.next_step}
                    </p>
                  )}
                </div>
                <ProjectStatusBadge status={p.status} />
              </div>

              <ProjectProgress phase={p.phase} tags={p.tags} />

              {p.client_action && (
                <p className="text-xs mt-3" style={{ color: "#92400e" }}>
                  Van jou nodig: {p.client_action}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
