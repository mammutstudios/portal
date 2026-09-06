import { createClient } from "@/lib/supabase/server";
import TasksPageClient from "./TasksPageClient";

export default async function TasksPage() {
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, projects(id, title), clients:client_id(id, name, logo_url), contacts:assigned_contact_id(id, name), profiles:assigned_profile_id(id, full_name, avatar_url), created_by_profile:created_by(id, full_name, avatar_url), task_comments(count)")
    .order("due_date", { ascending: true, nullsFirst: false });

  return <TasksPageClient tasks={tasks ?? []} />;
}
