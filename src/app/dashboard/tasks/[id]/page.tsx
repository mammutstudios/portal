import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import TicketDetail from "@/components/TicketDetail";
import { TEAM_ROL } from "@/lib/team";
import type { TicketReactie, Noembaar } from "@/components/TicketReacties";
import type { Task, Subtask } from "@/lib/types";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Alles wat alleen het ticket-id nodig heeft in één ronde: de lijsten voor
  // het bewerkformulier hangen er niet van af en kunnen dus mee.
  const [
    { data: task },
    { data: subtasks },
    { data: clients },
    { data: projects },
    { data: profiles },
    { data: reacties },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, projects(id, title, client_id), clients:client_id(id, name, logo_url), contacts:assigned_contact_id(id, name), profiles:assigned_profile_id(id, full_name, avatar_url), created_by_profile:created_by(id, full_name, avatar_url)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("subtasks").select("*").eq("task_id", id).order("created_at"),
    supabase.from("clients").select("id, name, logo_url").order("name"),
    supabase.from("projects").select("id, title").order("title"),
    supabase.from("profiles").select("id, full_name, avatar_url").eq("role", TEAM_ROL).order("full_name"),
    supabase
      .from("task_comments")
      .select("id, body, created_at, profile_id, mentions, profiles(full_name, avatar_url)")
      .eq("task_id", id)
      .order("created_at"),
    supabase.auth.getUser(),
  ]);

  if (!task) notFound();

  /**
   * Wie je in een reactie kunt noemen: het team, plus de mensen van de
   * organisatie waar dit ticket bij hoort. Bewust niet alle klantgebruikers:
   * iemand van een andere klant hier kunnen noemen is vragen om een naam die
   * niet in dit gesprek hoort.
   */
  const klantId =
    (task.client_id as string | null) ??
    ((task.projects as { client_id?: string | null } | null)?.client_id ?? null);

  const { data: klantLeden } = klantId
    ? await supabase
        .from("client_members")
        .select("profiles(id, full_name, avatar_url)")
        .eq("client_id", klantId)
    : { data: null };

  const noembaar: Noembaar[] = [
    ...(profiles ?? []).map((p) => ({
      id: p.id as string,
      full_name: p.full_name as string | null,
      avatar_url: p.avatar_url as string | null,
      groep: "Mammut",
    })),
    ...((klantLeden ?? [])
      .map((rij) => (rij as { profiles: Noembaar | Noembaar[] | null }).profiles)
      .flatMap((p) => (Array.isArray(p) ? p : p ? [p] : []))
      .map((p) => ({
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        groep: (task.clients as { name?: string } | null)?.name ?? "Klant",
      }))),
  ];

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-4xl mx-auto">
      <nav className="flex items-center gap-1.5 text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        <Link href="/dashboard/tasks" className="hover:underline">Tickets</Link>
        <CaretRight size={13} weight="bold" />
        <span className="truncate" style={{ color: "var(--text-heading)" }}>{task.title}</span>
      </nav>

      <TicketDetail
        task={task as unknown as Task}
        subtasks={(subtasks ?? []) as Subtask[]}
        clients={clients ?? []}
        projects={projects ?? []}
        profiles={profiles ?? []}
        noembaar={noembaar}
        reacties={(reacties ?? []) as unknown as TicketReactie[]}
        huidigeGebruikerId={user?.id ?? null}
      />
    </div>
  );
}
