import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ProjectStatusBadge } from "@/components/StatusBadge";

export default async function PortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: projects } = await supabase
    .from("projects")
    .select("*, clients(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        {profile?.full_name ? `Welkom, ${profile.full_name}` : "Mijn projecten"}
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Hier zie je de voortgang van je projecten.
      </p>

      <div className="grid gap-3">
        {projects && projects.length > 0 ? (
          projects.map((project) => (
            <Link
              key={project.id}
              href={`/portal/projects/${project.id}`}
              className="block rounded-lg px-5 py-4 transition-colors"
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg)",
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-heading)" }}>
                    {project.title}
                  </p>
                  {project.description && (
                    <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--text-muted)" }}>
                      {project.description}
                    </p>
                  )}
                </div>
                <ProjectStatusBadge status={project.status} />
              </div>
            </Link>
          ))
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Er zijn nog geen projecten voor jouw account.
          </p>
        )}
      </div>
    </div>
  );
}
