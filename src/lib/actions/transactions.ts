"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function resolveClientId(supabase: Awaited<ReturnType<typeof createClient>>, project_id: string | null) {
  if (!project_id) return null;
  const { data } = await supabase.from("projects").select("client_id").eq("id", project_id).single();
  return data?.client_id ?? null;
}

export async function createTransactionAction(formData: FormData) {
  const supabase = await createClient();
  const project_id = (formData.get("project_id") as string) || null;
  const client_id = await resolveClientId(supabase, project_id);

  const month = formData.get("date") as string;
  const { error } = await supabase.from("transactions").insert({
    description: formData.get("description") as string,
    amount: parseFloat(formData.get("amount") as string),
    client_id,
    project_id,
    date: month.length === 7 ? `${month}-01` : month,
    status: (formData.get("status") as string) || "confirmed",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/finance");
}

export async function updateTransactionAction(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const project_id = (formData.get("project_id") as string) || null;
  const client_id = await resolveClientId(supabase, project_id);

  const month = formData.get("date") as string;
  const { error } = await supabase.from("transactions").update({
    description: formData.get("description") as string,
    amount: parseFloat(formData.get("amount") as string),
    client_id,
    project_id,
    date: month.length === 7 ? `${month}-01` : month,
    status: (formData.get("status") as string) || "confirmed",
  }).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/finance");
}

export async function deleteTransactionAction(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("transactions").delete().eq("id", formData.get("id") as string);
  revalidatePath("/dashboard/finance");
}
