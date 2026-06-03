import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";
import { stopPreviewAction } from "@/lib/actions/preview";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const isPreview = cookieStore.get("admin_preview")?.value === "true";
  const previewClientId = cookieStore.get("preview_client_id")?.value ?? null;

  let previewClientName: string | null = null;
  if (isPreview && previewClientId) {
    const { data: c } = await supabase.from("clients").select("name").eq("id", previewClientId).single();
    previewClientName = c?.name ?? null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role="client" />
      <main className="flex-1 overflow-y-auto">
        {isPreview && (
          <div
            className="flex items-center justify-between px-5 py-2 text-sm"
            style={{ background: "#1e1e1e", color: "#fff" }}
          >
            <span style={{ opacity: 0.75 }}>
              Preview — je bekijkt het portaal als {previewClientName ?? "klant"}
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
  );
}
