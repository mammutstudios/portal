"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTaskAction(formData: FormData) {
  const supabase = await createClient();

  await supabase.from("tasks").insert({
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    project_id: (formData.get("project_id") as string) || null,
    status: (formData.get("status") as string) || "todo",
    priority: (formData.get("priority") as string) || "medium",
    due_date: (formData.get("due_date") as string) || null,
    assigned_contact_id: (formData.get("assigned_contact_id") as string) || null,
    assigned_profile_id: (formData.get("assigned_profile_id") as string) || null,
  });

  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
}

export async function updateTaskAction(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  await supabase.from("tasks").update({
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    project_id: (formData.get("project_id") as string) || null,
    status: formData.get("status") as string,
    priority: (formData.get("priority") as string) || "medium",
    due_date: (formData.get("due_date") as string) || null,
    assigned_contact_id: (formData.get("assigned_contact_id") as string) || null,
    assigned_profile_id: (formData.get("assigned_profile_id") as string) || null,
  }).eq("id", id);

  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
}

export async function updateTaskStatusAction(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ status: formData.get("status") }).eq("id", formData.get("id") as string);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTaskAction(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", formData.get("id") as string);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
}
