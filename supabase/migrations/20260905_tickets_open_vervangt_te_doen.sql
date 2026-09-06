-- Te doen gaat eruit, Open blijft.
--
-- De twee zeiden hetzelfde: nog niet opgepakt. Met allebei zou je bij elk
-- nieuw ticket moeten kiezen tussen twee woorden voor dezelfde toestand, en
-- dan raakt het bord verdeeld over twee kolommen die niets onderscheiden.
--
-- Draai dit ná 20260905_tickets_indienen.sql. Kan twee keer zonder schade.

-- Eerst verhuizen, dan de check aanpassen: 'open' is in de huidige check al
-- toegestaan, dus deze update mag nu al.
update tasks set status = 'open' where status = 'todo';

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

alter table tasks
  add constraint tasks_status_check
  check (status in ('open', 'in_progress', 'review', 'done'));

-- Een ticket zonder opgegeven status begint nu op Open in plaats van Te doen.
alter table tasks alter column status set default 'open';

-- Controle achteraf:
--   select status, count(*) from tasks group by status;
