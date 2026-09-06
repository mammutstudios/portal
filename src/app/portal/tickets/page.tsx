import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { logPaginabezoek } from "@/lib/activity";
import { getPortalContext, getPortalProjectIds } from "@/lib/portal";
import PageSkeleton from "@/components/PageSkeleton";
import PortalTickets from "@/components/PortalTickets";
import type { Task } from "@/lib/types";
import PortalEmpty from "../PortalEmpty";

/**
 * De tickets van deze klant, en de knop om er zelf een in te dienen.
 *
 * Net als op de andere portaalpagina's is de schil hier niet async: het kader
 * staat er meteen, de gegevens stromen erin via de <Suspense>.
 */
export default function PortalTicketsPage() {
  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Tickets
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Wat er voor je openstaat, en waar je iets nieuws kunt aanmelden.
      </p>

      <Suspense fallback={<PageSkeleton rijen={4} kaal />}>
        <Tickets />
      </Suspense>
    </div>
  );
}

async function Tickets() {
  const { clientIds, activeClientId, isPreview } = await getPortalContext();
  await logPaginabezoek("Tickets");
  if (clientIds.length === 0) return <PortalEmpty />;

  const supabase = await createClient();
  const projectIds = await getPortalProjectIds(clientIds);

  // Een ticket hoort bij deze klant via client_id, of via het project waar het
  // aan hangt. Dat tweede is er voor het werk van vóór deze kolom: daar is
  // client_id bij de migratie ingevuld, maar een ticket dat het team later aan
  // een project hangt zonder de organisatie te kiezen valt er anders buiten.
  const filters = [`client_id.in.(${clientIds.join(",")})`];
  if (projectIds.length > 0) filters.push(`project_id.in.(${projectIds.join(",")})`);

  const [{ data: tickets }, { data: projecten }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, projects(id, title), created_by_profile:created_by(id, full_name, avatar_url)")
      .or(filters.join(","))
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, title")
      .in("client_id", clientIds)
      .order("title"),
  ]);

  return (
    <PortalTickets
      tickets={(tickets ?? []) as unknown as Task[]}
      projecten={projecten ?? []}
      clientId={activeClientId ?? clientIds[0]}
      // In de preview kijk je mee als de klant; indienen zou het ticket op jouw
      // naam zetten. De serveractie weigert dat, dus de knop hoort hier ook weg.
      kanIndienen={!isPreview}
    />
  );
}
