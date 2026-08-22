import { createClient } from "@/lib/supabase/server";
import { fetchInvoicesAsTransactions } from "@/lib/moneybird/asTransactions";
import type { MoneybirdInvoice } from "@/components/InvoiceTable";
import FinancePageClient from "./FinancePageClient";

export default async function FinancePage() {
  const supabase = await createClient();

  const [transactions, { data: clients }, { data: projects }, { data: drafts }] = await Promise.all([
    fetchInvoicesAsTransactions(supabase),
    supabase.from("clients").select("id, name, logo_url").order("name"),
    supabase.from("projects").select("id, title, client_id").order("title"),
    supabase
      .from("moneybird_invoices")
      .select("*, clients(id, name, logo_url)")
      .eq("state", "draft")
      .order("invoice_date", { ascending: true, nullsFirst: true }),
  ]);

  return (
    <FinancePageClient
      transactions={transactions}
      clients={clients ?? []}
      projects={projects ?? []}
      draftInvoices={(drafts ?? []) as unknown as MoneybirdInvoice[]}
    />
  );
}
