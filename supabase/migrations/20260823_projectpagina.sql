-- Berichten bij een project, een lead per project, en de hulpfuncties waar de
-- policies op leunen.
--
-- Die functies staan ook in 20260822_portal_rls.sql, maar die migratie was hier
-- nog niet gedraaid. Ze staan er daarom opnieuw in, met "create or replace",
-- zodat dit bestand op zichzelf werkt.
--
-- Let op de kolomnaam: client_members koppelt op user_id, niet op profile_id.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.my_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select cm.client_id from client_members cm where cm.user_id = auth.uid();
$$;


-- Berichten bij een project: het gesprek tussen ons en de klant.
--
-- Bewust één stroom en geen apart intern kanaal. Een tweede, verborgen soort
-- bericht in dezelfde lijst is precies het soort ding waar per ongeluk een
-- interne opmerking bij de klant belandt.

create table if not exists project_comments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists project_comments_project_idx
  on project_comments (project_id, created_at);

alter table project_comments enable row level security;

drop policy if exists "project_comments_read" on project_comments;
create policy "project_comments_read" on project_comments
  for select using (
    is_admin()
    or project_id in (
      select p.id from projects p where p.client_id in (select my_client_ids())
    )
  );

-- Schrijven mag alleen onder je eigen naam. Zonder die voorwaarde kan iemand
-- een bericht op naam van een ander plaatsen.
drop policy if exists "project_comments_write" on project_comments;
create policy "project_comments_write" on project_comments
  for insert with check (
    profile_id = auth.uid()
    and (
      is_admin()
      or project_id in (
        select p.id from projects p where p.client_id in (select my_client_ids())
      )
    )
  );

drop policy if exists "project_comments_delete" on project_comments;
create policy "project_comments_delete" on project_comments
  for delete using (profile_id = auth.uid());


-- Wie trekt dit project? Zichtbaar voor de klant, zodat hij weet bij wie hij
-- moet zijn.

alter table projects
  add column if not exists lead_profile_id uuid references profiles(id) on delete set null;

comment on column projects.lead_profile_id is
  'Teamlid dat dit project trekt. Zichtbaar in het klantportaal.';

create index if not exists projects_lead_idx on projects (lead_profile_id);


-- Zonder dit blijft de naam van de lead leeg in het portaal en staan alle
-- berichten op naam van "Onbekend": profiles heeft row level security en een
-- klant kan er niets uit lezen.
--
-- Er gaat alleen open wat nodig is: je eigen profiel, dat van het team, en dat
-- van collega's binnen dezelfde organisatie.
drop policy if exists "profiles_read" on profiles;
create policy "profiles_read" on profiles
  for select using (
    id = auth.uid()
    or role = 'admin'
    or id in (
      select cm.user_id
      from client_members cm
      where cm.client_id in (select my_client_ids())
    )
  );
