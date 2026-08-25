import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { meet } from "@/lib/timing";

export type MonthStats = {
  /** Eerste dag van de maand, als YYYY-MM. */
  month: string;
  newTickets: number;
  closedTickets: number;
  hours: number;
  invoiceCount: number;
  invoiceTotalExclTax: number;
};

function monthBounds(year: number, monthIndex: number) {
  const from = new Date(Date.UTC(year, monthIndex, 1));
  const to = new Date(Date.UTC(year, monthIndex + 1, 1));
  return { from: from.toISOString(), to: to.toISOString(), key: from.toISOString().slice(0, 7) };
}

const leegteVoor = (key: string): MonthStats => ({
  month: key,
  newTickets: 0,
  closedTickets: 0,
  hours: 0,
  invoiceCount: 0,
  invoiceTotalExclTax: 0,
});

/**
 * Cijfers over één maand.
 *
 * De projecten binnen scope komen als argument binnen en worden hier niet meer
 * zelf opgehaald: het overzicht vraagt zes maanden tegelijk op, en dat waren
 * zes keer dezelfde projectquery vóór er ook maar iets geteld kon worden.
 *
 * Let op bij "afgerond": dat leunt op tasks.completed_at, en dat veld wordt pas
 * gevuld sinds die kolom bestaat. Tickets die daarvóór zijn afgerond tellen
 * nergens mee, hun afrondmoment is niet meer te achterhalen.
 */
async function monthStats(
  supabase: SupabaseClient,
  year: number,
  monthIndex: number,
  projectIds: string[] | null,
  clientIds?: string[],
): Promise<MonthStats> {
  const { from, to, key } = monthBounds(year, monthIndex);

  if (clientIds !== undefined && clientIds.length === 0) return leegteVoor(key);

  // Expliciet in plaats van een generieke helper: de query-builder van Supabase
  // laat zich slecht doorgeven zonder de typing te verliezen.
  let newTicketsQuery = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .gte("created_at", from)
    .lt("created_at", to);
  let closedTicketsQuery = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .gte("completed_at", from)
    .lt("completed_at", to);
  let hoursQuery = supabase
    .from("time_entries")
    .select("hours")
    .gte("date", from.slice(0, 10))
    .lt("date", to.slice(0, 10));
  let invoicesQuery = supabase
    .from("moneybird_invoices")
    .select("total_excl_tax")
    .neq("state", "draft")
    .gte("invoice_date", from.slice(0, 10))
    .lt("invoice_date", to.slice(0, 10));

  if (projectIds) {
    newTicketsQuery = newTicketsQuery.in("project_id", projectIds);
    closedTicketsQuery = closedTicketsQuery.in("project_id", projectIds);
    hoursQuery = hoursQuery.in("project_id", projectIds);
  }
  if (clientIds) {
    invoicesQuery = invoicesQuery.in("client_id", clientIds);
  }

  const [newT, closedT, hrs, inv] = await Promise.all([
    newTicketsQuery,
    closedTicketsQuery,
    hoursQuery,
    invoicesQuery,
  ]);

  const hours = (hrs.data ?? []).reduce(
    (sum: number, r: { hours: number }) => sum + (Number(r.hours) || 0),
    0,
  );
  const invoices = (inv.data ?? []) as { total_excl_tax: number }[];

  return {
    month: key,
    newTickets: newT.count ?? 0,
    closedTickets: closedT.count ?? 0,
    hours,
    invoiceCount: invoices.length,
    invoiceTotalExclTax: invoices.reduce((s, i) => s + (Number(i.total_excl_tax) || 0), 0),
  };
}

/**
 * De laatste maanden voor een set klanten, nieuwste eerst.
 *
 * In cache() verpakt zodat de kaarten bovenaan het overzicht en de tabel
 * eronder dezelfde cijfers delen: ze staan in aparte <Suspense>-blokken, maar
 * halen ze samen één keer op.
 */
export const maandCijfers = cache(async function maandCijfers(
  clientIds: string[],
  aantal = 6,
): Promise<MonthStats[]> {
  const nu = new Date();
  const maanden = Array.from({ length: aantal }, (_, i) => {
    const d = new Date(nu.getFullYear(), nu.getMonth() - i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  if (clientIds.length === 0) {
    return maanden.map((m) => leegteVoor(monthBounds(m.year, m.month).key));
  }

  const supabase = await createClient();

  // Tickets en uren hangen aan projecten, niet aan klanten. Deze vraag stond
  // eerder in monthStats en ging dus zes keer over de lijn.
  const { data } = await meet("maand.projecten", () =>
    supabase.from("projects").select("id").in("client_id", clientIds),
  );
  const projectIds = (data ?? []).map((p) => p.id as string);

  return meet("maand.tellingen", () =>
    Promise.all(maanden.map((m) => monthStats(supabase, m.year, m.month, projectIds, clientIds))),
  );
});
