import type { SupabaseClient } from "@supabase/supabase-js";
import { isEnabled, type NotificationKey, type NotificationPrefs } from "@/lib/notifications";

/**
 * Wie krijgt bericht over iets dat bij deze klant hoort?
 *
 * Twee groepen, bewust verschillend behandeld:
 * - portaalgebruikers hebben een account en dus een eigen voorkeur; die telt
 * - contactpersonen uit het CRM hebben die niet en krijgen de vaste set
 */
export async function recipientsForClient(
  supabase: SupabaseClient,
  clientId: string | null,
  type: NotificationKey,
): Promise<string[]> {
  if (!clientId) return [];

  const [{ data: members }, { data: links }] = await Promise.all([
    supabase
      .from("client_members")
      .select("profiles(email, notification_prefs)")
      .eq("client_id", clientId),
    supabase
      .from("contact_clients")
      .select("contacts(email)")
      .eq("client_id", clientId),
  ]);

  const emails: string[] = [];

  for (const row of (members ?? []) as unknown as {
    profiles: { email: string | null; notification_prefs: NotificationPrefs | null } | null;
  }[]) {
    const p = row.profiles;
    if (p?.email && isEnabled(p.notification_prefs, type)) emails.push(p.email);
  }

  for (const row of (links ?? []) as unknown as { contacts: { email: string | null } | null }[]) {
    if (row.contacts?.email) emails.push(row.contacts.email);
  }

  return [...new Set(emails)];
}
