"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTaskAction(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.from("tasks").insert({
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    project_id: (formData.get("project_id") as string) || null,
    status: (formData.get("status") as string) || "todo",
    priority: (formData.get("priority") as string) || "medium",
    due_date: (formData.get("due_date") as string) || null,
    assigned_contact_id: (formData.get("assigned_contact_id") as string) || null,
    assigned_profile_id: (formData.get("assigned_profile_id") as string) || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
}

/**
 * Stempelt het moment van afronden. Alleen zetten bij de overgang naar "done",
 * en weer leegmaken als een ticket heropend wordt — anders klopt het
 * maandoverzicht niet meer.
 */
async function completedAtFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  status: string,
): Promise<string | null> {
  if (status !== "done") return null;
  const { data } = await supabase.from("tasks").select("completed_at, status").eq("id", id).maybeSingle();
  // Was hij al af, dan blijft de oorspronkelijke datum staan.
  if (data?.status === "done" && data.completed_at) return data.completed_at as string;
  return new Date().toISOString();
}

export async function updateTaskAction(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  const status = formData.get("status") as string;

  const { error } = await supabase.from("tasks").update({
    title: formData.get("title") as string,
    completed_at: await completedAtFor(supabase, id, status),
    description: (formData.get("description") as string) || null,
    project_id: (formData.get("project_id") as string) || null,
    status,
    priority: (formData.get("priority") as string) || "medium",
    due_date: (formData.get("due_date") as string) || null,
    assigned_contact_id: (formData.get("assigned_contact_id") as string) || null,
    assigned_profile_id: (formData.get("assigned_profile_id") as string) || null,
  }).eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
}

export async function updateTaskStatusAction(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  const status = formData.get("status") as string;
  const { error } = await supabase
    .from("tasks")
    .update({ status, completed_at: await completedAtFor(supabase, id, status) })
    .eq("id", id);
  if (error) console.error("updateTaskStatus error:", error);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTaskAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", formData.get("id") as string);
  if (error) console.error("deleteTask error:", error);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
}
