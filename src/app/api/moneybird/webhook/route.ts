import type { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyMoneybirdSignature } from "@/lib/moneybird/signature";
import { deleteInvoice, matchesDocumentStyle, upsertInvoice } from "@/lib/moneybird/sync";
import type { MoneybirdWebhookPayload } from "@/lib/moneybird/types";

/**
 * Ontvangstpunt voor Moneybird-webhooks.
 *
 * Moneybird verwacht een 200 terug; alles anders telt als mislukte bezorging en
 * wordt opnieuw aangeboden. We antwoorden daarom alleen met een foutstatus als
 * het echt aan ons ligt (opslagfout), niet bij een payload die we simpelweg
 * negeren.
 */
export async function POST(request: NextRequest) {
  // Ruwe body: opnieuw serialiseren breekt de handtekening.
  const rawBody = await request.text();

  // Kip en ei: Moneybird geeft het secret pas ná het aanmaken van de webhook,
  // maar test bij het aanmaken of de URL 200 teruggeeft. Zolang het secret nog
  // niet is ingesteld antwoorden we dus bevestigend, maar verwerken we niets.
  // Er kan in dat venster niets in de database komen.
  if (!process.env.MONEYBIRD_WEBHOOK_SECRET) {
    console.warn("[moneybird] webhook ontvangen zonder ingesteld secret; genegeerd");
    return new Response("secret nog niet ingesteld", { status: 200 });
  }

  const verdict = verifyMoneybirdSignature(
    request.headers.get("Moneybird-Signature"),
    rawBody,
    process.env.MONEYBIRD_WEBHOOK_SECRET ?? "",
  );
  if (!verdict.ok) {
    console.warn(`[moneybird] webhook geweigerd: ${verdict.reason}`);
    return new Response("ongeldige handtekening", { status: 401 });
  }

  let payload: MoneybirdWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as MoneybirdWebhookPayload;
  } catch {
    return new Response("ongeldige JSON", { status: 400 });
  }

  if (payload.entity_type !== "SalesInvoice") {
    return new Response("genegeerd", { status: 200 });
  }

  try {
    const supabase = createServiceClient();

    if (payload.action === "sales_invoice_destroyed") {
      await deleteInvoice(supabase, payload.entity_id);
    } else if (!matchesDocumentStyle(payload.entity)) {
      // Andere huisstijl: hoort hier niet. Verwijderen voor het geval de
      // factuur eerder wel bij ons hoorde en later is omgezet.
      await deleteInvoice(supabase, payload.entity_id);
    } else {
      await upsertInvoice(supabase, payload.entity, payload.administration_id);
    }
  } catch (e) {
    console.error("[moneybird] verwerken mislukt:", e);
    return new Response("verwerken mislukt", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
