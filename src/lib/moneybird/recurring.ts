import type { SupabaseClient } from "@supabase/supabase-js";
import { isMoneybirdConfigured, listAllRecurringSalesInvoices } from "./client";
import { resolveClientId } from "./sync";
import type { MoneybirdRecurringSalesInvoice } from "./types";
import type { Transaction } from "@/lib/types";

/** Zo ver vooruit projecteren we; genoeg voor de grafiek en de kwartaalblokken. */
const MAANDEN_VOORUIT = 24;

const STAP: Record<MoneybirdRecurringSalesInvoice["frequency_type"], { dagen?: number; maanden?: number }> = {
  day: { dagen: 1 },
  week: { dagen: 7 },
  month: { maanden: 1 },
  quarter: { maanden: 3 },
  year: { maanden: 12 },
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

function contactNaam(r: MoneybirdRecurringSalesInvoice): string | null {
  const c = r.contact;
  if (!c) return null;
  const persoon = [c.firstname, c.lastname].filter(Boolean).join(" ").trim();
  return c.company_name || persoon || null;
}

/**
 * De datums waarop deze periodieke factuur nog wordt aangemaakt.
 *
 * We beginnen bij invoice_date — dat is bij Moneybird de eerstvolgende beurt,
 * niet de vorige. Zodra een factuur is aangemaakt schuift die datum op, dus
 * dubbeltellen met de facturen die al in de database staan kan niet.
 */
export function komendeDatums(
  r: MoneybirdRecurringSalesInvoice,
  vanaf: Date,
  maandenVooruit = MAANDEN_VOORUIT,
): string[] {
  if (!r.active || !r.invoice_date) return [];

  const stap = STAP[r.frequency_type];
  const aantal = Math.max(1, r.frequency || 1);
  if (!stap) return [];

  const horizon = new Date(
    Date.UTC(vanaf.getUTCFullYear(), vanaf.getUTCMonth() + maandenVooruit, vanaf.getUTCDate()),
  );

  const datums: string[] = [];
  let d = new Date(`${r.invoice_date}T00:00:00Z`);
  // Een ruime bovengrens, zodat een dagelijkse reeks de lus niet laat ontsporen.
  for (let i = 0; i < 1000 && d <= horizon; i++) {
    if (d >= vanaf) datums.push(iso(d));
    d = stap.maanden
      ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + stap.maanden * aantal, d.getUTCDate()))
      : new Date(d.getTime() + (stap.dagen ?? 1) * aantal * 86_400_000);
  }
  return datums;
}

/**
 * Verwachte omzet uit periodieke facturen, in de vorm die de financeweergaven
 * verwachten. Ze gelden als `draft`, want het zijn prognoses, geen facturen.
 *
 * Alleen periodieke facturen waarvan de relatie bij een portaalklant hoort
 * tellen mee. Dat is nodig omdat een periodieke factuur geen huisstijl draagt:
 * zonder die controle zou omzet van de andere merken in dezelfde administratie
 * meetellen. Koppel je de relatie alsnog aan een organisatie, dan verschijnt
 * hij vanzelf in de prognose.
 */
export async function fetchRecurringAsForecast(
  supabase: SupabaseClient,
  nu = new Date(),
): Promise<Transaction[]> {
  if (!isMoneybirdConfigured()) return [];

  let recurring: MoneybirdRecurringSalesInvoice[];
  try {
    recurring = await listAllRecurringSalesInvoices();
  } catch (e) {
    // De prognose mag de financepagina niet onderuit halen.
    console.error("[moneybird] periodieke facturen ophalen mislukt:", (e as Error).message);
    return [];
  }

  const vandaag = new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth(), nu.getUTCDate()));
  const rijen: Transaction[] = [];

  for (const r of recurring) {
    const naam = contactNaam(r);
    const client_id = await resolveClientId(supabase, r.contact_id, naam);
    if (!client_id) continue;

    const bedrag = Number.parseFloat(r.total_price_excl_tax ?? "0");
    if (!Number.isFinite(bedrag) || bedrag === 0) continue;

    const { data: klant } = await supabase
      .from("clients")
      .select("id, name, logo_url")
      .eq("id", client_id)
      .maybeSingle();

    for (const datum of komendeDatums(r, vandaag)) {
      rijen.push({
        id: `recurring-${r.id}-${datum}`,
        description: r.reference || naam || "Periodieke factuur",
        amount: bedrag,
        status: "draft",
        client_id,
        project_id: null,
        date: datum,
        created_at: datum,
        clients: (klant as { id: string; name: string; logo_url: string | null } | null) ?? null,
        projects: null,
      });
    }
  }

  return rijen;
}

export type RecurringAgreement = {
  id: string;
  description: string;
  amount: number;
  frequencyLabel: string;
  /** De eerstvolgende keer dat Moneybird hier een factuur van maakt. */
  nextDate: string | null;
  contactName: string | null;
  client: { id: string; name: string; logo_url: string | null } | null;
};

const ENKELVOUD: Record<MoneybirdRecurringSalesInvoice["frequency_type"], string> = {
  day: "Dagelijks",
  week: "Wekelijks",
  month: "Maandelijks",
  quarter: "Per kwartaal",
  year: "Jaarlijks",
};

const MEERVOUD: Record<MoneybirdRecurringSalesInvoice["frequency_type"], string> = {
  day: "dagen",
  week: "weken",
  month: "maanden",
  quarter: "kwartalen",
  year: "jaar",
};

function frequentie(r: MoneybirdRecurringSalesInvoice): string {
  const n = Math.max(1, r.frequency || 1);
  return n === 1 ? ENKELVOUD[r.frequency_type] : `Elke ${n} ${MEERVOUD[r.frequency_type]}`;
}

/**
 * De periodieke facturen zelf, om te tonen op de facturenpagina. Anders dan
 * fetchRecurringAsForecast projecteert deze niets vooruit en laat hij ook de
 * afspraken zien waarvan de relatie nog niet aan een organisatie hangt — die
 * tellen niet mee in de prognose, en dat hoor je te kunnen zien.
 */
export async function fetchRecurringAgreements(
  supabase: SupabaseClient,
): Promise<RecurringAgreement[]> {
  if (!isMoneybirdConfigured()) return [];

  let recurring: MoneybirdRecurringSalesInvoice[];
  try {
    recurring = await listAllRecurringSalesInvoices();
  } catch (e) {
    console.error("[moneybird] periodieke facturen ophalen mislukt:", (e as Error).message);
    return [];
  }

  const rijen: RecurringAgreement[] = [];

  for (const r of recurring.filter((x) => x.active)) {
    const naam = contactNaam(r);
    const client_id = await resolveClientId(supabase, r.contact_id, naam);

    let client: RecurringAgreement["client"] = null;
    if (client_id) {
      const { data } = await supabase
        .from("clients")
        .select("id, name, logo_url")
        .eq("id", client_id)
        .maybeSingle();
      client = (data as RecurringAgreement["client"]) ?? null;
    }

    rijen.push({
      id: r.id,
      description: r.reference || naam || "Periodieke factuur",
      amount: Number.parseFloat(r.total_price_excl_tax ?? "0") || 0,
      frequencyLabel: frequentie(r),
      nextDate: r.invoice_date,
      contactName: naam,
      client,
    });
  }

  // Eerstvolgende beurt bovenaan.
  return rijen.sort((a, b) => (a.nextDate ?? "9999").localeCompare(b.nextDate ?? "9999"));
}
