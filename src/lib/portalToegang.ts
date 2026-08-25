import { createServiceClient } from "@/lib/supabase/service";

/**
 * Of een contactpersoon in het klantportaal kan.
 *
 * Contacten en portaalgebruikers zijn twee losse dingen: een contact staat in
 * `contacts`, een gebruiker in `auth.users` met een rij in `profiles`. Het
 * e-mailadres is wat ze aan elkaar knoopt, dus dat is hier de sleutel.
 *
 * Lezen gaat met de service role. De policy op `profiles` laat een admin
 * namelijk alleen zijn eigen rij en die van collega's zien, niet die van
 * klanten, en juist die willen we hier weten.
 */
export type PortaalToegang = {
  /** Er bestaat een gebruiker met dit e-mailadres. */
  heeftAccount: boolean;
  /** De organisaties die deze gebruiker mag zien. Leeg betekent geen toegang. */
  clientIds: string[];
};

export const GEEN_TOEGANG: PortaalToegang = { heeftAccount: false, clientIds: [] };

export async function portaalToegangVoor(email: string | null): Promise<PortaalToegang> {
  const adres = email?.trim().toLowerCase();
  if (!adres) return GEEN_TOEGANG;

  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("id")
    .ilike("email", adres)
    .maybeSingle();

  if (!profile) return GEEN_TOEGANG;

  const { data: leden } = await service
    .from("client_members")
    .select("client_id")
    .eq("user_id", profile.id);

  return {
    heeftAccount: true,
    clientIds: (leden ?? []).map((l) => l.client_id as string),
  };
}
