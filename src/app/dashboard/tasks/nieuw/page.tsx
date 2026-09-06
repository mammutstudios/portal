import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import TicketForm from "@/components/TicketForm";

/**
 * Een nieuw ticket, op een eigen pagina.
 *
 * Zelfde opzet als /dashboard/deals/nieuw: kruimelpad, kop, en het formulier
 * in een wit vlak. Stond eerder in een venster over het bord heen, waar de
 * omschrijving twee regels hoog was.
 */
export default async function NieuwTicketPage() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, logo_url")
    .order("name");

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-3xl mx-auto">
      <nav className="flex items-center gap-1.5 text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        <Link href="/dashboard/tasks" className="hover:underline">Tickets</Link>
        <CaretRight size={13} weight="bold" />
        <span style={{ color: "var(--text-heading)" }}>Nieuw</span>
      </nav>

      <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
        Nieuw ticket
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        Werk dat nog gedaan moet worden, of een verzoek dat via een andere weg
        binnenkwam dan het portaal.
      </p>

      <div className="squircle p-6" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
        <TicketForm clients={clients ?? []} />
      </div>
    </div>
  );
}
