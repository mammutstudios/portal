import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import SmoothScroll from "@/components/SmoothScroll";
import { stopPreviewAction } from "@/lib/actions/preview";
import { getPortalContext } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { plausibleIsConfigured } from "@/lib/analytics/plausible";
import { hasBrandGuide } from "@/lib/brand";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { isPreview, activeClientName, fullName, clientIds } = await getPortalContext();

  // Twee menu-items uit één ronde. Analytics vraagt om een werkende koppeling
  // én een site die aan deze klant hangt; huisstijl om een gids die bij de
  // slug van deze klant hoort. Zonder dat is de pagina leeg en hoort hij niet
  // in de navigatie te staan.
  let showAnalytics = false;
  let showBrand = false;
  if (clientIds.length > 0) {
    const supabase = await createClient();
    const { data } = await supabase.from("clients").select("slug, plausible_site_id").in("id", clientIds);
    const rows = data ?? [];
    showAnalytics = plausibleIsConfigured() && rows.some((r) => Boolean(r.plausible_site_id));
    showBrand = rows.some((r) => hasBrandGuide(r.slug as string | null));
  }

  return (
    <div className="app-shell flex flex-col h-screen overflow-hidden">
      <SmoothScroll />
      <TopBar
        name={fullName ?? "Account"}
        avatarUrl={null}
        homeHref="/portal"
        settingsHref="/portal/instellingen"
      />
      <div className="flex flex-1 overflow-hidden">
      <Sidebar role="client" showAnalytics={showAnalytics} showBrand={showBrand} />
      <main className="app-main flex-1 overflow-y-auto">
        {isPreview && (
          <div
            className="flex items-center justify-between px-5 py-2 text-sm"
            style={{ background: "var(--ink)", color: "#fff" }}
          >
            <span style={{ opacity: 0.75 }}>
              Preview: je bekijkt het portaal als {activeClientName ?? "klant"}
            </span>
            <form action={stopPreviewAction}>
              <button
                type="submit"
                className="px-3 py-1 rounded-md text-xs font-medium"
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
              >
                Terug naar dashboard
              </button>
            </form>
          </div>
        )}
        {children}
      </main>
      </div>
    </div>
  );
}
