import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ProjectDetailClient from "./ProjectDetailClient";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: tasks }, { data: files }, { data: clients }] = await Promise.all([
    supabase.from("projects").select("*, clients(name, id)").eq("id", id).single(),
    supabase.from("tasks").select("*").eq("project_id", id).order("created_at"),
    supabase.from("files").select("*").eq("project_id", id).order("uploaded_at", { ascending: false }),
    supabase.from("clients").select("*").order("name"),
  ]);

  if (!project) notFound();

  return (
    <ProjectDetailClient
      project={project}
      clients={clients ?? []}
      tasks={tasks ?? []}
      files={files ?? []}
    />
  );
}
