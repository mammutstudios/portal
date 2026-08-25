-- Activiteitenlog.
--
-- Eén regel per gebeurtenis: wie deed wat, waaraan, wanneer. Los van de
-- projecttijdlijn, want die gaat over één project en is voor de klant bedoeld.
-- Dit is intern en gaat over alles.
--
-- De naam van de actor staat er niet in maar wordt bij het lezen aan profiles
-- gekoppeld. Wordt een profiel verwijderd, dan blijft de regel staan zonder
-- naam; dat is beter dan de regel meeslepen in de verwijdering.

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Null voor wat zonder ingelogde gebruiker gebeurt, zoals de Moneybird-webhook.
  actor_profile_id uuid references profiles (id) on delete set null,

  -- Wat er gebeurde, als 'onderwerp.werkwoord'. Zie lib/activity.ts voor de
  -- lijst en de zin die erbij hoort.
  action text not null,

  -- Waaraan. entity_label is de naam op het moment zelf, zodat de regel
  -- leesbaar blijft nadat het onderwerp is hernoemd of verwijderd.
  entity_type text,
  entity_id uuid,
  entity_label text,

  client_id uuid references clients (id) on delete set null,

  -- Losse details, bijvoorbeeld de oude en nieuwe status bij een wijziging.
  meta jsonb
);

-- De pagina leest altijd op tijd aflopend; dit is de enige index die telt.
create index if not exists activities_created_idx on activities (created_at desc);
create index if not exists activities_actor_idx on activities (actor_profile_id);
create index if not exists activities_entity_idx on activities (entity_type, entity_id);

alter table activities enable row level security;

-- Alleen admins lezen mee. Klanten hebben hier niets te zoeken: dit log gaat
-- ook over andere organisaties.
drop policy if exists "activities_admin_read" on activities;
create policy "activities_admin_read" on activities
  for select using (is_admin());

-- Schrijven gebeurt met de service role en gaat dus langs row level security
-- heen. Bewust geen insert-policy: niemand hoort hier vanuit de browser in te
-- schrijven, want dan is het log niet meer te vertrouwen.

comment on table activities is
  'Intern log van gebeurtenissen. Schrijven via lib/activity.ts met de service role.';
