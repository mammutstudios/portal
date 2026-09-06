-- Tickets: een klant kan er zelf een indienen, en het bord krijgt een kolom
-- Open waar zo'n verzoek in landt.
--
-- LET OP: dit bestand bevat ook de kolom completed_at uit
-- 20260822_task_completed_at.sql. Die migratie is nooit gedraaid, terwijl de
-- code er wel naar schrijft: een ticket bewerken gooide daardoor een fout en
-- de status wijzigen mislukte stil. Draai dit bestand dus in zijn geheel, ook
-- als je denkt dat die oude migratie al langs is geweest. Alles hieronder kan
-- twee keer draaien zonder schade.

-- 1. Wanneer is een ticket afgerond? Zonder dit weten we alleen dát het af is,
--    en kun je geen "afgerond in deze maand" berekenen.
alter table tasks add column if not exists completed_at timestamptz;
create index if not exists tasks_completed_at_idx on tasks (completed_at);

-- 2. Bij welke organisatie hoort dit ticket?
--    Tot nu toe liep dat alleen via het project. Een klant die iets indient
--    hoeft daar geen project bij te kiezen, dus dan is er niets om via te
--    lopen: zonder deze kolom zou zo'n verzoek nergens bij horen en door de
--    leesregel hieronder voor de indiener zelf onzichtbaar zijn.
alter table tasks add column if not exists client_id uuid references clients(id) on delete set null;
create index if not exists tasks_client_id_idx on tasks (client_id);

-- 3. Wie heeft het ingediend? Bij werk dat het team zelf aanmaakt is dit de
--    admin; bij een verzoek uit het portaal de klant. Op de kaart staat deze
--    naam met de organisatie eronder.
alter table tasks add column if not exists created_by uuid references profiles(id) on delete set null;

-- Bestaande tickets hangen aan een project, dus daar is de organisatie uit af
-- te leiden. Alleen invullen waar hij nog leeg is, zodat herhalen niets stuk
-- maakt.
update tasks t
   set client_id = p.client_id
  from projects p
 where p.id = t.project_id
   and t.client_id is null
   and p.client_id is not null;

-- 4. De statussen van het bord: Open, Te doen, Bezig, Review, Klaar.
--    Welke check er nu op status staat is van buiten de database niet te zien,
--    dus eerst weg met alles wat over die kolom gaat, daarna neerzetten wat er
--    hoort te staan.
do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'tasks'
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.tasks drop constraint %I', c.conname);
  end loop;
end $$;

-- Een onbekende status zou stil uit elk bord vallen: hij hoort bij geen enkele
-- kolom en is dan alleen nog in de database terug te vinden.
alter table tasks
  add constraint tasks_status_check
  check (status in ('open', 'todo', 'in_progress', 'review', 'done'));

alter table tasks alter column status set default 'todo';

-- 5. Toegang.
--    Zelfde aanpak als 20260825_rls_gaten_dichten.sql: policies zijn
--    permissief en worden ge-OR'd, dus een oudere ruimere policy blijft naast
--    een nieuwe strakke gelden. Op tasks staat geen enkele schrijfpolicy in de
--    migraties, terwijl het dashboard er wel schrijft; er zit dus iets in de
--    database dat we hier niet zien. Daarom eerst alles weg, dan opnieuw.
alter table tasks enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'tasks'
  loop
    execute format('drop policy %I on public.tasks', p.policyname);
  end loop;
end $$;

-- Het team mag alles.
create policy "tasks_admin_all" on tasks
  for all using (is_admin()) with check (is_admin());

-- De klant leest wat bij zijn organisatie hoort: via het project, of
-- rechtstreeks via client_id voor een verzoek zonder project.
create policy "tasks_portal_read" on tasks
  for select using (
    client_id in (select my_client_ids())
    or exists (
      select 1 from projects p
      where p.id = tasks.project_id
        and p.client_id in (select my_client_ids())
    )
  );

-- En hij mag er zelf een indienen, maar alleen op zijn eigen organisatie, op
-- eigen naam, en alleen als Open. Zonder die drie voorwaarden kan een klant
-- via een rechtstreekse POST een ticket op een andere organisatie zetten, of
-- er meteen een op Klaar schuiven.
create policy "tasks_portal_insert" on tasks
  for insert with check (
    tasks.client_id in (select my_client_ids())
    and tasks.created_by = auth.uid()
    and tasks.status = 'open'
    and (
      tasks.project_id is null
      or exists (
        select 1 from projects p
        where p.id = tasks.project_id
          and p.client_id in (select my_client_ids())
      )
    )
  );

-- Controle achteraf:
--   select policyname, cmd from pg_policies
--    where schemaname = 'public' and tablename = 'tasks' order by policyname;
--   select column_name from information_schema.columns
--    where table_name = 'tasks' and column_name in ('completed_at', 'client_id', 'created_by');
