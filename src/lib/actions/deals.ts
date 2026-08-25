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
    company: tekst(formData.get("company")),
    contact_name: tekst(formData.get("contact_name")),
    email: tekst(formData.get("email")),
    phone: tekst(formData.get("phone")),
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
  return { success: true };
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
 * Een gewonnen deal wordt een project, en zo nodig ook een organisatie.
 *
 * Hoort de deal al bij een bestaande klant, dan komt er alleen een project bij;
 * een tweede organisatie aanmaken zou die klant verdubbelen. Anders wordt de
 * organisatie hier gemaakt.
 *
 * De contactpersoon gaat mee: een bestaande wordt gekoppeld, en van een nieuwe
 * naam maken we er een aan. Zo hoef je niets over te tikken.
 *
 * converted_at is het stempel dat dit maar één keer gebeurt. client_id kan dat
 * niet zijn, want die is bij een bestaande klant al vooraf gevuld.
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

  // 1. De organisatie: bestaand of nieuw.
  let clientId = deal.client_id as string | null;
  let clientNaam: string | null = null;

  if (clientId) {
    const { data: bestaand } = await supabase
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .maybeSingle();
    clientNaam = (bestaand as { name?: string } | null)?.name ?? null;
  } else {
    const naam = (deal.company as string | null)?.trim() || (deal.title as string);
    const { data: klant, error: klantFout } = await supabase
      .from("clients")
      .insert({ name: naam, email: deal.email, tag: "client" })
      .select("id, name")
      .single();

    if (klantFout) return { error: `Organisatie aanmaken mislukt: ${klantFout.message}` };
    clientId = klant.id as string;
    clientNaam = klant.name as string;
  }

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
  const contactId = await contactVoorDeal(supabase, deal);
  if (contactId) {
    await supabase.from("contact_clients").upsert({ contact_id: contactId, client_id: clientId });
    await supabase.from("project_contacts").insert({ project_id: project.id, contact_id: contactId });
  }

  const nu = new Date().toISOString();
  const { error: koppelFout } = await supabase
    .from("deals")
    .update({
      client_id: clientId,
      contact_id: contactId ?? deal.contact_id,
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
    meta: { deal: deal.title, project_id: project.id, bestaandeKlant: Boolean(deal.client_id) },
  });

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/projects");
  return { success: true, clientId };
}

/**
 * De contactpersoon bij een deal: de aangewezen bestaande, of een nieuwe uit de
 * losse velden. Zonder naam valt er niets te maken.
 */
async function contactVoorDeal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  deal: Record<string, unknown>,
): Promise<string | null> {
  if (deal.contact_id) return deal.contact_id as string;

  const naam = (deal.contact_name as string | null)?.trim();
  if (!naam) return null;

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      name: naam,
      email: deal.email ?? null,
      phone: deal.phone ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[deals] contactpersoon aanmaken mislukt:", error);
    return null;
  }
  return data.id as string;
}
