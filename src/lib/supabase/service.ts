import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase-client met de service role, zonder cookies of ingelogde gebruiker.
 * Bedoeld voor achtergrondwerk zoals de Moneybird-webhook, die niet namens
 * een gebruiker binnenkomt. Nooit vanuit de browser gebruiken.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt");
  }
  return createSupabaseClient(url, key, { auth: { persistSession: false } });
}
