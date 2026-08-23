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

-- Lezen: admins alles, een portaalgebruiker alleen bij projecten van zijn
-- eigen organisatie.
drop policy if exists "project_comments_read" on project_comments;
create policy "project_comments_read" on project_comments
  for select using (
    is_admin()
    or project_id in (
      select p.id from projects p where p.client_id in (select my_client_ids())
    )
  );

-- Schrijven: alleen onder je eigen naam, en alleen bij een project dat je mag
-- zien. Zonder die eerste voorwaarde kan iemand een bericht op naam van een
-- ander plaatsen.
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

-- Verwijderen mag alleen je eigen bericht.
drop policy if exists "project_comments_delete" on project_comments;
create policy "project_comments_delete" on project_comments
  for delete using (profile_id = auth.uid());
