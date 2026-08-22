import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { stopPreviewAction } from "@/lib/actions/preview";
import { getPortalContext } from "@/lib/portal";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { isPreview, activeClientName, fullName } = await getPortalContext();

  return (
    <div className="app-shell flex flex-col h-screen overflow-hidden">
      <TopBar
        name={fullName ?? "Account"}
        avatarUrl={null}
        homeHref="/portal"
      />
      <div className="flex flex-1 overflow-hidden">
      <Sidebar role="client" />
      <main className="app-main flex-1 overflow-y-auto">
        {isPreview && (
          <div
            className="flex items-center justify-between px-5 py-2 text-sm"
            style={{ background: "var(--ink)", color: "#fff" }}
          >
            <span style={{ opacity: 0.75 }}>
              Preview — je bekijkt het portaal als {activeClientName ?? "klant"}
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
