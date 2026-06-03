"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function startPreviewAction(formData: FormData) {
  const client_id = formData.get("client_id") as string;
  const cookieStore = await cookies();
  cookieStore.set("admin_preview", "true", { path: "/", maxAge: 60 * 60 });
  if (client_id) {
    cookieStore.set("preview_client_id", client_id, { path: "/", maxAge: 60 * 60 });
  }
  redirect("/portal");
}

export async function stopPreviewAction() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_preview");
  cookieStore.delete("preview_client_id");
  redirect("/dashboard");
}
