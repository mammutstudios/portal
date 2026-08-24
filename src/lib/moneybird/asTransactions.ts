import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchRecurringAsForecast } from "./recurring";
import type { Transaction } from "@/lib/types";

/**
 * Moneybird-facturen in de vorm die de finance-weergaven verwachten.
 *
 * Zo blijven de grafiek, de kwartaalblokken en de dashboardkaarten ongewijzigd
 * werken terwijl de bron verandert. Bedragen zijn exclusief btw — dat is wat de
 * omzetcijfers altijd al toonden. Een concept in Moneybird geldt als `draft`,
 * dus als forecast, precies zoals de handmatige conceptregels werkten.
 */
export async function fetchInvoicesAsTransactions(
  supabase: SupabaseClient,
): Promise<Transaction[]> {
  const [{ data, error }, periodiek] = await Promise.all([
    supabase
      .from("moneybird_invoices")
      .select(
        "id, reference, invoice_number, contact_name, total_excl_tax, state, invoice_date, client_id, created_at, clients(id, name, logo_url)",
      )
      .not("invoice_date", "is", null)
      .order("invoice_date", { ascending: false }),
    fetchRecurringAsForecast(supabase),
  ]);

  if (error) {
    console.error("[moneybird] facturen ophalen mislukt:", error.message);
    return periodiek;
  }

  const facturen = (data ?? []).map((row) => {
    const r = row as unknown as {
      id: string;
      reference: string | null;
      invoice_number: string | null;
      contact_name: string | null;
      total_excl_tax: number | null;
      state: string | null;
      invoice_date: string;
      client_id: string | null;
      created_at: string;
      clients: { id: string; name: string; logo_url: string | null } | null;
    };
    return {
      id: r.id,
      description: r.reference ?? r.invoice_number ?? r.contact_name ?? "Factuur",
      amount: r.total_excl_tax ?? 0,
      status: r.state === "draft" ? "draft" : "confirmed",
      client_id: r.client_id,
      project_id: null,
      date: r.invoice_date,
      created_at: r.created_at,
      clients: r.clients,
      projects: null,
    } satisfies Transaction;
  });

  return [...facturen, ...periodiek];
}
