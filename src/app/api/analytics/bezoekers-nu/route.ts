import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { currentVisitors } from "@/lib/analytics/plausible";

/**
 * Het aantal bezoekers dat nu op een site is.
 *
 * Dit was een server action, en dat is precies verkeerd voor iets wat elke
 * dertig seconden opnieuw gevraagd wordt: een action is een POST naar de
 * huidige route, en Next hangt daar een volledige her-render van de pagina
 * aan vast. Elke tik kostte zo alle queries van het hele scherm, en omdat
 * Next actions serialiseert met navigatie wachtte een klik die er net in viel.
 * Een route handler geeft alleen dit getal terug en laat de pagina staan.
 *
 * De toegangscheck blijft: dit is een openbaar eindpunt, dus het domein uit de
 * browser vertrouwen zou betekenen dat iedereen elke site kan uitlezen.
 */
export async function GET(request: Request) {
  const site = new URL(request.url).searchParams.get("site");
  if (!site) return NextResponse.json({ bezoekers: null }, { status: 400 });

  const supabase = await createClient();
  const { data: claimData } = await supabase.auth.getClaims();
  const userId = claimData?.claims?.sub;
  if (!userId) return NextResponse.json({ bezoekers: null }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  // Een admin ziet alle sites. Anders moet de site aan een klant hangen waar
  // deze bezoeker aan gekoppeld is; !inner zorgt dat de voorwaarde op clients
  // de rijen echt filtert in plaats van alleen de koppeling leeg te laten.
  let toegestaan = profile?.role === "admin";
  if (!toegestaan) {
    const { data: koppeling } = await supabase
      .from("client_members")
      .select("client_id, clients!inner(plausible_site_id)")
      .eq("user_id", userId)
      .eq("clients.plausible_site_id", site)
      .limit(1)
      .maybeSingle();
    toegestaan = Boolean(koppeling);
  }
  if (!toegestaan) return NextResponse.json({ bezoekers: null }, { status: 403 });

  return NextResponse.json(
    { bezoekers: await currentVisitors(site) },
    // Dit getal staat op het scherm als "nu"; cachen heeft hier geen zin.
    { headers: { "cache-control": "no-store" } },
  );
}
