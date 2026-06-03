import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ClientDetailClient from "./ClientDetailClient";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: client }, { data: projects }, { data: contacts }, { data: allContacts }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase.from("projects").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    supabase.from("contacts").select("*").eq("client_id", id).order("created_at", { ascending: true }),
    supabase.from("contacts").select("*").order("name"),
  ]);

  if (!client) notFound();

  return <ClientDetailClient client={client} projects={projects ?? []} contacts={contacts ?? []} allContacts={allContacts ?? []} />;
}
