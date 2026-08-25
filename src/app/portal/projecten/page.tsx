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
 * wat actief is, hier staat alles, met actief bovenaan en het afgeronde werk
 * eronder. Dat laatste blijft staan omdat een klant er later nog naar terug
 * wil kunnen: de oplevering, de facturen en de afspraken staan erin.
 */
export default function PortalProjectenPage() {
  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Projecten
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Waar we aan werken, en wat we voor je hebben opgeleverd.
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
    .order("created_at", { ascending: false });

  const alle = (data ?? []) as unknown as PortalProject[];
  const lopend = alle.filter((p) => p.status !== "completed");
  const afgerond = alle.filter((p) => p.status === "completed");

  return (
    <>
      <PortalProjectList projecten={opStatus(lopend)} />

      {afgerond.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-heading)" }}>
            Afgerond
          </h2>
          <PortalProjectList projecten={afgerond} />
        </section>
      )}
    </>
  );
}
