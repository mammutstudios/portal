import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { createClient } from "@/lib/supabase/server";
import DealForm from "@/components/DealForm";
import DealActies from "./DealActies";
import DealBestanden, { type DealBestand } from "./DealBestanden";
import { DealStatusBadge } from "@/components/StatusBadge";
import type { Deal } from "@/lib/types";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: deal }, { data: clients }, { data: contacts }, { data: bestanden }] =
    await Promise.all([
      supabase.from("deals").select("*").eq("id", id).maybeSingle(),
      supabase.from("clients").select("id, name").order("name"),
      supabase.from("contacts").select("id, name, email").order("name"),
      supabase
        .from("files")
        .select("id, name, size_bytes, mime_type, created_at")
        .eq("deal_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (!deal) notFound();
  const d = deal as Deal;
  const klant = (clients ?? []).find((c) => c.id === d.client_id) ?? null;

  return (
    <div className="px-4 py-6 md:px-10 md:py-10 max-w-3xl mx-auto">
      <nav className="flex items-center gap-1.5 text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        <Link href="/dashboard/deals" className="hover:underline">Deals</Link>
        <CaretRight size={13} weight="bold" />
        <span style={{ color: "var(--text-heading)" }}>{d.title}</span>
      </nav>

      <div className="flex items-center gap-3 flex-wrap mb-1">
        <h1 className="text-3xl font-extrabold" style={{ color: "var(--text-heading)" }}>
          {d.title}
        </h1>
        <DealStatusBadge status={d.status} />
      </div>
      <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
        {[klant?.name, d.source && `via ${d.source}`].filter(Boolean).join(" · ") ||
          "Nog geen organisatie gekoppeld"}
      </p>

      <DealActies deal={d} klantNaam={klant?.name ?? null} />

      <DealBestanden dealId={d.id} bestanden={(bestanden ?? []) as DealBestand[]} />

      <div className="squircle p-6" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
        <DealForm deal={d} clients={clients ?? []} contacts={contacts ?? []} />
      </div>
    </div>
  );
}
