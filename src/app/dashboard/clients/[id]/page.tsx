import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ClientDetailClient from "./ClientDetailClient";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: projects }, { data: contacts }, { data: allContacts }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase.from("projects").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("contact_clients").select("contacts(*)").eq("client_id", id),
    supabase.from("contacts").select("*").order("name"),
  ]);

  if (!client) notFound();

  const linkedContacts = (contacts ?? []).map((cc: any) => cc.contacts).filter(Boolean);

  return <ClientDetailClient client={client} projects={projects ?? []} contacts={linkedContacts} allContacts={allContacts ?? []} />;
}
