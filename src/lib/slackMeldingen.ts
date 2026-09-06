import type { SupabaseClient } from "@supabase/supabase-js";
import { appUrl, stuurSlack } from "@/lib/slack";

/**
 * Wat er vanuit Tickets naar Slack gaat.
 *
 * De opbouw van een bericht staat hier en niet in de serveracties zelf: die
 * gaan over wat er in de database gebeurt, en een melding is een gevolg.
 *
 * Geen enkele functie hier gooit. Een bericht dat niet aankomt mag de
 * handeling eronder niet laten mislukken; het ticket of de reactie staat er
 * dan al. stuurSlack logt de reden en geeft { sent: false } terug.
 */

/** Een tekstblok inkorten zodat een lange omschrijving het kanaal niet vult. */
function kort(tekst: string | null | undefined, max = 300): string | null {
  const schoon = (tekst ?? "").trim();
  if (!schoon) return null;
  return schoon.length > max ? `${schoon.slice(0, max - 1)}…` : schoon;
}

/** De naam van wie iets deed. Valt terug op "Iemand" als het profiel weg is. */
async function naamVan(supabase: SupabaseClient, profileId: string | null): Promise<string> {
  if (!profileId) return "Iemand";
  const { data } = await supabase.from("profiles").select("full_name").eq("id", profileId).maybeSingle();
  return (data?.full_name as string | null) ?? "Iemand";
}

type TicketKop = {
  id: string;
  title: string;
  clients?: { name: string | null } | null;
};

/** Een klant heeft vanuit het portaal een verzoek ingediend. */
export async function meldVerzoekIngediend(
  supabase: SupabaseClient,
  ticket: TicketKop,
  indienerId: string | null,
  omschrijving: string | null,
) {
  const indiener = await naamVan(supabase, indienerId);
  const organisatie = ticket.clients?.name ?? "een klant";
  const uitleg = kort(omschrijving);

  await stuurSlack({
    tekst: `Nieuw verzoek van ${organisatie}: ${ticket.title}`,
    kop: `Nieuw verzoek van ${organisatie}`,
    regels: [`*${ticket.title}*`, `Ingediend door ${indiener}`, ...(uitleg ? [uitleg] : [])],
    link: { label: "Open ticket", url: appUrl(`/dashboard/tasks/${ticket.id}`) },
  });
}

/** Het team heeft zelf een ticket aangemaakt, vanuit het dashboard. */
export async function meldTicketAangemaakt(
  supabase: SupabaseClient,
  ticket: TicketKop,
  doorId: string | null,
  omschrijving: string | null,
) {
  const door = await naamVan(supabase, doorId);
  const organisatie = ticket.clients?.name;
  const uitleg = kort(omschrijving);

  await stuurSlack({
    tekst: `Nieuw ticket: ${ticket.title}`,
    kop: `Nieuw ticket: ${ticket.title}`,
    regels: [
      ...(organisatie ? [`_${organisatie}_`] : []),
      `Aangemaakt door ${door}`,
      ...(uitleg ? [uitleg] : []),
    ],
    link: { label: "Open ticket", url: appUrl(`/dashboard/tasks/${ticket.id}`) },
  });
}

/**
 * Er is gereageerd op een ticket.
 *
 * Vermeldingen zitten in ditzelfde bericht en niet in een tweede: een reactie
 * waarin je genoemd wordt is één gebeurtenis, en twee meldingen erover zijn er
 * een te veel.
 */
export async function meldReactie(
  supabase: SupabaseClient,
  ticket: TicketKop,
  auteurId: string | null,
  body: string,
  mentions: string[],
) {
  const auteur = await naamVan(supabase, auteurId);

  let genoemd: string | null = null;
  if (mentions.length > 0) {
    const { data } = await supabase.from("profiles").select("full_name").in("id", mentions);
    const namen = (data ?? [])
      .map((p) => (p as { full_name: string | null }).full_name)
      .filter((n): n is string => Boolean(n));
    if (namen.length > 0) genoemd = `Genoemd: ${namen.join(", ")}`;
  }

  const organisatie = ticket.clients?.name;

  await stuurSlack({
    tekst: `${auteur} reageerde op ${ticket.title}`,
    kop: `${auteur} reageerde op ${ticket.title}`,
    regels: [
      ...(organisatie ? [`_${organisatie}_`] : []),
      kort(body) ?? "",
      ...(genoemd ? [genoemd] : []),
    ].filter(Boolean),
    link: { label: "Open ticket", url: appUrl(`/dashboard/tasks/${ticket.id}`) },
  });
}

/** Een ticket is op Klaar gezet. */
export async function meldTicketKlaar(
  supabase: SupabaseClient,
  ticket: TicketKop,
  doorId: string | null,
) {
  const door = await naamVan(supabase, doorId);
  const organisatie = ticket.clients?.name;

  await stuurSlack({
    tekst: `${ticket.title} staat op Klaar`,
    kop: `${ticket.title} staat op Klaar`,
    regels: [...(organisatie ? [`_${organisatie}_`] : []), `Afgerond door ${door}`],
    link: { label: "Open ticket", url: appUrl(`/dashboard/tasks/${ticket.id}`) },
  });
}

/**
 * De gegevens van een ticket die elk bericht nodig heeft.
 *
 * Los opgehaald in plaats van meegegeven vanuit de aanroeper: die heeft na een
 * update vaak alleen het id, en een naam die uit een formulier komt hoeft niet
 * te kloppen met wat er nu in de database staat.
 */
export async function ticketVoorMelding(
  supabase: SupabaseClient,
  taskId: string,
): Promise<TicketKop | null> {
  const { data } = await supabase
    .from("tasks")
    .select("id, title, clients:client_id(name)")
    .eq("id", taskId)
    .maybeSingle();
  return (data as unknown as TicketKop | null) ?? null;
}
