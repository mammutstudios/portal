import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import SmoothScroll from "@/components/SmoothScroll";
import { stopPreviewAction } from "@/lib/actions/preview";
import { getPortalContext } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { plausibleIsConfigured } from "@/lib/analytics/plausible";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { isPreview, activeClientName, fullName, clientIds } = await getPortalContext();

  // Analytics alleen tonen als er ook echt iets te zien is: een werkende
  // koppeling én een site die aan deze klant hangt.
  let showAnalytics = false;
  if (plausibleIsConfigured() && clientIds.length > 0) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .in("id", clientIds)
      .not("plausible_site_id", "is", null);
    showAnalytics = (count ?? 0) > 0;
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
      <Sidebar role="client" showAnalytics={showAnalytics} />
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
