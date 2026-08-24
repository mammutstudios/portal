-- Koppeling organisatie -> site in Plausible. De waarde is het domein zoals het
-- in Plausible staat, bijvoorbeeld "deegmeesters.nl".
alter table clients add column if not exists plausible_site_id text;

comment on column clients.plausible_site_id is
  'site_id in Plausible: het domein zoals toegevoegd in de analytics-instantie.';
