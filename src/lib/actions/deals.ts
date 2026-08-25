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
 * Een gewonnen deal wordt een organisatie met een project eraan.
 *
 * Zo hoef je niets over te tikken en blijft zichtbaar waar een klant vandaan
 * kwam: de deal houdt zijn client_id en project_id. Een deal die al omgezet is
 * doet dit niet nog een keer, want dan stonden er twee organisaties.
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
  if (deal.client_id) return { error: "Deze deal is al omgezet" };

  const naam = (deal.company as string | null)?.trim() || (deal.title as string);

  const { data: klant, error: klantFout } = await supabase
    .from("clients")
    .insert({ name: naam, email: deal.email, tag: "client" })
    .select("id, name")
    .single();

  if (klantFout) return { error: `Organisatie aanmaken mislukt: ${klantFout.message}` };

  const { data: project, error: projectFout } = await supabase
    .from("projects")
    .insert({
      title: deal.title,
      client_id: klant.id,
      description: deal.notes,
      status: "upcoming",
      budget_amount: deal.value_amount,
    })
    .select("id")
    .single();

  if (projectFout) return { error: `Project aanmaken mislukt: ${projectFout.message}` };

  const { error: koppelFout } = await supabase
    .from("deals")
    .update({
      client_id: klant.id,
      project_id: project.id,
      status: "gewonnen",
      closed_at: (deal.closed_at as string | null) ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (koppelFout) return { error: koppelFout.message };

  await logActiviteit({
    action: "deal.omgezet",
    entityType: "klant",
    entityId: klant.id,
    entityLabel: klant.name,
    clientId: klant.id,
    meta: { deal: deal.title, project_id: project.id },
  });

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/projects");
  return { success: true, clientId: klant.id as string };
}
