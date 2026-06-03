"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");

  const full_name = formData.get("full_name") as string;
  const avatarFile = formData.get("avatar") as File | null;

  let avatar_url: string | undefined;

  if (avatarFile && avatarFile.size > 0) {
    const ext = avatarFile.name.split(".").pop();
    const path = `${user.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type });

    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    avatar_url = publicUrl;
  }

  const update: Record<string, string> = { full_name };
  if (avatar_url) update.avatar_url = avatar_url;

  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
}
