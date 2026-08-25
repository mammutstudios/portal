export type Role = "admin" | "client";

export type Profile = {
  id: string;
  role: Role;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  /** Zichtbaar bij de lead van een project, ook in het klantportaal. */
  phone: string | null;
  notification_prefs: Record<string, boolean> | null;
  created_at: string;
};

export type ClientTag = "agency" | "client";

/**
 * Een aanvraag die nog geen klant is.
 *
 * Let op de naam: "lead" betekent hier het teamlid dat een project trekt
 * (projects.lead_profile_id). Vandaar deals.
 */
export const DEAL_STATUSSEN = ["nieuw", "gesprek", "offerte", "gewonnen", "verloren"] as const;
export type DealStatus = (typeof DEAL_STATUSSEN)[number];

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  nieuw: "Nieuw",
  gesprek: "Gesprek",
  offerte: "Offerte",
  gewonnen: "Gewonnen",
  verloren: "Verloren",
};

/** Gewonnen en verloren zijn klaar; de rest loopt nog. */
export const DEAL_OPEN: DealStatus[] = ["nieuw", "gesprek", "offerte"];

export type Deal = {
  id: string;
  created_at: string;
  updated_at: string | null;
  title: string;
  company: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: DealStatus;
  value_amount: number | null;
  notes: string | null;
  client_id: string | null;
  project_id: string | null;
  closed_at: string | null;
};

export type Client = {
  id: string;
  client_number: string | null;
  name: string;
  email: string | null;
  slug: string | null;
  logo_url: string | null;
  tag: ClientTag | null;
  moneybird_contact_id?: string | null;
  created_at: string;
};

export type ClientMember = {
  id: string;
  client_id: string;
  profile_id: string;
};

export type ProjectStatus = "upcoming" | "active" | "review" | "completed" | "on_hold";

/**
 * Waar een status in een lijst terechtkomt. Actief bovenaan, dan wat eraan
 * komt, dan wat stilligt, en afgerond onderaan. Eén bron voor het dashboard
 * en het klantportaal, zodat lijsten niet elk hun eigen volgorde krijgen.
 */
export const PROJECT_STATUS_VOLGORDE: Record<ProjectStatus, number> = {
  active: 0,
  upcoming: 1,
  on_hold: 2,
  review: 3,
  completed: 4,
};

/** Sorteert op status. Stabiel, dus binnen een status blijft de invoervolgorde staan. */
export function opStatus<T extends { status: ProjectStatus }>(rijen: T[]): T[] {
  return [...rijen].sort(
    (a, b) => PROJECT_STATUS_VOLGORDE[a.status] - PROJECT_STATUS_VOLGORDE[b.status],
  );
}

/** De fases die een project doorloopt; volgorde is die van het echte traject. */
export const PROJECT_PHASES = ["kickoff", "ontwerp", "development", "review", "live"] as const;
export type ProjectPhase = (typeof PROJECT_PHASES)[number];

export const PHASE_LABEL: Record<ProjectPhase, string> = {
  kickoff: "Kickoff",
  ontwerp: "Ontwerp",
  development: "Development",
  review: "Review",
  live: "Live",
};

/**
 * Welke fases dit project doorloopt, afgeleid uit zijn type.
 *
 * Een project dat alleen development is kent geen ontwerpfase, en die dan toch
 * tonen suggereert een stap die nooit komt. Bij een retainer is er helemaal
 * geen traject: die loopt door, dus daar tonen we niets.
 *
 * Zonder tags weten we niets en tonen we alles; dat is beter dan iets weglaten
 * wat er wel bij hoort.
 */
export function phasesForProject(tags: string[] | null, huidige?: ProjectPhase | null): ProjectPhase[] {
  const t = (tags ?? []).map((x) => x.toLowerCase());

  if (t.length === 1 && t[0] === "retainer") return [];
  if (t.length === 0) return [...PROJECT_PHASES];

  const ontwerp = t.includes("design") || t.includes("branding");
  const development = t.includes("development");
  if (!ontwerp && !development) return [...PROJECT_PHASES];

  return PROJECT_PHASES.filter(
    (f) =>
      // De huidige fase blijft altijd staan, ook als het type later wijzigt.
      f === huidige ||
      (f !== "ontwerp" || ontwerp) && (f !== "development" || development),
  );
}

export type Project = {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  progress: number | null;
  deadline: string | null;
  tags: string[] | null;
  created_at: string;
  /** Waar het project staat. Zichtbaar voor de klant. */
  phase: ProjectPhase | null;
  /** Eén zin over wat er nu gebeurt. Zichtbaar voor de klant. */
  next_step: string | null;
  /** Wat wij van de klant nodig hebben. Zichtbaar voor de klant. */
  client_action: string | null;
  live_url: string | null;
  staging_url: string | null;
  /** Teamlid dat dit project trekt. Zichtbaar voor de klant. */
  lead_profile_id: string | null;
  lead?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  /** Afgesproken prijs excl. btw. Blijft intern: bij een vaste prijs heeft
   *  een klant niets aan een budgetstand, en het nodigt uit tot sturen op
   *  uren in plaats van op resultaat. */
  budget_amount: number | null;
  clients?: Pick<Client, "id" | "name" | "logo_url"> | null;
};

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type Task = {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  due_date: string | null;
  assigned_contact_id: string | null;
  assigned_profile_id: string | null;
  created_at: string;
  projects?: { id: string; title: string } | null;
  contacts?: { id: string; name: string } | null;
  profiles?: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

export type Subtask = {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  created_at: string;
};

export type TimeEntry = {
  id: string;
  task: string;
  hours: number;
  project_id: string | null;
  date: string;
  profile_id: string | null;
  created_at: string;
  projects?: { id: string; title: string; clients?: { name: string; logo_url: string | null } | null } | null;
  profiles?: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

export type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  contact_clients?: { clients: Pick<Client, "id" | "name" | "logo_url" | "client_number"> }[];
};

export type ProjectContact = {
  id: string;
  project_id: string;
  contact_id: string;
  contacts?: Contact;
};

export type Transaction = {
  id: string;
  description: string;
  amount: number;
  status: "confirmed" | "draft";
  client_id: string | null;
  project_id: string | null;
  date: string;
  created_at: string;
  clients?: { id: string; name: string; logo_url: string | null } | null;
  projects?: { id: string; title: string } | null;
};

export type File = {
  id: string;
  project_id: string;
  name: string;
  url: string;
  size: number | null;
  uploaded_at: string;
};
