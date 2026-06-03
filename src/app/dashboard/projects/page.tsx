import { createClient } from "@/lib/supabase/server";
import ProjectsPageClient from "./ProjectsPageClient";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const [{ data: projects }, { data: clients }] = await Promise.all([
    supabase.from("projects").select("*, clients(name, logo_url)").order("created_at", { ascending: false }),
    supabase.from("clients").select("*").order("name"),
  ]);

  return <ProjectsPageClient projects={projects ?? []} clients={clients ?? []} />;
}
