import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import DealForm from "@/components/DealForm";

export default async function NieuweDealPage() {
  const supabase = await createClient();
  const [{ data: clients }, { data: contacts }] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("contacts").select("id, name, email, contact_clients(client_id)").order("name"),
  ]);

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-3xl mx-auto">
      <nav className="flex items-center gap-1.5 text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        <Link href="/dashboard/deals" className="hover:underline">Deals</Link>
        <CaretRight size={13} weight="bold" />
        <span style={{ color: "var(--text-heading)" }}>Nieuw</span>
      </nav>

      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Nieuwe deal
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Een aanvraag of nieuw werk, van een nieuwe klant of van een bestaande.
      </p>

      <div className="squircle p-6" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
        <DealForm clients={clients ?? []} contacts={contacts ?? []} />
      </div>
    </div>
  );
}
