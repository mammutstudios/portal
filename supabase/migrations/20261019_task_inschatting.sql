-- Hoeveel uur denk je dat het wordt.
--
-- Uren schrijven kon al, maar zonder inschatting zegt een getal weinig: twee
-- uur is veel voor een tekstwijziging en weinig voor een nieuwe pagina. Met
-- allebei naast elkaar op de taskpagina zie je in één oogopslag of het uit de
-- hand loopt.
--
-- numeric en geen integer: een half uur komt vaker voor dan een heel uur.
-- Mag leeg blijven. Een inschatting is een hulpmiddel, geen verplichting, en
-- een verplicht veld bij het opschrijven van een krabbeltje kost je het
-- krabbeltje.
--
-- Kan twee keer draaien zonder schade.

alter table tasks add column if not exists estimate_hours numeric;

-- Controle achteraf:
--   select nummer, title, estimate_hours from tasks
--    where estimate_hours is not null order by nummer desc limit 10;
