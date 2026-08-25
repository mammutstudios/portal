"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Alleen een naam, voor het aanmaken vanuit een keuzelijst. Geeft hetzelfde
 * terug als quickCreateClientAction, zodat SearchSelect er direct mee verder kan.
 */
export async function quickCreateContactAction(
  name: string,
  /** Meteen aan deze organisatie hangen; anders staat hij nergens bij. */
  clientId?: string | null,
): Promise<{ id: string; name: string } | { error: string }> {
  if (!name?.trim()) return { error: "Naam is verplicht" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({ name: name.trim() })
    .select("id, name")
    .single();

  if (error) return { error: error.message };

  if (clientId) {
    await supabase.from("contact_clients").insert({ contact_id: data.id, client_id: clientId });
    revalidatePath(`/dashboard/clients/${clientId}`);
  }

  revalidatePath("/dashboard/contacts");
  return { id: data.id, name: data.name };
}

export async function createContactAction(formData: FormData) {
  const supabase = await createClient();
  const client_id = (formData.get("client_id") as string) || null;
  const project_id = (formData.get("project_id") as string) || null;

  const { data: contact } = await supabase.from("contacts").insert({
    name: formData.get("name") as string,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
  }).select().single();

  if (contact && client_id) {
    await supabase.from("contact_clients").insert({ contact_id: contact.id, client_id });
  }

  if (contact && project_id) {
    await supabase.from("project_contacts").insert({ project_id, contact_id: contact.id });
    revalidatePath(`/dashboard/projects/${project_id}`);
  }

  if (client_id) revalidatePath(`/dashboard/clients/${client_id}`);
  revalidatePath("/dashboard/contacts");
}

export async function updateContactAction(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  await supabase.from("contacts").update({
    name: formData.get("name") as string,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
  }).eq("id", id);

  revalidatePath(`/dashboard/contacts/${id}`);
  revalidatePath("/dashboard/contacts");
}

export async function linkContactToClientAction(formData: FormData) {
  const supabase = await createClient();
  const contact_id = formData.get("contact_id") as string;
  const client_id = formData.get("client_id") as string;

  await supabase.from("contact_clients").upsert({ contact_id, client_id });

  revalidatePath(`/dashboard/clients/${client_id}`);
  revalidatePath(`/dashboard/contacts/${contact_id}`);
  revalidatePath("/dashboard/contacts");
}

export async function unlinkContactFromClientAction(formData: FormData) {
  const supabase = await createClient();
  const contact_id = formData.get("contact_id") as string;
  const client_id = formData.get("client_id") as string;

  await supabase.from("contact_clients").delete()
    .eq("contact_id", contact_id)
    .eq("client_id", client_id);

  revalidatePath(`/dashboard/clients/${client_id}`);
  revalidatePath(`/dashboard/contacts/${contact_id}`);
  revalidatePath("/dashboard/contacts");
}

export async function addContactToProjectAction(formData: FormData) {
  const supabase = await createClient();
  const project_id = formData.get("project_id") as string;
  const contact_id = formData.get("contact_id") as string;

  await supabase.from("project_contacts").insert({ project_id, contact_id });
  revalidatePath(`/dashboard/projects/${project_id}`);
}

export async function removeContactFromProjectAction(formData: FormData) {
  const supabase = await createClient();
  const project_id = formData.get("project_id") as string;
  const contact_id = formData.get("contact_id") as string;

  await supabase.from("project_contacts").delete().eq("project_id", project_id).eq("contact_id", contact_id);
  revalidatePath(`/dashboard/projects/${project_id}`);
}

export async function deleteContactAction(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const client_id = formData.get("client_id") as string | null;

  await supabase.from("contacts").delete().eq("id", id);

  if (client_id) revalidatePath(`/dashboard/clients/${client_id}`);
  revalidatePath("/dashboard/contacts");
}
