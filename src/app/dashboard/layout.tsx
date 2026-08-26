import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar, { SidebarFallback } from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import SmoothScroll from "@/components/SmoothScroll";

/**
 * De schil van het dashboard.
 *
 * Net als bij het portaal: niet async, zodat de schil als statische HTML
 * klaarstaat en alleen het account-hoekje hoeft te wachten op de database.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell flex flex-col h-dvh overflow-hidden">
      <SmoothScroll />
      <Suspense fallback={<TopBar name={null} avatarUrl={null} homeHref="/dashboard" />}>
        <DashboardTopBar />
      </Suspense>
      <div className="flex flex-1 overflow-hidden">
        <Suspense fallback={<SidebarFallback role="admin" />}>
          <Sidebar role="admin" />
        </Suspense>
        <main className="app-main flex-1 overflow-y-auto pt-14 md:pt-0">
          {/* Dit omhulsel blijft staan zolang de schil staat; SmoothScroll meet
              eraan. Zie de toelichting in SmoothScroll waarom dat moet. */}
          <div data-scroll-content>{children}</div>
        </main>
      </div>
    </div>
  );
}

async function DashboardTopBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle();

  // Vangnet achter de proxy, die een klant al vóór het renderen wegstuurt.
  // Hier gebeurt het pas terwijl de pagina al streamt, dus dit is een tweede
  // slot op de deur en niet het eerste; de gegevens zelf worden door RLS
  // afgeschermd. De rol komt uit dezelfde query als de naam en kost dus niets.
  if (profile?.role === "client") redirect("/portal");

  return (
    <TopBar
      name={profile?.full_name ?? "Account"}
      avatarUrl={profile?.avatar_url ?? null}
      homeHref="/dashboard"
    />
  );
}
