import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Het activiteitenlog.
 *
 * Schrijven gaat met de service role, om twee redenen: er is geen
 * insert-policy (een log waar vanuit de browser in geschreven kan worden is
 * geen log), en sommige gebeurtenissen komen binnen zonder ingelogde
 * gebruiker, zoals de Moneybird-webhook.
 *
 * Loggen mag nooit een handeling laten mislukken. Gaat het schrijven fout, dan
 * belandt dat in de serverlog en gaat de rest gewoon door.
 */
export type ActivityAction =
  | "login"
  | "project.aangemaakt"
  | "project.bijgewerkt"
  | "project.status"
  | "taak.aangemaakt"
  | "taak.status"
  | "factuur.gekoppeld"
  | "factuur.ontkoppeld"
  | "klant.aangemaakt"
  | "klant.bijgewerkt"
  | "klant.verwijderd"
  | "uren.geschreven"
  | "preview.gestart"
  | "portaal.uitgenodigd"
  | "portaal.ingetrokken";

export type ActivityInvoer = {
  action: ActivityAction;
  entityType?: "project" | "taak" | "factuur" | "klant" | "uren" | "gebruiker";
  entityId?: string | null;
  /** De naam op dit moment; blijft leesbaar nadat het onderwerp is hernoemd. */
  entityLabel?: string | null;
  clientId?: string | null;
  meta?: Record<string, unknown> | null;
  /**
   * Wie het deed. Weglaten betekent: de ingelogde gebruiker van dit verzoek.
   * Expliciet null is voor wat zonder gebruiker gebeurt, zoals een webhook.
   */
  actorId?: string | null;
};

/** Het id van de ingelogde bezoeker, of null als er niemand is. */
async function huidigeActor(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    return (data?.claims?.sub as string | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function logActiviteit(invoer: ActivityInvoer): Promise<void> {
  try {
    const actor = invoer.actorId === undefined ? await huidigeActor() : invoer.actorId;

    await createServiceClient()
      .from("activities")
      .insert({
        actor_profile_id: actor,
        action: invoer.action,
        entity_type: invoer.entityType ?? null,
        entity_id: invoer.entityId ?? null,
        entity_label: invoer.entityLabel ?? null,
        client_id: invoer.clientId ?? null,
        meta: invoer.meta ?? null,
      });
  } catch (e) {
    console.error("[activity] wegschrijven mislukt:", e);
  }
}

/** Eén veld dat veranderde, zoals updateProjectAction het wegschrijft. */
export type Wijziging = { veld: string; van: string | null; naar: string | null };

/** De wijzigingen uit meta, of een lege lijst als er geen in staan. */
export function wijzigingenVan(a: Activity): Wijziging[] {
  const lijst = a.meta?.wijzigingen;
  if (!Array.isArray(lijst)) return [];
  return lijst.filter(
    (w): w is Wijziging =>
      typeof w === "object" && w !== null && typeof (w as Wijziging).veld === "string",
  );
}

/** "Status van Actief naar Review", of "Budget weggehaald". */
export function zinVoorWijziging(w: Wijziging): string {
  if (w.van && w.naar) return `${w.veld} van ${w.van} naar ${w.naar}`;
  if (w.naar) return `${w.veld} op ${w.naar}`;
  return `${w.veld} weggehaald`;
}

/** Eén regel zoals hij in de lijst komt te staan. */
export type Activity = {
  id: string;
  created_at: string;
  /**
   * Wie het deed. Staat los van `profiles`: is dit gevuld maar profiles leeg,
   * dan bestond de actor wél maar mocht de lezer zijn naam niet zien. Dan is
   * "Systeem" een leugen en hoort er "Onbekende gebruiker" te staan.
   */
  actor_profile_id: string | null;
  action: ActivityAction | string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  client_id: string | null;
  meta: Record<string, unknown> | null;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

/**
 * De zin die bij een regel hoort, zonder de naam van de actor ervoor.
 * "Daniel" + " maakte project X aan".
 */
export function beschrijf(a: Activity): string {
  const naam = a.entity_label ?? "";
  const meta = a.meta ?? {};
  const van = typeof meta.van === "string" ? meta.van : null;
  const naar = typeof meta.naar === "string" ? meta.naar : null;

  switch (a.action) {
    case "login":
      return "logde in";
    case "project.aangemaakt":
      return `maakte project ${naam} aan`;
    case "project.bijgewerkt": {
      const w = wijzigingenVan(a);
      // Eén wijziging past in de zin. Meer dan één zet de pagina eronder, want
      // een zin met vijf velden erin leest niemand.
      if (w.length === 1) {
        const e = w[0];
        if (e.van && e.naar) return `zette ${e.veld} van ${naam} van ${e.van} naar ${e.naar}`;
        if (e.naar) return `zette ${e.veld} van ${naam} op ${e.naar}`;
        return `haalde ${e.veld} weg bij ${naam}`;
      }
      if (w.length > 1) return `werkte ${w.length} velden bij op ${naam}`;
      return `werkte project ${naam} bij`;
    }
    case "project.status":
      return van && naar
        ? `zette ${naam} van ${van} naar ${naar}`
        : `wijzigde de status van ${naam}`;
    case "taak.aangemaakt":
      return `maakte ticket ${naam} aan`;
    case "taak.status":
      return naar ? `zette ticket ${naam} op ${naar}` : `wijzigde ticket ${naam}`;
    case "factuur.gekoppeld":
      return `koppelde factuur ${naam} aan ${typeof meta.project === "string" ? meta.project : "een project"}`;
    case "factuur.ontkoppeld":
      return `ontkoppelde factuur ${naam}`;
    case "klant.aangemaakt":
      return `voegde organisatie ${naam} toe`;
    case "klant.bijgewerkt":
      return `werkte organisatie ${naam} bij`;
    case "klant.verwijderd":
      return `verwijderde organisatie ${naam}`;
    case "uren.geschreven":
      return `schreef ${typeof meta.uren === "number" ? `${meta.uren} uur` : "uren"} op ${naam}`;
    case "preview.gestart":
      return `bekeek het portaal als ${naam}`;
    case "portaal.uitgenodigd":
      return `gaf ${naam} toegang tot het portaal`;
    case "portaal.ingetrokken":
      return `trok de portaaltoegang van ${naam} in`;
    default:
      return a.action;
  }
}

/** De naam van de actor, of wat er staat als die er niet is. */
export function actorNaam(a: Activity): string {
  if (a.profiles?.full_name) return a.profiles.full_name;
  // Wel een actor, geen naam: waarschijnlijk mag deze lezer dat profiel niet
  // zien. Nooit "Systeem" tonen, want dan lijkt het alsof niemand het deed.
  return a.actor_profile_id ? "Onbekende gebruiker" : "Systeem";
}

/** Waar je heen gaat als je op de regel klikt. Null = nergens heen. */
export function linkVoor(a: Activity): string | null {
  if (!a.entity_id) return null;
  switch (a.entity_type) {
    case "project":
      return `/dashboard/projects/${a.entity_id}`;
    case "klant":
      return `/dashboard/clients/${a.entity_id}`;
    case "taak":
      return "/dashboard/tasks";
    case "factuur":
      return "/dashboard/finance/facturen";
    default:
      return null;
  }
}
