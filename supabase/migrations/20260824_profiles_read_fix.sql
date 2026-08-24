-- Herstel: profiles was leesbaar zonder inlog.
--
-- De vorige policy zei "id = auth.uid() or role = 'admin' or ...". Die tweede
-- voorwaarde staat op zichzelf: voor een bezoeker zonder account is auth.uid()
-- leeg, maar "role = 'admin'" blijft gewoon waar voor de teamrijen. Daarmee kon
-- iedereen met de anon-sleutel, die in elke browserbundel zit, naam, e-mail en
-- rol van het team opvragen.
--
-- Nu moet je eerst ingelogd zijn; pas daarna gelden de drie gevallen.

drop policy if exists "profiles_read" on profiles;
create policy "profiles_read" on profiles
  for select using (
    auth.uid() is not null
    and (
      -- je eigen profiel
      id = auth.uid()
      -- het team, nodig voor de lead en de namen bij berichten
      or role = 'admin'
      -- collega's binnen dezelfde organisatie
      or id in (
        select cm.user_id
        from client_members cm
        where cm.client_id in (select my_client_ids())
      )
    )
  );
