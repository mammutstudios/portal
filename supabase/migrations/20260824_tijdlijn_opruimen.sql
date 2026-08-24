-- Regels van de tijdlijn kunnen weghalen.
--
-- Verwijderen mocht alleen bij je eigen bericht. Systeemregels als "Daniel is
-- nu de lead" bleven daardoor staan, ook als ze nergens op sloegen. Een admin
-- mag nu alles van de tijdlijn halen; een klant blijft bij zijn eigen berichten.

drop policy if exists "project_comments_delete" on project_comments;
create policy "project_comments_delete" on project_comments
  for delete using (is_admin() or profile_id = auth.uid());
