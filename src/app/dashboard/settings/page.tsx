import { createClient } from "@/lib/supabase/server";
import ProfileSettings from "@/components/ProfileSettings";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  return <ProfileSettings profile={profile} email={user?.email ?? ""} />;
}
