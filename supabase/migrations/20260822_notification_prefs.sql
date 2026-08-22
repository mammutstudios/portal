-- Meldingsvoorkeuren per gebruiker. Eén jsonb-kolom in plaats van losse
-- booleans, zodat er later een soort bij kan zonder migratie.
alter table profiles
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;

comment on column profiles.notification_prefs is
  'Per soort melding true/false. Ontbrekende sleutel = standaardwaarde uit de app.';
