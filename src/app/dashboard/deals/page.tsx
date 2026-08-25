import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import PageSkeleton from "@/components/PageSkeleton";
import DealsPageClient from "./DealsPageClient";
import type { Deal } from "@/lib/types";

export default function DealsPage() {
  return (
    <Suspense fallback={<PageSkeleton rijen={5} />}>
      <Deals />
    </Suspense>
  );
}

async function Deals() {
  const supabase = await createClient();
  const [{ data, error }, { data: clients }] = await Promise.all([
    supabase.from("deals").select("*").order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").order("name"),
  ]);

  // De tabel bestaat pas na de migratie; tot die tijd geen foutscherm maar uitleg.
  if (error) {
    return (
      <div className="px-4 py-6 md:px-10 md:py-10 max-w-5xl mx-auto">
        <h1 className="text-3xl font-extrabold mb-1" style={{ color: "var(--text-heading)" }}>
          Deals
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
          Aanvragen en nieuw werk, van nieuwe klanten en van bestaande.
        </p>
        <div className="squircle px-4 py-6" style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Deals zijn nog niet aangezet. Draai de migratie
            <code className="mx-1 px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--bg-secondary)" }}>
              20260825_deals.sql
            </code>
            in Supabase.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DealsPageClient deals={(data ?? []) as Deal[]} clients={clients ?? []} />
  );
}
