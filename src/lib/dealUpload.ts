import { createClient } from "@/lib/supabase/client";
import { signDealUploadAction, registerDealFileAction } from "@/lib/actions/dealBestanden";

/**
 * Eén bestand bij een deal zetten, vanuit de browser.
 *
 * Gedeeld door het nieuwe-dealformulier en het bestandenblok op de dealpagina,
 * zodat die twee niet uit elkaar lopen. De bytes gaan rechtstreeks naar de
 * opslag: door de serverfunctie heen zou het stuklopen op de 4,5 MB die Vercel
 * per verzoek toestaat.
 *
 * Geeft een foutmelding terug, of null als het gelukt is.
 */
export async function uploadDealBestand(dealId: string, bestand: File): Promise<string | null> {
  const link = await signDealUploadAction(dealId, bestand.name, bestand.size);
  if ("error" in link) return link.error;

  const { error } = await createClient()
    .storage.from("documents")
    .uploadToSignedUrl(link.path, link.token, bestand);

  if (error) return "uploaden mislukt";

  const rij = await registerDealFileAction(
    dealId,
    link.path,
    bestand.name,
    bestand.size,
    bestand.type || null,
  );
  return rij?.error ?? null;
}

/** Leesbare bestandsgrootte; lege waarde blijft leeg. */
export const bestandsgrootte = (bytes: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`.replace(".", ",");
};
