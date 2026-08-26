import { Suspense } from "react";
import Sidebar, { SidebarFallback } from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import SmoothScroll from "@/components/SmoothScroll";
import { stopPreviewAction } from "@/lib/actions/preview";
import { getPortalContext } from "@/lib/portal";
import { plausibleIsConfigured } from "@/lib/analytics/plausible";
import { hasBrandGuide } from "@/lib/brand";

/**
 * De schil van het klantportaal.
 *
 * Deze functie is met opzet niet async. Alles wat op een antwoord uit de
 * database moet wachten zit in een eigen <Suspense>, zodat Next de schil
 * (topbalk, menu, kader) als statische HTML kan klaarzetten en meteen kan
 * uitleveren. De klantgegevens stromen daar daarna in. Wachtte de layout zelf
 * op getPortalContext(), dan bleef het scherm leeg tot de traagste query klaar
 * was, en dat is precies wat het portaal traag deed voelen.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell flex flex-col h-dvh overflow-hidden">
      <SmoothScroll />
      <Suspense
        fallback={
          <TopBar name={null} avatarUrl={null} homeHref="/portal" settingsHref="/portal/instellingen" />
        }
      >
        <PortalTopBar />
      </Suspense>
      <div className="flex flex-1 overflow-hidden">
        <Suspense fallback={<SidebarFallback role="client" pending />}>
          <PortalSidebar />
        </Suspense>
        <main className="app-main flex-1 overflow-y-auto pt-14 md:pt-0">
          {/* Dit omhulsel blijft staan zolang de schil staat; SmoothScroll meet
              eraan. Zie de toelichting in SmoothScroll waarom dat moet. */}
          <div data-scroll-content>
            <Suspense fallback={null}>
              <PreviewBalk />
            </Suspense>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

async function PortalTopBar() {
  const { fullName } = await getPortalContext();
  return (
    <TopBar
      name={fullName ?? "Account"}
      avatarUrl={null}
      homeHref="/portal"
      settingsHref="/portal/instellingen"
    />
  );
}

/**
 * Twee menu-items die niet voor elke klant gelden. Analytics vraagt om een
 * werkende koppeling én een site die aan deze klant hangt; huisstijl om een
 * gids die bij de slug van deze klant hoort. Zonder dat is de pagina leeg en
 * hoort hij niet in de navigatie te staan.
 *
 * De gegevens komen uit getPortalContext en kosten hier dus geen eigen query
 * meer; die stond er eerder wel, en draaide bij elk bezoek opnieuw.
 */
async function PortalSidebar() {
  const { clients } = await getPortalContext();
  const showAnalytics = plausibleIsConfigured() && clients.some((c) => Boolean(c.plausible_site_id));
  const showBrand = clients.some((c) => hasBrandGuide(c.slug));
  return <Sidebar role="client" showAnalytics={showAnalytics} showBrand={showBrand} />;
}

async function PreviewBalk() {
  const { isPreview, activeClientName } = await getPortalContext();
  if (!isPreview) return null;

  return (
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
  );
}
