import { createClient } from "@/lib/supabase/server";
import TogglPageClient from "./TogglPageClient";
import type { TimeEntry } from "@/lib/types";
import type { TaskOptie } from "@/components/TimeWeek";

type ProjectRij = {
  id: string;
  title: string;
  client_id: string;
  clients?: { name: string; logo_url: string | null } | null;
};

export default async function TogglPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: entries }, { data: projects }, { data: profiles }, { data: tasks }] = await Promise.all([
    supabase
      .from("time_entries")
      .select("*, projects(id, title, clients(name, logo_url)), profiles(id, full_name, avatar_url), tasks(id, title, nummer)")
      .order("date", { ascending: false }),
    supabase.from("projects").select("id, title, client_id, clients(name, logo_url)").order("title"),
    supabase.from("profiles").select("id, full_name, avatar_url").order("full_name"),
    // Alles wat nog loopt. Op uren schrijven doe je terwijl je eraan werkt, en
    // een lijst met alles wat ooit af is gekomen maakt het kiezen alleen maar
    // trager.
    supabase
      .from("tasks")
      .select("id, title, nummer, project_id, clients(name, logo_url)")
      .neq("status", "done")
      .order("nummer", { ascending: false }),
  ]);

  return (
    <TogglPageClient
      // De generator van Supabase kent de genestelde selects niet, vandaar deze
      // twee stappen in plaats van any: de vorm staat in types.ts.
      entries={(entries ?? []) as unknown as TimeEntry[]}
      projects={(projects ?? []) as unknown as ProjectRij[]}
      tasks={(tasks ?? []) as unknown as TaskOptie[]}
      profiles={profiles ?? []}
      currentUserId={user?.id ?? null}
    />
  );
}
