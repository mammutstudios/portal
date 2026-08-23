import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import EditProjectPageClient from "./EditProjectPageClient";

export default async function ProjectBewerkenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: clients }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).single(),
    supabase.from("clients").select("*").order("name"),
  ]);

  if (!project) notFound();

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-2xl mx-auto">
      <nav className="flex items-center gap-1.5 text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        <Link href="/dashboard/projects" className="hover:underline">Projecten</Link>
        <CaretRight size={13} weight="bold" />
        <Link href={`/dashboard/projects/${id}`} className="hover:underline">{project.title}</Link>
        <CaretRight size={13} weight="bold" />
        <span style={{ color: "var(--text-heading)" }}>Bewerken</span>
      </nav>

      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Project bewerken
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Fase, volgende stap en wat je van de klant nodig hebt zijn zichtbaar in het portaal.
      </p>

      <EditProjectPageClient project={project} clients={clients ?? []} />
    </div>
  );
}
