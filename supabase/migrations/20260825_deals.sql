-- Deals: aanvragen die nog geen klant zijn.
--
-- Bewust een eigen tabel en geen extra tag op clients. Een aanvraag is iets
-- anders dan een organisatie: hij heeft een herkomst, een inschatting en een
-- verloop, en hij hoort niet mee te tellen in klantenlijsten, omzetcijfers of
-- portaaltoegang. Zou hij in clients staan, dan moest overal een filter omheen
-- en was één vergeten filter genoeg om een prospect een portaal te geven.
--
-- Let op de naam: "lead" betekent in deze codebase het teamlid dat een project
-- trekt (projects.lead_profile_id). Vandaar deals en niet leads.

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,

  -- Waar het over gaat, bijvoorbeeld "Webshop voor Van der Kam".
  title text not null,

  -- De aanvrager. Nog geen organisatie en geen contactpersoon in het CRM: dat
  -- worden het pas als de deal gewonnen wordt.
  company text,
  contact_name text,
  email text,
  phone text,

  -- Waar hij vandaan komt. Vrij veld: de bronnen veranderen sneller dan een
  -- lijst die je moet bijhouden.
  source text,

  -- nieuw | gesprek | offerte | gewonnen | verloren. Zie DEAL_STATUS in
  -- lib/types.ts voor de labels en de volgorde.
  status text not null default 'nieuw',

  -- Inschatting in euro's, exclusief btw. Mag leeg zijn zolang je het niet weet.
  value_amount numeric,

  notes text,

  -- Gevuld zodra de deal is omgezet; zo blijft zichtbaar waar een klant vandaan
  -- kwam en voorkomen we dat dezelfde deal twee keer wordt omgezet.
  client_id uuid references clients (id) on delete set null,
  project_id uuid references projects (id) on delete set null,

  -- Wanneer hij gewonnen of verloren werd; voor doorlooptijd en opschonen.
  closed_at timestamptz
);

create index if not exists deals_status_idx on deals (status);
create index if not exists deals_created_idx on deals (created_at desc);

alter table deals enable row level security;

-- Alleen het team. Een klant heeft hier niets te zoeken: dit gaat ook over
-- aanvragen van anderen.
drop policy if exists "deals_admin_all" on deals;
create policy "deals_admin_all" on deals
  for all using (is_admin()) with check (is_admin());

comment on table deals is
  'Aanvragen die nog geen klant zijn. Wordt bij winst omgezet naar clients + projects.';

-- Controleren wat er nu staat:
--   select policyname, cmd, qual from pg_policies
--   where schemaname = 'public' and tablename = 'deals';
