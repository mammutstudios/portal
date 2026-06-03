export type Role = "admin" | "client";

export type Profile = {
  id: string;
  role: Role;
  full_name: string | null;
  avatar_url: string | null;
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
  created_at: string;
};

export type ClientMember = {
  id: string;
  client_id: string;
  profile_id: string;
};

export type ProjectStatus = "active" | "review" | "completed" | "on_hold";

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
  clients?: Pick<Client, "id" | "name" | "logo_url"> | null;
};

export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export type Task = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
};

export type Contact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
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
