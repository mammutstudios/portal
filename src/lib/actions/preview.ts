"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Alleen admins mogen het portaal als klant bekijken. */
async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/portal");
}

export async function startPreviewAction(formData: FormData) {
  await assertAdmin();

  const client_id = formData.get("client_id") as string;
  // Zonder klant is preview betekenisloos: het portaal weet dan niet wie het toont.
  if (!client_id) redirect("/dashboard");

  const cookieStore = await cookies();
  cookieStore.set("admin_preview", "true", { path: "/", maxAge: 60 * 60 });
  cookieStore.set("preview_client_id", client_id, { path: "/", maxAge: 60 * 60 });
  redirect("/portal");
}

export async function stopPreviewAction() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_preview");
  cookieStore.delete("preview_client_id");
  redirect("/dashboard");
}
