import type { MoneybirdContact, MoneybirdSalesInvoice } from "./types";

const BASE = "https://moneybird.com/api/v2";

export class MoneybirdNotConfiguredError extends Error {
  constructor(missing: string[]) {
    super(`Moneybird is niet geconfigureerd — ontbrekend: ${missing.join(", ")}`);
    this.name = "MoneybirdNotConfiguredError";
  }
}

export function moneybirdConfig() {
  const token = process.env.MONEYBIRD_API_TOKEN;
  const administrationId = process.env.MONEYBIRD_ADMINISTRATION_ID;
  const missing: string[] = [];
  if (!token) missing.push("MONEYBIRD_API_TOKEN");
  if (!administrationId) missing.push("MONEYBIRD_ADMINISTRATION_ID");
  if (missing.length) throw new MoneybirdNotConfiguredError(missing);
  return { token: token!, administrationId: administrationId! };
}

/**
 * Alleen facturen met deze huisstijl horen in het portaal. Leeg laten betekent
 * geen filter — dan komt alles binnen, ook van andere merken in dezelfde
 * administratie.
 */
export function moneybirdDocumentStyleId(): string | null {
  return process.env.MONEYBIRD_DOCUMENT_STYLE_ID?.trim() || null;
}

export function isMoneybirdConfigured() {
  return Boolean(process.env.MONEYBIRD_API_TOKEN && process.env.MONEYBIRD_ADMINISTRATION_ID);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { token, administrationId } = moneybirdConfig();
  const res = await fetch(`${BASE}/${administrationId}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Moneybird ${res.status} op ${path}${body ? `: ${body.slice(0, 300)}` : ""}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Haalt alle verkoopfacturen op. Moneybird pagineert met ?page= en levert
 * standaard 100 per pagina; we stoppen zodra een pagina minder dan dat teruggeeft.
 */
export async function listAllSalesInvoices(maxPages = 50): Promise<MoneybirdSalesInvoice[]> {
  const perPage = 100;
  const all: MoneybirdSalesInvoice[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const batch = await request<MoneybirdSalesInvoice[]>(
      `/sales_invoices.json?page=${page}&per_page=${perPage}`,
    );
    all.push(...batch);
    if (batch.length < perPage) return all;
  }
  return all;
}

/** Alle relaties uit Moneybird, om handmatig aan een portaalklant te koppelen. */
export async function listAllContacts(maxPages = 50): Promise<MoneybirdContact[]> {
  const perPage = 100;
  const all: MoneybirdContact[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const batch = await request<MoneybirdContact[]>(
      `/contacts.json?page=${page}&per_page=${perPage}`,
    );
    all.push(...batch);
    if (batch.length < perPage) return all;
  }
  return all;
}
