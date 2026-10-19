-- Uren op een weekrooster: een regel krijgt een begintijd.
--
-- time_entries had alleen date en hours. Daarmee weet je wel dát er die dag
-- twee uur op iets ging, maar niet wanneer, en zonder wanneer kun je er geen
-- blok van tekenen. Vandaar start_at.
--
-- Alleen een begin en geen einde: de duur zit al in hours, en twee kolommen
-- die hetzelfde zeggen lopen vroeg of laat uit elkaar. Het einde is dus
-- start_at + hours, overal waar het nodig is.
--
-- date blijft bestaan en blijft leidend voor de lijst, de totalen en alles wat
-- er nu al op leunt. De app zet beide tegelijk; een gegenereerde kolom kan
-- hier niet, want welke dag een tijdstip is hangt af van de tijdzone en dat is
-- voor Postgres geen onveranderlijke functie.
--
-- Bestaande regels houden start_at leeg. Die horen niet op een tijdstip thuis
-- dat niemand heeft opgeschreven; ze staan in het rooster boven de dag, en je
-- sleept ze er zelf in.
--
-- Draai dit ná 20261016_task_nummer.sql. Kan twee keer draaien zonder schade.

alter table time_entries add column if not exists start_at timestamptz;

-- Op profile_id erbij, want het rooster toont één week van één persoon.
create index if not exists time_entries_start_at_idx
  on time_entries (profile_id, start_at);

-- Controle achteraf:
--   select id, date, start_at, hours, task from time_entries order by date desc limit 10;
--   select column_name, data_type from information_schema.columns
--    where table_name = 'time_entries';
