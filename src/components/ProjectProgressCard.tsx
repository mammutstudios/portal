import ProgressRing from "@/components/ProgressRing";
import ProjectProgress from "@/components/ProjectProgress";
import { projectProgressPercentage, type ProjectPhase } from "@/lib/types";

/**
 * De voortgangskaart naast de projectgegevens: een ring met het percentage,
 * en daaronder de fases van dit project.
 */
export default function ProjectProgressCard({
  progress,
  phase,
  tags,
}: {
  progress: number | null;
  phase: ProjectPhase | null;
  tags: string[] | null;
}) {
  const pct = projectProgressPercentage(progress, phase, tags);

  return (
    <div
      className="squircle p-6 flex flex-col items-center justify-center gap-5"
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      <ProgressRing value={pct} />
      <ProjectProgress phase={phase} tags={tags} />
    </div>
  );
}
