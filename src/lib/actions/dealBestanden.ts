"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { logActiviteit } from "@/lib/activity";

const BUCKET = "documents";

/**
 * Hierboven weigeren we het. Een briefing die groter is hoort in de cloud.
 *
 * Niet geëxporteerd, en dat is geen slordigheid: een bestand met "use server"
 * mag alleen async functies exporteren. Eén losse constante laat de hele module
 * vallen, en dat gaf een serverfout bij het opslaan van een deal.
 */
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Uploaden gaat niet via de server maar rechtstreeks van de browser naar de
 * opslag, met een link die hier wordt ondertekend.
 *
 * Anders zou elk bestand door de serverfunctie heen moeten, en die begrenst
 * Vercel op 4,5 MB. Een briefing van tien pagina's zit daar zo overheen.
 *
 * De server bepaalt wél wie mag en waar het terechtkomt: het pad wordt hier
 * bepaald, niet door de browser.
 */
export async function signDealUploadAction(
  dealId: string,
  bestandsnaam: string,
  bytes: number,
): Promise<{ path: string; token: string } | { error: string }> {
  if (!dealId) return { error: "Geen deal opgegeven" };
  if (bytes > MAX_BYTES) return { error: "Bestand is groter dan 25 MB" };

  // Leest met de sessie van de gebruiker: geeft de deal niets terug, dan mag
  // deze bezoeker er niet bij en houdt het hier op.
  const supabase = await createClient();
  const { data: deal } = await supabase.from("deals").select("id").eq("id", dealId).maybeSingle();
  if (!deal) return { error: "Deal niet gevonden" };

  // Een eigen naam in de opslag: twee bestanden die "briefing.pdf" heten
  // zouden elkaar anders overschrijven. De echte naam bewaren we in de tabel.
  const veilig = bestandsnaam.replace(/[^\w.\-]+/g, "-").slice(-80);
  const pad = `deals/${dealId}/${crypto.randomUUID()}-${veilig}`;

  const { data, error } = await createServiceClient()
    .storage.from(BUCKET)
    .createSignedUploadUrl(pad);

  if (error) return { error: `Uploadlink maken mislukt: ${error.message}` };
  return { path: data.path, token: data.token };
}

/** Pas ná een geslaagde upload: de rij die het bestand zichtbaar maakt. */
export async function registerDealFileAction(
  dealId: string,
  pad: string,
  naam: string,
  bytes: number,
  mimeType: string | null,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("files").insert({
    deal_id: dealId,
    name: naam,
    storage_path: pad,
    size_bytes: bytes,
    mime_type: mimeType,
    uploaded_by: user?.id ?? null,
  });

  if (error) return { error: error.message };

  await logActiviteit({
    action: "deal.bestand",
    entityType: "deal",
    entityId: dealId,
    entityLabel: naam,
  });

  revalidatePath(`/dashboard/deals/${dealId}`);
  return { success: true };
}

export async function deleteDealFileAction(fileId: string) {
  const supabase = await createClient();
  const { data: bestand } = await supabase
    .from("files")
    .select("id, name, storage_path, deal_id")
    .eq("id", fileId)
    .maybeSingle();

  if (!bestand) return { error: "Bestand niet gevonden" };

  const { error } = await supabase.from("files").delete().eq("id", fileId);
  if (error) return { error: error.message };

  // De rij is leidend: staat die er niet meer, dan is het bestand weg voor de
  // app. Lukt het opruimen in de opslag niet, dan blijft er hooguit een blob
  // achter en dat is geen reden om de verwijdering terug te draaien.
  const { error: opslagFout } = await createServiceClient()
    .storage.from(BUCKET)
    .remove([bestand.storage_path as string]);
  if (opslagFout) console.error("[deals] bestand uit opslag halen mislukt:", opslagFout);

  if (bestand.deal_id) revalidatePath(`/dashboard/deals/${bestand.deal_id}`);
  return { success: true };
}

/**
 * Een tijdelijke link om een bestand te bekijken.
 *
 * De bucket is privé, dus er bestaat geen vaste URL. Deze link verloopt na een
 * minuut: lang genoeg om hem te openen, kort genoeg om niet rond te slingeren.
 */
export async function dealFileUrlAction(
  fileId: string,
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data: bestand } = await supabase
    .from("files")
    .select("storage_path")
    .eq("id", fileId)
    .maybeSingle();

  if (!bestand) return { error: "Bestand niet gevonden" };

  const { data, error } = await createServiceClient()
    .storage.from(BUCKET)
    .createSignedUrl(bestand.storage_path as string, 60);

  if (error) return { error: error.message };
  return { url: data.signedUrl };
}
