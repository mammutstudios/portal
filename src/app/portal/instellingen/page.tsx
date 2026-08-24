import { createClient } from "@/lib/supabase/server";
import { getPortalContext } from "@/lib/portal";
import ProfileSettings from "@/components/ProfileSettings";

export default async function PortalSettingsPage() {
  // Zelfde afscherming als de rest van het portaal; redirect bij geen toegang.
  const { userId } = await getPortalContext();

  const supabase = await createClient();
  const [{ data: profile }, { data: { user } }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).single(),
    supabase.auth.getUser(),
  ]);

  return <ProfileSettings profile={profile} email={user?.email ?? ""} />;
}
