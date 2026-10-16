-- Een kort kenmerk per task, zoals TSK-00042.
--
-- Een uuid is onbruikbaar in een gesprek of een mail; hier kun je naar wijzen.
-- Een teller en geen datum-volgnummer: dat laatste loopt mis zodra er twee op
-- dezelfde dag binnenkomen, en de volgorde van aanmaak is precies wat je wil.
--
-- Draai dit ná 20260905_ticket_reacties_mentions.sql. Kan twee keer draaien
-- zonder schade.

create sequence if not exists tasks_nummer_seq;

alter table tasks add column if not exists nummer integer;

-- Bestaande tasks krijgen hun nummer in volgorde van aanmaak. id erbij als
-- tiebreaker, zodat twee rijen met hetzelfde tijdstip toch een vaste volgorde
-- hebben en herhalen dezelfde uitkomst geeft.
with genummerd as (
  select id, row_number() over (order by created_at, id) as n
    from tasks
   where nummer is null
)
update tasks t
   set nummer = g.n
  from genummerd g
 where g.id = t.id;

-- De teller verder zetten dan het hoogste nummer dat nu bestaat, anders geeft
-- de eerstvolgende insert een nummer dat al vergeven is.
select setval('tasks_nummer_seq', coalesce((select max(nummer) from tasks), 0), true);

alter table tasks alter column nummer set default nextval('tasks_nummer_seq');
alter table tasks alter column nummer set not null;

-- Uniek, want het is een kenmerk waar je naar verwijst. Een dubbele zou pas
-- opvallen als iemand het verkeerde ticket opent.
create unique index if not exists tasks_nummer_idx on tasks (nummer);

-- De sequence moet bruikbaar zijn voor wie een task aanmaakt: het team via het
-- dashboard, en een klant die vanuit het portaal een verzoek indient. Zonder
-- deze rechten faalt de insert op "permission denied for sequence".
grant usage, select on sequence tasks_nummer_seq to authenticated;

-- Controle achteraf:
--   select nummer, title from tasks order by nummer;
--   select column_default, is_nullable from information_schema.columns
--    where table_name = 'tasks' and column_name = 'nummer';
