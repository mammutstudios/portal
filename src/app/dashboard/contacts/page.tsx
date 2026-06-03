import { createClient } from "@/lib/supabase/server";
import ContactsPageClient from "./ContactsPageClient";

export default async function ContactsPage() {
  const supabase = await createClient();

  const [{ data: contacts }, { data: clients }] = await Promise.all([
    supabase.from("contacts").select("*, clients(name, id, logo_url)").order("created_at", { ascending: false }),
    supabase.from("clients").select("*").order("name"),
  ]);

  return <ContactsPageClient contacts={contacts ?? []} clients={clients ?? []} />;
}
