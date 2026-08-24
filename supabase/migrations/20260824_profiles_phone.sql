-- Telefoonnummer bij een profiel, zodat de lead van een project bereikbaar is
-- vanuit het klantportaal.

alter table profiles
  add column if not exists phone text;

comment on column profiles.phone is
  'Telefoonnummer van een teamlid. Zichtbaar bij de lead van een project.';
