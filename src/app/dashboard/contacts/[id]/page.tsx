import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import ContactDetailClient from "./ContactDetailClient";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: contact }, { data: clients }, { data: projectContacts }] = await Promise.all([
    supabase.from("contacts").select("*, clients(id, name, logo_url, client_number)").eq("id", id).single(),
    supabase.from("clients").select("id, name, logo_url, client_number").order("name"),
    supabase.from("project_contacts").select("projects(id, title, status, client_id)").eq("contact_id", id),
  ]);

  if (!contact) notFound();

  const projects = (projectContacts ?? []).map((pc: any) => pc.projects).filter(Boolean);

  return <ContactDetailClient contact={contact} clients={clients ?? []} projects={projects} />;
}
