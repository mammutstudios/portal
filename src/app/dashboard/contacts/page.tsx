import { createClient } from "@/lib/supabase/server";
import ContactsPageClient from "./ContactsPageClient";

export default async function ContactsPage() {
  const supabase = await createClient();

  const [{ data: contacts }, { data: clients }] = await Promise.all([
    supabase.from("contacts").select("*, contact_clients(clients(id, name, logo_url, client_number))").order("name"),
    supabase.from("clients").select("*").order("name"),
  ]);

  return <ContactsPageClient contacts={contacts ?? []} clients={clients ?? []} />;
}
