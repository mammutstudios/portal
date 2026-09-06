"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActiviteit } from "@/lib/activity";
import { TICKET_STATUS_LABEL } from "@/lib/tickets";
import { standaardToegewezene } from "@/lib/team";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * De organisatie die bij een project hoort.
 *
 * Een ticket bewaart die voortaan zelf, want een verzoek uit het portaal hoeft
 * geen project te hebben en zou anders bij niemand horen. Voor werk dat het
 * team aanmaakt leiden we hem hier af, zodat je hem niet apart hoeft te kiezen.
 */
async function clientVanProject(
  supabase: SupabaseClient,
  projectId: string | null,
): Promise<string | null> {
  if (!projectId) return null;
  const { data } = await supabase.from("projects").select("client_id").eq("id", projectId).maybeSingle();
  return (data?.client_id as string | null) ?? null;
}

/** Wie is er ingelogd? Belandt in created_by, de indiener van het ticket. */
async function huidigeGebruiker(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

export async function createTaskAction(formData: FormData) {
  const supabase = await createClient();

  const projectId = (formData.get("project_id") as string) || null;

  // De klant komt uit het formulier als die er zelf om vraagt (het
  // aanmaakscherm doet dat), en anders uit het project. Zonder die eerste weg
  // zou een ticket zonder project bij niemand horen.
  const gekozenClient = (formData.get("client_id") as string) || null;

  const { error } = await supabase.from("tasks").insert({
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || null,
    project_id: projectId,
    client_id: gekozenClient ?? (await clientVanProject(supabase, projectId)),
    created_by: await huidigeGebruiker(supabase),
    status: (formData.get("status") as string) || "open",
    priority: (formData.get("priority") as string) || "medium",
    due_date: (formData.get("due_date") as string) || null,
    assigned_contact_id: (formData.get("assigned_contact_id") as string) || null,
    // Niemand kiezen betekent niet: laat maar liggen. Een ticket zonder
    // eigenaar valt tussen wal en schip, dus komt hij standaard op Daniel te
    // staan en verdeel je hem daarna op het bord.
    assigned_profile_id:
      (formData.get("assigned_profile_id") as string) || (await standaardToegewezene(supabase)),
  });

  if (error) throw new Error(error.message);

  await logActiviteit({
    action: "taak.aangemaakt",
    entityType: "taak",
    entityLabel: (formData.get("title") as string)?.trim() || null,
    meta: { project_id: (formData.get("project_id") as string) || null },
  });

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
  const projectId = (formData.get("project_id") as string) || null;

  const { error } = await supabase.from("tasks").update({
    title: formData.get("title") as string,
    completed_at: await completedAtFor(supabase, id, status),
    description: (formData.get("description") as string) || null,
    project_id: projectId,
    // Verhuist een ticket naar een ander project, dan verhuist de organisatie
    // mee. Bij een verzoek zonder project blijft de oude staan: die is daar
    // niet uit het project afgeleid maar door de indiener bepaald.
    ...(projectId ? { client_id: await clientVanProject(supabase, projectId) } : {}),
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

  if (!error) {
    const { data: taak } = await supabase.from("tasks").select("title").eq("id", id).maybeSingle();
    await logActiviteit({
      action: "taak.status",
      entityType: "taak",
      entityId: id,
      entityLabel: (taak as { title?: string } | null)?.title ?? null,
      meta: { naar: TICKET_STATUS_LABEL[status as keyof typeof TICKET_STATUS_LABEL] ?? status },
    });
  }

  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
}

/**
 * Eén veld van een ticket wijzigen, vanaf de ticketpagina.
 *
 * updateTaskAction schrijft álles wat ze binnenkrijgt, dus die is voor een
 * formulier met alle velden erin. Voor het inline aanpassen van één regel zou
 * dat betekenen dat je de rest moet meesturen, en wat je vergeet raak je kwijt.
 *
 * De lijst hieronder is een witte lijst en geen filter op wat er binnenkomt:
 * een serveractie is met een gewone POST te bereiken, dus zonder deze grens
 * kan iemand elke kolom van de tabel schrijven.
 */
const AANPASBARE_VELDEN = [
  "title",
  "description",
  "client_id",
  "project_id",
  "assigned_profile_id",
  "assigned_contact_id",
  "due_date",
  "priority",
  "status",
] as const;

type AanpasbaarVeld = (typeof AANPASBARE_VELDEN)[number];

export async function updateTaskVeldAction(formData: FormData) {
  const id = formData.get("id") as string;
  const veld = formData.get("veld") as string;
  const ruw = (formData.get("waarde") as string) ?? "";
  const waarde = ruw === "" ? null : ruw;

  if (!id) throw new Error("Geen ticket opgegeven.");
  if (!AANPASBARE_VELDEN.includes(veld as AanpasbaarVeld)) {
    throw new Error(`Dat veld kun je hier niet wijzigen: ${veld}`);
  }

  // Een ticket zonder titel is in geen enkele lijst terug te vinden.
  if (veld === "title" && !waarde) throw new Error("Een ticket heeft een titel nodig.");

  const supabase = await createClient();

  const wijziging: Record<string, unknown> = { [veld]: waarde };

  // Twee velden slepen iets mee. De status stempelt het moment van afronden,
  // en toewijzen kan maar aan één kant tegelijk: een teamlid óf een
  // contactpersoon, nooit allebei.
  if (veld === "status") {
    wijziging.completed_at = await completedAtFor(supabase, id, ruw);
  }
  if (veld === "assigned_profile_id" && waarde) wijziging.assigned_contact_id = null;
  if (veld === "assigned_contact_id" && waarde) wijziging.assigned_profile_id = null;

  const { error } = await supabase.from("tasks").update(wijziging).eq("id", id);
  if (error) throw new Error(error.message);

  if (veld === "status") {
    const { data: taak } = await supabase.from("tasks").select("title").eq("id", id).maybeSingle();
    await logActiviteit({
      action: "taak.status",
      entityType: "taak",
      entityId: id,
      entityLabel: (taak as { title?: string } | null)?.title ?? null,
      meta: { naar: TICKET_STATUS_LABEL[ruw as keyof typeof TICKET_STATUS_LABEL] ?? ruw },
    });
  }

  revalidatePath(`/dashboard/tasks/${id}`);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTaskAction(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", formData.get("id") as string);
  if (error) console.error("deleteTask error:", error);
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
  // Deze knop staat op de ticketpagina zelf. Blijven staan kan niet: het
  // ticket is er niet meer en de pagina zou op een 404 uitkomen.
  redirect("/dashboard/tasks");
}
