"use client";

import { useRouter } from "next/navigation";
import EditProjectForm from "@/components/EditProjectForm";
import type { Project, Client } from "@/lib/types";

/**
 * Het bewerkformulier op een eigen pagina in plaats van in een modal. Er staan
 * inmiddels te veel velden in om in een venster te passen, en op een pagina
 * blijft de URL bovendien deelbaar en werkt de terugknop van de browser.
 */
export default function EditProjectPageClient({
  project,
  clients,
}: {
  project: Project;
  clients: Client[];
}) {
  const router = useRouter();
  const terug = `/dashboard/projects/${project.id}`;

  return (
    <EditProjectForm
      project={project}
      clients={clients}
      onClose={() => {
        router.push(terug);
        router.refresh();
      }}
    />
  );
}
