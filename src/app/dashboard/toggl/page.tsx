import { createClient } from "@/lib/supabase/server";
import TogglPageClient from "./TogglPageClient";

export default async function TogglPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: entries }, { data: projects }, { data: profiles }] = await Promise.all([
    supabase
      .from("time_entries")
      .select("*, projects(id, title, clients(name, logo_url)), profiles(id, full_name, avatar_url)")
      .order("date", { ascending: false }),
    supabase.from("projects").select("id, title, client_id, clients(name, logo_url)").order("title"),
    supabase.from("profiles").select("id, full_name, avatar_url").order("full_name"),
  ]);

  return (
    <TogglPageClient
      entries={(entries ?? []) as any}
      projects={(projects ?? []) as any}
      profiles={profiles ?? []}
      currentUserId={user?.id ?? null}
    />
  );
}
