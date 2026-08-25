import { createClient } from "@/lib/supabase/server";
import TasksPageClient from "./TasksPageClient";
import { meet } from "@/lib/timing";

export default async function TasksPage() {
  const supabase = await createClient();

  const [{ data: tasks }, { data: projects }, { data: contacts }, { data: profiles }] = await meet("tasks.queries", () => Promise.all([
    supabase.from("tasks")
      .select("*, projects(id, title), contacts:assigned_contact_id(id, name), profiles:assigned_profile_id(id, full_name, avatar_url)")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("projects").select("id, title, clients(name, logo_url)").order("title"),
    supabase.from("contacts").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]));

  return (
    <TasksPageClient
      tasks={tasks ?? []}
      projects={projects ?? []}
      contacts={contacts ?? []}
      profiles={profiles ?? []}
    />
  );
}
