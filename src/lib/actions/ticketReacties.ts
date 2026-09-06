"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Reacties onder een ticket.
 *
 * Dezelfde opzet als addProjectCommentAction: schrijven gaat onder je eigen
 * naam, en de databasepolicy bewaakt dat je bij dit ticket mag. De controle
 * staat hier ook, want in development draait createClient() met de service
 * role en is row level security uit.
 */
export async function addTicketReactieAction(
  taskId: string,
  body: string,
  /** Profiel-ids die in de tekst met @ genoemd zijn. */
  mentions: string[] = [],
) {
  const tekst = body.trim();
  if (!tekst) return { error: "Bericht is leeg" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Niet ingelogd" };

  const { error } = await supabase
    .from("task_comments")
    // Elk id hoogstens één keer. Of de naam ook nog in de tekst staat weet de
    // browser (die kent de namen); hier houden we alleen de dubbele eruit.
    .insert({ task_id: taskId, profile_id: user.id, body: tekst, mentions: [...new Set(mentions)] });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/tasks/${taskId}`);
  revalidatePath("/portal/tickets");
  return { success: true };
}

/** Je eigen bericht weghalen. De databasepolicy bewaakt dat "eigen". */
export async function deleteTicketReactieAction(reactieId: string, taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("task_comments").delete().eq("id", reactieId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/tasks/${taskId}`);
  revalidatePath("/portal/tickets");
  return { success: true };
}
