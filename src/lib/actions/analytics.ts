"use server";

import { getPortalContext } from "@/lib/portal";
import { createClient } from "@/lib/supabase/server";
import { currentVisitors } from "@/lib/analytics/plausible";

/**
 * Aantal bezoekers dat nu op de site is. Controleert eerst of de aanvrager deze
 * site mag zien — een actie is een openbaar eindpunt, dus het domein uit de
 * browser vertrouwen zou betekenen dat iedereen elke site kan uitlezen.
 */
export async function currentVisitorsAction(siteId: string): Promise<number | null> {
  const { clientIds } = await getPortalContext();
  if (clientIds.length === 0) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("id")
    .in("id", clientIds)
    .eq("plausible_site_id", siteId)
    .maybeSingle();

  if (!data) return null;
  return currentVisitors(siteId);
}
