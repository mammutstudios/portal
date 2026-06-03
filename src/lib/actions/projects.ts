"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createProjectAction(formData: FormData) {
  const title = formData.get("title") as string;
  const client_id = formData.get("client_id") as string;
  const description = formData.get("description") as string;
  const status = formData.get("status") as string;
  const deadline = formData.get("deadline") as string;
  const tags = formData.getAll("tags") as string[];

  if (!title?.trim()) return { error: "Naam is verplicht" };
  if (!client_id) return { error: "Klant is verplicht" };

  const supabase = await createClient();
  const { error } = await supabase.from("projects").insert({
    title: title.trim(),
    client_id,
    description: description?.trim() || null,
    status: status || "active",
    deadline: deadline || null,
    tags: tags.length > 0 ? tags : [],
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateProjectAction(id: string, formData: FormData) {
  const title = formData.get("title") as string;
  const client_id = formData.get("client_id") as string;
  const description = formData.get("description") as string;
  const status = formData.get("status") as string;
  const deadline = formData.get("deadline") as string;
  const tags = formData.getAll("tags") as string[];

  if (!title?.trim()) return { error: "Naam is verplicht" };

  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({
    title: title.trim(),
    client_id: client_id || undefined,
    description: description?.trim() || null,
    status: status || "active",
    deadline: deadline || null,
    tags: tags,
  }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}
