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
  const phase = formData.get("phase") as string;
  const next_step = formData.get("next_step") as string;
  const client_action = formData.get("client_action") as string;
  const live_url = formData.get("live_url") as string;
  const staging_url = formData.get("staging_url") as string;
  const progress = formData.get("progress") as string;
  const budget_amount = formData.get("budget_amount") as string;

  if (!title?.trim()) return { error: "Naam is verplicht" };
  if (!client_id) return { error: "Organisatie is verplicht" };

  const supabase = await createClient();
  const { error } = await supabase.from("projects").insert({
    title: title.trim(),
    client_id,
    description: description?.trim() || null,
    status: status || "active",
    deadline: deadline || null,
    tags: tags.length > 0 ? tags : [],
    phase: phase || null,
    next_step: next_step?.trim() || null,
    client_action: client_action?.trim() || null,
    live_url: live_url?.trim() || null,
    staging_url: staging_url?.trim() || null,
    progress: progress === "" || progress == null ? null : Number(progress),
    budget_amount: budget_amount?.trim() ? Number(budget_amount) : null,
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
  const phase = formData.get("phase") as string;
  const next_step = formData.get("next_step") as string;
  const client_action = formData.get("client_action") as string;
  const live_url = formData.get("live_url") as string;
  const staging_url = formData.get("staging_url") as string;
  const progress = formData.get("progress") as string;
  const budget_amount = formData.get("budget_amount") as string;

  if (!title?.trim()) return { error: "Naam is verplicht" };

  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({
    title: title.trim(),
    client_id: client_id || undefined,
    description: description?.trim() || null,
    status: status || "active",
    deadline: deadline || null,
    tags: tags,
    phase: phase || null,
    next_step: next_step?.trim() || null,
    client_action: client_action?.trim() || null,
    live_url: live_url?.trim() || null,
    staging_url: staging_url?.trim() || null,
    progress: progress === "" || progress == null ? null : Number(progress),
    budget_amount: budget_amount?.trim() ? Number(budget_amount) : null,
  }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${id}`);
  revalidatePath("/dashboard");
  // De klant ziet dezelfde velden in het portaal.
  revalidatePath("/portal/projecten");
  revalidatePath(`/portal/projecten/${id}`);
  return { success: true };
}

export async function quickCreateProjectAction(title: string, client_id: string) {
  if (!title?.trim()) throw new Error("Naam is verplicht");
  if (!client_id) throw new Error("Organisatie is verplicht");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ title: title.trim(), client_id, status: "active" })
    .select("id, title, client_id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/projects");
  revalidatePath("/dashboard/finance/transactions");
  return data;
}

/**
 * Een factuur aan een project hangen, of er weer los van maken.
 *
 * Facturen blijven altijd aan een klant gekoppeld; dit is een extra verfijning
 * zodat een projectpagina zijn eigen facturen kan tonen. Moneybird kent geen
 * projecten, dus deze koppeling leggen we zelf.
 */
export async function linkInvoiceToProjectAction(invoiceId: string, projectId: string | null) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("moneybird_invoices")
    .update({ project_id: projectId })
    .eq("id", invoiceId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/projects");
  if (projectId) {
    revalidatePath(`/dashboard/projects/${projectId}`);
    revalidatePath(`/portal/projecten/${projectId}`);
  }
  return { success: true };
}

/** Een bericht bij een project plaatsen. */
export async function addProjectCommentAction(projectId: string, body: string) {
  const tekst = body.trim();
  if (!tekst) return { error: "Bericht is leeg" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const { error } = await supabase
    .from("project_comments")
    .insert({ project_id: projectId, profile_id: user.id, body: tekst });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath(`/portal/projecten/${projectId}`);
  return { success: true };
}

/** Je eigen bericht weghalen. De databasepolicy bewaakt dat "eigen". */
export async function deleteProjectCommentAction(commentId: string, projectId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_comments").delete().eq("id", commentId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/projects/${projectId}`);
  revalidatePath(`/portal/projecten/${projectId}`);
  return { success: true };
}
