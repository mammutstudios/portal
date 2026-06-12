import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const realClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  // In dev mode: use service role (or anon) client with dev user bypass
  if (process.env.NODE_ENV === "development" && process.env.DEV_USER_ID) {
    const client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    // Monkey-patch getUser to return the dev user
    const devUserId = process.env.DEV_USER_ID;
    const origAuth = client.auth;
    (client as any).auth = new Proxy(origAuth, {
      get(target, prop) {
        if (prop === "getUser") {
          return async () => ({ data: { user: { id: devUserId, email: "dev@local" } as any }, error: null });
        }
        return (target as any)[prop];
      },
    });
    return client as unknown as typeof realClient;
  }

  return realClient;
}
