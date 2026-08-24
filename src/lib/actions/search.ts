"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchHit = {
  id: string;
  label: string;
  sublabel: string | null;
  href: string;
  group: "Klanten" | "Projecten" | "Tickets" | "Facturen";
  logo_url?: string | null;
};

/**
 * Zoekt over de vier dingen waar je in dit portaal naar op zoek bent.
 * Per groep maximaal vijf treffers, zodat de lijst leesbaar blijft.
 */
export async function globalSearchAction(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const like = `%${q}%`;

  const [clients, projects, tasks, invoices] = await Promise.all([
    supabase.from("clients").select("id, name, logo_url").ilike("name", like).limit(5),
    supabase.from("projects").select("id, title, clients(name)").ilike("title", like).limit(5),
    supabase.from("tasks").select("id, title, projects(title)").ilike("title", like).limit(5),
    supabase
      .from("moneybird_invoices")
      .select("id, reference, invoice_number, contact_name")
      .or(`reference.ilike.${like},invoice_number.ilike.${like},contact_name.ilike.${like}`)
      .limit(5),
  ]);

  const hits: SearchHit[] = [];

  for (const c of clients.data ?? []) {
    hits.push({
      id: c.id, label: c.name, sublabel: null,
      href: `/dashboard/clients/${c.id}`, group: "Klanten", logo_url: c.logo_url,
    });
  }
  for (const p of (projects.data ?? []) as unknown as { id: string; title: string; clients: { name: string } | null }[]) {
    hits.push({
      id: p.id, label: p.title, sublabel: p.clients?.name ?? null,
      href: `/dashboard/projects/${p.id}`, group: "Projecten",
    });
  }
  for (const t of (tasks.data ?? []) as unknown as { id: string; title: string; projects: { title: string } | null }[]) {
    hits.push({
      id: t.id, label: t.title, sublabel: t.projects?.title ?? null,
      href: `/dashboard/tasks`, group: "Tickets",
    });
  }
  for (const i of invoices.data ?? []) {
    hits.push({
      id: i.id,
      label: i.reference ?? i.invoice_number ?? "Factuur",
      sublabel: i.contact_name,
      href: `/dashboard/finance/facturen`, group: "Facturen",
    });
  }

  return hits;
}
