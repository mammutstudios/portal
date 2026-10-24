"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActiviteit } from "@/lib/activity";

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

  const projectId = (formData.get("project_id") as string) || null;
  let projectTitel: string | null = null;
  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("title")
      .eq("id", projectId)
      .maybeSingle();
    projectTitel = (project as { title?: string } | null)?.title ?? null;
  }

  await logActiviteit({
    action: "uren.geschreven",
    entityType: "project",
    entityId: projectId,
    entityLabel: projectTitel ?? (formData.get("task") as string) ?? null,
    meta: { uren: parseFloat(formData.get("hours") as string) || 0 },
  });

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

/**
 * De dag waarop een tijdstip valt, in Amsterdam.
 *
 * date blijft naast start_at bestaan, want de lijst, de totalen en de
 * projectpagina leunen erop. Welke dag een tijdstip is hangt af van de
 * tijdzone, dus dat rekenen we hier uit en niet in de database: voor Postgres
 * is die omrekening geen onveranderlijke functie en kan het dus geen
 * gegenereerde kolom zijn.
 */
function dagIn(tijdstip: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tijdstip);
}

export type UrenBlok = {
  id?: string;
  /** De omschrijving die je typt, niet de task. */
  task: string;
  task_id: string | null;
  project_id: string | null;
  profile_id: string | null;
  /** ISO-tijdstip van het begin; het einde is dit plus hours. */
  start_at: string;
  hours: number;
};

/**
 * Een blok op het weekrooster bewaren: nieuw als er geen id bij zit, anders
 * bijwerken. Eén actie voor allebei, want slepen, uitrekken en het formulier
 * schrijven precies dezelfde velden.
 */
export async function zetUrenBlokAction(blok: UrenBlok): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const begin = new Date(blok.start_at);
  if (Number.isNaN(begin.getTime())) throw new Error("Ongeldige begintijd");

  const rij = {
    task: blok.task,
    task_id: blok.task_id,
    hours: Math.max(0.25, Math.round(blok.hours * 100) / 100),
    project_id: blok.project_id,
    profile_id: blok.profile_id || user?.id || null,
    start_at: begin.toISOString(),
    date: dagIn(begin),
  };

  let id = blok.id;

  if (blok.id) {
    const { error } = await supabase.from("time_entries").update(rij).eq("id", blok.id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from("time_entries").insert(rij).select("id").single();
    if (error) throw new Error(error.message);
    id = (data as { id: string }).id;

    // Alleen bij een nieuwe regel in het log: anders staat er na een middag
    // schuiven een rij meldingen die niets toevoegt.
    let projectTitel: string | null = null;
    if (blok.project_id) {
      const { data: project } = await supabase
        .from("projects")
        .select("title")
        .eq("id", blok.project_id)
        .maybeSingle();
      projectTitel = (project as { title?: string } | null)?.title ?? null;
    }
    await logActiviteit({
      action: "uren.geschreven",
      entityType: "project",
      entityId: blok.project_id,
      entityLabel: projectTitel ?? blok.task ?? null,
      meta: { uren: rij.hours },
    });
  }

  revalidatePath("/dashboard/toggl");
  return id!;
}

/**
 * Uren op een task schrijven zonder tijdstip.
 *
 * Vanuit de tasklijst weet je wel hoeveel uur er heen ging, maar niet wanneer
 * precies, en daar ga je in zo'n regel ook niet over nadenken. De regel komt
 * daarom op de dag van vandaag te staan zonder begintijd: in het weekrooster
 * verschijnt hij boven die dag, en daar sleep je hem op zijn plek als het je
 * wat kan schelen.
 *
 * Het project komt van de task mee, zodat de uren ook op de projectpagina
 * meetellen zonder dat je het apart hoeft te kiezen.
 */
export async function urenOpTaskAction(taskId: string, uren: number): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: taak } = await supabase
    .from("tasks")
    .select("title, project_id")
    .eq("id", taskId)
    .maybeSingle();

  if (!taak) throw new Error("Die task bestaat niet meer.");

  const rij = {
    task: (taak as { title: string }).title,
    task_id: taskId,
    project_id: (taak as { project_id: string | null }).project_id,
    profile_id: user?.id ?? null,
    hours: Math.max(0.25, Math.round(uren * 100) / 100),
    date: dagIn(new Date()),
    start_at: null,
  };

  const { error } = await supabase.from("time_entries").insert(rij);
  if (error) throw new Error(error.message);

  await logActiviteit({
    action: "uren.geschreven",
    entityType: "taak",
    entityId: taskId,
    entityLabel: rij.task,
    meta: { uren: rij.hours },
  });

  revalidatePath("/dashboard/toggl");
  revalidatePath("/dashboard/tasks");
}

