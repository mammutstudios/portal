-- Wie er in een reactie genoemd wordt.
--
-- De namen staan al in de tekst zelf ("@Daniel"), maar tekst is geen
-- verwijzing: iemand die van naam verandert is dan niet meer terug te vinden,
-- en er valt niets op af te gaan zodra hier een melding aan hangt. Vandaar de
-- ids ernaast.
--
-- Draai dit ná 20260905_ticket_reacties.sql. Kan twee keer zonder schade.

alter table task_comments
  add column if not exists mentions uuid[] not null default '{}';

comment on column task_comments.mentions is
  'Profiel-ids die in body met @ genoemd zijn. De tekst blijft leidend voor wat je leest; deze kolom voor wat de app ermee doet.';

-- Voor "alles waar ik in genoemd word". Een gin-index is de vorm die past bij
-- zoeken op een waarde binnen een array.
create index if not exists task_comments_mentions_idx on task_comments using gin (mentions);

-- Controle achteraf:
--   select column_name, data_type from information_schema.columns
--    where table_name = 'task_comments' and column_name = 'mentions';
