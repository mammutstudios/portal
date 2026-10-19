-- Uren aan een task hangen.
--
-- time_entries wees alleen naar een project. Dat is grof: een project loopt
-- maanden en zegt niet waar de tijd heen ging. Een task wel, en die heeft zijn
-- project al bij zich.
--
-- De kolom task bestond al en is iets anders: dat is de omschrijving die je
-- zelf typt. Vandaar task_id voor de verwijzing. Ze bijten elkaar niet, maar
-- let erop bij het lezen van een query.
--
-- on delete set null en niet cascade: gooi je een task weg, dan blijven de
-- uren staan. Ze zijn gewerkt en vaak al gefactureerd; die horen niet mee te
-- verdwijnen met het lijstje waar ze aan hingen. project_id blijft dan het
-- enige wat ze plaatst, en dat vult de app bij het kiezen van een task.
--
-- Draai dit ná 20261018_uren_in_de_agenda.sql. Kan twee keer draaien zonder
-- schade.

alter table time_entries
  add column if not exists task_id uuid references tasks(id) on delete set null;

-- Voor het totaal per task op de taskpagina.
create index if not exists time_entries_task_id_idx on time_entries (task_id);

-- Controle achteraf:
--   select t.nummer, t.title, sum(e.hours) as uren
--     from time_entries e join tasks t on t.id = e.task_id
--    group by t.nummer, t.title order by t.nummer;
