import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // api/moneybird/webhook staat er bewust buiten: die wordt door Moneybird
    // aangeroepen en heeft geen sessie. Ging hij door de proxy, dan kreeg
    // Moneybird een omleiding naar /login in plaats van een antwoord. De route
    // bewaakt zichzelf met de handtekening.
    "/((?!api/moneybird/webhook|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
