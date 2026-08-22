import type { SupabaseClient } from "@supabase/supabase-js";
import { moneybirdDocumentStyleId } from "./client";
import { contactLabel, toAmount, type MoneybirdSalesInvoice } from "./types";
import { recipientsForClient } from "@/lib/email/recipients";
import { newInvoiceMail } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/send";

/** Hoort deze factuur bij de ingestelde huisstijl? Zonder instelling: alles. */
export function matchesDocumentStyle(invoice: MoneybirdSalesInvoice): boolean {
  const wanted = moneybirdDocumentStyleId();
  if (!wanted) return true;
  return invoice.document_style_id === wanted;
}


/**
 * Strip rechtsvorm en interpunctie zodat "Deegmeesters B.V." en "Deegmeesters"
 * als dezelfde relatie gelden. Bewust conservatief: alleen de achtervoegsels,
 * geen fuzzy matching — "Tota B.V." mag niet op "TotaMatch" uitkomen.
 */
const LEGAL_SUFFIXES = [
  "b.v.", "bv", "n.v.", "nv", "v.o.f.", "vof", "c.v.", "cv",
  "inc.", "inc", "ltd.", "ltd", "llc", "gmbh", "holding",
];

function normalizeCompanyName(name: string | null): string {
  if (!name) return "";
  let out = name.toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of LEGAL_SUFFIXES) {
      const bare = suffix.replace(/[.,]/g, "").trim();
      if (out.endsWith(` ${bare}`)) {
        out = out.slice(0, -(bare.length + 1)).trim();
        changed = true;
      }
    }
  }
  return out;
}

/** Facturen die in Moneybird verwijderd zijn, halen we ook hier weg. */
export async function deleteInvoice(supabase: SupabaseClient, moneybirdId: string) {
  const { error } = await supabase
    .from("moneybird_invoices")
    .delete()
    .eq("moneybird_id", moneybirdId);
  if (error) throw new Error(error.message);
}

/**
 * Zoekt de portaalklant bij een Moneybird-relatie. Eerst op een eerder gelegde
 * koppeling, anders op exacte naam. Geen match is geen fout: de factuur komt
 * binnen zonder klant en is in de weergave zichtbaar als "niet gekoppeld".
 */
async function resolveClientId(
  supabase: SupabaseClient,
  contactMoneybirdId: string | null,
  contactName: string | null,
): Promise<string | null> {
  if (contactMoneybirdId) {
    const { data } = await supabase
      .from("clients")
      .select("id")
      .eq("moneybird_contact_id", contactMoneybirdId)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  if (contactName) {
    // Exacte match eerst — die is het meest betrouwbaar.
    const { data } = await supabase
      .from("clients")
      .select("id")
      .ilike("name", contactName)
      .maybeSingle();
    if (data?.id) return data.id;

    // Anders vergelijken zonder rechtsvorm: "Deegmeesters B.V." == "Deegmeesters".
    // Alleen bij precies één treffer, zodat we nooit gokken.
    const target = normalizeCompanyName(contactName);
    if (target) {
      const { data: all } = await supabase.from("clients").select("id, name");
      const hits = (all ?? []).filter((c) => normalizeCompanyName(c.name) === target);
      if (hits.length === 1) return hits[0].id;
    }
  }
  return null;
}

export async function upsertInvoice(
  supabase: SupabaseClient,
  invoice: MoneybirdSalesInvoice,
  administrationId: string,
) {
  const contactMoneybirdId = invoice.contact?.id ?? invoice.contact_id ?? null;
  const contactName = contactLabel(invoice.contact);
  const client_id = await resolveClientId(supabase, contactMoneybirdId, contactName);

  const row = {
    moneybird_id: invoice.id,
    administration_id: administrationId,
    invoice_number: invoice.invoice_id ?? null,
    reference: invoice.reference ?? null,
    state: invoice.state ?? null,
    invoice_date: invoice.invoice_date ?? null,
    due_date: invoice.due_date ?? null,
    paid_at: invoice.paid_at ?? null,
    sent_at: invoice.sent_at ?? null,
    currency: invoice.currency ?? "EUR",
    total_excl_tax: toAmount(invoice.total_price_excl_tax),
    total_incl_tax: toAmount(invoice.total_price_incl_tax),
    contact_moneybird_id: contactMoneybirdId,
    contact_name: contactName,
    client_id,
    payload: invoice as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  };

  // Wat stond er hiervoor? Bepaalt of dit een verzending is die we melden.
  const { data: existing } = await supabase
    .from("moneybird_invoices")
    .select("state")
    .eq("moneybird_id", invoice.id)
    .maybeSingle();

  const { error } = await supabase
    .from("moneybird_invoices")
    .upsert(row, { onConflict: "moneybird_id" });
  if (error) throw new Error(error.message);

  // Alleen melden bij de overgang concept -> verstuurd. Een factuur die we voor
  // het eerst zien melden we nooit: anders zou de eerste import iedereen mailen
  // over de hele historie.
  const wasDraft = existing?.state === "draft";
  const isSent = row.state !== null && row.state !== "draft";
  if (wasDraft && isSent) {
    await notifyNewInvoice(supabase, row);
  }
}

async function notifyNewInvoice(
  supabase: SupabaseClient,
  row: {
    client_id: string | null;
    invoice_number: string | null;
    reference: string | null;
    total_excl_tax: number | null;
    invoice_date: string | null;
    contact_name: string | null;
  },
) {
  try {
    const to = await recipientsForClient(supabase, row.client_id, "new_invoice");
    if (to.length === 0) return;

    const { subject, html } = newInvoiceMail({
      invoiceNumber: row.invoice_number,
      reference: row.reference,
      amountExclTax: row.total_excl_tax,
      invoiceDate: row.invoice_date,
      clientName: row.contact_name,
    });
    await sendMail({ to, subject, html });
  } catch (e) {
    // Een mislukte mail mag het inlezen van facturen nooit tegenhouden.
    console.error("[mail] melding nieuwe factuur mislukt:", e);
  }
}
