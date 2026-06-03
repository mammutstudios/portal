"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const MIME: Record<string, string> = {
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

async function uploadLogo(supabase: Awaited<ReturnType<typeof createClient>>, file: File, clientId: string) {
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const path = `${clientId}.${ext}`;
  const contentType = file.type || MIME[ext] || "application/octet-stream";
  await supabase.storage.from("client-logos").remove([path]);
  const { error } = await supabase.storage.from("client-logos").upload(path, file, { contentType });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from("client-logos").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}

export async function quickCreateClientAction(name: string): Promise<{ id: string; name: string } | { error: string }> {
  if (!name?.trim()) return { error: "Naam is verplicht" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({ name: name.trim() })
    .select("id, name")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/projects");
  return { id: data.id, name: data.name };
}

export async function createClientAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const slug = formData.get("slug") as string;
  const client_number = formData.get("client_number") as string;
  const tag = formData.get("tag") as string;
  const logoFile = formData.get("logo") as File | null;

  if (!name?.trim()) return { error: "Naam is verplicht" };

  const supabase = await createClient();
  const { data: client, error } = await supabase.from("clients").insert({
    name: name.trim(),
    email: email?.trim() || null,
    slug: slug?.trim() || null,
    client_number: client_number?.trim() || null,
    tag: tag || null,
  }).select().single();

  if (error) return { error: error.message };

  if (logoFile && logoFile.size > 0 && client) {
    const { url, error: uploadError } = await uploadLogo(supabase, logoFile, client.id);
    if (uploadError) return { error: `Logo upload mislukt: ${uploadError}` };
    if (url) await supabase.from("clients").update({ logo_url: url }).eq("id", client.id);
  }

  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateClientAction(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const slug = formData.get("slug") as string;
  const client_number = formData.get("client_number") as string;
  const tag = formData.get("tag") as string;
  const logoFile = formData.get("logo") as File | null;

  if (!name?.trim()) return { error: "Naam is verplicht" };

  const supabase = await createClient();

  let logo_url: string | undefined;
  if (logoFile && logoFile.size > 0) {
    const { url, error: uploadError } = await uploadLogo(supabase, logoFile, id);
    if (uploadError) return { error: `Logo upload mislukt: ${uploadError}` };
    logo_url = url ?? undefined;
  }

  const { error } = await supabase
    .from("clients")
    .update({
      name: name.trim(),
      email: email?.trim() || null,
      slug: slug?.trim() || null,
      client_number: client_number?.trim() || null,
      tag: tag || null,
      ...(logo_url ? { logo_url } : {}),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/clients");
  revalidatePath(`/dashboard/clients/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}
