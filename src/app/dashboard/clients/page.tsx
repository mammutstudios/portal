import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ClientsPageClient from "./ClientsPageClient";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("name");

  return <ClientsPageClient clients={clients ?? []} />;
}
