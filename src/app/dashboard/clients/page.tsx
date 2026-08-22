import { createClient } from "@/lib/supabase/server";
import { isMoneybirdConfigured, listAllContacts } from "@/lib/moneybird/client";
import { contactLabel } from "@/lib/moneybird/types";
import ClientsPageClient from "./ClientsPageClient";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("name");

  // Relaties uit Moneybird om handmatig aan te koppelen. Valt de API weg, dan
  // blijft de pagina gewoon werken; de kolom verdwijnt dan simpelweg.
  let moneybirdContacts: { id: string; label: string }[] = [];
  if (isMoneybirdConfigured()) {
    try {
      moneybirdContacts = (await listAllContacts())
        .map((c) => ({ id: c.id, label: contactLabel(c) ?? c.id }))
        .sort((a, b) => a.label.localeCompare(b.label, "nl"));
    } catch (e) {
      console.error("[moneybird] relaties ophalen mislukt:", e);
    }
  }

  return <ClientsPageClient clients={clients ?? []} moneybirdContacts={moneybirdContacts} />;
}
