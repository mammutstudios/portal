"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSubtaskAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("subtasks").insert({
    task_id: formData.get("task_id") as string,
    title: formData.get("title") as string,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/tasks");
}

export async function toggleSubtaskAction(formData: FormData) {
  const supabase = await createClient();
  const completed = formData.get("completed") === "true";
  const { error } = await supabase.from("subtasks").update({ completed }).eq("id", formData.get("id") as string);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/tasks");
}

export async function deleteSubtaskAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("subtasks").delete().eq("id", formData.get("id") as string);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/tasks");
}
