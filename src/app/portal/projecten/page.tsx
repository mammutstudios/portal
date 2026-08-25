import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import PortalProjectList, {
  PORTAL_PROJECT_KOLOMMEN,
  type PortalProject,
} from "@/components/PortalProjectList";
import { opStatus } from "@/lib/types";
import PageSkeleton from "@/components/PageSkeleton";
import PortalEmpty from "../PortalEmpty";

/**
 * De projecten van deze klant.
 *
 * Dezelfde lijst als op het overzicht, uit dezelfde component, zodat de twee
 * niet uit elkaar lopen. Verschil is de selectie: het overzicht toont alleen
 * wat actief is, hier staat alles wat nog loopt, met actief bovenaan.
 */
export default function PortalProjectenPage() {
  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Projecten
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Waar we op dit moment aan werken.
      </p>

      <Suspense fallback={<PageSkeleton rijen={3} kaal />}>
        <Projecten />
      </Suspense>
    </div>
  );
}

async function Projecten() {
  const { clientIds } = await getPortalContext();
  if (clientIds.length === 0) return <PortalEmpty />;

  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(PORTAL_PROJECT_KOLOMMEN)
    .in("client_id", clientIds)
    .neq("status", "completed")
    .order("created_at", { ascending: false });

  return <PortalProjectList projecten={opStatus((data ?? []) as unknown as PortalProject[])} />;
}
