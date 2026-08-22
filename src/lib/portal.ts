import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Wie kijkt er naar het portaal, en welke klanten mag diegene zien?
 *
 * Elke portaalpagina begint hiermee. Vertrouw nooit op RLS alleen: in
 * development draait createClient() met de service role, dus daar is
 * row level security uitgeschakeld en is dit de enige afscherming.
 */
export type PortalContext = {
  userId: string;
  fullName: string | null;
  isAdmin: boolean;
  isPreview: boolean;
  /** Klanten die deze bezoeker mag zien. Leeg = geen toegang tot iets. */
  clientIds: string[];
  activeClientId: string | null;
  activeClientName: string | null;
};

export const getPortalContext = cache(async function getPortalContext(): Promise<PortalContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  // Preview-cookies tellen alleen voor admins. Een klant kan ze zelf zetten
  // (het zijn gewone cookies), dus zonder deze check is preview een gat.
  const cookieStore = await cookies();
  const isPreview = isAdmin && cookieStore.get("admin_preview")?.value === "true";
  const previewClientId = isPreview
    ? cookieStore.get("preview_client_id")?.value ?? null
    : null;

  let clientIds: string[];
  if (isAdmin) {
    // Een admin zonder gekozen klant heeft niets te zoeken in het portaal.
    if (!previewClientId) redirect("/dashboard");
    clientIds = [previewClientId];
  } else {
    const { data: memberships } = await supabase
      .from("client_members")
      .select("client_id")
      .eq("profile_id", user.id);
    clientIds = memberships?.map((m) => m.client_id as string) ?? [];
  }

  const activeClientId =
    previewClientId ?? (clientIds.length === 1 ? clientIds[0] : null);

  let activeClientName: string | null = null;
  if (activeClientId) {
    const { data: client } = await supabase
      .from("clients")
      .select("name")
      .eq("id", activeClientId)
      .single();
    activeClientName = client?.name ?? null;
  }

  return {
    userId: user.id,
    fullName: profile?.full_name ?? null,
    isAdmin,
    isPreview,
    clientIds,
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
