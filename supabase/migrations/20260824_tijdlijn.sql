-- Van berichten naar een tijdlijn.
--
-- Dezelfde tabel houdt nu twee soorten regels: wat mensen zelf schrijven, en
-- wat het systeem vastlegt als er iets gebeurt. Eén tabel en dus één volgorde;
-- twee tabellen zouden bij elke weergave samengevoegd en gesorteerd moeten
-- worden zonder dat daar iets tegenover staat.

alter table project_comments
  add column if not exists kind text not null default 'bericht';

comment on column project_comments.kind is
  'bericht = door een mens geschreven. status, fase, factuur = door het systeem vastgelegd.';

-- Systeemregels hebben geen auteur: een factuur die betaald wordt komt via de
-- webhook binnen, en daar is niemand ingelogd.
alter table project_comments
  alter column profile_id drop not null;

-- De schrijfregel blijft: onder je eigen naam, en alleen bij een project dat je
-- mag zien. Systeemregels worden met de service role weggeschreven en gaan
-- langs row level security heen.
drop policy if exists "project_comments_write" on project_comments;
create policy "project_comments_write" on project_comments
  for insert with check (
    profile_id = auth.uid()
    and (
      is_admin()
      or project_id in (
        select p.id from projects p where p.client_id in (select my_client_ids())
      )
    )
  );
