import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Wie hoort bij Mammut, en wie krijgt een nieuw ticket.
 *
 * Een ticket kan alleen aan het team worden toegewezen, niet aan een klant of
 * een contactpersoon: het is werk dat wij doen. Het onderscheid staat al in de
 * database als `profiles.role`, dezelfde kolom waar is_admin() op leunt, dus
 * daar leest dit uit. Voordeel boven een lijstje namen in de code: zodra
 * iemand een account met de rol admin krijgt staat die er vanzelf bij.
 */
export const TEAM_ROL = "admin";

/**
 * Wie een nieuw ticket standaard krijgt.
 *
 * Op naam en niet op id, zodat je in de database kunt rommelen zonder dat dit
 * bestand mee moet. Wordt het team groter en moet dit per persoon of per klant
 * verschillen, dan hoort het een instelling te worden in plaats van een
 * constante hier.
 */
export const STANDAARD_TOEGEWEZENE_EMAIL = "daniel@mammutstudios.com";

export type Teamlid = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

/** De teamleden, voor de keuzelijst bij Toegewezen aan. */
export async function teamProfielen(supabase: SupabaseClient): Promise<Teamlid[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("role", TEAM_ROL)
    .order("full_name");
  return (data ?? []) as Teamlid[];
}

/**
 * Het profiel-id waar een nieuw ticket standaard heen gaat.
 *
 * Null als dat account er niet is. Een ticket zonder toegewezene is
 * vervelender dan een ticket dat niet wordt aangemaakt, dus dit mag nooit een
 * fout opleveren: dan komt hij gewoon op niemand te staan.
 */
export async function standaardToegewezene(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", STANDAARD_TOEGEWEZENE_EMAIL)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
