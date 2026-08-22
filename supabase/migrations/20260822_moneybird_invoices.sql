-- Moneybird-verkoopfacturen, los van de bestaande transactions-tabel.
-- Alleen-lezen spiegel: Moneybird is de bron, dit is een kopie om te bekijken.

create table if not exists moneybird_invoices (
  id                    uuid primary key default gen_random_uuid(),
  moneybird_id          text not null unique,
  administration_id     text not null,
  invoice_number        text,
  reference             text,
  state                 text,
  invoice_date          date,
  due_date              date,
  paid_at               timestamptz,
  sent_at               timestamptz,
  currency              text default 'EUR',
  total_excl_tax        numeric(14,2),
  total_incl_tax        numeric(14,2),
  contact_moneybird_id  text,
  contact_name          text,
  client_id             uuid references clients(id) on delete set null,
  payload               jsonb not null,
  synced_at             timestamptz not null default now(),
  created_at            timestamptz not null default now()
);

create index if not exists moneybird_invoices_invoice_date_idx on moneybird_invoices (invoice_date desc);
create index if not exists moneybird_invoices_client_idx       on moneybird_invoices (client_id);
create index if not exists moneybird_invoices_contact_idx      on moneybird_invoices (contact_moneybird_id);

-- Koppeling Moneybird-relatie -> portaalklant
alter table clients add column if not exists moneybird_contact_id text;
create unique index if not exists clients_moneybird_contact_idx
  on clients (moneybird_contact_id) where moneybird_contact_id is not null;

-- Alleen admins mogen lezen; schrijven gebeurt via de service role (webhook/sync).
alter table moneybird_invoices enable row level security;

drop policy if exists "moneybird_invoices_admin_read" on moneybird_invoices;
create policy "moneybird_invoices_admin_read" on moneybird_invoices
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
