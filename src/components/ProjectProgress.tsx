import { PHASE_LABEL, phasesForProject, type ProjectPhase } from "@/lib/types";

/**
 * De fases van een project als een rij stappen, met de huidige gemarkeerd.
 *
 * Bewust naast en niet in plaats van het percentage: een balk die drie weken
 * op 60 procent staat roept vragen op, een fase veroudert minder zichtbaar.
 * In het portaal tonen we daarom alleen deze rij.
 */
export default function ProjectProgress({
  phase,
  tags = null,
  progress,
  showPercentage = false,
}: {
  phase: ProjectPhase | null;
  /** Bepaalt welke fases dit project kent; zie phasesForProject. */
  tags?: string[] | null;
  progress?: number | null;
  showPercentage?: boolean;
}) {
  const fases = phasesForProject(tags, phase);
  if (fases.length === 0) return null;

  const huidige = phase ? fases.indexOf(phase) : -1;

  return (
    <div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {fases.map((f, i) => {
          const gedaan = huidige >= 0 && i < huidige;
          const nu = i === huidige;
          return (
            <span
              key={f}
              className="px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap"
              style={{
                background: nu ? "var(--ink)" : gedaan ? "var(--lavender)" : "var(--bg-secondary)",
                color: nu ? "var(--white)" : gedaan ? "var(--ink)" : "var(--text-muted)",
              }}
            >
              {PHASE_LABEL[f]}
            </span>
          );
        })}
      </div>

      {showPercentage && progress != null && (
        <div className="mt-3">
          <div
            className="w-full rounded-full overflow-hidden"
            style={{ height: 6, background: "var(--bg-secondary)" }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                height: "100%",
                background: "var(--ink)",
              }}
            />
          </div>
          <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
            {progress}% afgerond
          </p>
        </div>
      )}
    </div>
  );
}
