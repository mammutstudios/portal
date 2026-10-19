import { createClient } from "@/lib/supabase/server";
import TasksPageClient from "./TasksPageClient";
import { meet } from "@/lib/meten";

export default async function TasksPage() {
  const supabase = await createClient();

  // Naast elkaar: de drie vragen weten niets van elkaar, en achter elkaar
  // wachten kost de som van drie keer heen en weer naar de database.
  const [{ data: tasks }, { data: clients }, { data: projects }] = await Promise.all([
    meet("tickets.lijst", () =>
      supabase
        .from("tasks")
        .select("*, projects(id, title), clients:client_id(id, name, logo_url), contacts:assigned_contact_id(id, name), profiles:assigned_profile_id(id, full_name, avatar_url), created_by_profile:created_by(id, full_name, avatar_url), task_comments(count)")
        .order("due_date", { ascending: true, nullsFirst: false }),
    ),
    // Voor het venster achter Add task: daar kies je waar de task bij hoort.
    supabase.from("clients").select("id, name, logo_url").order("name"),
    supabase.from("projects").select("id, title, client_id").order("title"),
  ]);

  return (
    <TasksPageClient tasks={tasks ?? []} klanten={clients ?? []} projecten={projects ?? []} />
  );
}
