import type { ProjectStatus, TaskStatus, ClientTag, DealStatus } from "@/lib/types";

const projectStatusConfig: Record<ProjectStatus, { label: string; bg: string; color: string }> = {
  upcoming: { label: "Upcoming", bg: "#ffedd5", color: "#9a3412" },
  active: { label: "Actief", bg: "#d3f1e3", color: "#1a6b47" },
  review: { label: "Review", bg: "#fef3c7", color: "#92400e" },
  completed: { label: "Afgerond", bg: "#f1f1ef", color: "#6b6b6b" },
  on_hold: { label: "On hold", bg: "#fce7f3", color: "#9d174d" },
};

const taskStatusConfig: Record<TaskStatus, { label: string; bg: string; color: string }> = {
  todo: { label: "Te doen", bg: "#f1f1ef", color: "#6b6b6b" },
  in_progress: { label: "Bezig", bg: "#dbeafe", color: "#1e40af" },
  review: { label: "Review", bg: "#fef3c7", color: "#92400e" },
  done: { label: "Klaar", bg: "#d3f1e3", color: "#1a6b47" },
};

const dealStatusConfig: Record<DealStatus, { label: string; bg: string; color: string }> = {
  nieuw: { label: "Nieuw", bg: "#dbeafe", color: "#1e40af" },
  gesprek: { label: "Gesprek", bg: "#ffedd5", color: "#9a3412" },
  offerte: { label: "Offerte", bg: "#fef3c7", color: "#92400e" },
  gewonnen: { label: "Gewonnen", bg: "#d3f1e3", color: "#1a6b47" },
  verloren: { label: "Verloren", bg: "#f1f1ef", color: "#6b6b6b" },
};

export function DealStatusBadge({ status }: { status: DealStatus }) {
  const config = dealStatusConfig[status] ?? dealStatusConfig.nieuw;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config = projectStatusConfig[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

const clientTagConfig: Record<ClientTag, { label: string; bg: string; color: string }> = {
  agency: { label: "Agency", bg: "#dbeafe", color: "#1e40af" },
  client: { label: "Client", bg: "#f1f1ef", color: "#6b6b6b" },
};

export function ClientTagBadge({ tag }: { tag: ClientTag }) {
  const config = clientTagConfig[tag];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}

const projectTagConfig: Record<string, { bg: string; color: string }> = {
  Branding:    { bg: "#fce7f3", color: "#9d174d" },
  Design:      { bg: "#dbeafe", color: "#1e40af" },
  Development: { bg: "#d3f1e3", color: "#1a6b47" },
  Retainer:    { bg: "#fef3c7", color: "#92400e" },
};

export function ProjectTagBadge({ tag }: { tag: string }) {
  const config = projectTagConfig[tag] ?? { bg: "#f1f1ef", color: "#6b6b6b" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: config.bg, color: config.color }}
    >
      {tag}
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const config = taskStatusConfig[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
}
