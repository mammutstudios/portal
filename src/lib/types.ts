export type Role = "admin" | "client";

export type Profile = {
  id: string;
  role: Role;
  full_name: string | null;
  avatar_url: string | null;
  notification_prefs: Record<string, boolean> | null;
  created_at: string;
};

export type ClientTag = "agency" | "client";

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
