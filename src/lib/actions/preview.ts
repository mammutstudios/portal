"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function startPreviewAction() {
  const cookieStore = await cookies();
  cookieStore.set("admin_preview", "true", { path: "/", maxAge: 60 * 60 });
  redirect("/portal");
}

export async function stopPreviewAction() {
  const cookieStore = await cookies();
  cookieStore.delete("admin_preview");
  redirect("/dashboard");
}
