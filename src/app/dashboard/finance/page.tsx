import { createClient } from "@/lib/supabase/server";
import FinancePageClient from "./FinancePageClient";

export default async function FinancePage() {
  const supabase = await createClient();

  const [{ data: transactions }, { data: clients }, { data: projects }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*, clients(id, name, logo_url), projects(id, title)")
      .order("date", { ascending: false }),
    supabase.from("clients").select("id, name, logo_url").order("name"),
    supabase.from("projects").select("id, title, client_id").order("title"),
  ]);

  return (
    <FinancePageClient
      transactions={transactions ?? []}
      clients={clients ?? []}
      projects={projects ?? []}
    />
  );
}
