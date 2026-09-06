-- Reacties op een ticket.
--
-- Zelfde vorm als project_comments uit 20260823_projectpagina.sql, want het is
-- hetzelfde ding op een ander onderwerp: een gesprek onder één stuk werk.
-- Bewust een eigen tabel en geen kolom task_id erbij op project_comments: die
-- laatste zit al in de projecttijdlijn, waar ook systeemregels tussen staan
-- (status, fase, factuur). Een ticketreactie zou daar tussen komen te hangen.
--
-- Draai dit ná 20260905_tickets_indienen.sql. Kan twee keer zonder schade.

create table if not exists task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists task_comments_task_idx on task_comments (task_id, created_at);

alter table task_comments enable row level security;

-- Lezen erft de toegang van het ticket: het team alles, een klant wat bij zijn
-- organisatie hoort. Dezelfde twee wegen als de leesregel op tasks, want een
-- verzoek uit het portaal hoeft geen project te hebben.
drop policy if exists "task_comments_read" on task_comments;
create policy "task_comments_read" on task_comments
  for select using (
    is_admin()
    or exists (
      select 1 from tasks t
      where t.id = task_comments.task_id
        and (
          t.client_id in (select my_client_ids())
          or exists (
            select 1 from projects p
            where p.id = t.project_id
              and p.client_id in (select my_client_ids())
          )
        )
    )
  );

-- Schrijven mag alleen onder je eigen naam. Zonder die voorwaarde kan iemand
-- een bericht op naam van een ander plaatsen.
drop policy if exists "task_comments_write" on task_comments;
create policy "task_comments_write" on task_comments
  for insert with check (
    profile_id = auth.uid()
    and (
      is_admin()
      or exists (
        select 1 from tasks t
        where t.id = task_comments.task_id
          and (
            t.client_id in (select my_client_ids())
            or exists (
              select 1 from projects p
              where p.id = t.project_id
                and p.client_id in (select my_client_ids())
            )
          )
      )
    )
  );

-- Je eigen bericht weghalen, en dat van niemand anders.
drop policy if exists "task_comments_delete" on task_comments;
create policy "task_comments_delete" on task_comments
  for delete using (profile_id = auth.uid());

-- Controle achteraf:
--   select policyname, cmd from pg_policies
--    where schemaname = 'public' and tablename = 'task_comments' order by policyname;
