import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMoneybirdConfigured, moneybirdConfig } from "@/lib/moneybird/client";

/**
 * De PDF van één factuur, in het tabblad zelf.
 *
 * Moneybird levert PDF's alleen achter een API-token, dus de browser kan er
 * niet rechtstreeks heen; en de download-URL die Moneybird teruggeeft draagt
 * `Content-Disposition: attachment`, waardoor de browser hem wegschrijft in
 * plaats van toont. Vandaar dat we de bytes hier doorgeven met `inline`.
 *
 * Wie wat mag zien laten we aan de databasepolicy: een portaalgebruiker leest
 * alleen zijn eigen facturen en nooit concepten, een admin alles. Komt de rij
 * niet terug, dan bestaat hij voor deze gebruiker niet.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isMoneybirdConfigured()) {
    return NextResponse.json({ error: "Moneybird is niet gekoppeld" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { data: invoice } = await supabase
    .from("moneybird_invoices")
    .select("moneybird_id, invoice_number")
    .eq("id", id)
    .maybeSingle();

  if (!invoice) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const { token, administrationId } = moneybirdConfig();
  const res = await fetch(
    `https://moneybird.com/api/v2/${administrationId}/sales_invoices/${invoice.moneybird_id}/download_pdf`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );

  if (!res.ok || !res.body) {
    console.error(`[moneybird] pdf ophalen mislukt (${res.status}) voor ${invoice.moneybird_id}`);
    return NextResponse.json({ error: "PDF ophalen mislukt" }, { status: 502 });
  }

  const naam = `${invoice.invoice_number ?? "factuur"}.pdf`;
  return new NextResponse(res.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${naam}"`,
      // Facturen zijn privé: nergens onderweg bewaren.
      "Cache-Control": "private, no-store",
    },
  });
}
