"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logActiviteit } from "@/lib/activity";
import { DEAL_STATUS_LABEL, type DealStatus } from "@/lib/types";

/** Leeg veld wordt null, niet een lege string; dat scheelt overal checks. */
const tekst = (v: FormDataEntryValue | null) => {
  const t = (v as string | null)?.trim();
  return t ? t : null;
};

function velden(formData: FormData) {
  const bedrag = tekst(formData.get("value_amount"));
  return {
    title: tekst(formData.get("title")),
    source: tekst(formData.get("source")),
    client_id: tekst(formData.get("client_id")),
    contact_id: tekst(formData.get("contact_id")),
    status: (tekst(formData.get("status")) ?? "nieuw") as DealStatus,
    // Komma's zijn wat je typt, punten zijn wat een numeric wil.
    value_amount: bedrag ? Number(bedrag.replace(",", ".")) : null,
    notes: tekst(formData.get("notes")),
  };
}

const KLAAR: DealStatus[] = ["gewonnen", "verloren"];

export async function createDealAction(formData: FormData) {
  const v = velden(formData);
  if (!v.title) return { error: "Waar gaat het over? Vul een titel in" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .insert({ ...v, closed_at: KLAAR.includes(v.status) ? new Date().toISOString() : null })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logActiviteit({
    action: "deal.aangemaakt",
    entityType: "deal",
    entityId: (data as { id?: string } | null)?.id ?? null,
    entityLabel: v.title,
    meta: { bron: v.source },
  });

  revalidatePath("/dashboard/deals");
  // Het id gaat mee terug: het formulier hangt er meteen de bestanden aan die
  // je bij het invullen al had gekozen.
  return { success: true, id: (data as { id?: string } | null)?.id ?? null };
}

export async function updateDealAction(id: string, formData: FormData) {
  const v = velden(formData);
  if (!v.title) return { error: "Waar gaat het over? Vul een titel in" };

  const supabase = await createClient();

  // Eerst de oude status, anders valt achteraf niet te zien wát er wijzigde.
  const { data: vorige } = await supabase
    .from("deals")
    .select("status, closed_at")
    .eq("id", id)
    .maybeSingle();

  const oudeStatus = (vorige as { status?: DealStatus } | null)?.status;
  const wordtKlaar = KLAAR.includes(v.status);

  const { error } = await supabase
    .from("deals")
    .update({
      ...v,
      updated_at: new Date().toISOString(),
      // Alleen stempelen bij de overgang; anders schuift de datum op bij elke
      // wijziging aan een deal die al gesloten is.
      closed_at: wordtKlaar
        ? (vorige as { closed_at?: string } | null)?.closed_at ?? new Date().toISOString()
        : null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  if (oudeStatus && oudeStatus !== v.status) {
    await logActiviteit({
      action: "deal.status",
      entityType: "deal",
      entityId: id,
      entityLabel: v.title,
      meta: { van: DEAL_STATUS_LABEL[oudeStatus] ?? oudeStatus, naar: DEAL_STATUS_LABEL[v.status] },
    });
  }

  revalidatePath("/dashboard/deals");
  return { success: true };
}

export async function deleteDealAction(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return { error: "Geen deal opgegeven" };

  const supabase = await createClient();
  const { data: deal } = await supabase.from("deals").select("title").eq("id", id).maybeSingle();

  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) return { error: error.message };

  await logActiviteit({
    action: "deal.verwijderd",
    entityType: "deal",
    entityLabel: (deal as { title?: string } | null)?.title ?? null,
  });

  revalidatePath("/dashboard/deals");
  return { success: true };
}

/**
 * Een gewonnen deal wordt een project bij de gekoppelde organisatie.
 *
 * De organisatie hoort er al aan te hangen: die koppel je bij de deal zelf, en
 * bestaat hij nog niet dan maak je hem daar aan vanuit de keuzelijst. Hier nog
 * een organisatie maken zou een tweede versie van dezelfde klant opleveren.
 *
 * De contactpersoon en de bestanden gaan mee naar het project, zodat je niets
 * overtikt en de briefing staat waar het werk staat.
 *
 * converted_at is het stempel dat dit maar één keer gebeurt. client_id kan dat
 * niet zijn, want die is al vóór het omzetten gevuld.
 */
export async function convertDealAction(id: string) {
  const supabase = await createClient();

  const { data: deal, error: leesFout } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (leesFout) return { error: leesFout.message };
  if (!deal) return { error: "Deal niet gevonden" };
  if (deal.converted_at) return { error: "Deze deal is al omgezet" };

  // 1. De organisatie. Die hoort er al aan te hangen: je koppelt hem bij de
  //    deal zelf, en bestaat hij nog niet dan maak je hem daar aan.
  const clientId = deal.client_id as string | null;
  if (!clientId) return { error: "Koppel eerst een organisatie aan deze deal" };

  const { data: klant } = await supabase
    .from("clients")
    .select("name")
    .eq("id", clientId)
    .maybeSingle();
  const clientNaam = (klant as { name?: string } | null)?.name ?? null;

  // 2. Het project.
  const { data: project, error: projectFout } = await supabase
    .from("projects")
    .insert({
      title: deal.title,
      client_id: clientId,
      description: deal.notes,
      status: "upcoming",
      budget_amount: deal.value_amount,
    })
    .select("id")
    .single();

  if (projectFout) return { error: `Project aanmaken mislukt: ${projectFout.message}` };

  // 3. De contactpersoon, als die er is. Mislukt dit, dan is dat jammer maar
  //    geen reden om de omzetting terug te draaien: klant en project staan er.
  const contactId = (deal.contact_id as string | null) ?? null;
  if (contactId) {
    await supabase.from("contact_clients").upsert({ contact_id: contactId, client_id: clientId });
    await supabase.from("project_contacts").insert({ project_id: project.id, contact_id: contactId });
  }

  // 4. De bestanden verhuizen mee: een briefing hoort bij het werk, niet bij
  //    de aanvraag alleen. deal_id blijft staan als herkomst.
  const { error: bestandFout } = await supabase
    .from("files")
    .update({ project_id: project.id })
    .eq("deal_id", id);
  if (bestandFout) console.error("[deals] bestanden koppelen mislukt:", bestandFout);

  const nu = new Date().toISOString();
  const { error: koppelFout } = await supabase
    .from("deals")
    .update({
      client_id: clientId,
      contact_id: contactId,
      project_id: project.id,
      status: "gewonnen",
      closed_at: (deal.closed_at as string | null) ?? nu,
      converted_at: nu,
      updated_at: nu,
    })
    .eq("id", id);

  if (koppelFout) return { error: koppelFout.message };

  await logActiviteit({
    action: "deal.omgezet",
    entityType: "klant",
    entityId: clientId,
    entityLabel: clientNaam,
    clientId,
    meta: { deal: deal.title, project_id: project.id },
  });

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/projects");
  return { success: true, clientId };
}
