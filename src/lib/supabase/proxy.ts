import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * De poortwachter vóór elke render.
 *
 * Hier telt elke milliseconde: dit draait op élk verzoek en niets begint
 * voordat het klaar is. Twee dingen houden het licht:
 *
 * 1. getClaims() controleert het token ter plekke met de publieke sleutel van
 *    het project, dus zonder netwerkrondje naar de auth-server. Staat het
 *    project nog op een symmetrisch geheim (HS256), dan valt de bibliotheek
 *    zelf terug op getUser() en is het precies zo duur als voorheen. Zet in het
 *    Supabase-dashboard onder Auth → Signing Keys asymmetrische sleutels aan en
 *    dit rondje verdwijnt helemaal.
 *
 * 2. De rol wordt alleen opgezocht waar hij de uitkomst verandert. Dat was
 *    eerder een profiles-query bij ieder verzoek, ook op pagina's die er niets
 *    mee doen.
 */
export async function updateSession(request: NextRequest) {
  // Skip auth in local development
  if (process.env.NODE_ENV === "development") {
    const { pathname } = request.nextUrl;
    if (pathname === "/") return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname === "/login" || pathname.startsWith("/auth/")) {
    if (claims) {
      const role = await rolVan(supabase, claims);
      return NextResponse.redirect(
        new URL(role === "admin" ? "/dashboard" : "/portal", request.url),
      );
    }
    return supabaseResponse;
  }

  // Protected routes
  if (!claims) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect root to appropriate view
  if (pathname === "/") {
    const role = await rolVan(supabase, claims);
    return NextResponse.redirect(new URL(role === "admin" ? "/dashboard" : "/portal", request.url));
  }

  // Hier stond een rolcontrole voor /dashboard, en die kostte gemeten op
  // productie 52 tot 173 ms per verzoek: de hele proxytijd. Bij elke klik,
  // want navigatie in Next haalt de route opnieuw op. Lokaal merkte je er
  // niets van omdat de dev-bypass de proxy overslaat.
  //
  // De controle zelf is niet weg, hij staat in de layout van het dashboard,
  // die de rol uit dezelfde query haalt als de naam en dus niets extra kost.
  // Dat gebeurt terwijl de pagina al streamt, dus een klant die hier toch
  // belandt ziet de schil kort voordat hij naar het portaal gaat. De gegevens
  // erin zijn door RLS afgeschermd, dus dat is een omleiding en geen lek.
  //
  // Wil je de controle hier terug zonder de rekening: zet de rol als claim in
  // het token met een custom access token hook in Supabase. rolVan() leest die
  // hieronder al, en dan kost dit nul rondjes.

  return supabaseResponse;
}

/**
 * De rol van deze bezoeker.
 *
 * Staat hij in het token, dan kost dit niets. Een custom access token hook in
 * Supabase kan de rol als claim meesturen (of zet hem in app_metadata); zolang
 * dat niet is ingesteld vragen we het aan de database, zoals altijd.
 */
async function rolVan(
  supabase: SupabaseClient,
  claims: Record<string, unknown>,
): Promise<string | null> {
  const uitToken =
    (claims.user_role as string | undefined) ??
    ((claims.app_metadata as { role?: string } | undefined)?.role);
  if (uitToken) return uitToken;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub as string)
    .maybeSingle();

  return (profile?.role as string | null) ?? null;
}
