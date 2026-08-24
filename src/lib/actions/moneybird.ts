"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { listAllSalesInvoices, moneybirdConfig } from "@/lib/moneybird/client";
import { deleteInvoice, matchesDocumentStyle, upsertInvoice } from "@/lib/moneybird/sync";

/**
 * Haalt in één keer alle verkoopfacturen op. Nodig naast de webhooks: die
 * leveren alleen wijzigingen vanaf het moment dat ze aanstaan, dus de
 * bestaande historie moet een keer worden ingelezen.
 */
export async function backfillMoneybirdAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");

  const { administrationId } = moneybirdConfig();
  const invoices = await listAllSalesInvoices();

  const service = createServiceClient();
  let imported = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const invoice of invoices) {
    if (!matchesDocumentStyle(invoice)) {
      skipped++;
      // Stond hij er eerder wel in, dan hoort hij er nu niet meer.
      await deleteInvoice(service, invoice.id).catch(() => {});
      continue;
    }
    try {
      await upsertInvoice(service, invoice, administrationId);
      imported++;
    } catch (e) {
      failures.push(`${invoice.invoice_id ?? invoice.id}: ${(e as Error).message}`);
    }
  }

  revalidatePath("/dashboard/finance/facturen");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard");
  return { total: invoices.length, imported, skipped, failures };
}

/**
 * Koppelt een Moneybird-relatie aan een portaalklant en trekt die koppeling
 * meteen door naar de al ingelezen facturen van die relatie. Een lege waarde
 * maakt de koppeling ongedaan.
 */
export async function linkMoneybirdContactAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");

  const client_id = formData.get("client_id") as string;
  const contact_id = ((formData.get("moneybird_contact_id") as string) || "").trim() || null;
  if (!client_id) throw new Error("Geen klant opgegeven");

  const service = createServiceClient();

  // Dezelfde relatie mag niet aan twee klanten hangen.
  if (contact_id) {
    await service
      .from("clients")
      .update({ moneybird_contact_id: null })
      .eq("moneybird_contact_id", contact_id)
      .neq("id", client_id);
  }

  const { error } = await service
    .from("clients")
    .update({ moneybird_contact_id: contact_id })
    .eq("id", client_id);
  if (error) throw new Error(error.message);

  // Bestaande facturen meteen bijwerken, zodat je het resultaat direct ziet.
  if (contact_id) {
    await service
      .from("moneybird_invoices")
      .update({ client_id })
      .eq("contact_moneybird_id", contact_id);
  } else {
    await service
      .from("moneybird_invoices")
      .update({ client_id: null })
      .eq("client_id", client_id);
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/finance/facturen");
}
