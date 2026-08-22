import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="app-shell flex flex-col h-screen overflow-hidden">
      <TopBar
        name={profile?.full_name ?? "Account"}
        avatarUrl={profile?.avatar_url ?? null}
        homeHref="/dashboard"
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role="admin" />
        <main className="app-main flex-1 overflow-y-auto pt-14 md:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
