import { createClient } from "@/lib/supabase/server";
import { isMoneybirdConfigured } from "@/lib/moneybird/client";
import { fetchRecurringAgreements } from "@/lib/moneybird/recurring";
import FacturenPageClient from "./FacturenPageClient";
import type { MoneybirdInvoice } from "@/components/InvoiceTable";

export default async function FacturenPage() {
  const supabase = await createClient();

  const [{ data: rows, error }, recurring] = await Promise.all([
    supabase
      .from("moneybird_invoices")
      .select("*, clients(id, name, logo_url)")
      .order("invoice_date", { ascending: false, nullsFirst: true }),
    fetchRecurringAgreements(supabase),
  ]);

  // Payload eraf: de volledige factuur-JSON hoeft niet naar de browser.
  const invoices: MoneybirdInvoice[] = (rows ?? []).map((r) => {
    const { payload: _payload, ...rest } = r as typeof r & { payload: unknown };
    return rest as MoneybirdInvoice;
  });

  return (
    <FacturenPageClient
      configured={isMoneybirdConfigured()}
      invoices={invoices}
      recurring={recurring}
      tableMissing={error?.message?.includes("moneybird_invoices") ? error.message : null}
    />
  );
}
