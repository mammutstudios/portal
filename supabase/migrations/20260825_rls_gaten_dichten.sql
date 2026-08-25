-- Vier tabellen stonden open voor iedereen die was ingelogd.
--
-- Gevonden door met een echte sessie van een klantgebruiker, gekoppeld aan één
-- organisatie, langs elke tabel te gaan en te vergelijken met wat er in de
-- database staat:
--
--   contacts         14 van de 14 rijen leesbaar, en insert werkte
--   contact_clients  14 van de 14 rijen leesbaar, en insert werkte
--   time_entries     de urenregel van een ánder project leesbaar, insert werkte
--   subtasks         beide subtaken van een ánder project leesbaar, insert werkte
--
-- Organisaties, projecten, taken, facturen, bestanden en het activiteitenlog
-- waren wel goed: daar zag de klant alleen zijn eigen rijen en werd elke
-- schrijfpoging geweigerd. Reacties op de tijdlijn ook, die mag een klant zelf
-- plaatsen maar alleen op zijn eigen projecten.
--
-- De oorzaak is wat 20260822_portal_rls.sql bovenaan al voorspelde: policies
-- zijn permissief en worden ge-OR'd, dus een oudere ruimere policy blijft naast
-- een nieuwe strakke gelden. Op deze vier tabellen stond zo'n oude nog. Welke
-- precies is van buiten de database niet te zien, dus dit script ruimt eerst
-- alles op die tabellen op en zet daarna neer wat er hoort te staan.

alter table contacts        enable row level security;
alter table contact_clients enable row level security;
alter table time_entries    enable row level security;
alter table subtasks        enable row level security;

do $$
declare
  t text;
  p record;
begin
  foreach t in array array['contacts', 'contact_clients', 'time_entries', 'subtasks'] loop
    for p in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;

-- Contacten en hun koppelingen: alleen het team. Het portaal toont ze nergens,
-- dus een klant heeft er niets te zoeken.
create policy "contacts_admin_all" on contacts
  for all using (is_admin()) with check (is_admin());

create policy "contact_clients_admin_all" on contact_clients
  for all using (is_admin()) with check (is_admin());

-- Uren: lezen mag over de eigen projecten, schrijven doet alleen het team.
create policy "time_entries_portal_read" on time_entries
  for select using (
    is_admin() or exists (
      select 1 from projects p
      where p.id = time_entries.project_id
        and p.client_id in (select my_client_ids())
    )
  );

create policy "time_entries_admin_write" on time_entries
  for all using (is_admin()) with check (is_admin());

-- Subtaken erven hun toegang van de taak, en die van het project.
create policy "subtasks_portal_read" on subtasks
  for select using (
    is_admin() or exists (
      select 1 from tasks t
      join projects p on p.id = t.project_id
      where t.id = subtasks.task_id
        and p.client_id in (select my_client_ids())
    )
  );

create policy "subtasks_admin_write" on subtasks
  for all using (is_admin()) with check (is_admin());

-- Controle achteraf:
--   select tablename, policyname, cmd
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in ('contacts', 'contact_clients', 'time_entries', 'subtasks')
--   order by tablename, policyname;
