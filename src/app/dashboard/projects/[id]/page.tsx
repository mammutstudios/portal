import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProjectDetailClient from "./ProjectDetailClient";
import type { ProjectComment } from "@/components/ProjectComments";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Alles wat alleen het project-id nodig heeft gaat in één ronde. Elke vraag
  // aan Supabase kost ruim honderd milliseconden, dus achter elkaar wachten
  // telt hard aan: dit waren vijf rondes.
  const [
    { data: project },
    { data: tasks },
    { data: files },
    { data: timeEntries },
    { data: comments },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("*, clients(name, id), lead:profiles(id, full_name, avatar_url)")
      .eq("id", id)
      .single(),
    supabase.from("tasks").select("*").eq("project_id", id).order("created_at"),
    supabase.from("files").select("*").eq("project_id", id).order("uploaded_at", { ascending: false }),
    supabase.from("time_entries").select("*, profiles(id, full_name, avatar_url)").eq("project_id", id).order("date", { ascending: false }),
    supabase
      .from("project_comments")
      .select("id, body, created_at, profile_id, profiles(full_name, avatar_url)")
      .eq("project_id", id)
      .order("created_at"),
    supabase.auth.getUser(),
  ]);

  if (!project) notFound();

  // Deze twee konden niet mee: de een heeft de klant van het project nodig,
  // de ander de ingelogde gebruiker.
  const [{ data: invoices }, { data: mij }] = await Promise.all([
    // Alle facturen van deze klant: de gekoppelde om te tonen, de losse om te
    // kunnen koppelen. Facturen van een andere klant horen hier nooit bij.
    supabase
      .from("moneybird_invoices")
      .select("id, reference, invoice_date, state, total_excl_tax, project_id")
      .eq("client_id", project.client_id)
      .order("invoice_date", { ascending: false }),
    user
      ? supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <ProjectDetailClient
      project={project}
      tasks={tasks ?? []}
      files={files ?? []}
      timeEntries={timeEntries ?? []}
      invoices={invoices ?? []}
      comments={(comments ?? []) as unknown as ProjectComment[]}
      currentProfileId={user?.id ?? null}
      currentName={mij?.full_name ?? null}
      currentAvatarUrl={mij?.avatar_url ?? null}
    />
  );
}
