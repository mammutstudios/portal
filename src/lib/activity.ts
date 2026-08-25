import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getPortalContext } from "@/lib/portal";

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
  | "portaal.ingetrokken"
  | "portaal.bekeken";

export type ActivityInvoer = {
  action: ActivityAction;
  entityType?: "project" | "taak" | "factuur" | "klant" | "uren" | "gebruiker" | "pagina";
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

/**
 * Redirect en notFound van Next werken via een worp. Een catch die alles
 * opslikt zou die stilzetten, en dan blijft een bezoeker staan waar hij niet
 * hoort. Deze gaan er dus altijd weer uit.
 */
function isBesturing(e: unknown): boolean {
  const digest = (e as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND");
}

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
    if (isBesturing(e)) throw e;
    console.error("[activity] wegschrijven mislukt:", e);
  }
}

/**
 * Hoe lang eenzelfde pagina van dezelfde bezoeker als één bezoek telt.
 *
 * Zonder dit vult het log zich met een regel per klik en verdwijnt al het
 * andere eronder. Een half uur is lang genoeg om heen en weer klikken samen te
 * nemen, en kort genoeg om een bezoek later op de dag apart te zien.
 */
const BEZOEK_VENSTER_MINUTEN = 30;

/**
 * Legt vast dat een klant een portaalpagina bekeek.
 *
 * Alleen echte klanten: wat jij in de preview bekijkt is jouw eigen klikwerk en
 * zegt niets over wat de klant doet. Dat staat al als "bekeek het portaal als".
 */
export async function logPaginabezoek(
  pagina: string,
  /** Waar de regel heen linkt. Zonder dit is het een gewone portaalpagina. */
  onderwerp?: { type: "project"; id: string },
): Promise<void> {
  try {
    const { userId, isAdmin } = await getPortalContext();
    if (isAdmin) return;

    const service = createServiceClient();
    const sinds = new Date(Date.now() - BEZOEK_VENSTER_MINUTEN * 60_000).toISOString();

    // Zag deze bezoeker dezelfde pagina net al? Dan is dit hetzelfde bezoek.
    const { data: recent } = await service
      .from("activities")
      .select("id")
      .eq("actor_profile_id", userId)
      .eq("action", "portaal.bekeken")
      .eq("entity_label", pagina)
      .gte("created_at", sinds)
      .limit(1);

    if (recent && recent.length > 0) return;

    await service.from("activities").insert({
      actor_profile_id: userId,
      action: "portaal.bekeken",
      entity_type: onderwerp?.type ?? "pagina",
      entity_id: onderwerp?.id ?? null,
      entity_label: pagina,
    });
  } catch (e) {
    if (isBesturing(e)) throw e;
    console.error("[activity] paginabezoek vastleggen mislukt:", e);
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
    case "portaal.bekeken":
      return `bekeek ${naam}`;
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

/**
 * Opeenvolgende paginabezoeken van dezelfde persoon zijn één rondgang.
 *
 * Vijf losse regels voor iemand die even rondklikt duwt al het andere uit
 * beeld. De regels blijven apart in de database staan, want daar is de
 * fijnmazigheid iets waard; alleen het lezen wordt samengevouwen.
 */
const RONDGANG_MINUTEN = 30;

export type Groep =
  | { soort: "enkel"; activiteit: Activity }
  | { soort: "rondgang"; regels: Activity[] };

export function groepeer(regels: Activity[]): Groep[] {
  const uit: Groep[] = [];

  for (let i = 0; i < regels.length; i++) {
    const eerste = regels[i];
    if (eerste.action !== "portaal.bekeken") {
      uit.push({ soort: "enkel", activiteit: eerste });
      continue;
    }

    // De lijst is nieuwste eerst, dus we lopen terug in de tijd.
    const rondgang = [eerste];
    while (i + 1 < regels.length) {
      const volgende = regels[i + 1];
      const vorige = rondgang[rondgang.length - 1];
      const gat =
        (new Date(vorige.created_at).getTime() - new Date(volgende.created_at).getTime()) / 60_000;
      if (
        volgende.action !== "portaal.bekeken" ||
        volgende.actor_profile_id !== eerste.actor_profile_id ||
        gat > RONDGANG_MINUTEN
      ) {
        break;
      }
      rondgang.push(volgende);
      i++;
    }

    uit.push(
      rondgang.length === 1
        ? { soort: "enkel", activiteit: eerste }
        : { soort: "rondgang", regels: rondgang },
    );
  }

  return uit;
}

/** "Overzicht, Projecten en Facturen", in de volgorde van bezoeken. */
export function paginasZin(rondgang: Activity[]): string {
  const namen = [...rondgang].reverse().map((r) => r.entity_label ?? "een pagina");
  if (namen.length === 1) return namen[0];
  return `${namen.slice(0, -1).join(", ")} en ${namen[namen.length - 1]}`;
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
