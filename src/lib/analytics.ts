import type { SupabaseClient } from "@supabase/supabase-js";

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

/**
 * Cijfers over één maand, eventueel beperkt tot een set klanten.
 *
 * Let op bij "afgerond": dat leunt op tasks.completed_at, en dat veld wordt pas
 * gevuld sinds die kolom bestaat. Tickets die daarvóór zijn afgerond tellen
 * nergens mee — hun afrondmoment is niet meer te achterhalen.
 */
export async function monthStats(
  supabase: SupabaseClient,
  year: number,
  monthIndex: number,
  clientIds?: string[],
): Promise<MonthStats> {
  const { from, to, key } = monthBounds(year, monthIndex);
  const scoped = clientIds !== undefined;

  // Projecten binnen scope; tickets en uren hangen aan projecten, niet aan klanten.
  let projectIds: string[] | null = null;
  if (scoped) {
    if (clientIds.length === 0) {
      return { month: key, newTickets: 0, closedTickets: 0, hours: 0, invoiceCount: 0, invoiceTotalExclTax: 0 };
    }
    const { data } = await supabase.from("projects").select("id").in("client_id", clientIds);
    projectIds = (data ?? []).map((p) => p.id as string);
  }

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
