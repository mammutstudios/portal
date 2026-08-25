import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { meet } from "@/lib/timing";

/**
 * Wie kijkt er naar het portaal, en welke klanten mag diegene zien?
 *
 * Elke portaalpagina begint hiermee. Vertrouw nooit op RLS alleen: in
 * development draait createClient() met de service role, dus daar is
 * row level security uitgeschakeld en is dit de enige afscherming.
 *
 * Snelheid telt hier zwaar: dit draait vóór alles wat een pagina zelf wil
 * weten, dus elk rondje dat hier op een vorige wacht komt bij álles bovenop.
 * Vandaar dat de vragen hieronder in één ronde gaan en niet achter elkaar.
 */
export type PortalClient = {
  id: string;
  name: string | null;
  slug: string | null;
  plausible_site_id: string | null;
};

export type PortalContext = {
  userId: string;
  fullName: string | null;
  isAdmin: boolean;
  isPreview: boolean;
  /** Klanten die deze bezoeker mag zien. Leeg = geen toegang tot iets. */
  clientIds: string[];
  /**
   * Diezelfde klanten, met de velden die de schil en het overzicht nodig
   * hebben. Zat hier eerder niet in, waardoor layout en pagina's er allebei
   * nog een eigen query naar clients achteraan deden.
   */
  clients: PortalClient[];
  activeClientId: string | null;
  activeClientName: string | null;
};

/**
 * Het id van de ingelogde bezoeker.
 *
 * getClaims() controleert het token het liefst ter plekke met de publieke
 * sleutel van het project: geen netwerkrondje naar de auth-server, en dat
 * scheelt op elk verzoek. Staat het project nog op een symmetrisch geheim,
 * dan valt de bibliotheek zelf terug op een vraag aan de server, dus dit is
 * nooit trager dan getUser() en zodra je asymmetrische sleutels aanzet
 * (Supabase-dashboard, Auth → Signing Keys) meteen sneller.
 */
async function getUserId(supabase: SupabaseClient): Promise<string | null> {
  const { data, error } = await meet("context.getClaims", () => supabase.auth.getClaims());
  if (!error && data?.claims?.sub) return data.claims.sub;
  if (error) {
    // Alleen bij een echt probleem terugvallen; geen sessie is geen fout.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  }
  return null;
}

/** Supabase geeft een gekoppelde rij als object, of als array bij twijfel. */
function eerste<T>(waarde: T | T[] | null | undefined): T | null {
  if (Array.isArray(waarde)) return waarde[0] ?? null;
  return waarde ?? null;
}

export const getPortalContext = cache(async function getPortalContext(): Promise<PortalContext> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);

  if (!userId) redirect("/login");

  // Preview-cookies tellen alleen voor admins. Een klant kan ze zelf zetten
  // (het zijn gewone cookies), dus zonder de is-admin-check hieronder is
  // preview een gat. We lezen ze wel alvast, zodat de bijbehorende query in
  // dezelfde ronde mee kan; wat een niet-admin ermee ophaalt gooien we weg,
  // en RLS laat hem er sowieso niet bij.
  const cookieStore = await cookies();
  const previewGevraagd = cookieStore.get("admin_preview")?.value === "true";
  const previewClientId = previewGevraagd
    ? cookieStore.get("preview_client_id")?.value ?? null
    : null;

  const KLANTVELDEN = "id, name, slug, plausible_site_id";

  // Eén ronde in plaats van drie. De koppeling naar clients zit in dezelfde
  // vraag als het lidmaatschap, want de kolom heet user_id, niet profile_id:
  // met de verkeerde naam faalt de query stil en houdt elke klant een leeg
  // portaal over.
  const [profielAntwoord, ledenAntwoord, previewAntwoord] = await meet("context.queries", () => Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", userId).maybeSingle(),
    supabase
      .from("client_members")
      .select(`client_id, clients(${KLANTVELDEN})`)
      .eq("user_id", userId),
    previewClientId
      ? supabase.from("clients").select(KLANTVELDEN).eq("id", previewClientId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]));

  const profile = profielAntwoord.data as { full_name: string | null; role: string | null } | null;
  const isAdmin = profile?.role === "admin";
  const isPreview = isAdmin && previewGevraagd;

  let clients: PortalClient[];
  if (isAdmin) {
    // Een admin zonder gekozen klant heeft niets te zoeken in het portaal.
    if (!previewClientId) redirect("/dashboard");
    // Net als hieronder is het id uit de cookie leidend. Komt de rij niet mee,
    // dan mist alleen de naam in de schil; de preview zelf blijft werken.
    const klant = previewAntwoord.data as PortalClient | null;
    clients = [
      {
        id: previewClientId,
        name: klant?.name ?? null,
        slug: klant?.slug ?? null,
        plausible_site_id: klant?.plausible_site_id ?? null,
      },
    ];
  } else {
    const rijen = (ledenAntwoord.data ?? []) as {
      client_id: string;
      clients: PortalClient | PortalClient[] | null;
    }[];
    // client_id is leidend, niet de gekoppelde rij: zou de join om wat voor
    // reden dan ook niets teruggeven, dan raakt deze bezoeker zijn toegang
    // kwijt in plaats van alleen de naam in de schil.
    clients = rijen.map((r) => {
      const klant = eerste(r.clients);
      return {
        id: r.client_id,
        name: klant?.name ?? null,
        slug: klant?.slug ?? null,
        plausible_site_id: klant?.plausible_site_id ?? null,
      };
    });
  }

  const clientIds = clients.map((c) => c.id);
  const activeClientId =
    (isAdmin ? previewClientId : null) ?? (clientIds.length === 1 ? clientIds[0] : null);
  const activeClientName = clients.find((c) => c.id === activeClientId)?.name ?? null;

  return {
    userId,
    fullName: profile?.full_name ?? null,
    isAdmin,
    isPreview,
    clientIds,
    clients,
    activeClientId,
    activeClientName,
  };
});

/** Project-ids van de klanten die deze bezoeker mag zien. */
export async function getPortalProjectIds(clientIds: string[]): Promise<string[]> {
  if (clientIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id")
    .in("client_id", clientIds);
  return data?.map((p) => p.id as string) ?? [];
}

export const euro = (n: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(n);

export const shortDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" }) : "—";
