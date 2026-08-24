import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { isMoneybirdConfigured, listAllContacts } from "@/lib/moneybird/client";
import { contactLabel } from "@/lib/moneybird/types";
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

  // Relaties uit Moneybird om deze organisatie eenmalig aan te koppelen.
  // Valt de API weg, dan blijft de pagina werken en verdwijnt alleen dat blok.
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

  const linkedContacts = (contacts ?? []).map((cc: any) => cc.contacts).filter(Boolean);

  return (
    <ClientDetailClient
      client={client}
      projects={projects ?? []}
      contacts={linkedContacts}
      allContacts={allContacts ?? []}
      moneybirdContacts={moneybirdContacts}
    />
  );
}
