-- Portaal-autorisatie: een klantgebruiker ziet uitsluitend de klanten waaraan
-- hij via client_members gekoppeld is. Admins zien alles.
--
-- LET OP: policies zijn permissief en worden ge-OR'd. Bestaande policies die
-- ruimer zijn (bijv. "authenticated mag alles lezen") blijven gelden naast
-- deze. Draai eerst de query onderaan dit bestand en verwijder wat te ruim is.

-- Hulpfuncties, security definer zodat ze zelf niet door RLS heen hoeven.
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
  select cm.client_id from client_members cm where cm.profile_id = auth.uid();
$$;

-- clients
alter table clients enable row level security;
drop policy if exists "clients_portal_read" on clients;
create policy "clients_portal_read" on clients
  for select using (is_admin() or id in (select my_client_ids()));

-- client_members: je mag alleen je eigen koppelingen zien
alter table client_members enable row level security;
drop policy if exists "client_members_own_read" on client_members;
create policy "client_members_own_read" on client_members
  for select using (is_admin() or profile_id = auth.uid());

-- projects
alter table projects enable row level security;
drop policy if exists "projects_portal_read" on projects;
create policy "projects_portal_read" on projects
  for select using (is_admin() or client_id in (select my_client_ids()));

-- tasks: via het project
alter table tasks enable row level security;
drop policy if exists "tasks_portal_read" on tasks;
create policy "tasks_portal_read" on tasks
  for select using (
    is_admin() or exists (
      select 1 from projects p
      where p.id = tasks.project_id
        and p.client_id in (select my_client_ids())
    )
  );

-- files: via het project
alter table files enable row level security;
drop policy if exists "files_portal_read" on files;
create policy "files_portal_read" on files
  for select using (
    is_admin() or exists (
      select 1 from projects p
      where p.id = files.project_id
        and p.client_id in (select my_client_ids())
    )
  );

-- time_entries: via het project
alter table time_entries enable row level security;
drop policy if exists "time_entries_portal_read" on time_entries;
create policy "time_entries_portal_read" on time_entries
  for select using (
    is_admin() or exists (
      select 1 from projects p
      where p.id = time_entries.project_id
        and p.client_id in (select my_client_ids())
    )
  );

-- moneybird_invoices: klant ziet eigen facturen, behalve concepten
drop policy if exists "moneybird_invoices_portal_read" on moneybird_invoices;
create policy "moneybird_invoices_portal_read" on moneybird_invoices
  for select using (
    client_id in (select my_client_ids()) and coalesce(state, '') <> 'draft'
  );

-- Een portaalgebruiker aan een klant koppelen:
--   insert into client_members (client_id, profile_id) values ('<client-uuid>', '<profile-uuid>');

-- Controleer welke policies er nu staan (en of er te ruime tussen zitten):
--   select tablename, policyname, cmd, qual
--   from pg_policies
--   where schemaname = 'public'
--   order by tablename, policyname;
