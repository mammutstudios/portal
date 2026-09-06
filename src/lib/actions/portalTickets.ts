"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import { logActiviteit } from "@/lib/activity";
import { TICKET_STATUS_NIEUW } from "@/lib/tickets";
import { standaardToegewezene } from "@/lib/team";
import { meldVerzoekIngediend, ticketVoorMelding } from "@/lib/slackMeldingen";

/**
 * Een klant dient vanuit het portaal een verzoek in. Dat wordt een ticket op
 * Open, dat jij op het bord aanneemt.
 *
 * Elke controle staat hier, niet alleen in RLS. Een serveractie is bereikbaar
 * met een gewone POST, dus zonder deze regels kan iemand die de aanroep
 * nabouwt een ticket op een andere organisatie zetten. En in development
 * draait createClient() met de service role: daar is RLS uit en is dit de
 * enige afscherming. Zie de waarschuwing boven in lib/portal.ts.
 */
export async function createPortalTicketAction(formData: FormData) {
  const { userId, clientIds, isPreview, activeClientId } = await getPortalContext();

  if (clientIds.length === 0) {
    throw new Error("Je account is nog niet aan een organisatie gekoppeld.");
  }

  // Een admin die meekijkt is niet de klant. Zou hij hier indienen, dan stond
  // zijn naam als indiener op een ticket van iemand anders.
  if (isPreview) {
    throw new Error("Je kijkt mee in de preview. Dien een ticket aan vanuit het dashboard.");
  }

  const title = ((formData.get("title") as string) ?? "").trim();
  if (!title) throw new Error("Geef je verzoek een titel.");

  const description = ((formData.get("description") as string) ?? "").trim() || null;

  // De organisatie komt uit de aanvraag als de klant er meerdere heeft, anders
  // uit de context. In beide gevallen moet hij in clientIds zitten.
  const gevraagdeClient = (formData.get("client_id") as string) || activeClientId || clientIds[0];
  if (!clientIds.includes(gevraagdeClient)) {
    throw new Error("Die organisatie staat niet op je account.");
  }

  const supabase = await createClient();

  // Een project mag erbij, maar alleen een project van diezelfde organisatie.
  const projectId = (formData.get("project_id") as string) || null;
  if (projectId) {
    const { data: project } = await supabase
      .from("projects")
      .select("client_id")
      .eq("id", projectId)
      .maybeSingle();
    if (!project || project.client_id !== gevraagdeClient) {
      throw new Error("Dat project hoort niet bij je organisatie.");
    }
  }

  // Prioriteit bepaalt de klant bewust niet: dat is jouw planning. Wel de
  // urgentie in eigen woorden, en die staat in de omschrijving.
  const { data: nieuw, error } = await supabase
    .from("tasks")
    .insert({
      title,
      description,
      client_id: gevraagdeClient,
      project_id: projectId,
      created_by: userId,
      status: TICKET_STATUS_NIEUW,
      priority: "medium",
      // Een verzoek dat op niemand staat blijft liggen tot iemand het bord
      // opent. Zelfde standaard als bij een ticket dat het team zelf aanmaakt.
      assigned_profile_id: await standaardToegewezene(supabase),
    })
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);

  // De melding komt na het loggen: een ticket dat er staat is belangrijker dan
  // een bericht dat aankomt, en stuurSlack gooit niet.
  const nieuwId = (nieuw?.id as string | undefined) ?? null;
  if (nieuwId) {
    const kop = await ticketVoorMelding(supabase, nieuwId);
    if (kop) await meldVerzoekIngediend(supabase, kop, userId, description);
  }

  await logActiviteit({
    action: "taak.ingediend",
    entityType: "taak",
    entityId: nieuwId,
    entityLabel: title,
    clientId: gevraagdeClient,
    meta: { project_id: projectId },
  });

  revalidatePath("/portal/tickets");
  revalidatePath("/portal/overzicht");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/dashboard");
}
