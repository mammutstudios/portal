"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTimeEntryAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("time_entries").insert({
    task: formData.get("task") as string,
    hours: parseFloat(formData.get("hours") as string) || 0,
    project_id: (formData.get("project_id") as string) || null,
    date: (formData.get("date") as string) || new Date().toISOString().slice(0, 10),
    profile_id: (formData.get("profile_id") as string) || user?.id || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/toggl");
}

export async function updateTimeEntryAction(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  const { error } = await supabase.from("time_entries").update({
    task: formData.get("task") as string,
    hours: parseFloat(formData.get("hours") as string) || 0,
    project_id: (formData.get("project_id") as string) || null,
    date: (formData.get("date") as string) || null,
    profile_id: (formData.get("profile_id") as string) || null,
  }).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/toggl");
}

export async function deleteTimeEntryAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("time_entries").delete().eq("id", formData.get("id") as string);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/toggl");
}
