import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import { findBrandGuide } from "@/lib/brand";
import BrandGuideView from "@/components/brand/BrandGuideView";
import PortalEmpty from "../PortalEmpty";

/**
 * De huisstijl van de klant die nu in het portaal actief is.
 *
 * De gids zelf staat in `src/lib/brand/guides`, gekoppeld via `clients.slug`.
 * De slug halen we hier op in plaats van hem in de context te zetten: alleen
 * deze pagina en de layout hebben hem nodig.
 */
export default async function PortalHuisstijlPage() {
  const { clientIds, activeClientId, activeClientName } = await getPortalContext();
  if (clientIds.length === 0) return <PortalEmpty />;

  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("id, slug").in("id", clientIds);

  const rows = data ?? [];
  const voorkeur = rows.find((r) => r.id === activeClientId)?.slug as string | null | undefined;
  const guide = findBrandGuide(
    rows.map((r) => r.slug as string | null),
    voorkeur,
  );

  if (!guide) {
    return (
      <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
          Huisstijl
        </h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {activeClientName
            ? `De huisstijl van ${activeClientName} staat nog niet klaar.`
            : "De huisstijl staat nog niet klaar."}{" "}
          Zodra logo, kleuren en typografie vastliggen, vind je ze hier terug, met de bestanden erbij.
        </p>
      </div>
    );
  }

  return <BrandGuideView guide={guide} />;
}
