import Link from "next/link";
import { ProjectStatusBadge } from "@/components/StatusBadge";
import type { ProjectStatus } from "@/lib/types";

/**
 * De projectenlijst van het klantportaal.
 *
 * Eén component voor zowel het overzicht als de projectenpagina, zodat die
 * twee niet uit elkaar kunnen lopen. Bewust zonder fasebalk: die stond hier
 * eerder wel, maar zegt de klant weinig naast de status en het volgende punt.
 */
export type PortalProject = {
  id: string;
  title: string;
  status: ProjectStatus;
  description: string | null;
  client_action: string | null;
};

/**
 * Waar een status in de lijst terechtkomt. Actief bovenaan, dan wat eraan
 * komt, dan wat stilligt. Afgerond staat onderaan en komt in het portaal
 * meestal niet eens langs.
 */
const VOLGORDE: Record<ProjectStatus, number> = {
  active: 0,
  upcoming: 1,
  on_hold: 2,
  review: 3,
  completed: 4,
};

/** Sorteert op status. Stabiel, dus binnen een status blijft de invoervolgorde staan. */
export function opStatus<T extends { status: ProjectStatus }>(rijen: T[]): T[] {
  return [...rijen].sort((a, b) => VOLGORDE[a.status] - VOLGORDE[b.status]);
}

export default function PortalProjectList({
  projecten,
  leegTekst = "Er lopen op dit moment geen projecten.",
}: {
  projecten: PortalProject[];
  leegTekst?: string;
}) {
  if (projecten.length === 0) {
    return (
      <div
        className="squircle px-4 py-6"
        style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
      >
        <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
          {leegTekst}
        </p>
      </div>
    );
  }

  return (
    <div
      className="squircle overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--bg)" }}
    >
      {projecten.map((p, i) => (
        <Link
          key={p.id}
          href={`/portal/projecten/${p.id}`}
          // items-center: de knop hoort in het midden van de regel te staan,
          // niet bovenaan naast de titel.
          className="card-hover flex items-center justify-between gap-4 px-4 py-4"
          style={{ borderBottom: i < projecten.length - 1 ? "1px solid var(--border)" : "none" }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-heading)" }}>
                {p.title}
              </h3>
              <ProjectStatusBadge status={p.status} />
            </div>

            {p.description && (
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                {p.description}
              </p>
            )}

            {p.client_action && (
              <p className="text-xs mt-2" style={{ color: "#92400e" }}>
                Van jou nodig: {p.client_action}
              </p>
            )}
          </div>

          {/* Een span en geen button: de hele regel is al een link, en een knop
              daarbinnen zou een klikbaar element in een klikbaar element zijn. */}
          <span
            className="text-sm px-3 py-1.5 rounded-md flex-shrink-0"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text-heading)",
            }}
          >
            Bekijk
          </span>
        </Link>
      ))}
    </div>
  );
}

/** De kolommen die deze lijst nodig heeft; nooit select("*"). */
export const PORTAL_PROJECT_KOLOMMEN = "id, title, status, description, client_action";
