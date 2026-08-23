import { createClient } from "@/lib/supabase/server";
import { getPortalContext, euro } from "@/lib/portal";
import InvoiceTable, { type MoneybirdInvoice } from "@/components/InvoiceTable";
import PortalEmpty from "../PortalEmpty";

export default async function PortalInvoicesPage() {
  const { clientIds, activeClientName } = await getPortalContext();
  if (clientIds.length === 0) return <PortalEmpty />;

  const supabase = await createClient();
  const { data } = await supabase
    .from("moneybird_invoices")
    .select("id, invoice_number, reference, state, invoice_date, total_excl_tax, total_incl_tax")
    .in("client_id", clientIds)
    // Concepten zijn intern: die heeft de klant nooit gezien.
    .neq("state", "draft")
    .order("invoice_date", { ascending: false, nullsFirst: false });

  // Dezelfde vorm als in het dashboard, zodat beide dezelfde tabel gebruiken.
  const invoices: MoneybirdInvoice[] = (data ?? []).map(
    (r) =>
      ({
        ...r,
        moneybird_id: "",
        contact_name: null,
        client_id: null,
        synced_at: null,
        has_pdf: true,
      }) as MoneybirdInvoice,
  );

  const open = invoices.filter((i) => i.state !== "paid");
  const openTotal = open.reduce((s, i) => s + (i.total_incl_tax ?? 0), 0);

  return (
    <div className="px-10 py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Facturen
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        {activeClientName ? `Alle facturen van ${activeClientName}.` : "Al je facturen op één plek."}
        {open.length > 0 && ` ${open.length} openstaand — ${euro(openTotal)} incl. btw.`}
      </p>

      <InvoiceTable
        invoices={invoices}
        emptyLabel="Er zijn nog geen facturen verstuurd."
        // Elke factuur is van dezelfde organisatie, dus die kolom zegt niets.
        showClient={false}
        // De klant ziet wat hij overmaakt; intern rekenen we exclusief btw.
        amount="incl"
        amountLabel="Bedrag incl. btw"
      />
    </div>
  );
}
