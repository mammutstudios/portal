export type MoneybirdContact = {
  id: string;
  company_name?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  email?: string | null;
  customer_id?: string | null;
};

export type MoneybirdSalesInvoice = {
  id: string;
  contact_id?: string | null;
  contact?: MoneybirdContact | null;
  document_style_id?: string | null;
  invoice_id?: string | null;
  reference?: string | null;
  state?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  paid_at?: string | null;
  sent_at?: string | null;
  currency?: string | null;
  total_price_excl_tax?: string | number | null;
  total_price_incl_tax?: string | number | null;
};

/** Body van een Moneybird-webhook. Zie developer.moneybird.com/webhooks/payload */
export type MoneybirdWebhookPayload = {
  administration_id: string;
  webhook_id: string;
  webhook_token: string;
  entity_type: string;
  entity_id: string;
  state?: string | null;
  action: string;
  entity: MoneybirdSalesInvoice;
};

export function contactLabel(c?: MoneybirdContact | null): string | null {
  if (!c) return null;
  const company = c.company_name?.trim();
  if (company) return company;
  const person = [c.firstname, c.lastname].filter(Boolean).join(" ").trim();
  return person || null;
}

/** Moneybird levert bedragen als string ("300.0"). */
export function toAmount(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Periodieke verkoopfactuur. Anders dan een gewone factuur draagt deze géén
 * document_style_id — de huisstijl wordt pas bepaald zodra Moneybird de factuur
 * aanmaakt. Filteren op huisstijl kan hier dus niet; zie recurring.ts.
 */
export type MoneybirdRecurringSalesInvoice = {
  id: string;
  active: boolean;
  /** De eerstvolgende datum waarop Moneybird een factuur aanmaakt. */
  invoice_date: string | null;
  start_date: string | null;
  last_date: string | null;
  frequency: number;
  frequency_type: "day" | "week" | "month" | "quarter" | "year";
  /** Moneybird levert bedragen als string, bijvoorbeeld "255.0". */
  total_price_excl_tax: string | null;
  currency: string | null;
  reference: string | null;
  contact_id: string | null;
  contact: {
    id?: string;
    company_name?: string | null;
    firstname?: string | null;
    lastname?: string | null;
  } | null;
};
