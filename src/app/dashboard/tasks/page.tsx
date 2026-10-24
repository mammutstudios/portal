import { createClient } from "@/lib/supabase/server";
import { TEAM_ROL } from "@/lib/team";
import TasksPageClient from "./TasksPageClient";
import { meet } from "@/lib/meten";

export default async function TasksPage() {
  const supabase = await createClient();

  // Naast elkaar: deze vragen weten niets van elkaar, en achter elkaar
  // wachten kost de som van vijf keer heen en weer naar de database.
  const [
    { data: tasks },
    { data: clients },
    { data: projects },
    { data: team },
    { data: uren },
  ] = await Promise.all([
    meet("tickets.lijst", () =>
      supabase
        .from("tasks")
        .select("*, projects(id, title), clients:client_id(id, name, logo_url), contacts:assigned_contact_id(id, name), profiles:assigned_profile_id(id, full_name, avatar_url), created_by_profile:created_by(id, full_name, avatar_url), task_comments(count)")
        .order("due_date", { ascending: true, nullsFirst: false }),
    ),
    // Voor het venster achter Add task: daar kies je waar de task bij hoort.
    supabase.from("clients").select("id, name, logo_url").order("name"),
    supabase.from("projects").select("id, title, client_id").order("title"),
    // Voor het toewijzen vanuit de regel. Alleen het team: een task is werk
    // dat wij doen, zie lib/team.ts.
    supabase.from("profiles").select("id, full_name, avatar_url").eq("role", TEAM_ROL).order("full_name"),
    // De geschreven uren per task. Apart en niet als telling bij de tasks:
    // PostgREST kan wel tellen in zo'n uitstapje, maar geen som, en deze
    // tabel is klein genoeg om hem in één keer op te halen.
    supabase.from("time_entries").select("task_id, hours").not("task_id", "is", null),
  ]);

  const urenPerTask: Record<string, number> = {};
  for (const regel of (uren ?? []) as { task_id: string; hours: number }[]) {
    urenPerTask[regel.task_id] = (urenPerTask[regel.task_id] ?? 0) + Number(regel.hours);
  }

  return (
    <TasksPageClient
      tasks={tasks ?? []}
      klanten={clients ?? []}
      projecten={projects ?? []}
      team={team ?? []}
      urenPerTask={urenPerTask}
    />
  );
}
